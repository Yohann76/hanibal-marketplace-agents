from langchain.tools import tool

META = {
    "name": "mcp_datagouv",
    "label": "MCP data.gouv.fr",
    "icon": "globe",
    "description": "Interroge le serveur MCP officiel de data.gouv.fr (JSON-RPC 2.0) pour rechercher des datasets publics : BODACC (annonces légales), DECP (marchés publics), SIRENE étendu, subventions, RNE. Complète la recherche SIRENE avec des données croisées sur l'activité réelle des entreprises.",
    "input_label": "Requête",
    "input_example": "agences web Paris marchés publics",
    "source": "MCP data.gouv.fr",
}


def _mcp_call(session_id: str, tool_name: str, arguments: dict) -> dict:
    import httpx, json

    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
        "id": 1,
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["Mcp-Session-Id"] = session_id

    resp = httpx.post(
        "https://mcp.data.gouv.fr/mcp",
        json=payload,
        headers=headers,
        timeout=20,
    )
    raw = resp.text

    # Streamable HTTP répond en SSE : "event: message\r\ndata: {...}\r\n\r\n"
    # On extrait le premier payload JSON de la ligne "data:"
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            raw = line[len("data:"):].strip()
            break

    return json.loads(raw)


def _mcp_init_session() -> str:
    import httpx

    payload = {
        "jsonrpc": "2.0",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "oc-agents", "version": "1.0"},
        },
        "id": 0,
    }
    resp = httpx.post(
        "https://mcp.data.gouv.fr/mcp",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        timeout=15,
    )
    return resp.headers.get("Mcp-Session-Id", "")


def _extract_text(result: dict) -> str:
    content = result.get("result", {}).get("content", [])
    parts = [c["text"] for c in content if c.get("type") == "text" and c.get("text")]
    return "\n".join(parts) if parts else str(result)


@tool
def mcp_datagouv(query: str) -> str:
    """Search open government datasets on data.gouv.fr via MCP (JSON-RPC). Returns relevant datasets: BODACC legal notices, public contracts (DECP), subsidies, company registry. Use to cross-reference companies with public data."""
    try:
        session_id = _mcp_init_session()
        result = _mcp_call(session_id, "search_datasets", {"query": query})
        text = _extract_text(result)
        if not text:
            return f"Aucun dataset trouvé pour : {query}"
        # Limiter à 8 résultats pour garder le contexte concis
        lines = text.splitlines()
        truncated, count = [], 0
        for line in lines:
            truncated.append(line)
            if line.strip().startswith(str(count + 1) + "."):
                count += 1
            if count >= 8 and line.strip() == "":
                break
        return f"Datasets data.gouv.fr pour '{query}' :\n\n" + "\n".join(truncated)
    except Exception as e:
        return f"MCP data.gouv.fr indisponible : {e}"
