package handlers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type KnowledgeFile struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type AgentDetail struct {
	Config       AgentConfig     `json:"config"`
	SystemPrompt string          `json:"system_prompt"`
	Docs         string          `json:"docs"`
	Knowledge    []KnowledgeFile `json:"knowledge"`
}

func GetAgent(c *fiber.Ctx) error {
	agentID := c.Params("id")

	configPath := filepath.Join("agents", agentID, "config.json")
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "agent introuvable"})
	}

	var config AgentConfig
	if err := json.Unmarshal(configData, &config); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "configuration invalide"})
	}
	if config.Provider == "" {
		config.Provider = "mistral"
	}

	promptData, _ := os.ReadFile(filepath.Join("agents", agentID, "system_prompt.txt"))
	docsData, _ := os.ReadFile(filepath.Join("agents", agentID, "docs.md"))
	knowledge := LoadKnowledge(agentID)

	return c.JSON(AgentDetail{
		Config:       config,
		SystemPrompt: string(promptData),
		Docs:         string(docsData),
		Knowledge:    knowledge,
	})
}

func LoadKnowledge(agentID string) []KnowledgeFile {
	dir := filepath.Join("agents", agentID, "connaissance")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var files []KnowledgeFile
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		content, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}
		files = append(files, KnowledgeFile{
			Name:    entry.Name(),
			Content: string(content),
		})
	}
	return files
}

func BuildSystemPromptWithKnowledge(systemPrompt string, knowledge []KnowledgeFile) string {
	if len(knowledge) == 0 {
		return systemPrompt
	}
	var sb strings.Builder
	sb.WriteString(systemPrompt)
	sb.WriteString("\n\n---\n\n## Base de connaissances\n\n")
	sb.WriteString("Les documents suivants sont ta base de référence. Utilise-les pour répondre avec précision.\n\n")
	for _, k := range knowledge {
		sb.WriteString(fmt.Sprintf("### %s\n\n%s\n\n", k.Name, k.Content))
	}
	return sb.String()
}
