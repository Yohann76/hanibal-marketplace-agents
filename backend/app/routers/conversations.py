from typing import Optional
from fastapi import APIRouter, Depends
from app.database import list_conversations
from app.services.agent_runner import get_conversation_history
from app.auth import get_optional_user

router = APIRouter()


@router.get("/conversations")
async def get_conversations(
    agent_id: Optional[str] = None,
    current_user: dict | None = Depends(get_optional_user),
):
    user_id = current_user["id"] if current_user else None
    return list_conversations(agent_id=agent_id, user_id=user_id)


@router.get("/conversations/{session_id}/messages")
async def get_conversation_messages(session_id: str):
    messages = get_conversation_history(session_id)
    return {"session_id": session_id, "messages": messages}
