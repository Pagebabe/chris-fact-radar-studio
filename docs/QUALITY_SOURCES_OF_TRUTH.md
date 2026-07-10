# Quality Sources of Truth

## Server gewinnt

Wenn Supabase konfiguriert ist, sind die vom Server geladenen Claims maßgeblich. Browser-Cache, Seeds, Fixtures und Fallback-Daten dürfen sie nicht still überschreiben.

## Claims

- maßgeblich: `/api/claims`
- öffentliche Filterung: zentrale Public-Claim-Regeln
- Videoquelle: `sourceVideo.url`
- Zeitstempel: Bestandteil der direkten Watch-URL
- bekannte Debattenfälle: `src/lib/debate-claims.ts`

## Chris-Wissen

- maßgeblich: `/api/truths`
- automatisch extrahierte Aussagen bleiben als automatisch erzeugt erkennbar
- Testeinträge und Platzhalter dürfen nicht in Produktion erscheinen

## LLM

- maßgeblich: `/api/health`
- Branding bleibt providerneutral
- konkrete Modellnamen werden nur als verifizierter Laufzeitstatus angezeigt
- Fallback-Ausgaben müssen als Fallback markiert werden

## Öffentliche Zahlen

Fall-, Quellen- und Kategorie-Zahlen werden aus dem aktuellen öffentlichen Datensatz berechnet. Sie werden nicht mehrfach in README, UI und Loom fest verdrahtet.

## Browser-Cache

LocalStorage dient nur zur Wiederherstellung lokaler Arbeit, wenn kein gemeinsamer Store verfügbar ist. Bei verbundenem Store gilt:

1. Serverdaten gewinnen bei ID-Konflikten.
2. bekannte ungültige Such-URLs werden normalisiert oder verworfen.
3. beschädigtes JSON darf die App nicht blockieren.
4. Cache-Daten dürfen keine automatischen, unbemerkten Server-Schreibvorgänge mit veraltetem Inhalt auslösen.
