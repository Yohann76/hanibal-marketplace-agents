from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.auth import require_admin, require_owner_or_admin, get_current_user, hash_password
from app.database import (
    list_users,
    list_orgs,
    create_org,
    get_org_by_id,
    update_user,
    get_user_by_id,
    create_user,
    get_user_by_email,
    get_all_agent_permissions,
    upsert_agent_permissions,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Models ─────────────────────────────────────────────────────────────────────

class UpdateRoleRequest(BaseModel):
    role: str


class UpdateOrgRequest(BaseModel):
    organisation_id: int


class UpdatePermissionsRequest(BaseModel):
    can_access: bool
    tool_permissions: dict


class CreateOrgRequest(BaseModel):
    name: str
    slug: str


class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "member"
    organisation_id: int | None = None


# ── Organisations (admin uniquement) ──────────────────────────────────────────

@router.get("/organisations")
async def admin_list_orgs(_: dict = Depends(require_admin)):
    return list_orgs()


@router.post("/organisations")
async def admin_create_org(body: CreateOrgRequest, _: dict = Depends(require_admin)):
    org = create_org(body.name, body.slug)
    if not org:
        raise HTTPException(400, "Impossible de créer l'organisation (slug déjà pris ?)")
    return org


# ── Utilisateurs ───────────────────────────────────────────────────────────────

@router.get("/users")
async def admin_list_users(current_user: dict = Depends(require_owner_or_admin)):
    if current_user["role"] == "admin":
        users = list_users()
    else:
        # owner : uniquement son organisation
        users = list_users(org_id=current_user["organisation_id"])
    result = []
    for u in users:
        perms = get_all_agent_permissions(u["id"])
        result.append({**u, "agent_permissions": perms})
    return result


@router.post("/users")
async def admin_create_user(body: CreateUserRequest, current_user: dict = Depends(require_owner_or_admin)):
    if len(body.password) < 8:
        raise HTTPException(400, "Le mot de passe doit contenir au moins 8 caractères")

    # owner ne peut créer que des membres dans sa propre organisation
    if current_user["role"] == "owner":
        if body.role != "member":
            raise HTTPException(403, "Un owner ne peut créer que des membres")
        org_id = current_user["organisation_id"]
    else:
        # admin peut choisir le rôle et l'organisation
        if body.role not in ("member", "owner", "admin"):
            raise HTTPException(400, "Rôle invalide")
        if body.role == "admin" and current_user["role"] != "admin":
            raise HTTPException(403, "Seul un admin peut créer un autre admin")
        org_id = body.organisation_id or 1

    existing = get_user_by_email(body.email.lower())
    if existing:
        raise HTTPException(409, "Un compte existe déjà avec cet email")

    ph = hash_password(body.password)
    user = create_user(body.email.lower(), ph, body.name, organisation_id=org_id, role=body.role)
    if not user:
        raise HTTPException(500, "Erreur lors de la création du compte")
    return user


@router.put("/users/{user_id}/role")
async def admin_update_role(
    user_id: int,
    body: UpdateRoleRequest,
    current_user: dict = Depends(require_admin),
):
    if body.role not in ("member", "owner", "admin"):
        raise HTTPException(400, "Rôle invalide (member | owner | admin)")
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(404, "Utilisateur introuvable")
    if target["role"] == "admin" and body.role != "admin":
        # Ne pas se rétrograder soi-même si on est le seul admin
        admins = [u for u in list_users() if u["role"] == "admin"]
        if len(admins) <= 1:
            raise HTTPException(400, "Impossible : vous êtes le seul administrateur")
    update_user(user_id, role=body.role)
    return get_user_by_id(user_id)


@router.put("/users/{user_id}/org")
async def admin_update_org(
    user_id: int,
    body: UpdateOrgRequest,
    _: dict = Depends(require_admin),
):
    org = get_org_by_id(body.organisation_id)
    if not org:
        raise HTTPException(404, "Organisation introuvable")
    update_user(user_id, organisation_id=body.organisation_id)
    return get_user_by_id(user_id)


@router.put("/users/{user_id}/permissions/{agent_id}")
async def admin_update_permissions(
    user_id: int,
    agent_id: str,
    body: UpdatePermissionsRequest,
    current_user: dict = Depends(require_owner_or_admin),
):
    # owner ne peut gérer que les membres de son org
    if current_user["role"] == "owner":
        target = get_user_by_id(user_id)
        if not target or target["organisation_id"] != current_user["organisation_id"]:
            raise HTTPException(403, "Accès refusé : cet utilisateur n'est pas dans votre organisation")
    upsert_agent_permissions(user_id, agent_id, body.can_access, body.tool_permissions)
    return {"ok": True, "user_id": user_id, "agent_id": agent_id}


@router.get("/users/{user_id}/permissions")
async def admin_get_permissions(user_id: int, current_user: dict = Depends(require_owner_or_admin)):
    if current_user["role"] == "owner":
        target = get_user_by_id(user_id)
        if not target or target["organisation_id"] != current_user["organisation_id"]:
            raise HTTPException(403, "Accès refusé")
    return get_all_agent_permissions(user_id)
