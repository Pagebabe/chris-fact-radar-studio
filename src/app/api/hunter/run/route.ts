import { NextResponse } from "next/server";
import { runHunter } from "@/lib/hunter";
import type { HunterRun } from "@/lib/types";

export const maxDuration = 300;

export async function POST() {
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
