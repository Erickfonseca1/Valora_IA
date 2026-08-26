# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Monorepo with two independent apps:

- `ValoraIA_back/` — Next.js 16 API server (Node.js, TypeScript). All business logic and DB access live here.
- `ValoraIA_front/` — React + Vite SPA (TypeScript, Tailwind v3). Pure UI; calls the backend over HTTP.
- `newschema.sql` — authoritative DB schema. Run against Supabase manually when the schema changes.
- `docker-compose.yml` — orchestrates both services for local dev.

## Commands

### Backend (`ValoraIA_back/`)
```bash
npm run dev        # Next.js dev server on :3000 (heavy — Turbopack compiles in memory;
                   # on low-RAM Macs prefer the production mode below)
npm run build      # production build
npm run start      # production server on :3000 (light: ~130MB RAM, no file watcher)
npm run lint
npm run test       # vitest run (one-shot)
npm run test:watch # vitest watch
```
Note: `next dev` Turbopack must have `turbopack.root` set (already in `next.config.ts`)
or it infers the monorepo root from `package-lock.json` and enters a compile loop (300% CPU,
multi-GB RAM). `npm run start` is the safe choice on machines with 16GB or less.

New dashboard RPC migration: `supabase/migrations/006_dashboard_metrics.sql` — run it
manually in the Supabase SQL editor to activate the single-round-trip metrics endpoint.
Until then the route falls back to parallel REST queries.

### Frontend (`ValoraIA_front/`)
```bash
npm run dev        # Vite dev server on :5173 (proxies /api → :3000)
npm run build      # tsc -b && vite build
npm run test       # vitest watch
npm run test:coverage
```

### Docker (root)
```bash
docker-compose up          # backend :3000 + frontend nginx :80
docker-compose up frontend-dev  # frontend hot-reload dev mode
```

## Environment Variables

Backend requires `ValoraIA_back/.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase project
- `SUPABASE_SECRET_KEY` — service-role key (server-side only, bypasses RLS)
- `GOOGLE_MAPS_API_KEY` — geocoding + nearby places
- `GEMINI_API_KEY` — Gemini Vision for photo analysis
- `INGEST_WEBHOOK_SECRET` — shared secret for `/api/ingest` webhook (Apify scraper)

Frontend: set `VITE_API_URL` to point at the backend when running in production (different domain).
Frontend auth (Supabase): `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `ValoraIA_front/.env.local.example`).
Requires the Supabase project to have email/password auth enabled. Every product route behind `/app` requires a session;
the backend validates the `Authorization: Bearer` JWT via `src/lib/access.ts` (`getCurrentUser`).

## Architecture

### Domain
Brazilian real estate appraisal (PTAM — Parecer Técnico de Avaliação de Mercado) compliant with **NBR 14653**. All monetary values in BRL.

### Database (Supabase + PostGIS)
Two main tables:
- `listings` — comparable properties scraped from market (ingested via `/api/ingest`)
- `valuations` — appraisal records with inputs, results, and JSONB blobs for comparables/POIs/homogenization factors

Coordinates stored as PostGIS `GEOGRAPHY(POINT, 4326)`. Spatial queries use `ST_DWithin` for radius-based comparable search.

DB enum types (defined in `newschema.sql`) must stay in sync with `src/types/index.ts` in both apps. When adding enum values, update SQL, backend types, and frontend types together.

### Backend API (`ValoraIA_back/src/`)

All routes under `src/app/api/`. Every response is wrapped: `{ success: true, data: T }` or `{ success: false, error: string }`.

Two Supabase clients in `src/lib/db/supabase.ts`:
- `createSupabaseServerClient()` — respects RLS; for user-facing reads
- `getAdminClient()` — bypasses RLS; for valuation writes and scraper ingestion

Key route groups:
- `POST /api/valuations` — creates a full PTAM record (geocodes, runs valuation engine, persists) — requires auth; records `created_by` + `organization_id` (active org from `x-org-id` header)
- `GET /api/valuations` — paginated, tenant-scoped list with `q`/`status=active|deleted`/`property_type` filters
- `GET /api/valuations/[id]` — fetch single record (author or owner/admin of the org); `DELETE` = soft delete (lixeira); `POST` = restore
- `GET /api/dashboard/*` — aggregated metrics and recent valuations list (tenant-scoped)
- `POST /api/auth/onboarding` — creates profile + personal "solo" org + owner membership (idempotent)
- `GET/PATCH /api/me` — profile + organizations + memberships
- `POST /api/organizations` + `GET/PATCH /api/organizations/[id]` — org management (owner/admin)
- `POST /api/organizations/[id]/invites` + `POST /api/invites/accept` — invite members by e-mail token
- `PATCH/DELETE /api/organizations/[id]/members/[userId]` — role changes / removal
- `POST /api/upload-logo` — organization logo (public bucket `org-logos`)
- `POST /api/ingest` — webhook endpoint for scraped listings (authenticated via `x-ingest-secret` header)
- `POST /api/upload-photos` / `POST /api/analyze-photos` — Supabase Storage upload + Gemini Vision analysis (private bucket, proxy at `GET /api/valuation-photos/[id]/image`)
- `GET /api/market/trend` — price trend series for a city

Multi-tenant model: `profiles` (1:1 auth.users) · `organizations` (solo/team) · `memberships` (role: owner/admin/avaliador/pending). Valuations belong to an org and an author; RLS (migrations 019–022) isolates by membership. The backend uses the service role but always applies `getValuationScope()` (author OR org owner/admin). New DB migrations under `supabase/migrations/` must be applied manually in the Supabase SQL editor.

### Valuation Engine (`src/lib/math/`)

Ensemble of three models, combined by precision-weighted average:
1. **MCD+IDW** — Inverse Distance Weighting across 4 radii (1–5 km), always available
2. **WLS** — Weighted Least Squares regression (NBR 14653 Grau III), needs ≥8 samples
3. **GBDT** — Gradient Boosted Decision Trees, needs ≥15 samples

Entry point: `valuation-engine.ts → runValuation()`. Ensemble logic in `ensemble.ts`. Individual models in `regression.ts` and `gradient-boost.ts`.

**Post-ensemble homogenization** (NBR 14653) applied in `valuation-engine.ts`:
- Physical depreciation: `ross-heidecke.ts` (uses `construction_age` + `conservation_state`)
- Terrain factors: corner (+5%), slope, street level
- Amenity factors: `amenities/factors.ts` — three scopes (`interno`, `condo`, `proximo`)
- Typology factor: adjusts ppm² when target type differs from comp type
- Offer factor: 0.90 (asking-to-transaction discount)

### Frontend (`ValoraIA_front/src/`)

SPA with React Router v7. Routes:
- `/` → `Dashboard` — metrics + recent valuations table
- `/nova-avaliacao` → `ValuationFlow` — 3-step wizard (property details → conservation & photos → submit)
- `/resultado/:id` → `Report` — full PTAM report view with waterfall chart
- `/relatorios` → `Relatorios` — paginated valuations list
- `LaudoPDF.tsx` — PDF generation with `@react-pdf/renderer`

API calls centralized in `src/api.ts`. Types mirrored in `src/types/index.ts` (must stay in sync with backend types).

Amenity catalog and scope inference logic duplicated in `src/amenities.ts` (frontend) and `src/lib/amenities/` (backend) — keep both in sync when modifying the catalog.

### Next.js 16 Warning

The backend uses **Next.js 16**, which has breaking changes from older versions. Before writing route handlers or middleware, read `node_modules/next/dist/docs/` for current API conventions. Do not rely on training-data knowledge of Next.js App Router.
