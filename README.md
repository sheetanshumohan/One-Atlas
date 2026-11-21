# OneAtlas: AI model discovery & intelligence platform

An MVP of [oneatlas.dev](https://oneatlas.dev/) for the AI Software Engineer Internship assignment (**Backend Engineer**
role). It helps developers discover, compare and evaluate AI models across labs and providers.

| Part | Stack | Docs |
|---|---|---|
| [`oneatlas-api/`](oneatlas-api/README.md) | Node.js · TypeScript · NestJS · PostgreSQL · Prisma | REST API, data model, ingestion, ~454 tests |
| [`oneatlas-web/`](oneatlas-web/README.md) | Next.js · React · TypeScript · Tailwind CSS | Product UI, 89 tests (unit + Playwright) |

## Assignment requirements → where they are

| Requirement | Implementation |
|---|---|
| 1. Model discovery & search: browse, search, filter by company/provider/capability/type, sort by price/context/date, specs & pricing | `GET /api/v1/models` · `/models` page |
| 2. Model detail: specs, I/O pricing, context, modalities, capabilities, providers, benchmarks | `GET /api/v1/models/:slug` · `/models/[slug]` |
| 3. Comparison: side by side, pricing/context/capabilities/benchmarks | `GET /api/v1/models/compare` · `/compare` |
| 4. Rankings & benchmarks: leaderboards, filter by category & benchmark, comparative scores | `GET /api/v1/rankings` · `/rankings` |
| 5. Labs & providers directory: companies, their models and releases, providers and supported models | `/api/v1/organizations`, `/api/v1/providers` · `/labs`, `/providers` |
| 6. Product experience: navigation, global search, responsive, consistent | header nav + global search on every page; desktop & mobile layouts (tested) |
| Data through DB + APIs (no hard-coded frontend data) | PostgreSQL ← Prisma ← NestJS API ← Next.js server components |
| Backend: APIs, schema & relations, search/filter/pagination, pricing & benchmark management, validation & normalisation, error handling | see [`oneatlas-api/README.md`](oneatlas-api/README.md) |

## Run the whole product

**Docker Compose** (Postgres + API + web, migrated and seeded):

```bash
docker compose up --build
# web: http://localhost:3001 · API docs: http://localhost:3000/docs
```

**Without Docker** (needs PostgreSQL):

```bash
cd oneatlas-api && npm install && cp .env.example .env    # set DATABASE_URL
npm run build && npm run start:demo                       # migrate + seed + API on :3000
cd ../oneatlas-web && npm install && npm run build
API_URL=http://localhost:3000 npm start                   # web on :3001
```

## Deploy (live URL)

**Render (recommended):** New → Blueprint → choose this repo (it reads `render.yaml` at the root). This creates
PostgreSQL, the API and the web app. When prompted:
- set the same random string (≥16 characters) for `TRUSTED_CLIENT_KEY` on the API and `API_CLIENT_KEY` on the web app;
- set the web app's `API_URL` to the API's URL, e.g. `https://oneatlas-api.onrender.com`.

The API migrates and seeds itself on start.

**Vercel + Neon/Railway (alternative):**
- **Database:** create PostgreSQL on Neon (use the pooled connection string).
- **API:** deploy to Railway or Render with build `npm ci --include=dev && npm run build` and start `npm run start:demo`.
- **Web:** deploy to Vercel with root directory `oneatlas-web` and the `API_URL` and `API_CLIENT_KEY` env vars.

## CI

`.github/workflows/oneatlas-ci.yml` runs in two jobs:
1. **API:** typecheck → build → migration drift check → unit → e2e, against PostgreSQL 16.
2. **Full stack:** boot the real API and web app, then run web unit tests and Playwright on desktop and mobile.
