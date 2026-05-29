package db

import (
	"database/sql"
	"os"

	_ "github.com/lib/pq"
)

var conn *sql.DB

func Connect() error {
	dsn := os.Getenv("DATABASE_URL")
	var err error
	conn, err = sql.Open("postgres", dsn)
	if err != nil {
		return err
	}
	return conn.Ping()
}

func SaveExecution(agentID string, inputTokens, outputTokens int) error {
	if conn == nil {
		return nil
	}
	_, err := conn.Exec(
		"INSERT INTO executions (agent_id, input_tokens, output_tokens) VALUES ($1, $2, $3)",
		agentID, inputTokens, outputTokens,
	)
	return err
}
