# Evaluator Guide

Kuratierter Bewerbungsprototyp — kein autonomes Fact-Checking-System.

**Direkte Links:**

- Live-App: https://chris-fact-radar.vercel.app
- Studio (Claim-Review): https://chris-fact-radar.vercel.app/studio — stärkster Demo-Fall: Claim `debate-006`
- Statusseite (Daten-Ehrlichkeit): https://chris-fact-radar.vercel.app/status
- E-Book (Lead-Magnet): https://chris-fact-radar.vercel.app/lead-magnets/anti-heisshunger
- Originalquelle von `debate-006`: https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1802s

## Welches Problem wird gelöst?

Fitness- und Ernährungs-Content enthält laufend prüfbare Behauptungen. Der Fact Radar macht aus realen Aussagen strukturierte, belegbewusste Review-Fälle: Originalfundstelle, normalisierter Claim, Evidence und redaktionelle Entscheidung bleiben sichtbar getrennt.

## Wie funktioniert die Pipeline?

```text
Originalquelle
→ prüfbarer Claim
→ Evidence und Kontext
→ redaktionelle Einordnung
→ menschliche Freigabe
```

Was davon ist kuratiert, was automatisch:

- **Kuratiert:** Die öffentlichen Demo-Claims sind manuell aus realen Quellen normalisiert (Debattenvideo mit Timestamp-Links, dokumentierte Web-Behauptungen). Evidence-Quellen sind manuell zugeordnet, jede mit Begründung (`assignmentReason`).
- **Automatisch:** Strukturierung, Anzeige, Scoring-Heuristiken und Entwurfstexte (LLM oder deterministischer Fallback). Es gibt **keine** vollautomatische Claim-Erkennung, keine automatische Evidenzvalidierung und keine automatische Transkription über die deklarierten Apify-/manuellen Wege hinaus.

## Wie wird Evidence eingeordnet?

Jede Quelle trägt eine Stance: **stützt**, **widerspricht** oder **Kontext**. Kontext-Evidence ordnet einen Claim ein, bestätigt oder widerlegt ihn aber nicht automatisch — deshalb zeigt die UI dafür das Label „Kontext — keine Bestätigung". Aus „keine Bestätigung" folgt nicht „widerlegt".

## Warum ist `debate-006` prüfenswert?

Der Fall ist prüfenswert, weil er eine verbreitete argumentative Abkürzung sichtbar macht: „natürlich = gut". Originalaussage (Stevia sei spannender, *weil* natürlich), begrifflicher Kontext (die im Gespräch selbst benannte Gleichsetzung von Natürlichkeit und gut) und sachlich-regulatorische Einordnung lassen sich sauber voneinander trennen. Die konkreten Quellen stehen in der Evidence des Falls, jeweils mit Zuordnungsbegründung.

## Warum entscheidet der Mensch final?

Das System liefert Struktur, Belege und Entwürfe — es fällt kein Urteil. Jeder Claim wird erst durch eine menschliche Entscheidung (Accept/Reject mit sichtbarem `decidedAt`) freigegeben. Öffentliche Besucher können alles einsehen, aber nichts an den geteilten Daten verändern; Schreibpfade sind fail-closed gesperrt.

## Grenzen

Siehe [ARCHITECTURE_AND_LIMITS.md](ARCHITECTURE_AND_LIMITS.md) und die „Honest limits" im [README](../README.md).
