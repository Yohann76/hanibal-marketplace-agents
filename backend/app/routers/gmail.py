from fastapi import APIRouter
from fastapi.responses import RedirectResponse, HTMLResponse
from app.services import gmail_service

router = APIRouter()


@router.get("/gmail/auth")
async def gmail_auth_start():
    if not gmail_service.GOOGLE_CLIENT_ID:
        return HTMLResponse("GOOGLE_CLIENT_ID not configured", status_code=500)
    return RedirectResponse(gmail_service.get_auth_url())


@router.get("/gmail/callback")
async def gmail_auth_callback(code: str = "", error: str = ""):
    if error or not code:
        return HTMLResponse(f"Authentication failed: {error}", status_code=400)

    try:
        session_key = await gmail_service.exchange_code(code)
    except Exception as e:
        return HTMLResponse(f"Token exchange failed: {e}", status_code=500)

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
<h2>✅ Gmail connected successfully</h2>
<p>You can close this window.</p>
<script>
  if (window.opener) {{
    window.opener.postMessage({{ gmailSession: '{session_key}' }}, '*');
    setTimeout(() => window.close(), 800);
  }}
</script>
</body></html>"""
    return HTMLResponse(html)
