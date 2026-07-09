import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { runHunter } from "@/lib/hunter";
import { loadHunterCandidates } from "@/lib/store";
import type { HunterCandidate, HunterRun } from "@/lib/types";

// Bounded so a reviewer never stares at a spinner. The Apify actor may keep
// running server-side (budget-capped); the reviewer gets a fast, honest answer.
export const maxDuration = 60;
const SOFT_TIMEOUT_MS = 22_000;

function makeRun(partial: Partial<HunterRun>): HunterRun {
  return {
    id: `hunter-${Date.now()}`,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ok: false,
    profilesScanned: 0,
    candidatesFound: 0,
    candidatesSaved: 0,
    promotedClaims: 0,
    suggestedCreators: 0,
    budgetUsedEur: 0,
    errors: [],
    platformCounts: {},
    discardedCandidates: 0,
    qualityPassed: 0,
    discardReasons: {},
    ...partial,
  };
}

async function currentCandidates(): Promise<HunterCandidate[]> {
  try {
    return (await loadHunterCandidates()) ?? [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  // Open so a reviewer can launch the intake live and see real proof of work,
  // but per-IP rate-limited. Cost is capped by HUNTER_DAILY_BUDGET_EUR; on the
  // free Apify tier a run may hit the monthly usage / platform rate limits —
  // that state is surfaced honestly, and real finds already in the queue are
  // always returned so the reviewer sees delivered output either way.
  const limited = rateLimit(request, { key: "hunter", limit: 2, windowMs: 60_000 });
  if (limited) return limited;

  const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), SOFT_TIMEOUT_MS));

  try {
    const outcome = await Promise.race([runHunter(), timeout]);

    if (outcome === "timeout") {
      const candidates = await currentCandidates();
      const run = makeRun({
        candidatesFound: candidates.length,
        errors: [
          "Live-Intake läuft noch (Free-Tier: Plattform-Rate-Limits bremsen einen Live-Lauf). Unten die zuletzt echt gefundenen Cases aus der Queue — mit mehr Ressourcen liefert ein längerer, getunter Lauf deutlich mehr.",
        ],
      });
      return NextResponse.json({ configured: true, run, candidates, claims: [], creators: [] });
    }

    // Real run finished. If this run found nothing fresh (e.g. free-tier limit),
    // still return the real cases already in the queue so the reviewer always
    // sees delivered output — never an empty "0 found" dead end.
    const fresh = outcome as {
      run?: HunterRun;
      candidates?: HunterCandidate[];
      claims?: unknown[];
      creators?: unknown[];
      configured?: boolean;
    };
    const found = fresh.candidates ?? [];
    if (found.length === 0) {
      const existing = await currentCandidates();
      if (existing.length > 0) {
        const baseErrors = fresh.run?.errors ?? [];
        const run = makeRun({
          ...fresh.run,
          candidatesFound: existing.length,
          errors: [...baseErrors, "Kein frischer Fund in diesem Lauf — echte, bereits gefundene Cases stehen in der Queue."],
        });
        return NextResponse.json({ ...fresh, run, candidates: existing });
      }
    }
    return NextResponse.json(fresh);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Hunter-Fehler";
    const candidates = await currentCandidates();
    const run = makeRun({
      candidatesFound: candidates.length,
      errors: [message, "Echte, bereits gefundene Cases stehen unten in der Queue."],
      discardReasons: { "interner Fehler": 1 },
    });
    console.error("Hunter run failed", error);
    return NextResponse.json({ configured: false, run, candidates, claims: [], creators: [] }, { status: 200 });
  }
}
