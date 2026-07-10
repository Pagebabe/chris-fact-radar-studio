import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { DEBATE_CANONICAL_URLS, DEBATE_VIDEO_ID } from "@/lib/debate-claims";
import { upsertClaims } from "@/lib/store";
import type { ClaimItem, SourceVideo } from "@/lib/types";

const baseVideo: SourceVideo = {
  id: `yt-${DEBATE_VIDEO_ID}`,
  platform: "Debatten-Rebuttal",
  sourceMode: "live",
  url: DEBATE_CANONICAL_URLS["debate-001"],
  creator: "{ungeskriptet} by Ben",
  title: "Streit eskaliert komplett: Christian Wolf vs Jan Leyk",
  description: "Kuratierter Debattenfall aus Nutzertranskript. Nicht als normaler Gegner-Claim behandeln.",
  publishedAt: "2025-08-01T00:00:00Z",
  views: 1500000,
  likes: 26865,
  comments: 0,
  thumbnail: "",
  transcriptSnippet: "Kuratierte Aussage aus Debatte.",
  transcriptSource: "curated",
};

const seeds = [
  ["debate-001", "Supplements", "Jan Leyk wertet Produkte, Marketing und Person pauschal ab, ohne die Kritik zuerst in konkrete überprüfbare Punkte zu trennen.", "unclear", "00:02:19"],
  ["debate-002", "Supplements", "Jan Leyk behauptet, More sei nur ein Durchschnittsprodukt mit besserem Marketing als die Konkurrenz.", "unclear", "00:04:13"],
  ["debate-003", "Supplements", "Jan Leyk sagt, Flavor-Produkte und Sirups würden das Gehirn industriell austricksen.", "misleading", "00:13:05"],
  ["debate-004", "Supplements", "Jan Leyk stellt Sucralose wegen möglicher Veränderungen des Darmmikrobioms als problematisch dar.", "misleading", "00:20:03"],
  ["debate-005", "Supplements", "Jan Leyk sagt, More-Produkte würden dem Körper im Vergleich zu Wasser eher schaden oder ihn negativ verändern.", "misleading", "00:21:47"],
  ["debate-006", "Supplements", "Jan Leyk stellt Stevia als besser dar, weil es natürlich ist, und verbindet Natürlichkeit grundsätzlich mit gut.", "likely_false", "00:30:00"],
  ["debate-007", "Fettverlust", "Jan Leyk behauptet, Menschen bräuchten zum Abnehmen keine Produkte, sondern müssten nur den Schalter im Kopf umlegen.", "misleading", "02:02:16"],
  ["debate-008", "Fettverlust", "Jan Leyk reduziert Rauchen und Abnehmen stark auf einfache Willenskraft nach dem Motto: einfach aufhören beziehungsweise weniger essen.", "misleading", "01:41:32"],
] as const;

function makeClaim(seed: typeof seeds[number]): ClaimItem {
  const [id, category, claim, verdict, timestamp] = seed;
  const why = "Kuratierter Rebuttal-Fall aus einer Debatte. Die Aussage ist für Chris Fact Radar relevant, aber von normalen externen Gegner-Claims zu trennen.";
  return {
    id,
    stage: "ready",
    category,
    claim,
    riskScore: verdict === "likely_false" ? 86 : 82,
    relevanceScore: 92,
    checkworthiness: 88,
    verdict,
    confidence: verdict === "unclear" ? 76 : 82,
    whyItMatters: why,
    responseDraft: "Ruhig bleiben, die Aussage konkretisieren und dann prüfen: Was ist belegt, was ist Meinung, was ist pauschal formuliert?",
    analysisSource: "llm",
    sourceVideo: { ...baseVideo, url: DEBATE_CANONICAL_URLS[id], transcriptSnippet: `Kuratierte Stelle ${timestamp}` },
    evidence: [],
    responseBlocks: {
      hook: claim,
      opener: "Das ist ein Debatten-Rebuttal, kein normaler Gegner-Fund.",
      argumentation: [why, "Der wichtigste Schritt ist, pauschale Kritik in überprüfbare Einzelbehauptungen zu zerlegen."],
      sources: [`Nutzertranskript ${timestamp}`],
    },
  };
}

export async function GET(request: Request) {
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "seed-debate-cases") {
    return NextResponse.json({ ok: false, error: "Use confirm=seed-debate-cases." }, { status: 400 });
  }
  const claims = seeds.map(makeClaim);
  const saved = await upsertClaims(claims);
  return NextResponse.json({ ok: Boolean(saved), saved, count: claims.length, claims });
}
