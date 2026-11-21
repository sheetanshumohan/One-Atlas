# OneAtlas Web — product UI

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3. All data comes from the
[OneAtlas API](../oneatlas-api/README.md); nothing is hard-coded in the frontend.

## Pages

| Route | What it does |
|---|---|
| `/` | Hero with global search, catalogue stats, latest releases, top-ranked and cheapest models, labs |
| `/models` | Explorer: search; filter by type, company, provider, capabilities (all-of), input modality, open weights, deprecated, context size and max price; sort by date, price, context, providers or name; pagination |
| `/models/[slug]` | Detail: key facts, specs, capabilities, every provider's pricing/latency/throughput/uptime (cheapest first), benchmark scores with normalised bars |
| `/compare?models=a,b,c` | 2–6 models side by side (pricing, specs, capability matrix, benchmarks), best value per row marked ★ |
| `/rankings` | Overall, per-category or per-benchmark leaderboard; filters for type, open weights and minimum benchmark coverage |
| `/labs`, `/labs/[slug]` | AI labs directory → profile with stats and a release timeline grouped by year |
| `/providers`, `/providers/[slug]` | Provider directory → every model served, with that provider's prices |
| `/search?q=` | Global search across models, labs, providers and benchmarks |

## Design

A dark, modern interface: glass cards, gradient accents, the Geist typeface, and gentle motion.

- **Design tokens** live in `tailwind.config.ts` (colours, animations) and `src/app/globals.css` (component classes
  such as `.card`, `.btn-primary`, `.input`, `.text-gradient`).
- **Motion:** pages and lists fade up in sequence, score bars grow in, cards lift on hover, and the background glows
  drift slowly. Everything is switched off for users who set "reduce motion" in their system.
- **Lab and provider avatars** are gradient monograms whose colour comes from the name, so a lab looks the same on
  every page (no external logo files).
- **Performance:**
  - The background glows are radial gradients, not `filter: blur()`. Blur filters are re-drawn every frame and made
    the site measurably slower; gradients are drawn once and only moved.
  - Cards use no `backdrop-filter`, so dozens of cards aren't re-blurring the moving background each frame.
- **Layout:** the model table switches to cards on smaller screens. Long names wrap instead of widening the table, and
  low-priority columns hide on narrow screens. Checked by measuring overflow at 768 / 1024 / 1280 / 1440 / 1920 px.

## Architecture and decisions

- **Server Components fetch from the API** (`src/lib/api.ts`). The browser never calls the API directly, so:
  - there is no CORS setup;
  - the API URL can stay private;
  - every page arrives server-rendered with real data, and works even without JavaScript.
- **All UI state lives in the URL**: filters, sort order, page, leaderboard scope and the comparison selection.
  - Views are shareable and bookmarkable, and the back button works.
  - Controls update instantly with React `useOptimistic` (`use-url-state.ts`) while the server re-renders.
- **Progressive enhancement:** search forms are real `GET` forms with an `action`, field names and hidden inputs for the active filters. Submitting before hydration (or without JS) still works. A browser test enforces this.
- **Compare tray:** "+ Compare" buttons keep the selection in `localStorage`, so it survives navigation and reloads. A floating tray links to `/compare`.
- **Responsive:**
  - The listing is a dense table on desktop and cards on mobile; filters collapse on mobile.
  - The header becomes a hamburger menu on small screens.
  - Wide tables scroll inside their own container; the page itself never scrolls sideways (tested).
- **Errors:**
  - Unknown slugs return a real **404** status.
  - Invalid filters from hand-edited URLs show an inline message.
  - An API outage shows `error.tsx` with a retry button.
- **Rate limits:** the server sends `x-client-key` (`API_CLIENT_KEY`), so the API doesn't count every visitor against one per-IP quota.
- **Caching:** API responses are cached for 60s (`next.revalidate`). Pages render per request, so the build doesn't need the API.

## Run locally

```bash
# 1. start the API (see ../oneatlas-api): migrate + seed + start
cd ../oneatlas-api && npm install && npm run build && npm run start:demo   # needs DATABASE_URL
# 2. start the web app
cd ../oneatlas-web && npm install
API_URL=http://localhost:3000 npm run dev          # http://localhost:3001
```

| Env var | Default | Notes |
|---|---|---|
| `API_URL` | `http://localhost:3000` | Base URL of the API (server-side only) |
| `API_CLIENT_KEY` | unset | Same value as the API's `TRUSTED_CLIENT_KEY` |
| `PORT` | `3001` | |

## Tests

```bash
npm run typecheck
npm test               # 31 unit tests (vitest): price/token/date formatting, URL-state helpers
npm run test:e2e       # 58 Playwright tests, desktop + Pixel 7, against the running app (WEB_URL, default :3001)
```

The browser tests expect the API seeded with the demo catalogue. They cover:
- **Discovery:** every filter type and sort order (prices checked in order), search, and pagination.
- **Pages:** model detail (providers ordered cheapest first, unavailable offerings, lower-is-better labels), and real 404 statuses.
- **Compare:** the full flow from list → tray → compare page, persistence across reloads, the picker, and empty/invalid selections.
- **Rankings:** all three scopes and their filters.
- **Directories:** lab and provider directories, and search.
- **Mobile:** menu, collapsible filters, and cards instead of the table.
- **Without JavaScript:** pages still render with data, and search forms still work.
- **Page quality, on every page:**
  - exactly one `h1` and a visible header;
  - no duplicate element IDs;
  - no sideways page scroll;
  - **no browser console errors** (any console error fails the test).
