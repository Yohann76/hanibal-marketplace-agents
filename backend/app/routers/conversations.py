from typing import Optional
from fastapi import APIRouter, Depends
from app.database import list_conversations, list_conversations_org
from app.services.agent_runner import get_conversation_history
from app.auth import get_current_user

router = APIRouter()


@router.get("/conversations")
async def get_conversations(
    agent_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    - admin : toutes les conversations de l'application
    - owner : toutes les conversations de son organisation (avec user_name)
    - member : uniquement ses propres conversations
    """
    if current_user["role"] == "admin":
        return list_conversations(agent_id=agent_id)
    if current_user["role"] == "owner":
        return list_conversations_org(current_user["organisation_id"], agent_id=agent_id)
    return list_conversations(agent_id=agent_id, user_id=current_user["id"])


@router.get("/conversations/{session_id}/messages")
async def get_conversation_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    messages = get_conversation_history(session_id)
    return {"session_id": session_id, "messages": messages}
