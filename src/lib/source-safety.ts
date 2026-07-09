import type { TruthRecord, VideoCategory } from "./types";
import bundle from "@/data/chris-truths.json";

/**
 * Sprecher-Sicherheit einer Chris-Quelle.
 *
 * Auto-Untertitel haben keine Sprecher-Trennung. In Reaktions-/Debatten-Videos
 * laeuft die Gegenmeinung ungetrennt im Text mit — solche Videos duerfen NIE als
 * "Chris' Position" oder Zitat gelesen werden, sonst wird die widerlegte
 * Falschaussage faelschlich Chris zugeschrieben. Nur eigenstaendige Ratgeber
 * (solo_advice) sind fuer Positionen freigegeben.
 */

// HOCH-Risiko: Live-Dialog, zwei Stimmen
const DEBATE = ["debattiert", "im verhör", " vs ", " vs.", "vs christian", "christian wolf vs",
  "eskalation", "eskaliert", "aktivisten", "fordere arda", "streckt sein", "doppelmoral", "wirft mir"];
// MITTEL-Risiko: Chris kontrolliert, aber fremde Aussagen eingebettet
const REACTION = ["reagiert", "reaction", "antwort", "exposed", "kritisiert", "entlarvt", "blamiert",
  "hetzt", "story", "der fall", "verliert vor gericht", "kritisiert mich", "trauen", "manipulation", "am punkt vorbei"];
// Kein Fachinhalt
const VLOG = ["room tour", "las vegas", "vegas", "romina", "ehrliches gespräch", "lebenslektionen",
  "vaterrolle", "arbeitstag", "von der fibo", "roh gang", "fetzen mcdonalds", "besuche meinen sohn", "onlyfans"];

export function classifyVideo(title: string): { category: VideoCategory; safeForPositions: boolean } {
  const t = (title || "").toLowerCase();
  if (VLOG.some((k) => t.includes(k))) return { category: "vlog", safeForPositions: false };
  if (DEBATE.some((k) => t.includes(k))) return { category: "debate_interview", safeForPositions: false };
  if (REACTION.some((k) => t.includes(k))) return { category: "reaction", safeForPositions: false };
  return { category: "solo_advice", safeForPositions: true };
}

/**
 * Ist dieser Truth-Datensatz als Chris' Position freigegeben?
 * Bevorzugt das explizite Flag; faellt sonst auf die Titel-Heuristik zurueck,
 * damit auch Altdaten ohne Flag nicht ungeprueft durchrutschen.
 */
export function truthIsSafe(truth: Pick<TruthRecord, "safeForPositions" | "videoTitle">): boolean {
  if (typeof truth.safeForPositions === "boolean") return truth.safeForPositions;
  return classifyVideo(truth.videoTitle).safeForPositions;
}

// Sichtbarer Hinweis an JEDER KB-abgeleiteten Ausgabe.
export const POSITION_DISCLAIMER =
  "Automatisch aus YouTube-Untertiteln, maschinell und nicht menschlich abgenommen — vor Nutzung am verlinkten Video prüfen.";

// Gebuendelte, freigegebene Chris-Aussagen (nur Solo-Videos) als eingebaute
// Truth-Basis — damit die App die Wissensbasis auch ohne Store nutzt (Proof of Work).
export const bundledTruths: TruthRecord[] = (bundle as unknown as TruthRecord[]).map((t) => ({
  ...t,
  publishedAt: t.publishedAt ?? "",
  category: "solo_advice" as const,
  safeForPositions: true,
  origin: "kb-bundle" as const,
}));
