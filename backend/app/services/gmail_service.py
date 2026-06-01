import httpx
import secrets
from datetime import date
from urllib.parse import urlencode, quote
from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

# In-memory token store (use Redis for production)
_token_store: dict[str, dict] = {}

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"


def get_auth_url() -> str:
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.readonly",
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        token_data = resp.json()

    session_key = secrets.token_hex(20)
    _token_store[session_key] = token_data
    return session_key


async def fetch_emails(session_key: str) -> str:
    token_data = _token_store.get(session_key)
    if not token_data:
        raise ValueError("Gmail session expired — please reconnect")

    access_token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    today = date.today().strftime("%Y/%m/%d")

    async with httpx.AsyncClient(timeout=15) as client:
        list_resp = await client.get(
            f"{GMAIL_API}/messages",
            headers=headers,
            params={"q": f"after:{today}", "maxResults": 30},
        )
        list_resp.raise_for_status()
        messages = list_resp.json().get("messages", [])

        if not messages:
            return f"No emails received today ({date.today().strftime('%d/%m/%Y')})."

        lines = [
            f"Source: Gmail API",
            f"Date: {date.today().strftime('%d/%m/%Y')}",
            f"Emails received: {len(messages)}",
            "",
        ]

        for i, msg in enumerate(messages, 1):
            detail = await client.get(
                f"{GMAIL_API}/messages/{msg['id']}",
                headers=headers,
                params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
            )
            detail.raise_for_status()
            headers_list = detail.json().get("payload", {}).get("headers", [])

            def get_header(name):
                return next((h["value"] for h in headers_list if h["name"].lower() == name.lower()), "")

            lines.append(f"[{i}] {get_header('Subject')}")
            lines.append(f"    From: {get_header('From')}")
            lines.append(f"    Date: {get_header('Date')}")
            lines.append("")

    return "\n".join(lines)
