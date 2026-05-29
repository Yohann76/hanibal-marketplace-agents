package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type entrepriseResult struct {
	NomComplet        string `json:"nom_complet"`
	Siren             string `json:"siren"`
	ActivitePrincipale string `json:"activite_principale"`
	NomCommune        string `json:"commune"`
	CodePostal        string `json:"code_postal"`
	Dirigeants        []struct {
		Nom     string `json:"nom"`
		Prenom  string `json:"prenom"`
		Qualite string `json:"qualite"`
	} `json:"dirigeants"`
	NatureJuridique string `json:"nature_juridique"`
	DateCreation    string `json:"date_creation"`
}

type searchEntreprisesResponse struct {
	Results      []entrepriseResult `json:"results"`
	TotalResults int                `json:"total_results"`
}

func searchEntreprises(query string) (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	apiURL := "https://recherche-entreprises.api.gouv.fr/search?q=" +
		url.QueryEscape(query) + "&per_page=10&mtm_campaign=prospection-agent"

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return "", fmt.Errorf("requête invalide: %v", err)
	}
	req.Header.Set("User-Agent", "OC-Agents/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("impossible d'accéder à l'API Annuaire des Entreprises: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("erreur lecture réponse: %v", err)
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("erreur API (%d): %s", resp.StatusCode, string(body))
	}

	var result searchEntreprisesResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("impossible de parser les résultats: %v", err)
	}

	if len(result.Results) == 0 {
		return fmt.Sprintf("Aucune entreprise trouvée pour la recherche : \"%s\"\n\nSuggestions :\n- Essayez des termes plus généraux\n- Précisez une ville ou une région\n- Utilisez le nom d'un secteur d'activité", query), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Source : API Annuaire des Entreprises (data.gouv.fr / SIRENE)\n"))
	sb.WriteString(fmt.Sprintf("Recherche : \"%s\"\n", query))
	sb.WriteString(fmt.Sprintf("Résultats trouvés : %d (affichage des 10 premiers)\n\n", result.TotalResults))

	for i, e := range result.Results {
		sb.WriteString(fmt.Sprintf("=== Entreprise %d ===\n", i+1))
		sb.WriteString(fmt.Sprintf("Nom           : %s\n", e.NomComplet))
		sb.WriteString(fmt.Sprintf("SIREN         : %s\n", e.Siren))
		sb.WriteString(fmt.Sprintf("Activité (NAF): %s\n", e.ActivitePrincipale))
		sb.WriteString(fmt.Sprintf("Localisation  : %s %s\n", e.CodePostal, e.NomCommune))
		if e.DateCreation != "" {
			sb.WriteString(fmt.Sprintf("Création      : %s\n", e.DateCreation))
		}
		if e.NatureJuridique != "" {
			sb.WriteString(fmt.Sprintf("Forme juridique: %s\n", e.NatureJuridique))
		}
		if len(e.Dirigeants) > 0 {
			sb.WriteString("Dirigeants    :\n")
			for _, d := range e.Dirigeants {
				name := strings.TrimSpace(d.Prenom + " " + d.Nom)
				if d.Qualite != "" {
					name += " — " + d.Qualite
				}
				sb.WriteString(fmt.Sprintf("  • %s\n", name))
			}
		} else {
			sb.WriteString("Dirigeants    : non disponibles\n")
		}
		sb.WriteString("\n")
	}

	return sb.String(), nil
}
