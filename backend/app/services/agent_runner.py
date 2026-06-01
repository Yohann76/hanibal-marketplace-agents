import json
import uuid
import asyncio
from pathlib import Path
from typing import Optional, AsyncGenerator
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from sqlalchemy import text
from app.config import DATABASE_URL, MISTRAL_API_KEY, ANTHROPIC_API_KEY
from app.database import engine
from app.services.tools import get_tools

AGENTS_DIR = Path(__file__).parent.parent.parent / "agents"


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


# ── LLM factory ──────────────────────────────────────────────────────────────

def get_llm(provider: str, callbacks: list):
    if provider == "claude":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model="claude-sonnet-4-6", api_key=ANTHROPIC_API_KEY, callbacks=callbacks)
    from langchain_mistralai import ChatMistralAI
    return ChatMistralAI(model="mistral-small-latest", api_key=MISTRAL_API_KEY, callbacks=callbacks)


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


def _sync_save_history(session_id: str, human_msg: str, ai_msg: str):
    with engine.connect() as conn:
        for msg_type, content in [("human", human_msg), ("ai", ai_msg)]:
            conn.execute(
                text("INSERT INTO message_store (session_id, message) VALUES (:sid, :msg)"),
                {"sid": session_id, "msg": json.dumps({"type": msg_type, "data": {"content": content}})},
            )
        conn.commit()


async def load_history(session_id: str):
    return await asyncio.get_event_loop().run_in_executor(None, _sync_load_history, session_id)

async def save_history(session_id: str, human_msg: str, ai_msg: str):
    await asyncio.get_event_loop().run_in_executor(None, _sync_save_history, session_id, human_msg, ai_msg)


# ── Streaming agent ───────────────────────────────────────────────────────────

async def stream_agent(
    agent_id: str,
    user_input: str,
    session_id: Optional[str] = None,
) -> AsyncGenerator[dict, None]:

    config = load_agent_config(agent_id)
    system_prompt = load_system_prompt(agent_id)
    knowledge = load_knowledge(agent_id)
    full_prompt = build_system_prompt(system_prompt, knowledge)
    provider = config.get("provider", "mistral")
    tool_names = config.get("tools", [])

    usage = UsageCallback()
    llm = get_llm(provider, [usage])
    history = await load_history(session_id) if session_id else []
    full_response = ""

    messages = [SystemMessage(content=full_prompt)] + history + [HumanMessage(content=user_input)]

    if tool_names:
        # ── Manual tool calling loop (fixes Mistral tool_call_id=None bug) ───
        tools = get_tools(tool_names)
        tools_dict = {t.name: t for t in tools}
        llm_with_tools = llm.bind_tools(tools)
        current_messages = list(messages)

        for _ in range(5):  # max 5 tool rounds
            response = await llm_with_tools.ainvoke(current_messages)

            if not response.tool_calls:
                full_response = response.content or ""
                break

            # Fix None IDs — Mistral sometimes omits tool_call_id
            fixed_tool_calls = []
            for tc in response.tool_calls:
                fixed = {**tc, "id": tc.get("id") or f"call_{uuid.uuid4().hex[:8]}"}
                fixed_tool_calls.append(fixed)

            # Rebuild AIMessage with fixed IDs
            current_messages.append(AIMessage(
                content=response.content or "",
                tool_calls=fixed_tool_calls,
            ))

            for tc in fixed_tool_calls:
                yield {"type": "tool_start", "tool": tc["name"], "input": str(tc.get("args", {}))}
                tool_fn = tools_dict.get(tc["name"])
                try:
                    result = tool_fn.invoke(tc.get("args", {})) if tool_fn else f"Tool '{tc['name']}' not found"
                except Exception as e:
                    result = f"Tool error: {e}"
                current_messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
                yield {"type": "tool_end", "tool": tc["name"]}

        # Stream final response token by token
        for i in range(0, len(full_response), 6):
            chunk = full_response[i:i+6]
            yield {"type": "token", "content": chunk}

    else:
        # ── Simple streaming mode ────────────────────────────────────────────
        async for chunk in llm.astream(messages):
            if chunk.content:
                full_response += chunk.content
                yield {"type": "token", "content": chunk.content}

    if session_id and full_response:
        await save_history(session_id, user_input, full_response)

    yield {"type": "done", "input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens}


# ── Non-streaming (backward compat) ──────────────────────────────────────────

async def run_agent(agent_id: str, user_input: str, session_id: Optional[str] = None) -> dict:
    full_response = ""
    input_tokens = output_tokens = 0
    async for event in stream_agent(agent_id, user_input, session_id):
        if event["type"] == "token":
            full_response += event["content"]
        elif event["type"] == "done":
            input_tokens = event.get("input_tokens", 0)
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
    messages = _sync_load_history(session_id)
    return [
        {"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content}
        for m in messages
    ]
