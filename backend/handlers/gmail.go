package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type gmailMessageList struct {
	Messages []struct {
		ID string `json:"id"`
	} `json:"messages"`
}

type gmailMessageDetail struct {
	Payload struct {
		Headers []struct {
			Name  string `json:"name"`
			Value string `json:"value"`
		} `json:"headers"`
	} `json:"payload"`
}

func fetchGmailEmails(sessionKey string) (string, error) {
	token, ok := getTokenBySession(sessionKey)
	if !ok {
		return "", fmt.Errorf("session Gmail expirée, veuillez vous reconnecter")
	}

	httpClient := oauthConfig().Client(context.Background(), token)

	today := time.Now().Format("2006/01/02")
	listURL := "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" +
		url.QueryEscape("after:"+today) + "&maxResults=30"

	resp, err := httpClient.Get(listURL)
	if err != nil {
		return "", fmt.Errorf("impossible de récupérer les emails: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("erreur Gmail API (%d): %s", resp.StatusCode, string(body))
	}

	var list gmailMessageList
	if err := json.Unmarshal(body, &list); err != nil {
		return "", fmt.Errorf("impossible de parser la réponse Gmail: %v", err)
	}

	if len(list.Messages) == 0 {
		return fmt.Sprintf("Aucun email reçu aujourd'hui (%s).", time.Now().Format("02/01/2006")), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Emails reçus le %s — %d email(s) :\n\n", time.Now().Format("02/01/2006"), len(list.Messages)))

	for i, msg := range list.Messages {
		detail, err := fetchMessageDetail(httpClient, msg.ID)
		if err != nil {
			continue
		}
		subject := gmailHeader(detail, "Subject")
		from := gmailHeader(detail, "From")
		date := gmailHeader(detail, "Date")
		sb.WriteString(fmt.Sprintf("[%d] %s\n    De : %s\n    Date : %s\n\n", i+1, subject, from, date))
	}

	return sb.String(), nil
}

func fetchMessageDetail(client *http.Client, id string) (*gmailMessageDetail, error) {
	u := fmt.Sprintf(
		"https://gmail.googleapis.com/gmail/v1/users/me/messages/%s?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date",
		id,
	)
	resp, err := client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var detail gmailMessageDetail
	if err := json.NewDecoder(resp.Body).Decode(&detail); err != nil {
		return nil, err
	}
	return &detail, nil
}

func gmailHeader(detail *gmailMessageDetail, name string) string {
	for _, h := range detail.Payload.Headers {
		if strings.EqualFold(h.Name, name) {
			return h.Value
		}
	}
	return ""
}
