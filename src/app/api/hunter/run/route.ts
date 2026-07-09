import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { runHunter } from "@/lib/hunter";
import type { HunterRun } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  // Open so a reviewer can launch the intake live and see real proof of work,
  // but per-IP rate-limited. Cost is capped by HUNTER_DAILY_BUDGET_EUR; on the
  // free Apify tier a run may hit the monthly usage / platform rate limits —
  // that state is returned honestly in the run result, not hidden.
  const limited = rateLimit(request, { key: "hunter", limit: 2, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const result = await runHunter();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Hunter-Fehler";
    const run: HunterRun = {
      id: `hunter-error-${Date.now()}`,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      ok: false,
      profilesScanned: 0,
      candidatesFound: 0,
      candidatesSaved: 0,
      promotedClaims: 0,
      suggestedCreators: 0,
      budgetUsedEur: 0,
      errors: [message],
      platformCounts: {},
      discardedCandidates: 0,
      qualityPassed: 0,
      discardReasons: { "interner Fehler": 1 },
    };

    console.error("Hunter run failed", error);
    return NextResponse.json({ configured: false, run, candidates: [], claims: [], creators: [] }, { status: 200 });
  }
}
