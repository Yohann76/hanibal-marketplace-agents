-- Base de données séparée pour LangFuse (observabilité)
CREATE DATABASE langfuse;

CREATE TABLE IF NOT EXISTS executions (
    id          SERIAL PRIMARY KEY,
    agent_id    VARCHAR(100) NOT NULL,
    input_tokens  INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Organisations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    slug       VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO organisations (name, slug) VALUES ('Default', 'default') ON CONFLICT DO NOTHING;

-- ── Utilisateurs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    organisation_id INT REFERENCES organisations(id) DEFAULT 1,
    role            VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ── Configuration par utilisateur ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_config (
    user_id            INT REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    preferred_provider VARCHAR(50) DEFAULT 'mistral',
    features           JSONB DEFAULT '{}',
    updated_at         TIMESTAMP DEFAULT NOW()
);

-- ── Droits par utilisateur par agent ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_permissions (
    user_id          INT REFERENCES users(id) ON DELETE CASCADE,
    agent_id         VARCHAR(100) NOT NULL,
    can_access       BOOLEAN DEFAULT TRUE,
    tool_permissions JSONB DEFAULT '{}',
    PRIMARY KEY (user_id, agent_id)
);

-- ── Conversations liées aux utilisateurs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_sessions (
    session_id    VARCHAR(100) PRIMARY KEY,
    agent_id      VARCHAR(100) NOT NULL,
    user_id       INT REFERENCES users(id) ON DELETE SET NULL,
    title         VARCHAR(200),
    message_count INT DEFAULT 0,
    input_tokens  INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);
