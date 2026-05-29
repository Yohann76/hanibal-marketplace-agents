package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const mcpURL = "https://mcp.data.gouv.fr/mcp"

type mcpRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"`
	ID      int         `json:"id"`
}

type mcpResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
	ID int `json:"id"`
}

var mcpHTTPClient = &http.Client{Timeout: 20 * time.Second}

func mcpCall(sessionID, toolName string, arguments map[string]interface{}) (json.RawMessage, error) {
	payload := mcpRequest{
		JSONRPC: "2.0",
		Method:  "tools/call",
		Params: map[string]interface{}{
			"name":      toolName,
			"arguments": arguments,
		},
		ID: 1,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", mcpURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if sessionID != "" {
		req.Header.Set("Mcp-Session-Id", sessionID)
	}

	resp, err := mcpHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("MCP data.gouv.fr inaccessible: %v", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Streamable HTTP peut répondre en SSE — on extrait le JSON de la ligne "data:"
	raw := string(respBody)
	if strings.HasPrefix(strings.TrimSpace(raw), "data:") {
		for _, line := range strings.Split(raw, "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "data:") {
				raw = strings.TrimPrefix(line, "data:")
				raw = strings.TrimSpace(raw)
				break
			}
		}
		respBody = []byte(raw)
	}

	var mcpResp mcpResponse
	if err := json.Unmarshal(respBody, &mcpResp); err != nil {
		return nil, fmt.Errorf("réponse MCP invalide: %v", err)
	}
	if mcpResp.Error != nil {
		return nil, fmt.Errorf("erreur MCP (%d): %s", mcpResp.Error.Code, mcpResp.Error.Message)
	}

	return mcpResp.Result, nil
}

func mcpInitSession() (string, error) {
	payload := mcpRequest{
		JSONRPC: "2.0",
		Method:  "initialize",
		Params: map[string]interface{}{
			"protocolVersion": "2024-11-05",
			"capabilities":    map[string]interface{}{},
			"clientInfo": map[string]string{
				"name":    "oc-agents",
				"version": "1.0",
			},
		},
		ID: 0,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", mcpURL, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")

	resp, err := mcpHTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("impossible d'initialiser la session MCP: %v", err)
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)

	return resp.Header.Get("Mcp-Session-Id"), nil
}

// MCPSearchDatasets recherche des datasets sur data.gouv.fr via MCP
func MCPSearchDatasets(query string) (string, error) {
	sessionID, err := mcpInitSession()
	if err != nil {
		return "", err
	}

	result, err := mcpCall(sessionID, "search_datasets", map[string]interface{}{
		"q": query,
	})
	if err != nil {
		return "", err
	}

	// Extraire le texte du résultat MCP (format content[].text)
	var parsed struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(result, &parsed); err != nil {
		return string(result), nil
	}

	var sb strings.Builder
	for _, c := range parsed.Content {
		if c.Type == "text" {
			sb.WriteString(c.Text)
		}
	}
	return sb.String(), nil
}

// MCPQueryResource interroge directement un dataset data.gouv.fr via MCP
func MCPQueryResource(resourceID, query string) (string, error) {
	sessionID, err := mcpInitSession()
	if err != nil {
		return "", err
	}

	args := map[string]interface{}{
		"resource_id": resourceID,
	}
	if query != "" {
		args["query"] = query
	}

	result, err := mcpCall(sessionID, "query_resource_data", args)
	if err != nil {
		return "", err
	}

	var parsed struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(result, &parsed); err != nil {
		return string(result), nil
	}

	var sb strings.Builder
	for _, c := range parsed.Content {
		if c.Type == "text" {
			sb.WriteString(c.Text)
		}
	}
	return sb.String(), nil
}
