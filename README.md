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

The live app currently carries **20 reviewed cases across 13 sources**.

## Market-intelligence layer (concept)

The fact-checking crawl produces a structured market signal as a byproduct. Two concept views show where this goes — clearly marked as a build-out stage, not shipped features:

- [`docs/concept/vision_01_radar_dashboard.html`](docs/concept/vision_01_radar_dashboard.html) — niche radar / trend dashboard
- [`docs/concept/vision_02_secretary_autopilot.html`](docs/concept/vision_02_secretary_autopilot.html) — "secretary" briefing autopilot

## Architecture

| Layer | Source of truth |
|---|---|
| LLM / QA control | OpenAI-compatible proxy (`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `LLM_MODEL`) with a deterministic fallback |
| Social intake | Apify-backed Hunter flow + manual transcript import |
| Data store | Supabase (REST) |
| Framework | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Charts | Recharts |
| Deploy | Vercel (2 scheduled cron routes) |

**Design stance — API-first by choice.** Automated video-platform API discovery is intentionally **disabled**; legacy discovery routes return `410 Gone`. New material comes only from Apify-backed intake or manually verified transcripts. The app does not claim to discover or transcribe content through undisclosed platform access. Seed data is deliberately empty rather than padded with fake cases.

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
# LLM / QA control layer (OpenAI-compatible proxy)
OPENAI_BASE_URL=http://127.0.0.1:3456
OPENAI_API_KEY=your-proxy-token
LLM_MODEL=opus
LLM_TIMEOUT_MS=25000

# Social intake (Apify)
APIFY_TOKEN=your-apify-token

# Data store (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Studio protection (token-gated MVP mode)
APP_ADMIN_TOKEN=choose-a-local-admin-token
```

## Validation

```bash
npm run lint
npm run build
npm run test:e2e         # Playwright smoke
npm run test:e2e:auth    # studio auth gate
```

## Honest limits

- This is a live, tested MVP / proof-of-work — **not** a fully hardened SaaS.
- Studio protection is a token-gated MVP mode; full multi-user auth is future work.
- Real provider tests depend on the local Opus proxy and available Apify credit.
- Automatic platform discovery is deliberately disabled; the market-intelligence dashboard is a concept stage.

## Tech stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Recharts · Apify client · Supabase · Playwright · deployed on Vercel.
