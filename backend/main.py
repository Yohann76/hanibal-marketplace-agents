from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import agents, gmail, conversations
from app.database import init_db
from app.services.agent_runner import register_models_in_langfuse

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
    await register_models_in_langfuse()

app.include_router(agents.router, prefix="/api")
app.include_router(gmail.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
