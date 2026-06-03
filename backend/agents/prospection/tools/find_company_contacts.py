import re
from langchain.tools import tool
from app.config import TAVILY_API_KEY

META = {
    "name": "find_company_contacts",
    "label": "Recherche de contacts",
    "icon": "contact",
    "description": "Recherche les coordonnées d'une entreprise (email, téléphone, site web) via le web et le scraping de la page contact.",
    "input_label": "Nom de l'entreprise",
    "input_example": "LA WEB AGENCE Paris",
    "source": "Tavily + scraping",
}

_EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}')
_PHONE_RE = re.compile(r'(?:(?:\+|00)33[\s.\-]?|0)[1-9](?:[\s.\-]?\d{2}){4}')
_SKIP_EMAIL = {"noreply", "no-reply", "donotreply", "mailer", "bounce", "@sentry", "@example", ".png", ".jpg", ".gif", "@2x"}
_SKIP_DOMAINS = {"linkedin.com", "societe.com", "pappers.fr", "infogreffe.fr",
                 "google.com", "facebook.com", "twitter.com", "instagram.com",
                 "youtube.com", "wikipedia.org"}


def _clean_phone(p: str) -> str:
    digits = re.sub(r"[\s.\-]", "", p)
    if digits.startswith("0033"):
        digits = "0" + digits[4:]
    elif digits.startswith("+33"):
        digits = "0" + digits[3:]
    return " ".join(digits[i:i+2] for i in range(0, 10, 2))


def _is_official(url: str) -> bool:
    return not any(d in url for d in _SKIP_DOMAINS)


def _extract(text: str) -> tuple[list, list]:
    emails = [e for e in _EMAIL_RE.findall(text)
              if not any(s in e.lower() for s in _SKIP_EMAIL)]
    phones = [_clean_phone(p) for p in _PHONE_RE.findall(text)]
    return emails, phones


@tool
def find_company_contacts(company_name: str) -> str:
    """Find contact details (email, phone, website) for a French company by searching the web and scraping their contact page."""
    try:
        from tavily import TavilyClient
        import httpx
        from bs4 import BeautifulSoup

        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            f'"{company_name}" contact email téléphone site officiel',
            max_results=5,
            search_depth="basic",
        )

        all_emails, all_phones, website = [], [], None

        for r in response.get("results", []):
            url = r.get("url", "")
            snippet = r.get("content", "")
            e, p = _extract(snippet + " " + url)
            all_emails.extend(e)
            all_phones.extend(p)
            if website is None and _is_official(url):
                website = url.split("?")[0].rstrip("/")

        # Scrape official website contact pages
        if website:
            base = re.match(r"https?://[^/]+", website)
            base_url = base.group(0) if base else website
            for path in ["/contact", "/nous-contacter", "/contactez-nous", ""]:
                try:
                    resp = httpx.get(
                        base_url + path, timeout=7, follow_redirects=True,
                        headers={"User-Agent": "Mozilla/5.0 (compatible; OC-Agent/1.0)"},
                    )
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        for tag in soup(["script", "style"]):
                            tag.decompose()
                        e, p = _extract(soup.get_text(" "))
                        all_emails.extend(e)
                        all_phones.extend(p)
                except Exception:
                    pass

        # Deduplicate
        emails = list(dict.fromkeys(all_emails))[:3]
        phones = list(dict.fromkeys(all_phones))[:2]

        if not emails and not phones and not website:
            return f"Aucun contact trouvé pour : {company_name}"

        parts = []
        if website:
            parts.append(f"Site : {website}")
        if emails:
            parts.append(f"Email : {', '.join(emails)}")
        if phones:
            parts.append(f"Tél : {', '.join(phones)}")
        return "\n".join(parts)

    except Exception as e:
        return f"Erreur recherche contacts : {e}"
