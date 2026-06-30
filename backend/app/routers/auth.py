from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.database import (
    create_user,
    get_user_by_email,
    get_user_config,
    update_user,
    update_user_config,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateMeRequest(BaseModel):
    name: str | None = None
    preferred_provider: str | None = None


def _user_response(user: dict, token: str | None = None) -> dict:
    cfg = get_user_config(user["id"])
    data: dict = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "organisation_id": user["organisation_id"],
        "preferred_provider": cfg.get("preferred_provider", "mistral"),
        "features": cfg.get("features", {}),
    }
    if token:
        data["token"] = token
    return data


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    if len(body.password) < 8:
        raise HTTPException(400, "Le mot de passe doit contenir au moins 8 caractères")
    existing = get_user_by_email(body.email.lower())
    if existing:
        raise HTTPException(409, "Un compte existe déjà avec cet email")
    ph = hash_password(body.password)
    user = create_user(body.email.lower(), ph, body.name)
    if not user:
        raise HTTPException(500, "Erreur lors de la création du compte")
    token = create_access_token(user["id"], user["role"])
    return _user_response(user, token)


@router.post("/login")
async def login(body: LoginRequest):
    user = get_user_by_email(body.email.lower())
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    token = create_access_token(user["id"], user["role"])
    return _user_response(user, token)


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return _user_response(current_user)


@router.put("/me")
async def update_me(body: UpdateMeRequest, current_user: dict = Depends(get_current_user)):
    if body.name:
        update_user(current_user["id"], name=body.name)
    if body.preferred_provider:
        if body.preferred_provider not in ("mistral", "claude"):
            raise HTTPException(400, "Provider invalide")
        update_user_config(current_user["id"], preferred_provider=body.preferred_provider)
    user = get_user_by_email(current_user["email"])
    return _user_response(user)
