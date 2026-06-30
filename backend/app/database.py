import json
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
            CREATE TABLE IF NOT EXISTS organisations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            INSERT INTO organisations (name, slug) VALUES ('Default', 'default')
            ON CONFLICT DO NOTHING
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(200) NOT NULL,
                organisation_id INT REFERENCES organisations(id) DEFAULT 1,
                role VARCHAR(50) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_config (
                user_id INT REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
                preferred_provider VARCHAR(50) DEFAULT 'mistral',
                features JSONB DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_permissions (
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                agent_id VARCHAR(100) NOT NULL,
                can_access BOOLEAN DEFAULT TRUE,
                tool_permissions JSONB DEFAULT '{}',
                PRIMARY KEY (user_id, agent_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS conversation_sessions (
                session_id VARCHAR(100) PRIMARY KEY,
                agent_id VARCHAR(100) NOT NULL,
                user_id INT REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(200),
                message_count INT DEFAULT 0,
                input_tokens INT DEFAULT 0,
                output_tokens INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        # Migration douce : ajouter user_id si la colonne n'existe pas encore
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='conversation_sessions' AND column_name='user_id'
                ) THEN
                    ALTER TABLE conversation_sessions
                    ADD COLUMN user_id INT REFERENCES users(id) ON DELETE SET NULL;
                END IF;
            END$$
        """))
        conn.commit()


def upsert_conversation_session(
    session_id: str,
    agent_id: str,
    title: str,
    input_tokens: int,
    output_tokens: int,
    user_id: int | None = None,
):
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO conversation_sessions
                    (session_id, agent_id, user_id, title, message_count, input_tokens, output_tokens)
                VALUES (:sid, :aid, :uid, :title, 1, :it, :ot)
                ON CONFLICT (session_id) DO UPDATE SET
                    message_count = conversation_sessions.message_count + 1,
                    input_tokens  = conversation_sessions.input_tokens + :it,
                    output_tokens = conversation_sessions.output_tokens + :ot,
                    updated_at    = NOW()
            """), {"sid": session_id, "aid": agent_id, "uid": user_id, "title": title, "it": input_tokens, "ot": output_tokens})
            conn.commit()
    except Exception:
        pass


def list_conversations(agent_id: str | None = None, user_id: int | None = None) -> list[dict]:
    try:
        with engine.connect() as conn:
            conditions = []
            params: dict = {}
            if agent_id:
                conditions.append("agent_id = :a")
                params["a"] = agent_id
            if user_id is not None:
                conditions.append("user_id = :uid")
                params["uid"] = user_id
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            rows = conn.execute(
                text(f"SELECT * FROM conversation_sessions {where} ORDER BY updated_at DESC"),
                params,
            ).mappings().all()
            return [dict(r) for r in rows]
    except Exception:
        return []


# ── User helpers ───────────────────────────────────────────────────────────────

def create_user(email: str, password_hash: str, name: str) -> dict | None:
    try:
        with engine.connect() as conn:
            row = conn.execute(text("""
                INSERT INTO users (email, password_hash, name)
                VALUES (:email, :ph, :name)
                RETURNING id, email, name, role, organisation_id, created_at
            """), {"email": email, "ph": password_hash, "name": name}).mappings().first()
            if row:
                user = dict(row)
                conn.execute(text("""
                    INSERT INTO user_config (user_id) VALUES (:uid)
                """), {"uid": user["id"]})
            conn.commit()
            return dict(row) if row else None
    except Exception:
        return None


def get_user_by_email(email: str) -> dict | None:
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": email},
            ).mappings().first()
            return dict(row) if row else None
    except Exception:
        return None


def get_user_by_id(user_id: int) -> dict | None:
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT id, email, name, role, organisation_id, created_at FROM users WHERE id = :uid"),
                {"uid": user_id},
            ).mappings().first()
            return dict(row) if row else None
    except Exception:
        return None


def get_user_config(user_id: int) -> dict:
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT preferred_provider, features FROM user_config WHERE user_id = :uid"),
                {"uid": user_id},
            ).mappings().first()
            return dict(row) if row else {"preferred_provider": "mistral", "features": {}}
    except Exception:
        return {"preferred_provider": "mistral", "features": {}}


def update_user_config(user_id: int, preferred_provider: str | None = None, features: dict | None = None):
    try:
        with engine.connect() as conn:
            if preferred_provider is not None:
                conn.execute(text("""
                    UPDATE user_config SET preferred_provider = :p, updated_at = NOW()
                    WHERE user_id = :uid
                """), {"p": preferred_provider, "uid": user_id})
            if features is not None:
                conn.execute(text("""
                    UPDATE user_config SET features = :f, updated_at = NOW()
                    WHERE user_id = :uid
                """), {"f": str(features), "uid": user_id})
            conn.commit()
    except Exception:
        pass


def update_user(user_id: int, name: str | None = None, role: str | None = None):
    try:
        with engine.connect() as conn:
            if name is not None:
                conn.execute(text("""
                    UPDATE users SET name = :n, updated_at = NOW() WHERE id = :uid
                """), {"n": name, "uid": user_id})
            if role is not None:
                conn.execute(text("""
                    UPDATE users SET role = :r, updated_at = NOW() WHERE id = :uid
                """), {"r": role, "uid": user_id})
            conn.commit()
    except Exception:
        pass


def list_users() -> list[dict]:
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT id, email, name, role, organisation_id, created_at FROM users ORDER BY created_at DESC")
            ).mappings().all()
            return [dict(r) for r in rows]
    except Exception:
        return []


# ── Agent permissions helpers ──────────────────────────────────────────────────

def get_agent_permissions(user_id: int, agent_id: str) -> dict:
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT can_access, tool_permissions FROM agent_permissions WHERE user_id = :uid AND agent_id = :aid"),
                {"uid": user_id, "aid": agent_id},
            ).mappings().first()
            return dict(row) if row else {"can_access": True, "tool_permissions": {}}
    except Exception:
        return {"can_access": True, "tool_permissions": {}}


def get_all_agent_permissions(user_id: int) -> dict[str, dict]:
    """Returns {agent_id: {can_access, tool_permissions}} for a user."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT agent_id, can_access, tool_permissions FROM agent_permissions WHERE user_id = :uid"),
                {"uid": user_id},
            ).mappings().all()
            return {r["agent_id"]: {"can_access": r["can_access"], "tool_permissions": r["tool_permissions"]} for r in rows}
    except Exception:
        return {}


def upsert_agent_permissions(user_id: int, agent_id: str, can_access: bool, tool_permissions: dict):
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO agent_permissions (user_id, agent_id, can_access, tool_permissions)
                VALUES (:uid, :aid, :ca, :tp::jsonb)
                ON CONFLICT (user_id, agent_id) DO UPDATE SET
                    can_access = EXCLUDED.can_access,
                    tool_permissions = EXCLUDED.tool_permissions
            """), {"uid": user_id, "aid": agent_id, "ca": can_access, "tp": json.dumps(tool_permissions)})
            conn.commit()
    except Exception:
        pass
