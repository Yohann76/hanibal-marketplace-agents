from langchain.tools import tool

META = {
    "name": "gmail_read",
    "label": "Lecture Gmail",
    "icon": "contact",
    "description": "Lit les emails Gmail via l'API Google (OAuth2 persistant). Retourne la liste des emails avec expéditeur, objet et aperçu du contenu. Par défaut lit les emails du jour, mais accepte n'importe quelle requête Gmail (ex: 'from:boss@company.com', 'is:unread', 'subject:facture').",
    "input_label": "Requête Gmail",
    "input_example": "is:unread",
    "source": "Gmail API — Google",
}


@tool
def gmail_read(query: str = "") -> str:
    """Read emails from Gmail using the Google API. Default: today's emails. Accepts any Gmail search query: 'is:unread', 'from:someone@example.com', 'subject:invoice', 'after:2024/01/01'. Returns sender, subject and content preview for each email. If not connected, returns the authentication URL."""
    import asyncio
    try:
        from app.services.gmail_service import fetch_emails, is_connected
        from app.config import BACKEND_PUBLIC_URL

        if not is_connected():
            return (
                "❌ Gmail non connecté.\n\n"
                f"Pour connecter Gmail, ouvrez ce lien dans votre navigateur :\n"
                f"👉 {BACKEND_PUBLIC_URL}/api/gmail/auth\n\n"
                "Après authentification, relancez votre demande."
            )

        return asyncio.run(fetch_emails(query=query, max_results=25))
    except Exception as e:
        return f"Erreur Gmail : {e}"
