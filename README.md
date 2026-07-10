# Chris Fact Radar

**A claim-review studio for fitness & nutrition content — with a market-intelligence engine built into the same data stream.**

Chris Fact Radar turns real spoken claims and manually reviewed source material into evidence-aware rebuttal packages, creator dossiers, and a lead-magnet funnel. The same data that powers fact-checking (transcripts, reach, formats, timing) doubles as a niche market database: what topics are heating up, who owns which angle, where the content gap is.

Built as a proof-of-work application: a working MVP, honest about what is live and what is a deliberate next step.

- **Live app:** https://chris-fact-radar.vercel.app
- **Status & data-honesty page:** https://chris-fact-radar.vercel.app/status

---

## What it does

- **Claim inbox & review stages** — collect claims from real sources, structure them, run them through evidence checks, and score brand fit.
- **Human-in-the-loop verdicts** — no autonomous "AI is confident" truth claims; a person approves before anything ships.
- **Apify / manual-first intake** — a Hunter flow backed by Apify actors, plus manual transcript import for creator memory and opponent claims.
- **Evidence-aware content packs** — rebuttal drafts generated through an LLM (or a deterministic rule-based fallback when no key is configured).
- **Creator dossiers & position matching** — map a claim against a creator's known positions.
- **Lead-magnet funnel** — an anti-craving ("Anti-Heißhunger") landing page and interactive qualification check.

Current public case and source counts are loaded from the live claims API and rendered dynamically. They are deliberately not duplicated as fixed README numbers.

## Market-intelligence layer (concept)

The fact-checking crawl produces a structured market signal as a byproduct. Two concept views show where this goes — clearly marked as a build-out stage, not shipped features:

- [`docs/concept/vision_01_radar_dashboard.html`](docs/concept/vision_01_radar_dashboard.html) — niche radar / trend dashboard
- [`docs/concept/vision_02_secretary_autopilot.html`](docs/concept/vision_02_secretary_autopilot.html) — "secretary" briefing autopilot

## Architecture

| Layer | Source of truth |
|---|---|
| LLM / QA control | OpenAI-compatible runtime selected through environment variables. The active runtime model is exposed by the safe health endpoint; the UI remains provider-neutral. Deterministic rule-based fallback when unavailable. |
| Social intake | Apify-backed Hunter flow + manual transcript import |
| Data store | Supabase (REST) |
| Framework | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Charts | Recharts |
| Deploy | Vercel (2 scheduled cron routes) |

**Design stance — API-first by choice.** Automated video-platform API discovery is intentionally **disabled**; legacy discovery routes return `410 Gone`. New material comes only from Apify-backed intake or manually verified transcripts. The app does not claim to discover or transcribe content through undisclosed platform access. Seed data is deliberately empty rather than padded with fake cases.

**Route security.** Public reviewer routes (`/`, `/studio`, `/status`, `GET /api/claims`, `POST /api/chat`, content generation) are open but per-IP rate-limited to protect free-tier LLM cost. Write / paid-intake routes (`POST /api/hunter/run`, `manual-claim`, `opponent-import`, `truths`) are **fail-closed**: they return `401` until `APP_ADMIN_TOKEN` is set on the server. The assistant treats app context as data (prompt-injection hardened) and never echoes secrets.

### Core routes

| Route | Purpose |
|---|---|
| `/` | Public evaluator / showcase page |
| `/studio` | Full claim review & content-production studio |
| `/status` | Public status & data-honesty overview |
| `/lead-magnets/anti-heisshunger` | Anti-craving lead-magnet landing page |
| `/api/health` | Safe machine-readable health endpoint (reports config presence, never secrets) |

## Local setup

```bash
npm install
npm run dev      # http://localhost:3217
```

### Environment

The app runs with **no** configuration — intake shows honest empty states and analysis uses the rule-based fallback. To enable the full pipeline, create `.env.local` (never commit real keys):

```bash
# LLM / QA control layer (any OpenAI-compatible endpoint)
OPENAI_BASE_URL=https://your-openai-compatible-endpoint.example/v1
OPENAI_API_KEY=your-api-key
LLM_MODEL=your-model-id
LLM_TIMEOUT_MS=25000

# Social intake (Apify)
APIFY_TOKEN=your-apify-token

# Data store (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin token — REQUIRED to unlock write/paid-intake routes (fail-closed without it)
# Also enable a Vercel cron secret in production.
APP_ADMIN_TOKEN=choose-a-strong-admin-token
CRON_SECRET=choose-a-strong-cron-secret
```

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e         # Playwright smoke
npm run test:e2e:auth    # studio auth gate
npm run audit:source     # forbidden source/copy patterns
npm run audit:production # live API, PDF, claims, truths and copy
npm run audit:submission # full one-command submission gate
```

See [`docs/SUBMISSION_AUDIT.md`](docs/SUBMISSION_AUDIT.md) for the exact gate, report files and environment variables.

## Honest limits

- This is a live, tested MVP / proof-of-work — **not** a fully hardened SaaS.
- Studio protection is a token-gated MVP mode; full multi-user auth is future work.
- Real provider tests depend on the configured OpenAI-compatible endpoint and available Apify credit.
- Automatic platform discovery is deliberately disabled; the market-intelligence dashboard is a concept stage.

## Tech stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Recharts · Apify client · Supabase · Playwright · deployed on Vercel.
