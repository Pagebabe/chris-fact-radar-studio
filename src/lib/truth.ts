import { claimSimilarity } from "./dedup";
import type { ChrisPosition, TruthRecord } from "./types";

// Ab dieser Bigram-Ähnlichkeit gilt eine Chris-Position als thematisch relevant
// für einen fremden Claim. Bewusst niedrig: die Truth Base ist deutschsprachig
// und thematisch eng, ein Teil-Overlap reicht als „Chris hat dazu was gesagt".
const MATCH_THRESHOLD = 0.24;

/**
 * Findet die am besten passende Chris-Position zu einem fremden Claim.
 * Rein lokal (Bigram-Dice über {@link claimSimilarity}) — kein LLM-Call,
 * damit das Matching auch ohne Token-Budget in jeder Analyse läuft.
 */
export function matchClaimToTruths(claim: string, truths: TruthRecord[]): ChrisPosition | null {
  if (!claim.trim() || truths.length === 0) return null;

  let best: { truth: TruthRecord; similarity: number } | null = null;
  for (const truth of truths) {
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
  };
}
