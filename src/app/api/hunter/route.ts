import { NextResponse } from "next/server";
import { DEFAULT_HUNTER_PROFILES } from "@/lib/hunter";
import { isBlockedSourceText } from "@/lib/public-claims";
import { hasEvaluationReadySpokenWord } from "@/lib/spoken-word";
import { loadHunterCandidates, loadHunterProfiles, loadHunterRuns, storeConfigured } from "@/lib/store";
import type { HunterCandidate } from "@/lib/types";

export async function GET() {
  const configured = storeConfigured();
  if (!configured) {
    return NextResponse.json({
      configured,
      profiles: DEFAULT_HUNTER_PROFILES,
      candidates: [],
      runs: [],
    });
  }

  const [profiles, candidates, runs] = await Promise.all([
    loadHunterProfiles(),
    loadHunterCandidates(),
    loadHunterRuns(),
  ]);

  return NextResponse.json({
    configured,
    profiles: profiles?.length ? profiles : DEFAULT_HUNTER_PROFILES,
    candidates: (candidates ?? []).filter(isVisibleHunterCandidate),
    runs: runs ?? [],
  });
}

function isVisibleHunterCandidate(candidate: HunterCandidate) {
  if (candidate.status === "rejected") return false;
  if (!hasEvaluationReadySpokenWord(candidate)) return false;
  if (candidate.language && candidate.language !== "de") return false;
  if ((candidate.speakingScore ?? 0) < 45) return false;
  if ((candidate.claimClarity ?? 0) < 55) return false;
  if (candidate.contentKind !== "talking_claim") return false;
  if ((candidate.qualityScore ?? 0) < 72) return false;
  if (isBlockedSourceText([candidate.creator, candidate.title, candidate.url].filter(Boolean).join(" "))) return false;
  return true;
}
