# Chris Fact Radar

**A claim-review studio for fitness & nutrition content with a market-intelligence layer built into the same data stream.**

Chris Fact Radar turns real spoken claims and manually reviewed source material into evidence-aware rebuttal packages, creator dossiers, and a lead-magnet funnel. The same data that powers fact-checking, including transcripts, reach, formats, and timing, can also become a niche market database.

Built as a proof-of-work application: live and usable, with explicit boundaries between public review actions, protected writes, configured providers, and deterministic fallbacks.

- **Live app:** https://chris-fact-radar.vercel.app
- **Status & data-honesty page:** https://chris-fact-radar.vercel.app/status

---

## What it does

- **Claim inbox & review stages** — collect claims from real sources, structure them, run evidence checks, and score brand fit.
- **Human-in-the-loop verdicts** — no autonomous “AI is confident” truth claims; a person approves before anything ships.
- **Apify / manual-first intake** — a public, rate-limited Hunter run for reviewer proof plus protected manual transcript and claim imports.
- **Evidence-aware content packs** — rebuttal drafts generated through an LLM or a deterministic fallback when no provider is available.
- **Creator dossiers & position matching** — map claims against known creator positions.
- **Lead-magnet funnel** — an Anti-Heißhunger landing page and interactive qualification check.

Current public case and source counts are loaded from the live claims API and rendered dynamically. They are not duplicated as fixed README numbers.

## Market-intelligence layer

The fact-checking intake produces structured market signals as a byproduct. Concept views demonstrate possible trend and briefing extensions without presenting them as autonomous production features:

- [`docs/concept/vision_01_radar_dashboard.html`](docs/concept/vision_01_radar_dashboard.html)
- [`docs/concept/vision_02_secretary_autopilot.html`](docs/concept/vision_02_secretary_autopilot.html)

## Architecture

| Layer | Source of truth |
|---|---|
| LLM / QA control | OpenAI-compatible runtime configured through environment variables. The safe health endpoint exposes whether a provider is active; the UI remains provider-neutral. Deterministic fallback when unavailable. |
| Social intake | Apify-backed Hunter flow plus protected manual transcript and claim import |
| Data store | Supabase REST |
| Framework | Next.js 16, React 19, TypeScript, Tailwind 4 |
| Charts | Recharts |
| Deploy | Vercel with scheduled cron routes |

**Source policy.** New material comes from Apify-backed intake or manually verified source text. Legacy platform-discovery routes are disabled. The app does not claim undisclosed platform access or automatic transcription where none exists.

**Route security.** Public read and reviewer paths include `/`, `/studio`, `/status`, `GET /api/claims`, chat/content generation, and the rate-limited `POST /api/hunter/run`. Persistent shared-data writes are fail-closed with `APP_ADMIN_TOKEN`, including claim writes, manual claim import, candidate promotion/rejection, creator watchlist changes, Chris-Wissen imports, transcript scans, truth imports, URL migrations, and seed operations. Seed operations use POST rather than side-effectful GET requests.

**Public capability model.** A public reviewer can inspect the system, launch the bounded live intake, open sources, generate fallback content, and navigate all proof surfaces. Actions that change the shared database are disabled in the UI and rejected by the server without valid admin authorization.

### Core routes

| Route | Purpose |
|---|---|
| `/` | Public showcase and guided entry |
| `/studio` | Claim review and content-production studio |
| `/status` | Public status and data-honesty overview |
| `/lead-magnets/anti-heisshunger` | Anti-Heißhunger lead-magnet landing page |
| `/api/health` | Safe machine-readable configuration status |

## Local setup

```bash
npm install
npm run dev      # http://localhost:3217
```

### Environment

The app can run without external configuration: read surfaces show honest empty states and analysis uses deterministic fallbacks. To enable the shared pipeline, create `.env.local` and never commit real keys:

```bash
# Any OpenAI-compatible runtime
OPENAI_BASE_URL=https://your-openai-compatible-endpoint.example/v1
OPENAI_API_KEY=your-api-key
LLM_MODEL=your-model-id
LLM_TIMEOUT_MS=25000

# Social intake
APIFY_TOKEN=your-apify-token

# Shared store
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for persistent writes and admin routes
APP_ADMIN_TOKEN=choose-a-strong-admin-token
CRON_SECRET=choose-a-strong-cron-secret
```

## Validation

```bash
npm run audit:interactions  # fail-open routes, mutating GETs, fake controls, capability-aware UI
npm run lint
npm run typecheck
npm run build
npm run test:e2e           # public reviewer journey, links, fallbacks, protected writes
npm run test:e2e:auth      # authenticated studio path
```

The interaction audit writes machine-readable and Markdown reports to `artifacts/`.

## Honest limits

- This is a proof-of-work product, not a multi-tenant hardened SaaS.
- Public review and protected shared-data administration are deliberately separated.
- Real provider and Apify runs depend on configured credentials, available quota, and external service health.
- Automatic platform discovery outside the declared Apify/manual paths is disabled.
- Automated tests cover defined error classes and user journeys; they do not prove universal buglessness, because software has standards to uphold.

## Tech stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Recharts · Apify client · Supabase · Playwright · Vercel
