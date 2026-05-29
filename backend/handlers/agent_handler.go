package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"marketplace-oc-agents/db"
)

type AgentConfig struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Type        string      `json:"type"`
	Provider    string      `json:"provider"` // "mistral" | "claude" — défaut : mistral
	Input       AgentInput  `json:"input"`
	Output      AgentOutput `json:"output"`
}

type AgentInput struct {
	Type        string `json:"type"`
	Label       string `json:"label"`
	Placeholder string `json:"placeholder"`
}

type AgentOutput struct {
	Type string `json:"type"`
}

func ListAgents(c *fiber.Ctx) error {
	agents, err := loadAgents()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(agents)
}

func RunAgent(c *fiber.Ctx) error {
	agentID := c.Params("id")

	var body struct {
		Input   string `json:"input"`
		Session string `json:"session"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corps de requête invalide"})
	}

	configPath := filepath.Join("agents", agentID, "config.json")
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "agent introuvable"})
	}

	var config AgentConfig
	if err := json.Unmarshal(configData, &config); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "configuration invalide"})
	}

	promptPath := filepath.Join("agents", agentID, "system_prompt.txt")
	systemPrompt, err := os.ReadFile(promptPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "prompt système introuvable"})
	}

	userContent, err := resolveInput(config.Input.Type, body.Input, body.Session)
	if err != nil {
		return c.Status(422).JSON(fiber.Map{"error": err.Error()})
	}

	knowledge := LoadKnowledge(agentID)
	fullPrompt := BuildSystemPromptWithKnowledge(string(systemPrompt), knowledge)

	result, inputTokens, outputTokens, err := callAI(config.Provider, fullPrompt, userContent)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	if err := db.SaveExecution(agentID, inputTokens, outputTokens); err != nil {
		log.Printf("failed to save execution: %v", err)
	}

	return c.JSON(fiber.Map{
		"result":        result,
		"input_tokens":  inputTokens,
		"output_tokens": outputTokens,
		"provider":      config.Provider,
	})
}

func loadAgents() ([]AgentConfig, error) {
	entries, err := os.ReadDir("agents")
	if err != nil {
		return nil, err
	}

	var agents []AgentConfig
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		configPath := filepath.Join("agents", entry.Name(), "config.json")
		data, err := os.ReadFile(configPath)
		if err != nil {
			continue
		}
		var config AgentConfig
		if err := json.Unmarshal(data, &config); err != nil {
			continue
		}
		if config.Provider == "" {
			config.Provider = "mistral"
		}
		agents = append(agents, config)
	}
	return agents, nil
}

func resolveInput(inputType, input, session string) (string, error) {
	switch inputType {
	case "gmail":
		if session == "" {
			return "", fmt.Errorf("veuillez vous connecter à Gmail")
		}
		return fetchGmailEmails(session)
	case "url":
		if input == "" {
			return "", fmt.Errorf("l'URL est requise")
		}
		return fetchURLContent(input)
	default:
		if input == "" {
			return "", fmt.Errorf("le champ input est requis")
		}
		return input, nil
	}
}

func callAI(provider, systemPrompt, userInput string) (string, int, int, error) {
	switch provider {
	case "claude":
		return callClaude(systemPrompt, userInput)
	default:
		return callMistral(systemPrompt, userInput)
	}
}

// --- Mistral ---

type mistralRequest struct {
	Model     string           `json:"model"`
	MaxTokens int              `json:"max_tokens"`
	Messages  []mistralMessage `json:"messages"`
}

type mistralMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type mistralResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

func callMistral(systemPrompt, userInput string) (string, int, int, error) {
	apiKey := os.Getenv("MISTRAL_API_KEY")
	if apiKey == "" {
		return "", 0, 0, fmt.Errorf("MISTRAL_API_KEY non configuré")
	}

	reqBody := mistralRequest{
		Model:     "mistral-small-latest",
		MaxTokens: 4096,
		Messages: []mistralMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userInput},
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", 0, 0, err
	}

	req, err := http.NewRequest("POST", "https://api.mistral.ai/v1/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		return "", 0, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", 0, 0, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, 0, err
	}
	if resp.StatusCode != 200 {
		return "", 0, 0, fmt.Errorf("erreur API Mistral (%d): %s", resp.StatusCode, string(respBody))
	}

	var mistralResp mistralResponse
	if err := json.Unmarshal(respBody, &mistralResp); err != nil {
		return "", 0, 0, err
	}
	if len(mistralResp.Choices) == 0 {
		return "", 0, 0, fmt.Errorf("réponse vide de Mistral")
	}

	return mistralResp.Choices[0].Message.Content,
		mistralResp.Usage.PromptTokens,
		mistralResp.Usage.CompletionTokens,
		nil
}

// --- Claude ---

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Usage struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

func callClaude(systemPrompt, userInput string) (string, int, int, error) {
	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return "", 0, 0, fmt.Errorf("ANTHROPIC_API_KEY non configuré")
	}

	reqBody := claudeRequest{
		Model:     "claude-sonnet-4-6",
		MaxTokens: 4096,
		System:    systemPrompt,
		Messages:  []claudeMessage{{Role: "user", Content: userInput}},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", 0, 0, err
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(body))
	if err != nil {
		return "", 0, 0, err
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("content-type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", 0, 0, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, 0, err
	}
	if resp.StatusCode != 200 {
		return "", 0, 0, fmt.Errorf("erreur API Claude (%d): %s", resp.StatusCode, string(respBody))
	}

	var claudeResp claudeResponse
	if err := json.Unmarshal(respBody, &claudeResp); err != nil {
		return "", 0, 0, err
	}
	if len(claudeResp.Content) == 0 {
		return "", 0, 0, fmt.Errorf("réponse vide de Claude")
	}

	return claudeResp.Content[0].Text, claudeResp.Usage.InputTokens, claudeResp.Usage.OutputTokens, nil
}
