from fastapi import APIRouter
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from app.services import gmail_service

router = APIRouter()


@router.get("/gmail/auth")
async def gmail_auth_start():
    if not gmail_service.GOOGLE_CLIENT_ID:
        return HTMLResponse("GOOGLE_CLIENT_ID non configuré", status_code=500)
    return RedirectResponse(gmail_service.get_auth_url())


@router.get("/gmail/callback")
async def gmail_auth_callback(code: str = "", error: str = ""):
    if error or not code:
        return HTMLResponse(f"Authentification échouée : {error}", status_code=400)
    try:
        await gmail_service.exchange_code(code)
    except Exception as e:
        return HTMLResponse(f"Échange de token échoué : {e}", status_code=500)

    return HTMLResponse("""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;background:#111;color:#fff">
<h2>✅ Gmail connecté</h2>
<p>Tokens sauvegardés. Vous pouvez fermer cette fenêtre.</p>
<p style="color:#6b7280;font-size:14px">Retournez sur l'agent et demandez : <em>"Résume mes emails du jour"</em></p>
<script>setTimeout(() => window.close(), 3000);</script>
</body></html>""")


@router.get("/gmail/status")
async def gmail_status():
    return JSONResponse({
        "connected": gmail_service.is_connected(),
        "auth_url":  "/api/gmail/auth" if not gmail_service.is_connected() else None,
    })
