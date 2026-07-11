# Architecture and Limits

Dieser Prototyp demonstriert einen redaktionellen Review-Workflow: `Originalquelle → prüfbarer Claim → Evidence und Kontext → redaktionelle Einordnung → menschliche Freigabe`. Details zur Bedienung im [EVALUATOR_GUIDE.md](EVALUATOR_GUIDE.md), technischer Aufbau im [README](../README.md).

## Zeitliche Einordnung von Evidence

Evidence kann vor oder nach der ursprünglichen Aussage veröffentlicht worden sein. Spätere Quellen werden als nachträgliche Einordnung behandelt und nicht so dargestellt, als hätten sie dem Sprecher zum ursprünglichen Zeitpunkt zwingend vorliegen müssen.

Konkret in den kuratierten Demo-Daten: Das Debattenvideo wurde am 19.07.2025 veröffentlicht; einzelne zugeordnete Belege datieren später (2026). Das Veröffentlichungsdatum der Quelle ist dabei nicht automatisch der Aussagezeitpunkt — der exakte Aufnahme- oder Äußerungszeitpunkt wird nur dann gleichgesetzt, wenn er belegt ist. Alle Quellen tragen ein eigenes Datum (`date`, `publishedAt`) sowie Zugriffs- und Verifikationszeitpunkte (`accessedAt`, `verifiedAt`), sodass die Reihenfolge prüfbar bleibt.

## Abgrenzung zu Forschungs- und Produktionssystemen

Forschungs- und Produktionssysteme verwenden für Claim Detection, Retrieval, Re-Ranking und Stance Classification häufig spezialisierte Modelle und Benchmarks. Dieser Bewerbungsprototyp demonstriert nicht diese Skalierung, sondern einen nachvollziehbaren redaktionellen Workflow für eine konkrete Content-Domäne mit sichtbarer Provenienz und menschlicher Entscheidungskontrolle.

## Grenzen

- Proof-of-Work-Produkt, kein multi-tenant-gehärtetes SaaS.
- Claims und Evidence der öffentlichen Demo sind kuratiert; es gibt keine vollautomatische Claim-Erkennung oder Evidenzvalidierung.
- Kontext-Evidence ordnet ein — sie bestätigt oder widerlegt einen Claim nicht automatisch.
- Echte Provider- und Apify-Läufe hängen von konfigurierten Zugängen, Quota und externer Diensteverfügbarkeit ab.
- Automatische Plattform-Discovery außerhalb der deklarierten Apify-/manuellen Wege ist deaktiviert.
