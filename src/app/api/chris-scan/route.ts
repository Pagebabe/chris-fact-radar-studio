import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import {
  storeConfigured,
  upsertTranscriptChunks,
  upsertTranscriptSource,
  upsertTruths,
} from "@/lib/store";
import { classifyVideo } from "@/lib/source-safety";
import type { TranscriptChunk, TruthRecord } from "@/lib/types";

type ScanRequest = {
  url?: string;
  title?: string;
  publishedAt?: string;
  transcript?: string;
  source?: "manual" | "description" | "youtube-captions";
};

const TOPIC_RULES: Array<[string, string[]]> = [
  ["Heißhunger", ["heißhunger", "süßhunger", "hunger", "appetit", "fressattacke"]],
  ["Protein", ["protein", "eiweiß", "sättigung", "muskeln"]],
  ["Kaloriendefizit", ["kaloriendefizit", "kalorien", "abnehmen", "diät"]],
  ["Stressessen", ["stress", "cortisol", "emotional", "essen"]],
  ["Insulin", ["insulin", "blutzucker", "zero", "zucker"]],
  ["Training", ["training", "krafttraining", "cardio", "steps"]],
];

function cleanId(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
function videoIdFromUrl(url: string) { const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{6,})/); return match?.[1] ?? cleanId(url || `manual-${Date.now()}`); }
function nowIso() { return new Date().toISOString(); }
function splitSentences(text: string) { return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 35); }
function detectTopic(text: string) { const lower = text.toLowerCase(); const found = TOPIC_RULES.find(([, words]) => words.some((word) => lower.includes(word))); return found?.[0] ?? "Ernährung"; }
function keywordsFor(text: string) { const lower = text.toLowerCase(); return TOPIC_RULES.flatMap(([, words]) => words.filter((word) => lower.includes(word))).slice(0, 8); }

function chunkTranscript(args: { videoId: string; title: string; url: string; publishedAt: string; transcript: string; source: TranscriptChunk["source"] }) {
  const sentences = splitSentences(args.transcript);
  const chunks: TranscriptChunk[] = [];
  for (let index = 0; index < sentences.length; index += 4) {
    const text = sentences.slice(index, index + 4).join(" ");
    if (text.length < 80) continue;
    chunks.push({ id: `${args.videoId}-chunk-${chunks.length}`, videoId: args.videoId, videoTitle: args.title, url: args.url, publishedAt: args.publishedAt, source: args.source, chunkIndex: chunks.length, text, tokenCount: Math.ceil(text.length / 4), topics: [detectTopic(text)], createdAt: nowIso() });
  }
  return chunks;
}

function extractTruths(chunks: TranscriptChunk[]) {
  const markers = ["wichtig", "entscheidend", "das problem", "nicht", "wenn", "deshalb", "am ende", "meistens", "in der praxis", "du musst", "du brauchst", "warum"];
  return chunks.flatMap((chunk) => {
    let sentences = splitSentences(chunk.text).filter((sentence) => markers.some((marker) => sentence.toLowerCase().includes(marker))).slice(0, 2);
    if (sentences.length === 0) sentences = splitSentences(chunk.text).slice(0, 1);
    return sentences.map((sentence, index): TruthRecord => ({
      id: `truth-${chunk.id}-${index}`,
      statement: sentence,
      topic: detectTopic(sentence),
      quote: sentence.length > 180 ? `${sentence.slice(0, 177)}…` : sentence,
      videoId: chunk.videoId,
      videoTitle: chunk.videoTitle,
      url: chunk.url,
      publishedAt: chunk.publishedAt,
      source: chunk.source,
      transcriptId: chunk.videoId,
      chunkId: chunk.id,
      chunkIndex: chunk.chunkIndex,
      topics: [detectTopic(sentence)],
      keywords: keywordsFor(sentence),
      confidence: chunk.source === "description" ? 0.62 : 0.78,
      extractedAt: nowIso(),
    }));
  }).slice(0, 12);
}

async function scanOne(args: { url: string; title: string; publishedAt: string; transcript: string; source: TranscriptChunk["source"]; save: boolean }) {
  const videoId = videoIdFromUrl(args.url);
  const { category, safeForPositions } = classifyVideo(args.title);
  const chunks = chunkTranscript({ videoId, title: args.title, url: args.url, publishedAt: args.publishedAt, transcript: args.transcript, source: args.source })
    .map((chunk) => ({ ...chunk, category, safeForPositions }));
  const truths = safeForPositions
    ? extractTruths(chunks).map((truth) => ({ ...truth, category, safeForPositions, origin: "store" as const }))
    : [];
  const configured = storeConfigured();
  const sourceSaved = configured && args.save ? await upsertTranscriptSource({ id: videoId, video_id: videoId, url: args.url, title: args.title, published_at: args.publishedAt, source: args.source, raw_transcript: args.transcript, payload: { url: args.url, title: args.title, publishedAt: args.publishedAt, source: args.source, characterCount: args.transcript.length } }) : false;
  const chunksSaved = configured && args.save ? await upsertTranscriptChunks(chunks) : false;
  const truthsSaved = configured && args.save ? await upsertTruths(truths) : false;
  return { sourceSaved, chunksSaved, truthsSaved, chunks, truths, transcript: args.transcript, videoId, category, safeForPositions };
}

export async function POST(request: Request) {
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as ScanRequest;
  const transcript = body.transcript?.trim();
  if (!transcript || transcript.length < 120) return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  const result = await scanOne({ url: body.url?.trim() || "manual://christian-channel-scan", title: body.title?.trim() || "Christian Channel Scan", publishedAt: body.publishedAt?.trim() || nowIso(), transcript, source: body.source ?? "manual", save: true });
  return NextResponse.json({ ok: true, mode: "manual-transcript", configured: storeConfigured(), category: result.category, safeForPositions: result.safeForPositions, positionsBlocked: !result.safeForPositions, sourceSaved: result.sourceSaved, chunksSaved: result.chunksSaved, truthsSaved: result.truthsSaved, chunks: result.chunks.length, truths: result.truths });
}

export async function GET() {
  return NextResponse.json({
    ok: false,
    disabled: true,
    mode: "apify-manual-intake",
    reason: "Automatic channel scanning is disabled. Use checked manual source text or the Apify-backed intake flow.",
  }, { status: 410 });
}
