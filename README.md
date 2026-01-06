## Exa MCP Research Agent

Deep-search anything with Exa MCP and explain via OpenRouter model `xiaomi/mimo-v2-flash:free` using a LangChain tools agent.

### Prerequisites
- Node.js 18+ and Bun installed
- Environment variables in `.env.local`:
	- `OPENROUTER_API_KEY` – OpenRouter API key
	- `OPENROUTER_BASE_URL` (optional) – defaults to `https://openrouter.ai/api/v1`
	- `OPENROUTER_MODEL` (optional) – defaults to `xiaomi/mimo-v2-flash:free`
	- `EXA_API_KEY` – Exa MCP API key
	- `EXA_SEARCH_URL` (optional) – defaults to `https://api.exa.ai/search`

### Install

```bash
bun install
```

### Run dev server

```bash
bun dev
```

Visit http://localhost:3000. Enter a query, optionally choose a response style, and the agent will stream results as it searches Exa and reasons with the OpenRouter model.

### Production build

```bash
bun run build
bun run start
```

### Notes
- API transport is via `app/api/agent` POST route, streaming NDJSON tokens.
- Exa requests use short jittered retries and surface errors back to the client.
- Responses adapt to the provided style hint but stay concise and source-aware.
