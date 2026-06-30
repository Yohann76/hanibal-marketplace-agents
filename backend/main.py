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

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(agents.router, prefix="/api")
app.include_router(gmail.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
