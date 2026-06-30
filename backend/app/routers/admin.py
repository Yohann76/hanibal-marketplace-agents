from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.auth import require_admin, get_current_user
from app.database import (
    list_users,
    update_user,
    get_user_by_id,
    get_all_agent_permissions,
    upsert_agent_permissions,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class UpdateRoleRequest(BaseModel):
    role: str


class UpdatePermissionsRequest(BaseModel):
    can_access: bool
    tool_permissions: dict


@router.get("/users")
async def admin_list_users(_: dict = Depends(require_admin)):
    users = list_users()
    result = []
    for u in users:
        perms = get_all_agent_permissions(u["id"])
        result.append({**u, "agent_permissions": perms})
    return result


@router.put("/users/{user_id}/role")
async def admin_update_role(
    user_id: int,
    body: UpdateRoleRequest,
    current_user: dict = Depends(require_admin),
):
    if body.role not in ("user", "org_admin", "super_admin"):
        raise HTTPException(400, "Rôle invalide")
    if current_user["role"] != "super_admin" and body.role == "super_admin":
        raise HTTPException(403, "Seul un super_admin peut promouvoir en super_admin")
    update_user(user_id, role=body.role)
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")
    return user


@router.put("/users/{user_id}/permissions/{agent_id}")
async def admin_update_permissions(
    user_id: int,
    agent_id: str,
    body: UpdatePermissionsRequest,
    _: dict = Depends(require_admin),
):
    upsert_agent_permissions(user_id, agent_id, body.can_access, body.tool_permissions)
    return {"ok": True, "user_id": user_id, "agent_id": agent_id}


@router.get("/users/{user_id}/permissions")
async def admin_get_permissions(user_id: int, _: dict = Depends(require_admin)):
    perms = get_all_agent_permissions(user_id)
    return perms
