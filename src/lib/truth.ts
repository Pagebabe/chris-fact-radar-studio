import { claimSimilarity } from "./dedup";
import { POSITION_DISCLAIMER, bundledTruths, truthIsSafe } from "./source-safety";
import type { ChrisPosition, TruthRecord } from "./types";

// Ab dieser Bigram-Ähnlichkeit gilt eine Chris-Position als thematisch relevant
// für einen fremden Claim. Bewusst niedrig: die Truth Base ist deutschsprachig
// und thematisch eng, ein Teil-Overlap reicht als „Chris hat dazu was gesagt".
const MATCH_THRESHOLD = 0.24;

/**
 * Findet die am besten passende Chris-Position zu einem fremden Claim.
 * Rein lokal (Bigram-Dice über {@link claimSimilarity}) — kein LLM-Call,
 * damit das Matching auch ohne Token-Budget in jeder Analyse läuft.
 *
 * Sicherheit: Es werden die uebergebenen Store-Truths mit der eingebauten
 * KB-Basis (nur Solo-Videos) zusammengefuehrt — aber NUR sprecher-sichere
 * Datensaetze gematcht. Reaktions-/Debatten-Quellen sind ausgeschlossen, damit
 * keine zitierte Gegenmeinung als Chris' Position auftaucht. Jede Ausgabe traegt
 * den maschinellen Disclaimer.
 */
export function matchClaimToTruths(claim: string, truths: TruthRecord[]): ChrisPosition | null {
  if (!claim.trim()) return null;

  // Store-Truths + eingebaute KB, dedupliziert, dann auf sichere Quellen gefiltert
  const byId = new Map<string, TruthRecord>();
  for (const t of [...truths, ...bundledTruths]) byId.set(t.id, t);
  const candidates = Array.from(byId.values()).filter(truthIsSafe);
  if (candidates.length === 0) return null;

  let best: { truth: TruthRecord; similarity: number } | null = null;
  for (const truth of candidates) {
    // gegen Statement UND Zitat matchen — das Zitat trifft oft die Wortwahl besser
    const similarity = Math.max(
      claimSimilarity(claim, truth.statement),
      truth.quote ? claimSimilarity(claim, truth.quote) : 0,
    );
    if (similarity >= MATCH_THRESHOLD && (!best || similarity > best.similarity)) {
      best = { truth, similarity };
    }
  }
  if (!best) return null;

  return {
    statement: best.truth.statement,
    quote: best.truth.quote,
    url: best.truth.url,
    videoTitle: best.truth.videoTitle,
    topic: best.truth.topic,
    similarity: Math.round(best.similarity * 100) / 100,
    safeForPositions: true,
    startSeconds: best.truth.startSeconds,
    disclaimer: POSITION_DISCLAIMER,
  };
}
