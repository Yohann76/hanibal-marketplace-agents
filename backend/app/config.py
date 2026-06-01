import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL     = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/marketplace")
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

# ── Costs in EUR per million tokens ──────────────────────────────────────────
# Mistral Small Latest: $0.10 input / $0.30 output  → ×0.92 EUR/USD
MISTRAL_COST_INPUT_PER_M  = float(os.getenv("MISTRAL_COST_INPUT_PER_M",  "0.09"))
MISTRAL_COST_OUTPUT_PER_M = float(os.getenv("MISTRAL_COST_OUTPUT_PER_M", "0.28"))

# Claude Sonnet 4.6: $3.00 input / $15.00 output  → ×0.92 EUR/USD
CLAUDE_COST_INPUT_PER_M   = float(os.getenv("CLAUDE_COST_INPUT_PER_M",   "2.76"))
CLAUDE_COST_OUTPUT_PER_M  = float(os.getenv("CLAUDE_COST_OUTPUT_PER_M",  "13.80"))
