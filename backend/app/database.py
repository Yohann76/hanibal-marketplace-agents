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
                role VARCHAR(50) NOT NULL DEFAULT 'member',
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
        # Migration douce : colonne user_id sur conversations existantes
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
        # Migration douce : renommage des anciens rôles
        conn.execute(text("""
            UPDATE users SET role = 'member'      WHERE role = 'user';
            UPDATE users SET role = 'owner'       WHERE role = 'org_admin';
            UPDATE users SET role = 'admin'       WHERE role = 'super_admin';
        """))
        conn.commit()


# ── Conversations ──────────────────────────────────────────────────────────────

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
            """), {"sid": session_id, "aid": agent_id, "uid": user_id,
                   "title": title, "it": input_tokens, "ot": output_tokens})
            conn.commit()
    except Exception:
        pass


def list_conversations(agent_id: str | None = None, user_id: int | None = None) -> list[dict]:
    try:
        with engine.connect() as conn:
            conditions, params = [], {}
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


# ── Organisations ──────────────────────────────────────────────────────────────

def list_orgs() -> list[dict]:
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT id, name, slug, created_at FROM organisations ORDER BY created_at")
            ).mappings().all()
            return [dict(r) for r in rows]
    except Exception:
        return []


def get_org_by_id(org_id: int) -> dict | None:
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT id, name, slug, created_at FROM organisations WHERE id = :id"),
                {"id": org_id},
            ).mappings().first()
            return dict(row) if row else None
    except Exception:
        return None


def create_org(name: str, slug: str) -> dict | None:
    try:
        with engine.connect() as conn:
            row = conn.execute(text("""
                INSERT INTO organisations (name, slug) VALUES (:name, :slug)
                RETURNING id, name, slug, created_at
            """), {"name": name, "slug": slug}).mappings().first()
            conn.commit()
            return dict(row) if row else None
    except Exception:
        return None


# ── Users ──────────────────────────────────────────────────────────────────────

def create_user(
    email: str,
    password_hash: str,
    name: str,
    organisation_id: int = 1,
    role: str = "member",
) -> dict | None:
    try:
        with engine.connect() as conn:
            row = conn.execute(text("""
                INSERT INTO users (email, password_hash, name, organisation_id, role)
                VALUES (:email, :ph, :name, :org_id, :role)
                RETURNING id, email, name, role, organisation_id, created_at
            """), {"email": email, "ph": password_hash, "name": name,
                   "org_id": organisation_id, "role": role}).mappings().first()
            if row:
                conn.execute(text("INSERT INTO user_config (user_id) VALUES (:uid)"),
                             {"uid": row["id"]})
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


def update_user_config(user_id: int, preferred_provider: str | None = None,
                       features: dict | None = None):
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


def update_user(user_id: int, name: str | None = None, role: str | None = None,
                organisation_id: int | None = None):
    try:
        with engine.connect() as conn:
            if name is not None:
                conn.execute(text("UPDATE users SET name = :n, updated_at = NOW() WHERE id = :uid"),
                             {"n": name, "uid": user_id})
            if role is not None:
                conn.execute(text("UPDATE users SET role = :r, updated_at = NOW() WHERE id = :uid"),
                             {"r": role, "uid": user_id})
            if organisation_id is not None:
                conn.execute(text("UPDATE users SET organisation_id = :o, updated_at = NOW() WHERE id = :uid"),
                             {"o": organisation_id, "uid": user_id})
            conn.commit()
    except Exception:
        pass


def list_users(org_id: int | None = None) -> list[dict]:
    """Returns all users joined with their organisation name."""
    try:
        with engine.connect() as conn:
            where = "WHERE u.organisation_id = :org_id" if org_id is not None else ""
            params = {"org_id": org_id} if org_id is not None else {}
            rows = conn.execute(text(f"""
                SELECT u.id, u.email, u.name, u.role, u.organisation_id,
                       u.created_at, o.name AS organisation_name
                FROM users u
                LEFT JOIN organisations o ON o.id = u.organisation_id
                {where}
                ORDER BY
                    CASE u.role WHEN 'admin' THEN 0 WHEN 'owner' THEN 1 ELSE 2 END,
                    u.created_at
            """), params).mappings().all()
            return [dict(r) for r in rows]
    except Exception:
        return []


# ── Agent permissions ──────────────────────────────────────────────────────────

def get_agent_permissions(user_id: int, agent_id: str) -> dict:
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT can_access, tool_permissions FROM agent_permissions "
                     "WHERE user_id = :uid AND agent_id = :aid"),
                {"uid": user_id, "aid": agent_id},
            ).mappings().first()
            return dict(row) if row else {"can_access": True, "tool_permissions": {}}
    except Exception:
        return {"can_access": True, "tool_permissions": {}}


def get_all_agent_permissions(user_id: int) -> dict[str, dict]:
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT agent_id, can_access, tool_permissions "
                     "FROM agent_permissions WHERE user_id = :uid"),
                {"uid": user_id},
            ).mappings().all()
            return {r["agent_id"]: {"can_access": r["can_access"],
                                    "tool_permissions": r["tool_permissions"]} for r in rows}
    except Exception:
        return {}


def upsert_agent_permissions(user_id: int, agent_id: str, can_access: bool,
                             tool_permissions: dict):
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO agent_permissions (user_id, agent_id, can_access, tool_permissions)
                VALUES (:uid, :aid, :ca, :tp::jsonb)
                ON CONFLICT (user_id, agent_id) DO UPDATE SET
                    can_access = EXCLUDED.can_access,
                    tool_permissions = EXCLUDED.tool_permissions
            """), {"uid": user_id, "aid": agent_id, "ca": can_access,
                   "tp": json.dumps(tool_permissions)})
            conn.commit()
    except Exception:
        pass
