package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"sync"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var (
	tokenStore   = map[string]*oauth2.Token{}
	tokenStoreMu sync.Mutex
)

func oauthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"),
		Scopes:       []string{"https://www.googleapis.com/auth/gmail.readonly"},
		Endpoint:     google.Endpoint,
	}
}

func GetConfig(c *fiber.Ctx) error {
	publicURL := os.Getenv("BACKEND_PUBLIC_URL")
	return c.JSON(fiber.Map{
		"gmail_auth_url": publicURL + "/api/gmail/auth",
	})
}

func GmailAuthStart(c *fiber.Ctx) error {
	config := oauthConfig()
	if config.ClientID == "" {
		return c.Status(500).SendString("GOOGLE_CLIENT_ID non configuré")
	}
	state := randomHex(16)
	authURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
	return c.Redirect(authURL)
}

func GmailAuthCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return c.Status(400).SendString("Code d'autorisation manquant")
	}

	config := oauthConfig()
	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		return c.Status(500).SendString("Échange du token échoué: " + err.Error())
	}

	sessionKey := randomHex(20)
	tokenStoreMu.Lock()
	tokenStore[sessionKey] = token
	tokenStoreMu.Unlock()

	html := fmt.Sprintf(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
<h2>✅ Connexion Gmail réussie</h2>
<p>Vous pouvez fermer cette fenêtre.</p>
<script>
  if (window.opener) {
    window.opener.postMessage({ gmailSession: '%s' }, '*');
    setTimeout(() => window.close(), 800);
  }
</script>
</body></html>`, sessionKey)

	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}

func getTokenBySession(sessionKey string) (*oauth2.Token, bool) {
	tokenStoreMu.Lock()
	defer tokenStoreMu.Unlock()
	t, ok := tokenStore[sessionKey]
	return t, ok
}

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
