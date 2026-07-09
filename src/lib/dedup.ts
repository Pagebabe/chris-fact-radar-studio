import type { ClaimItem } from "./types";

export type DuplicateMatch = { id: string; claim: string; similarity: number };

const DUPLICATE_THRESHOLD = 0.72;

export function findDuplicate(claimText: string, existing: ClaimItem[]): DuplicateMatch | null {
  const candidate = normalize(claimText);
  if (!candidate) return null;

  let best: DuplicateMatch | null = null;
  for (const item of existing) {
    const similarity = diceCoefficient(candidate, normalize(item.claim));
    if (similarity >= DUPLICATE_THRESHOLD && (!best || similarity > best.similarity)) {
      best = { id: item.id, claim: item.claim, similarity: Math.round(similarity * 100) / 100 };
    }
  }
  return best;
}

export function claimSimilarity(a: string, b: string): number {
  return diceCoefficient(normalize(a), normalize(b));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let overlap = 0;
  for (const [gram, countA] of bigramsA) {
    const countB = bigramsB.get(gram) ?? 0;
    overlap += Math.min(countA, countB);
  }
  const totalA = [...bigramsA.values()].reduce((sum, count) => sum + count, 0);
  const totalB = [...bigramsB.values()].reduce((sum, count) => sum + count, 0);
  return (2 * overlap) / (totalA + totalB);
}

function bigrams(text: string): Map<string, number> {
  const grams = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}
