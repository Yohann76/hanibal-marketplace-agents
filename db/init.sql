-- Base de données séparée pour LangFuse (observabilité)
CREATE DATABASE langfuse;

CREATE TABLE IF NOT EXISTS executions (
    id          SERIAL PRIMARY KEY,
    agent_id    VARCHAR(100) NOT NULL,
    input_tokens  INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
);
