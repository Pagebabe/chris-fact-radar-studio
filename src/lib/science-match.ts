import { claimSimilarity } from "./dedup";
import type { ClaimItem, ScienceItem } from "./types";

// Verbindet den Wissenschafts-Brief mit der Vollprüfung — rein lokal
// (Bigram-Dice wie truth.ts), kein LLM-Call. Ein Topic-Treffer wiegt mit,
// weil ScienceItems kurz sind und reine Text-Ähnlichkeit dann unterschätzt.
const MATCH_THRESHOLD = 0.16;
const TOPIC_BONUS = 0.1;

function scoreAgainst(claimText: string, category: string, item: ScienceItem): number {
  const text = `${item.title} ${item.summary}`;
  let score = claimSimilarity(claimText, text);
  const topic = item.topic.toLowerCase();
  if (category.toLowerCase().includes(topic) || claimText.toLowerCase().includes(topic)) {
    score += TOPIC_BONUS;
  }
  return score;
}

/** Passende Studien aus dem Wissenschafts-Brief zu einem Fall (Top 2). */
export function matchScienceToClaim(claimText: string, category: string, items: ScienceItem[]): ScienceItem[] {
  if (!claimText.trim() || items.length === 0) return [];
  return items
    .map((item) => ({ item, score: scoreAgainst(claimText, category, item) }))
    .filter((entry) => entry.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((entry) => entry.item);
}

/** Gegenrichtung: offene Fälle, zu denen eine Studie passt (für die Science-Karten). */
export function matchClaimsToScience(item: ScienceItem, claims: ClaimItem[]): ClaimItem[] {
  const open = claims.filter((claim) => claim.decision !== "rejected" && claim.stage !== "rejected");
  return open
    .map((claim) => ({ claim, score: scoreAgainst(claim.claim, claim.category, item) }))
    .filter((entry) => entry.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.claim);
}
