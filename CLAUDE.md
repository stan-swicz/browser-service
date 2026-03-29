# Browser Service

Standalone Playwright browser automation service. Used by the main app's `web_crawl` tool as a fallback when Firecrawl cannot render JavaScript SPAs.

## Stack

- **Runtime**: Node.js + TypeScript (ESM)
- **Server**: Fastify on port 9004
- **Browser**: Playwright (Chromium)
- **Build**: `tsc` for production, `tsx watch` for dev

## Architecture

Session-based browser pool — each client gets an isolated browser context with its own cookies/storage. Sessions auto-expire after 5 minutes of inactivity (configurable).

## Routes

| Route | Description |
|-------|-------------|
| `GET /health` | Service health check |
| `POST /sessions` | Create browser session |
| `DELETE /sessions/:id` | Destroy session |
| `POST /navigate` | Navigate to URL |
| `POST /action` | Perform browser action (click, type, etc.) |
| `POST /extract` | Extract page content (text, tables, links, interactive elements) |
| `POST /screenshot` | Take page screenshot |
| `POST /batch` | Run multiple actions in sequence |

## Commands

```bash
npm install                 # install deps (independent from root)
npm run dev                 # tsx watch src/server.ts
npm run build               # tsc
npm start                   # node dist/server.js
```

## Environment

See `.env.example`: `PORT` (default 9004), `MAX_SESSIONS`, `SESSION_TIMEOUT_MS`, `BROWSER_HEADLESS`.

## Integration

- **NOT** part of root npm workspaces — has its own `package.json` and `node_modules`
- Main app connects via HTTP client at `src/lib/browser-client.ts`
- Only used by `web_crawl` tool when SPA fallback is triggered
