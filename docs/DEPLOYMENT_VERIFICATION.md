# Deployment Verification

## Verifizierter Code-Stand

Der vollständige Repository-Stand wurde über GitHub Actions geprüft. Das Gate umfasst:

- Interaktions- und API-Sicherheitsaudit
- ESLint
- TypeScript-Typecheck
- Next.js-Produktionsbuild
- Dependency-Audit auf hohe Schwachstellen
- öffentliche Playwright-Prüferreise
- geschützte Auth-Playwright-Tests

## Produktionsnachweis

Nach jedem Production-Deploy muss der ausgelieferte Commit mit dem erwarteten Git-Commit verglichen werden:

```bash
AUDIT_EXPECTED_COMMIT=$(git rev-parse HEAD) npm run audit:production
```

Der Health-Endpunkt `/api/health` veröffentlicht dafür ausschließlich sichere Build-Metadaten:

- gekürzte Commit-SHA
- Git-Ref
- Umgebung

Keine Secrets oder Zugangsdaten werden ausgegeben.

## Finales Abgabe-Gate

```bash
npm ci
npx playwright install --with-deps chromium
npm run audit:submission
```

Ein grüner lokaler oder CI-Build allein beweist nicht, dass Vercel denselben Commit ausliefert. Der Production-Audit ist deshalb ein eigener Pflichtschritt.
