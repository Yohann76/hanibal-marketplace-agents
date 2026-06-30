import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL     = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/marketplace")
SECRET_KEY       = os.getenv("SECRET_KEY", "changeme-use-a-strong-random-key-in-production")
MISTRAL_API_KEY  = os.getenv("MISTRAL_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
TAVILY_API_KEY   = os.getenv("TAVILY_API_KEY", "")
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "")
BACKEND_PUBLIC_URL   = os.getenv("BACKEND_PUBLIC_URL", "")
PORT = int(os.getenv("PORT", "8080"))

# ── Providers & models ────────────────────────────────────────────────────────
MISTRAL_PROVIDER = os.getenv("MISTRAL_PROVIDER", "mistral")
MISTRAL_MODEL    = os.getenv("MISTRAL_MODEL",    "mistral-small-latest")

CLAUDE_PROVIDER  = os.getenv("CLAUDE_PROVIDER",  "claude")
CLAUDE_MODEL     = os.getenv("CLAUDE_MODEL",     "claude-sonnet-4-6")

# ── LangFuse observability ────────────────────────────────────────────────────
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY", "")
LANGFUSE_HOST       = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

