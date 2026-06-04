import importlib.util
import json
import logging
import uuid
import asyncio
import httpx
from pathlib import Path
from typing import Optional, AsyncGenerator, Any
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from sqlalchemy import text
from app.config import (
    DATABASE_URL, MISTRAL_API_KEY, ANTHROPIC_API_KEY,
    MISTRAL_MODEL, CLAUDE_MODEL,
    LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST,
)
from app.database import engine

AGENTS_DIR = Path(__file__).parent.parent.parent / "agents"
logger = logging.getLogger(__name__)


# ── LangFuse ──────────────────────────────────────────────────────────────────

try:
    from langfuse import Langfuse
    from langfuse.callback import CallbackHandler as LangfuseHandler
    _LANGFUSE_OK = True
except ImportError:
    _LANGFUSE_OK = False

_lf: "Langfuse | None" = None

def _get_lf():
    global _lf
    if not _LANGFUSE_OK or not LANGFUSE_PUBLIC_KEY:
        return None
    if _lf is None:
        try:
            _lf = Langfuse()
        except Exception:
            pass
    return _lf




# Prompts déjà synchronisés dans cette session — évite de recréer une version à chaque run
_synced_prompts: set[str] = set()


def _resolve_system_prompt(agent_id: str) -> tuple[str, Any]:
    """
    Retourne (texte_prompt, objet_prompt_langfuse|None).
    Priorité : LangFuse → fichier.
    La création dans LangFuse n'a lieu qu'une seule fois par démarrage du backend
    pour éviter de créer une nouvelle version à chaque run.
    """
    file_text = (AGENTS_DIR / agent_id / "system_prompt.txt").read_text()
    lf = _get_lf()
    if not lf:
        return file_text, None

    prompt_name = f"agent-{agent_id}"

    # Cas nominal : prompt existant dans LangFuse
    try:
        obj = lf.get_prompt(prompt_name, cache_ttl_seconds=60)
        logger.info("[prompt] %s → LangFuse v%s", prompt_name, getattr(obj, 'version', '?'))
        return obj.prompt, obj
    except Exception as e:
        logger.warning("[prompt] %s → get_prompt échoue (%s)", prompt_name, e)

    # Prompt absent : on le crée une seule fois par session (pas à chaque run)
    if prompt_name not in _synced_prompts:
        _synced_prompts.add(prompt_name)
        try:
            lf.create_prompt(name=prompt_name, prompt=file_text, labels=["production"])
            logger.info("[prompt] %s → créé dans LangFuse depuis le fichier", prompt_name)
        except Exception as e:
            logger.warning("[prompt] %s → create_prompt échoue (%s)", prompt_name, e)
        try:
            obj = lf.get_prompt(prompt_name, cache_ttl_seconds=60)
            return obj.prompt, obj
        except Exception:
            pass

    logger.warning("[prompt] %s → fallback fichier system_prompt.txt", prompt_name)
    return file_text, None


async def score_trace(
    trace_id: str,
    value: float,
    comment: str | None = None,
    name: str = "user-feedback",
) -> bool:
    lf = _get_lf()
    if not lf or not trace_id:
        return False
    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: lf.score(trace_id=trace_id, name=name, value=value, comment=comment),
        )
        return True
    except Exception:
        return False


# ── Callbacks ────────────────────────────────────────────────────────────────

class UsageCallback(BaseCallbackHandler):
    def __init__(self):
        self.input_tokens = 0
        self.output_tokens = 0

    def on_llm_end(self, response, **kwargs):
        try:
            gen = response.generations[0][0]
            meta = getattr(getattr(gen, "message", None), "usage_metadata", None)
            if meta:
                self.input_tokens = meta.get("input_tokens", 0)
                self.output_tokens = meta.get("output_tokens", 0)
        except (IndexError, AttributeError):
            pass


# ── LLM factory ───────────────────────────────────────────────────────────────

def get_llm(provider: str, callbacks: list):
    if provider == "claude":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=CLAUDE_MODEL, api_key=ANTHROPIC_API_KEY, callbacks=callbacks)
    from langchain_mistralai import ChatMistralAI
    return ChatMistralAI(model=MISTRAL_MODEL, api_key=MISTRAL_API_KEY, callbacks=callbacks)

def get_model_name(provider: str) -> str:
    return CLAUDE_MODEL if provider == "claude" else MISTRAL_MODEL


# ── Agent config helpers ──────────────────────────────────────────────────────

def load_agent_tools(agent_id: str) -> tuple[list, dict]:
    tools_dir = AGENTS_DIR / agent_id / "tools"
    if not tools_dir.exists():
        return [], {}
    tools, tools_dict = [], {}
    for path in sorted(tools_dir.glob("*.py")):
        if path.name.startswith("_"):
            continue
        spec = importlib.util.spec_from_file_location(f"agent_{agent_id}_{path.stem}", path)
        mod = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(mod)
        except Exception:
            continue
        fn = getattr(mod, path.stem, None)
        if fn and hasattr(fn, "invoke"):
            tools.append(fn)
            tools_dict[fn.name] = fn
    return tools, tools_dict


def load_agent_config(agent_id: str) -> dict:
    return json.loads((AGENTS_DIR / agent_id / "config.json").read_text())

def load_system_prompt(agent_id: str) -> str:
    """Lecture du prompt : LangFuse en priorité, fichier en fallback."""
    lf = _get_lf()
    if lf:
        try:
            return lf.get_prompt(f"agent-{agent_id}", cache_ttl_seconds=60).prompt
        except Exception:
            pass
    return (AGENTS_DIR / agent_id / "system_prompt.txt").read_text()

def load_knowledge(agent_id: str) -> list[dict]:
    d = AGENTS_DIR / agent_id / "connaissance"
    if not d.exists():
        return []
    return [{"name": f.name, "content": f.read_text()} for f in sorted(d.iterdir()) if f.is_file()]

def build_system_prompt(system_prompt: str, knowledge: list[dict]) -> str:
    if not knowledge:
        return system_prompt
    kb = "\n\n---\n\n## Knowledge Base\n\nUse the following reference documents to answer accurately:\n\n"
    for k in knowledge:
        kb += f"### {k['name']}\n\n{k['content']}\n\n"
    return system_prompt + kb


# ── Memory ────────────────────────────────────────────────────────────────────

def _sync_load_history(session_id: str) -> list:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT message FROM message_store WHERE session_id = :sid ORDER BY id"),
            {"sid": session_id},
        ).fetchall()
    messages = []
    for row in rows:
        data = row[0]
        if isinstance(data, str):
            data = json.loads(data)
        msg_type = data.get("type", "")
        content = data.get("data", {}).get("content", "")
        if msg_type == "human":
            messages.append(HumanMessage(content=content))
        elif msg_type == "ai":
            messages.append(AIMessage(content=content))
    return messages


def _sync_save_history(session_id: str, human_msg: str, ai_msg: str, tool_calls: list | None = None):
    with engine.connect() as conn:
        conn.execute(
            text("INSERT INTO message_store (session_id, message) VALUES (:sid, :msg)"),
            {"sid": session_id, "msg": json.dumps({"type": "human", "data": {"content": human_msg}})},
        )
        ai_data: dict = {"content": ai_msg}
        if tool_calls:
            ai_data["tool_calls"] = tool_calls
        conn.execute(
            text("INSERT INTO message_store (session_id, message) VALUES (:sid, :msg)"),
            {"sid": session_id, "msg": json.dumps({"type": "ai", "data": ai_data})},
        )
        conn.commit()


async def load_history(session_id: str):
    return await asyncio.get_event_loop().run_in_executor(None, _sync_load_history, session_id)

async def save_history(session_id: str, human_msg: str, ai_msg: str, tool_calls: list | None = None):
    await asyncio.get_event_loop().run_in_executor(None, _sync_save_history, session_id, human_msg, ai_msg, tool_calls)


# ── Direct Mistral tool loop ──────────────────────────────────────────────────

def _lc_to_dict(m) -> dict:
    if isinstance(m, SystemMessage):
        return {"role": "system", "content": m.content}
    if isinstance(m, HumanMessage):
        return {"role": "user", "content": m.content}
    return {"role": "assistant", "content": m.content or ""}


def _tool_schema(t) -> dict:
    props, required = {}, []
    for name, info in (t.args or {}).items():
        props[name] = {"type": info.get("type", "string")}
        if info.get("description"):
            props[name]["description"] = info["description"]
        required.append(name)
    return {
        "type": "function",
        "function": {
            "name": t.name,
            "description": t.description,
            "parameters": {"type": "object", "properties": props, "required": required},
        },
    }


async def _mistral_tool_loop(
    lc_messages: list,
    tools: list,
    tools_dict: dict,
    usage: UsageCallback,
    lf_trace=None,
    lf_prompt_obj=None,
) -> AsyncGenerator[dict, None]:
    history = [_lc_to_dict(m) for m in lc_messages]
    schemas = [_tool_schema(t) for t in tools]
    full_response = ""

    async with httpx.AsyncClient(timeout=60) as client:
        for iteration in range(15):
            lf_gen = None
            if lf_trace:
                try:
                    lf_gen = lf_trace.generation(
                        name=f"mistral-llm-{iteration}",
                        model=MISTRAL_MODEL,
                        model_parameters={"tool_choice": "auto"},
                        input=history,
                        # Lien vers le prompt LangFuse sur le premier appel uniquement
                        prompt=lf_prompt_obj if iteration == 0 else None,
                    )
                except Exception:
                    lf_gen = None

            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {MISTRAL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MISTRAL_MODEL,
                    "messages": history,
                    "tools": schemas,
                    "tool_choice": "auto",
                },
            )
            if resp.status_code != 200:
                if lf_gen:
                    try:
                        lf_gen.end(level="ERROR", status_message=f"HTTP {resp.status_code}: {resp.text[:200]}")
                    except Exception:
                        pass
                raise Exception(f"Mistral API {resp.status_code}: {resp.text}")

            data = resp.json()
            u = data.get("usage", {})
            usage.input_tokens  = u.get("prompt_tokens", 0)
            usage.output_tokens = u.get("completion_tokens", 0)
            call_input_tokens   = u.get("prompt_tokens", 0)
            call_output_tokens  = u.get("completion_tokens", 0)
            call_tokens         = call_input_tokens + call_output_tokens

            msg        = data["choices"][0]["message"]
            tool_calls = msg.get("tool_calls") or []

            if lf_gen:
                try:
                    lf_gen.end(
                        output=msg.get("content") or (json.dumps(tool_calls) if tool_calls else ""),
                        usage={"input": call_input_tokens, "output": call_output_tokens},
                    )
                except Exception:
                    pass

            if not tool_calls:
                full_response = msg.get("content") or ""
                break

            fixed = [
                {**tc, "id": (tc.get("id") or "").strip() or f"call_{uuid.uuid4().hex[:8]}"}
                for tc in tool_calls
            ]

            history.append({
                "role": "assistant",
                "content": msg.get("content") or "",
                "tool_calls": fixed,
            })

            for tc in fixed:
                name = tc["function"]["name"]
                try:
                    args = json.loads(tc["function"]["arguments"])
                except Exception:
                    args = {}

                yield {"type": "tool_start", "tool": name, "input": str(args)}

                lf_span = None
                if lf_trace:
                    try:
                        lf_span = lf_trace.span(
                            name=f"tool/{name}",
                            input=args,
                            metadata={"tool_call_id": tc["id"], "call_tokens": call_tokens},
                        )
                    except Exception:
                        lf_span = None

                tool_fn = tools_dict.get(name)
                try:
                    result = await asyncio.to_thread(
                        tool_fn.invoke, args
                    ) if tool_fn else f"Tool '{name}' not found"
                except Exception as e:
                    result = f"Tool error: {e}"

                if lf_span:
                    try:
                        lf_span.end(output=str(result)[:4000])
                    except Exception:
                        pass

                history.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": str(result),
                })
                yield {
                    "type": "tool_end",
                    "tool": name,
                    "result": str(result),
                    "call_tokens": call_tokens,
                    "call_input_tokens": call_input_tokens,
                    "call_output_tokens": call_output_tokens,
                }

        if not full_response:
            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {MISTRAL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"model": MISTRAL_MODEL, "messages": history},
            )
            if resp.status_code == 200:
                data = resp.json()
                u = data.get("usage", {})
                usage.input_tokens  = u.get("prompt_tokens", 0)
                usage.output_tokens = u.get("completion_tokens", 0)
                full_response = data["choices"][0]["message"].get("content") or ""

    for i in range(0, len(full_response), 6):
        yield {"type": "token", "content": full_response[i:i+6]}


# ── Streaming agent ───────────────────────────────────────────────────────────

async def stream_agent(
    agent_id: str,
    user_input: str,
    session_id: Optional[str] = None,
) -> AsyncGenerator[dict, None]:

    config     = load_agent_config(agent_id)
    provider   = config.get("provider", "mistral")
    tool_names = config.get("tools", [])

    # ── Prompt : LangFuse en priorité, fichier en fallback + auto-sync ────────
    system_prompt_text, lf_prompt_obj = await asyncio.get_event_loop().run_in_executor(
        None, lambda: _resolve_system_prompt(agent_id)
    )
    knowledge  = load_knowledge(agent_id)
    full_prompt = build_system_prompt(system_prompt_text, knowledge)

    usage   = UsageCallback()
    history = await load_history(session_id) if session_id else []
    full_response = ""
    completed_tool_calls: list = []

    # ── LangFuse : ouverture de la trace ──────────────────────────────────────
    lf = _get_lf()
    lf_trace    = None
    lf_callbacks = [usage]

    if lf:
        try:
            lf_trace = lf.trace(
                name=f"agent/{agent_id}",
                session_id=session_id or "no-session",
                metadata={
                    "agent_id": agent_id,
                    "provider": provider,
                    "model": get_model_name(provider),
                    "has_tools": bool(tool_names),
                    "tool_names": tool_names,
                    "history_length": len(history),
                },
                input={"message": user_input},
                tags=[agent_id, provider],
            )
            lf_callbacks.append(LangfuseHandler(stateful_client=lf_trace))
        except Exception:
            lf_trace = None

    messages = [SystemMessage(content=full_prompt)] + history + [HumanMessage(content=user_input)]

    if tool_names:
        tools, tools_dict = load_agent_tools(agent_id)

        if provider == "claude":
            from langchain_core.messages import ToolMessage
            llm            = get_llm(provider, lf_callbacks)
            llm_with_tools = llm.bind_tools(tools)
            current        = list(messages)

            for _ in range(5):
                response = await llm_with_tools.ainvoke(current)
                if not response.tool_calls:
                    full_response = response.content or ""
                    break

                current.append(AIMessage(
                    content=response.content or "",
                    tool_calls=response.tool_calls,
                ))

                for tc in response.tool_calls:
                    yield {"type": "tool_start", "tool": tc["name"], "input": str(tc.get("args", {}))}

                    lf_span = None
                    if lf_trace:
                        try:
                            lf_span = lf_trace.span(
                                name=f"tool/{tc['name']}",
                                input=tc.get("args", {}),
                            )
                        except Exception:
                            pass

                    tool_fn = tools_dict.get(tc["name"])
                    try:
                        result = tool_fn.invoke(tc.get("args", {})) if tool_fn else f"Tool '{tc['name']}' not found"
                    except Exception as e:
                        result = f"Tool error: {e}"

                    if lf_span:
                        try:
                            lf_span.end(output=str(result)[:4000])
                        except Exception:
                            pass

                    current.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
                    completed_tool_calls.append({"tool": tc["name"], "result": str(result)})
                    yield {"type": "tool_end", "tool": tc["name"], "result": str(result)}

            for i in range(0, len(full_response), 6):
                yield {"type": "token", "content": full_response[i:i+6]}

        else:
            async for event in _mistral_tool_loop(
                messages, tools, tools_dict, usage, lf_trace, lf_prompt_obj
            ):
                if event["type"] == "token":
                    full_response += event["content"]
                elif event["type"] == "tool_end":
                    completed_tool_calls.append({
                        "tool": event["tool"],
                        "result": event.get("result", ""),
                        "tokens": event.get("call_tokens", 0),
                    })
                yield event

    else:
        llm = get_llm(provider, lf_callbacks)
        async for chunk in llm.astream(messages):
            if chunk.content:
                full_response += chunk.content
                yield {"type": "token", "content": chunk.content}

    if session_id and full_response:
        await save_history(session_id, user_input, full_response,
                           completed_tool_calls or None)

    # ── LangFuse : fermeture de la trace ──────────────────────────────────────
    trace_id = None
    if lf and lf_trace:
        try:
            lf_trace.update(
                output={"response": full_response},
                metadata={
                    "input_tokens": usage.input_tokens,
                    "output_tokens": usage.output_tokens,
                    "tool_calls_count": len(completed_tool_calls),
                },
            )
            trace_id = lf_trace.id
            await asyncio.get_event_loop().run_in_executor(None, lf.flush)
        except Exception:
            pass

    yield {
        "type": "done",
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "trace_id": trace_id,
    }


# ── Non-streaming ─────────────────────────────────────────────────────────────

async def run_agent(agent_id: str, user_input: str, session_id: Optional[str] = None) -> dict:
    full_response = ""
    input_tokens = output_tokens = 0
    trace_id = None
    async for event in stream_agent(agent_id, user_input, session_id):
        if event["type"] == "token":
            full_response += event["content"]
        elif event["type"] == "done":
            input_tokens  = event.get("input_tokens", 0)
            output_tokens = event.get("output_tokens", 0)
            trace_id      = event.get("trace_id")
    config = load_agent_config(agent_id)
    return {
        "result": full_response,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "provider": config.get("provider", "mistral"),
        "session_id": session_id,
        "trace_id": trace_id,
    }


# ── History reader ────────────────────────────────────────────────────────────

def get_conversation_history(session_id: str) -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT message FROM message_store WHERE session_id = :sid ORDER BY id"),
            {"sid": session_id},
        ).fetchall()
    result = []
    for row in rows:
        data = row[0]
        if isinstance(data, str):
            data = json.loads(data)
        msg_type = data.get("type", "")
        msg_data = data.get("data", {})
        if msg_type == "human":
            result.append({"role": "user", "content": msg_data.get("content", "")})
        elif msg_type == "ai":
            msg: dict = {"role": "assistant", "content": msg_data.get("content", "")}
            if msg_data.get("tool_calls"):
                msg["tool_calls"] = msg_data["tool_calls"]
            result.append(msg)
    return result
