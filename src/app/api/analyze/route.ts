import { NextResponse } from "next/server";
import { analyzeVideoSmart } from "@/lib/analyze";
import { loadTruths } from "@/lib/store";
import type { SourceVideo, TruthRecord } from "@/lib/types";

export const maxDuration = 60;

type AnalyzeRequest = {
  video: SourceVideo;
};

// Truth Base pro Serverinstanz kurz cachen, damit ein Discover-Batch
// (mehrere Analyse-Calls kurz hintereinander) sie nicht jedes Mal neu lädt.
let truthCache: { at: number; truths: TruthRecord[] } | null = null;
const TRUTH_TTL_MS = 60_000;

async function getTruths(): Promise<TruthRecord[]> {
  if (truthCache && Date.now() - truthCache.at < TRUTH_TTL_MS) return truthCache.truths;
  const truths = (await loadTruths()) ?? [];
  truthCache = { at: Date.now(), truths };
  return truths;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AnalyzeRequest>;
  if (!body.video) {
    return NextResponse.json({ error: "Missing video" }, { status: 400 });
  }

  const truths = await getTruths();
  const claim = await analyzeVideoSmart(body.video, truths);
  return NextResponse.json({ claim });
}
