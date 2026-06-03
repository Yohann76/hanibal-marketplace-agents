from sqlalchemy import create_engine, text
from app.config import DATABASE_URL

_db_url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
engine = create_engine(_db_url)

def init_db():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS executions (
                id SERIAL PRIMARY KEY,
                agent_id VARCHAR(100) NOT NULL,
                session_id VARCHAR(100),
                input_tokens INT NOT NULL DEFAULT 0,
                output_tokens INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS message_store (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(100) NOT NULL,
                message JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS conversation_sessions (
                session_id VARCHAR(100) PRIMARY KEY,
                agent_id VARCHAR(100) NOT NULL,
                title VARCHAR(200),
                message_count INT DEFAULT 0,
                input_tokens INT DEFAULT 0,
                output_tokens INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS gmail_tokens (
                user_key VARCHAR(100) PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.commit()

def save_execution(agent_id: str, session_id: str | None, input_tokens: int, output_tokens: int):
    try:
        with engine.connect() as conn:
            conn.execute(
                text("INSERT INTO executions (agent_id, session_id, input_tokens, output_tokens) VALUES (:a, :s, :i, :o)"),
                {"a": agent_id, "s": session_id, "i": input_tokens, "o": output_tokens}
            )
            conn.commit()
    except Exception:
        pass


def upsert_conversation_session(session_id: str, agent_id: str, title: str, input_tokens: int, output_tokens: int):
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO conversation_sessions (session_id, agent_id, title, message_count, input_tokens, output_tokens)
                VALUES (:sid, :aid, :title, 1, :it, :ot)
                ON CONFLICT (session_id) DO UPDATE SET
                    message_count = conversation_sessions.message_count + 1,
                    input_tokens  = conversation_sessions.input_tokens + :it,
                    output_tokens = conversation_sessions.output_tokens + :ot,
                    updated_at    = NOW()
            """), {"sid": session_id, "aid": agent_id, "title": title, "it": input_tokens, "ot": output_tokens})
            conn.commit()
    except Exception:
        pass


def list_conversations(agent_id: str | None = None) -> list[dict]:
    try:
        with engine.connect() as conn:
            if agent_id:
                rows = conn.execute(
                    text("SELECT * FROM conversation_sessions WHERE agent_id = :a ORDER BY updated_at DESC"),
                    {"a": agent_id}
                ).mappings().all()
            else:
                rows = conn.execute(
                    text("SELECT * FROM conversation_sessions ORDER BY updated_at DESC")
                ).mappings().all()
            return [dict(r) for r in rows]
    except Exception:
        return []
