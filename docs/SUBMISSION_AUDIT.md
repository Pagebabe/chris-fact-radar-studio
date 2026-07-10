# Submission Audit

Dieses Repository besitzt ein reproduzierbares Abgabe-Gate. Es prüft nicht nur, ob die App baut, sondern auch typische Fehlerklassen, die bei einer Demo besonders schädlich sind: Suchseiten statt Originalquellen, veraltete Browserdaten, widersprüchliche Produkttexte, Testdaten in der Produktions-API und Abweichungen zwischen lokaler Implementierung und Live-System.

## Source of Truth

| Datentyp | Verbindliche Quelle |
|---|---|
| Claims | `GET /api/claims` beziehungsweise der konfigurierte Supabase Store |
| öffentliche Fallzahlen | dynamisch aus den öffentlichen Claims |
| Videoquelle | `claim.sourceVideo.url` |
| Video-Zeitstempel | direkte Claim-URL |
| Chris-Wissen | `GET /api/truths` |
| Evidence | Evidence-Einträge des Claims |
| LLM-Status und Modell | `GET /api/health` |
| E-Book | `/anti-heisshunger-system.pdf` |

LocalStorage ist nur ein Browser-Cache. Sobald der gemeinsame Store verbunden ist, dürfen aktuelle Serverdaten nicht durch alte lokale Claims überschrieben werden.

## Befehle

```bash
npm run audit:source
npm run audit:production
npm run audit:submission
```

### `npm run audit:source`

Prüft Produktionscode und README auf kritische Muster:

- YouTube-Suchergebnis-URLs
- Test-Videoquellen
- veraltete Opus-Marken
- feste README-Fallzahlen
- versehentlich eingecheckte Secrets

Stärkere, aber nicht immer eindeutig falsche Aussagen werden als Warnung ausgegeben.

### `npm run audit:production`

Prüft standardmäßig:

```text
https://chris-fact-radar.vercel.app
```

Eine andere Umgebung kann gesetzt werden:

```bash
AUDIT_BASE_URL=https://example.vercel.app npm run audit:production
```

Geprüft werden:

- `/api/claims`
- `/api/truths`
- `/api/health`
- E-Book-PDF
- Startseite, Studio, Status, Lead-Magnet und Application Brief
- direkte Videoquellen
- kanonische URLs und Zeitstempel für `debate-001` bis `debate-008`
- doppelte IDs und fehlende Pflichtfelder
- Testdaten im Chris-Wissen
- veraltete öffentliche Produkttexte
- versehentlich offengelegte Secrets

### `npm run audit:submission`

Führt die Abgabe-Gates in einer festen Reihenfolge aus:

1. Source Audit
2. ESLint
3. TypeScript-Typecheck
4. Production Build
5. Playwright E2E
6. geschützter Auth-Smoke-Test
7. Production Audit

Der Lauf stoppt beim ersten kritischen Fehler und liefert Exit-Code 1.

Für CI oder Offline-Arbeit kann ausschließlich der externe Production-Audit übersprungen werden:

```bash
SKIP_PRODUCTION_AUDIT=1 npm run audit:submission
```

Ein übersprungener Production-Audit ist kein vollständiger Abgabenachweis.

## Reports

Die Audits schreiben maschinenlesbare und lesbare Reports nach `artifacts/`:

```text
artifacts/source-audit.json
artifacts/source-audit.md
artifacts/production-audit.json
artifacts/production-audit.md
artifacts/submission-audit.json
artifacts/submission-audit.md
```

Die Reports enthalten keine Tokens oder geheimen Header.

## Statusklassen

- `PASS`: Prüfung erfolgreich
- `WARN`: auffällig, aber nicht automatisch ein Abgabe-Blocker
- `FAIL`: kritischer Fehler, Exit-Code 1
- `SKIPPED`: Prüfung wurde bewusst nicht ausgeführt und gilt nicht als Nachweis

## Finaler Ablauf

```bash
npm ci
npx playwright install --with-deps chromium
npm run audit:submission
```

Danach die drei Golden Cases zusätzlich einmal in einem frischen Browser öffnen:

1. Debatten-Rebuttal mit direktem YouTube-Zeitstempel
2. echtes YouTube-Crawler-Ergebnis
3. normaler Web-Claim ohne iframe

Automatisierte Tests reduzieren Fehlerklassen. Sie beweisen nicht, dass Software plötzlich eine metaphysische Form von Fehlerfreiheit erreicht hat. Sie beweisen, was konkret geprüft wurde.
