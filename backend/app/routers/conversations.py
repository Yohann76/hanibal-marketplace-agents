from typing import Optional
from fastapi import APIRouter, HTTPException
from app.database import list_conversations
from app.services.agent_runner import get_conversation_history

router = APIRouter()


@router.get("/conversations")
async def get_conversations(agent_id: Optional[str] = None):
    return list_conversations(agent_id)


@router.get("/conversations/{session_id}/messages")
async def get_conversation_messages(session_id: str):
    messages = get_conversation_history(session_id)
    if not messages:
        raise HTTPException(404, "Conversation not found or empty")
    return {"session_id": session_id, "messages": messages}
