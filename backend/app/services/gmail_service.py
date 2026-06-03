"""
Gmail service — OAuth2 web flow, tokens persistés dans gmail_token.json.
Authentification via https://agents.hanibal.fr/api/gmail/auth (une seule fois).
"""
import json
import os
import httpx
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode

TOKEN_FILE   = Path(__file__).parent.parent.parent / "gmail_token.json"
GMAIL_API    = "https://gmail.googleapis.com/gmail/v1/users/me"
TOKEN_URL    = "https://oauth2.googleapis.com/token"
AUTH_URL     = "https://accounts.google.com/o/oauth2/v2/auth"

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "")


def get_auth_url() -> str:
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "https://www.googleapis.com/auth/gmail.readonly",
        "access_type":   "offline",
        "prompt":        "consent",
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def is_connected() -> bool:
    return TOKEN_FILE.exists()


def _load_token() -> dict:
    if not TOKEN_FILE.exists():
        raise ValueError("Gmail non connecté — visite /api/gmail/auth pour autoriser l'accès.")
    return json.loads(TOKEN_FILE.read_text())


def _save_token(data: dict):
    TOKEN_FILE.write_text(json.dumps(data, indent=2))


async def exchange_code(code: str) -> None:
    """Exchange auth code for tokens and persist to gmail_token.json."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        resp.raise_for_status()
        data = resp.json()

    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
    ).isoformat()

    _save_token({
        "token":         data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "expires_at":    expires_at,
    })


async def _get_valid_access_token() -> str:
    data = _load_token()

    expires_at_str = data.get("expires_at")
    needs_refresh  = True

    if expires_at_str:
        try:
            exp = datetime.fromisoformat(expires_at_str)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            needs_refresh = datetime.now(timezone.utc) >= exp
        except Exception:
            needs_refresh = True

    if needs_refresh and data.get("refresh_token"):
        async with httpx.AsyncClient() as client:
            resp = await client.post(TOKEN_URL, data={
                "client_id":     data["client_id"],
                "client_secret": data["client_secret"],
                "refresh_token": data["refresh_token"],
                "grant_type":    "refresh_token",
            })
            resp.raise_for_status()
            refreshed = resp.json()

        data["token"]      = refreshed["access_token"]
        data["expires_at"] = (
            datetime.now(timezone.utc) + timedelta(seconds=refreshed.get("expires_in", 3600))
        ).isoformat()
        _save_token(data)

    return data["token"]


async def fetch_emails(query: str = "", max_results: int = 25) -> str:
    access_token = await _get_valid_access_token()
    headers = {"Authorization": f"Bearer {access_token}"}

    from datetime import date
    today = date.today().strftime("%Y/%m/%d")
    search_query = query if query else f"after:{today}"

    async with httpx.AsyncClient(timeout=20) as client:
        list_resp = await client.get(
            f"{GMAIL_API}/messages",
            headers=headers,
            params={"q": search_query, "maxResults": max_results},
        )
        list_resp.raise_for_status()
        messages = list_resp.json().get("messages", [])

        if not messages:
            return f"Aucun email trouvé (requête : {search_query})."

        lines = [
            f"📧 **{len(messages)} email(s)** — {search_query}",
            f"Date : {date.today().strftime('%d/%m/%Y')}",
            "",
        ]

        for i, msg in enumerate(messages, 1):
            detail = await client.get(
                f"{GMAIL_API}/messages/{msg['id']}",
                headers=headers,
                params={"format": "metadata",
                        "metadataHeaders": ["Subject", "From", "Date"]},
            )
            detail.raise_for_status()
            hdrs = detail.json().get("payload", {}).get("headers", [])

            def h(name):
                return next(
                    (x["value"] for x in hdrs if x["name"].lower() == name.lower()), ""
                )

            snippet = detail.json().get("snippet", "")[:200]
            lines.append(f"**[{i}] {h('Subject') or '(sans objet)'}**")
            lines.append(f"   De : {h('From')}  |  Le : {h('Date')}")
            if snippet:
                lines.append(f"   → {snippet}…")
            lines.append("")

    return "\n".join(lines)
