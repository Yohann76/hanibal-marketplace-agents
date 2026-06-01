import json
import uuid
import asyncio
import httpx
from pathlib import Path
from typing import Optional, AsyncGenerator
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from sqlalchemy import text
from app.config import DATABASE_URL, MISTRAL_API_KEY, ANTHROPIC_API_KEY
from app.database import engine
from app.services.tools import get_tools

AGENTS_DIR = Path(__file__).parent.parent.parent / "agents"

MISTRAL_MODEL = "mistral-small-latest"
CLAUDE_MODEL  = "claude-sonnet-4-6"


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


# ── LLM factory (simple streaming only, no tools) ────────────────────────────

def get_llm(provider: str, callbacks: list):
    if provider == "claude":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=CLAUDE_MODEL, api_key=ANTHROPIC_API_KEY, callbacks=callbacks)
    from langchain_mistralai import ChatMistralAI
    return ChatMistralAI(model=MISTRAL_MODEL, api_key=MISTRAL_API_KEY, callbacks=callbacks)


# ── Agent config helpers ──────────────────────────────────────────────────────

def load_agent_config(agent_id: str) -> dict:
    return json.loads((AGENTS_DIR / agent_id / "config.json").read_text())

def load_system_prompt(agent_id: str) -> str:
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


# ── Direct Mistral tool loop (bypasses LangChain serialisation entirely) ─────
#
# langchain-mistralai 0.1.x has a bug where tool_call_id=None leaks through
# even after patching AIMessage.tool_calls, because the serialiser reads from
# additional_kwargs in some code paths.  By building the messages dict ourselves
# and calling the Mistral REST API directly we guarantee the IDs are always set.

def _lc_to_dict(m) -> dict:
    """Convert a LangChain message to a plain Mistral API dict."""
    if isinstance(m, SystemMessage):
        return {"role": "system", "content": m.content}
    if isinstance(m, HumanMessage):
        return {"role": "user", "content": m.content}
    # AIMessage from history — content only, no tool_calls
    return {"role": "assistant", "content": m.content or ""}


def _tool_schema(t) -> dict:
    """Build a Mistral-compatible tool schema from a LangChain @tool."""
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
) -> AsyncGenerator[dict, None]:
    history = [_lc_to_dict(m) for m in lc_messages]
    schemas = [_tool_schema(t) for t in tools]
    full_response = ""

    async with httpx.AsyncClient(timeout=60) as client:
        for _ in range(15):
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
                raise Exception(f"Mistral API {resp.status_code}: {resp.text}")

            data = resp.json()
            u = data.get("usage", {})
            usage.input_tokens  = u.get("prompt_tokens", 0)
            usage.output_tokens = u.get("completion_tokens", 0)
            call_tokens = u.get("prompt_tokens", 0) + u.get("completion_tokens", 0)

            msg        = data["choices"][0]["message"]
            tool_calls = msg.get("tool_calls") or []

            if not tool_calls:
                full_response = msg.get("content") or ""
                break

            # Fix None IDs before they ever enter the history dict
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

                tool_fn = tools_dict.get(name)
                try:
                    result = await asyncio.to_thread(
                        tool_fn.invoke, args
                    ) if tool_fn else f"Tool '{name}' not found"
                except Exception as e:
                    result = f"Tool error: {e}"

                history.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": str(result),
                })
                yield {"type": "tool_end", "tool": name, "result": str(result), "call_tokens": call_tokens}

        # Si la boucle s'est terminée sans réponse finale (limite atteinte),
        # forcer un dernier appel sans tools pour obtenir la synthèse
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

    config       = load_agent_config(agent_id)
    system_prompt = load_system_prompt(agent_id)
    knowledge    = load_knowledge(agent_id)
    full_prompt  = build_system_prompt(system_prompt, knowledge)
    provider     = config.get("provider", "mistral")
    tool_names   = config.get("tools", [])

    usage   = UsageCallback()
    history = await load_history(session_id) if session_id else []
    full_response = ""
    completed_tool_calls: list = []

    messages = [SystemMessage(content=full_prompt)] + history + [HumanMessage(content=user_input)]

    if tool_names:
        tools      = get_tools(tool_names)
        tools_dict = {t.name: t for t in tools}

        if provider == "claude":
            # ── Claude tool loop via LangChain (no tool_call_id bug) ──────────
            from langchain_core.messages import ToolMessage
            llm          = get_llm(provider, [usage])
            llm_with_tools = llm.bind_tools(tools)
            current      = list(messages)

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
                    tool_fn = tools_dict.get(tc["name"])
                    try:
                        result = tool_fn.invoke(tc.get("args", {})) if tool_fn else f"Tool '{tc['name']}' not found"
                    except Exception as e:
                        result = f"Tool error: {e}"
                    current.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
                    event = {"type": "tool_end", "tool": tc["name"], "result": str(result)}
                    completed_tool_calls.append({"tool": tc["name"], "result": str(result)})
                    yield event

            for i in range(0, len(full_response), 6):
                yield {"type": "token", "content": full_response[i:i+6]}

        else:
            # ── Mistral tool loop — direct HTTP, no LangChain serialisation ───
            async for event in _mistral_tool_loop(messages, tools, tools_dict, usage):
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
        # ── Simple streaming (no tools) ───────────────────────────────────────
        llm = get_llm(provider, [usage])
        async for chunk in llm.astream(messages):
            if chunk.content:
                full_response += chunk.content
                yield {"type": "token", "content": chunk.content}

    if session_id and full_response:
        await save_history(session_id, user_input, full_response,
                           completed_tool_calls or None)

    yield {"type": "done", "input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens}


# ── Non-streaming (backward compat) ──────────────────────────────────────────

async def run_agent(agent_id: str, user_input: str, session_id: Optional[str] = None) -> dict:
    full_response = ""
    input_tokens = output_tokens = 0
    async for event in stream_agent(agent_id, user_input, session_id):
        if event["type"] == "token":
            full_response += event["content"]
        elif event["type"] == "done":
            input_tokens  = event.get("input_tokens", 0)
            output_tokens = event.get("output_tokens", 0)
    config = load_agent_config(agent_id)
    return {
        "result": full_response,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "provider": config.get("provider", "mistral"),
        "session_id": session_id,
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
