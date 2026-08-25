# Smart Bookmarker API

## Project layout

- `src/config` — validated application configuration.
- `src/db` — PostgreSQL connection.
- `src/integrations` — external-provider clients; Gemini is isolated here.
- `src/modules/auth` — authentication and refresh-token logic.
- `src/modules/categories` — category persistence and the `/categories` endpoint.
- `src/modules/captures` — capture API and URL-ingestion pipeline.
- `src/scripts` — manual development scripts, excluded from application routing.
- `migrations` — ordered database schema migrations.

## Setup

Copy `.env.example` to `.env` and supply real values. Keep `.env` out of version control.

```powershell
npm install
npm run dev
```

## Commands

```powershell
npm run build
npm run test:categorize
```

`test:categorize` loads `.env`, calls Gemini once, and prints its structured category/tag response. Gemini requests are limited to two attempts with a 12-second request timeout to avoid long waits during provider outages.
