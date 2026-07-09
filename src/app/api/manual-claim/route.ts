import { NextResponse } from "next/server";
import { analyzeVideoSmart } from "@/lib/analyze";
import { loadTruths, storeConfigured, upsertClaims } from "@/lib/store";
import type { SourceVideo } from "@/lib/types";

export const maxDuration = 60;

type ManualClaimRequest = {
  url?: string;
  platform?: SourceVideo["platform"];
  creator?: string;
  title?: string;
  text?: string;
  claim?: string;
  views?: number;
};

function detectPlatform(url: string): SourceVideo["platform"] {
  const lowered = url.toLowerCase();
  if (lowered.includes("tiktok.com")) return "TikTok";
  if (lowered.includes("instagram.com")) return "Instagram";
  return "YouTube";
}

function manualVideoId(url: string) {
  return `manual-${url.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120)}-${Date.now()}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ManualClaimRequest;
  const url = body.url?.trim();
  const text = (body.text ?? body.claim)?.trim();

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  if (!text || text.length < 20) return NextResponse.json({ error: "Missing text/caption" }, { status: 400 });

  const video: SourceVideo = {
    id: manualVideoId(url),
    platform: body.platform ?? detectPlatform(url),
    sourceMode: "live",
    curationReason: "Manual import: pasted and checked source text. Apify/manual intake is the accepted source path.",
    url,
    creator: body.creator?.trim() || "Manual Import",
    title: body.title?.trim() || text.slice(0, 120),
    description: text.slice(0, 500),
    publishedAt: new Date().toISOString(),
    views: Number.isFinite(body.views) ? Number(body.views) : 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
    transcriptSnippet: text,
    transcriptSource: "manual",
  };

  const truths = storeConfigured() ? (await loadTruths()) ?? [] : [];
  const analyzed = await analyzeVideoSmart(video, truths);
  const claim = {
    ...analyzed,
    stage: "new" as const,
    sourceVideo: video,
  };

  const saved = storeConfigured() ? await upsertClaims([claim]) : false;
  return NextResponse.json({ ok: true, saved, claim });
}
