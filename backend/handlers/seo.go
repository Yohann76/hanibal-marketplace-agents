package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/net/html"
)

type seoData struct {
	Title           string
	MetaDescription string
	MetaRobots      string
	Canonical       string
	OGTitle         string
	OGDescription   string
	H1s             []string
	H2s             []string
	H3s             []string
	ImagesTotal     int
	ImagesMissingAlt int
	LinksInternal   int
	LinksExternal   int
	StatusCode      int
}

func fetchURLContent(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("URL invalide: %v", err)
	}

	httpClient := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return "", fmt.Errorf("requête invalide: %v", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; SEO-Analyzer/1.0)")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("impossible d'accéder à l'URL: %v", err)
	}
	defer resp.Body.Close()

	doc, err := html.Parse(resp.Body)
	if err != nil {
		return "", fmt.Errorf("impossible de parser la page HTML: %v", err)
	}

	data := &seoData{StatusCode: resp.StatusCode}
	extractSEO(doc, parsed, data)

	return formatSEOReport(rawURL, data), nil
}

func extractSEO(n *html.Node, base *url.URL, data *seoData) {
	if n.Type == html.ElementNode {
		switch strings.ToLower(n.Data) {
		case "title":
			if n.FirstChild != nil {
				data.Title = strings.TrimSpace(n.FirstChild.Data)
			}

		case "meta":
			name := attrVal(n, "name")
			prop := attrVal(n, "property")
			content := attrVal(n, "content")
			switch strings.ToLower(name) {
			case "description":
				data.MetaDescription = content
			case "robots":
				data.MetaRobots = content
			}
			switch strings.ToLower(prop) {
			case "og:title":
				data.OGTitle = content
			case "og:description":
				data.OGDescription = content
			}

		case "link":
			if attrVal(n, "rel") == "canonical" {
				data.Canonical = attrVal(n, "href")
			}

		case "h1":
			data.H1s = append(data.H1s, textContent(n))
		case "h2":
			data.H2s = append(data.H2s, textContent(n))
		case "h3":
			data.H3s = append(data.H3s, textContent(n))

		case "img":
			data.ImagesTotal++
			if attrVal(n, "alt") == "" {
				data.ImagesMissingAlt++
			}

		case "a":
			href := attrVal(n, "href")
			if href == "" || strings.HasPrefix(href, "#") || strings.HasPrefix(href, "javascript:") {
				break
			}
			parsed, err := url.Parse(href)
			if err != nil {
				break
			}
			if parsed.Host == "" || parsed.Host == base.Host {
				data.LinksInternal++
			} else {
				data.LinksExternal++
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractSEO(c, base, data)
	}
}

func formatSEOReport(rawURL string, d *seoData) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("URL analysée : %s\n", rawURL))
	sb.WriteString(fmt.Sprintf("Code HTTP : %d\n\n", d.StatusCode))

	sb.WriteString("=== BALISES ===\n")
	sb.WriteString(fmt.Sprintf("Title : %q (%d caractères)\n", d.Title, len(d.Title)))
	sb.WriteString(fmt.Sprintf("Meta description : %q (%d caractères)\n", d.MetaDescription, len(d.MetaDescription)))
	sb.WriteString(fmt.Sprintf("Meta robots : %q\n", d.MetaRobots))
	sb.WriteString(fmt.Sprintf("Canonical : %q\n", d.Canonical))
	sb.WriteString(fmt.Sprintf("OG Title : %q\n", d.OGTitle))
	sb.WriteString(fmt.Sprintf("OG Description : %q\n\n", d.OGDescription))

	sb.WriteString("=== STRUCTURE DES TITRES ===\n")
	sb.WriteString(fmt.Sprintf("H1 (%d) : %s\n", len(d.H1s), joinTrunc(d.H1s, 3)))
	sb.WriteString(fmt.Sprintf("H2 (%d) : %s\n", len(d.H2s), joinTrunc(d.H2s, 5)))
	sb.WriteString(fmt.Sprintf("H3 (%d) : %s\n\n", len(d.H3s), joinTrunc(d.H3s, 5)))

	sb.WriteString("=== IMAGES ===\n")
	sb.WriteString(fmt.Sprintf("Total : %d\n", d.ImagesTotal))
	sb.WriteString(fmt.Sprintf("Sans attribut alt : %d\n\n", d.ImagesMissingAlt))

	sb.WriteString("=== LIENS ===\n")
	sb.WriteString(fmt.Sprintf("Internes : %d\n", d.LinksInternal))
	sb.WriteString(fmt.Sprintf("Externes : %d\n", d.LinksExternal))

	return sb.String()
}

func attrVal(n *html.Node, key string) string {
	for _, a := range n.Attr {
		if strings.ToLower(a.Key) == key {
			return a.Val
		}
	}
	return ""
}

func textContent(n *html.Node) string {
	var sb strings.Builder
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.TextNode {
			sb.WriteString(n.Data)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)
	return strings.TrimSpace(sb.String())
}

func joinTrunc(items []string, max int) string {
	if len(items) == 0 {
		return "(aucun)"
	}
	if len(items) > max {
		items = items[:max]
	}
	quoted := make([]string, len(items))
	for i, s := range items {
		if len(s) > 60 {
			s = s[:60] + "..."
		}
		quoted[i] = fmt.Sprintf("%q", s)
	}
	return strings.Join(quoted, ", ")
}
