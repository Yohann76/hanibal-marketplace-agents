import asyncio
import importlib.util
import json
import logging
import traceback
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
from app.services import agent_runner, gmail_service
from app.database import upsert_conversation_session
from app.config import BACKEND_PUBLIC_URL, MISTRAL_MODEL, CLAUDE_MODEL

router = APIRouter()
AGENTS_DIR = Path("agents")


def _load_agent_tools_info(agent_id: str) -> list[dict]:
    """Load tools META from the agent's own tools/ subfolder."""
    tools_dir = AGENTS_DIR / agent_id / "tools"
    if not tools_dir.exists():
        return []
    result = []
    for path in sorted(tools_dir.glob("*.py")):
        if path.name.startswith("_"):
            continue
        spec = importlib.util.spec_from_file_location(f"agent_{agent_id}_{path.stem}", path)
        mod = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(mod)
        except Exception:
            continue
        if hasattr(mod, "META"):
            result.append(mod.META)
    return result


def _find_tool_in_agents(tool_name: str):
    """Find a tool function by scanning all agents' tools/ subfolders."""
    for agent_dir in sorted(AGENTS_DIR.iterdir()):
        if not agent_dir.is_dir():
            continue
        path = agent_dir / "tools" / f"{tool_name}.py"
        if not path.exists():
            continue
        spec = importlib.util.spec_from_file_location(f"find_tool_{tool_name}", path)
        mod = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(mod)
        except Exception:
            continue
        fn = getattr(mod, tool_name, None)
        if fn and hasattr(fn, "invoke"):
            return fn
    return None


def load_agents() -> list[dict]:
    agents = []
    if not AGENTS_DIR.exists():
        return agents
    for d in sorted(AGENTS_DIR.iterdir()):
        config_path = d / "config.json"
        if d.is_dir() and config_path.exists():
            try:
                config = json.loads(config_path.read_text())
                if not config.get("provider"):
                    config["provider"] = "mistral"
                agents.append(config)
            except Exception:
                continue
    return agents


def load_agent_detail(agent_id: str) -> dict:
    agent_dir = AGENTS_DIR / agent_id
    if not agent_dir.exists():
        raise HTTPException(status_code=404, detail="Agent not found")

    config = json.loads((agent_dir / "config.json").read_text())
    if not config.get("provider"):
        config["provider"] = "mistral"

    system_prompt = ""
    prompt_path = agent_dir / "system_prompt.txt"
    if prompt_path.exists():
        system_prompt = prompt_path.read_text()

    docs = ""
    docs_path = agent_dir / "docs.md"
    if docs_path.exists():
        docs = docs_path.read_text()

    knowledge = []
    knowledge_dir = agent_dir / "connaissance"
    if knowledge_dir.exists():
        for f in sorted(knowledge_dir.iterdir()):
            if f.is_file():
                knowledge.append({"name": f.name, "content": f.read_text()})

    return {
        "config": config,
        "system_prompt": system_prompt,
        "docs": docs,
        "knowledge": knowledge,
        "tools_info": _load_agent_tools_info(agent_id),
    }


class RunRequest(BaseModel):
    input: Optional[str] = None
    session: Optional[str] = None       # Gmail OAuth session key
    session_id: Optional[str] = None    # Conversation memory session


@router.get("/agents")
async def list_agents():
    return load_agents()


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    return load_agent_detail(agent_id)


async def _resolve_input(agent_id: str, body: RunRequest) -> str:
    detail = load_agent_detail(agent_id)
    input_type = detail["config"]["input"]["type"]
    if not body.input:
        raise HTTPException(422, "Input is required")
    return body.input


@router.post("/agents/{agent_id}/run")
async def run_agent(agent_id: str, body: RunRequest):
    user_content = await _resolve_input(agent_id, body)
    try:
        result = await agent_runner.run_agent(
            agent_id=agent_id,
            user_input=user_content,
            session_id=body.session_id,
        )
    except Exception as e:
        logger.error("Agent runner error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(500, str(e))

    if body.session_id:
        title = (body.input or "")[:80] or f"Session {agent_id}"
        upsert_conversation_session(
            body.session_id, agent_id, title,
            result["input_tokens"], result["output_tokens"]
        )

    return result


@router.post("/agents/{agent_id}/stream")
async def stream_agent(agent_id: str, body: RunRequest):
    user_content = await _resolve_input(agent_id, body)

    title = (body.input or "")[:80] or f"Session {agent_id}"

    async def generate():
        try:
            async for event in agent_runner.stream_agent(agent_id, user_content, body.session_id):
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") == "done" and body.session_id:
                    upsert_conversation_session(
                        body.session_id, agent_id, title,
                        event.get("input_tokens", 0),
                        event.get("output_tokens", 0),
                    )
        except Exception as e:
            logger.error("Stream error: %s\n%s", e, traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


@router.get("/agents/{agent_id}/history/{session_id}")
async def get_history(agent_id: str, session_id: str):
    messages = agent_runner.get_conversation_history(session_id)
    return {"session_id": session_id, "agent_id": agent_id, "messages": messages}


class ScoreRequest(BaseModel):
    value: float
    comment: Optional[str] = None
    name: str = "user-feedback"


@router.post("/traces/{trace_id}/score")
async def score_trace(trace_id: str, body: ScoreRequest):
    ok = await agent_runner.score_trace(trace_id, body.value, body.comment, body.name)
    return {"ok": ok, "trace_id": trace_id}


class ToolRunRequest(BaseModel):
    input: str


@router.post("/tools/{tool_name}/run")
async def run_tool(tool_name: str, body: ToolRunRequest):
    tool = _find_tool_in_agents(tool_name)
    if not tool:
        raise HTTPException(404, f"Tool '{tool_name}' not found")
    try:
        first_arg = next(iter(tool.args))
        result = await asyncio.get_event_loop().run_in_executor(
            None, tool.invoke, {first_arg: body.input}
        )
        return {"result": str(result)}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/config")
async def get_config():
    return {
        "gmail_auth_url": f"{BACKEND_PUBLIC_URL}/api/gmail/auth",
        "models": {
            "mistral": {"name": MISTRAL_MODEL},
            "claude":  {"name": CLAUDE_MODEL},
        },
    }
