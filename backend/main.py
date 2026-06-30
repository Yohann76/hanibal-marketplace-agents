from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import agents, gmail, conversations
from app.routers import auth, admin
from app.database import init_db

app = FastAPI(title="OC Agents API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ensure_initial_admin():
    """Crée le compte admin initial si nécessaire."""
    from app.auth import hash_password
    from app.database import get_user_by_email, create_user, update_user
    email = "yohanndurand76@gmail.com"
    existing = get_user_by_email(email)
    if existing:
        if existing["role"] != "admin":
            update_user(existing["id"], role="admin")
    else:
        ph = hash_password("adminadmin")
        user = create_user(email, ph, "Yohann", role="admin")
        if not user:
            import logging
            logging.getLogger(__name__).warning("Impossible de créer le compte admin initial")


@app.on_event("startup")
async def startup():
    init_db()
    _ensure_initial_admin()


app.include_router(agents.router, prefix="/api")
app.include_router(gmail.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
