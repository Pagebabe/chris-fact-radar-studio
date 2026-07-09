import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import {
  storeConfigured,
  upsertClaims,
  upsertMemoryContentItems,
  upsertMemoryExtractions,
  upsertMemoryRawTranscripts,
  upsertMemoryScanRuns,
  upsertMemorySources,
  upsertTranscriptChunks,
} from "@/lib/store";
import type { ClaimItem, MemoryContentItem, MemoryExtraction, MemoryPlatform, MemoryRawTranscript, MemoryScanRun, MemorySource, SourceVideo, TranscriptChunk } from "@/lib/types";

type OpponentImportRequest = {
  transcript?: string;
  title?: string;
  url?: string;
  creator?: string;
  platform?: MemoryPlatform;
  sourceLabel?: string;
  publishedAt?: string;
};

const TOPIC_RULES: Array<[ClaimItem["category"], string[]]> = [
  ["Heisshunger", ["heißhunger", "heisshunger", "süßhunger", "suesshunger", "fressattacke", "appetit"]],
  ["Protein", ["protein", "eiweiß", "eiweiss", "muskeln", "nier", "shake"]],
  ["Insulin", ["insulin", "blutzucker", "zucker", "kohlenhydrate", "carbs"]],
  ["Supplements", ["supplement", "vitamin", "magnesium", "kreatin", "creatin", "tablette"]],
  ["Fettverlust", ["abnehmen", "diät", "diet", "fett", "kalorien", "stoffwechsel", "bauchfett"]],
];

const CLAIM_MARKERS = [
  "macht", "verhindert", "zerstört", "schadet", "du darfst", "du musst", "niemals", "immer", "keiner", "jeder", "garantiert", "beweist", "ist schuld", "funktioniert nicht", "lüge", "mythos", "gift", "ungesund", "fett", "abnehmen", "insulin", "protein", "kalorien",
];

function nowIso() { return new Date().toISOString(); }
function cleanId(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || `item-${Date.now()}`; }
function splitSentences(text: string) { return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 35); }
function detectCategory(text: string): ClaimItem["category"] {
  const lower = text.toLowerCase();
  return TOPIC_RULES.find(([, words]) => words.some((word) => lower.includes(word)))?.[0] ?? "Fettverlust";
}
function keywordsFor(text: string) {
  const lower = text.toLowerCase();
  return TOPIC_RULES.flatMap(([, words]) => words.filter((word) => lower.includes(word))).slice(0, 10);
}
function platformLabel(platform: MemoryPlatform): SourceVideo["platform"] {
  if (platform === "tiktok") return "TikTok";
  if (platform === "instagram") return "Instagram";
  return "YouTube";
}

function chunkTranscript(args: { contentItemId: string; sourceId: string; title: string; url: string; publishedAt: string; transcript: string }) {
  const sentences = splitSentences(args.transcript);
  const chunks: TranscriptChunk[] = [];
  for (let index = 0; index < sentences.length; index += 4) {
    const text = sentences.slice(index, index + 4).join(" ");
    if (text.length < 80) continue;
    chunks.push({
      id: `${args.contentItemId}-chunk-${chunks.length}`,
      videoId: args.contentItemId,
      videoTitle: args.title,
      url: args.url,
      publishedAt: args.publishedAt,
      source: "manual",
      chunkIndex: chunks.length,
      text,
      tokenCount: Math.ceil(text.length / 4),
      topics: [detectCategory(text)],
      createdAt: nowIso(),
      sourceId: args.sourceId,
      contentItemId: args.contentItemId,
    });
  }
  return chunks;
}

function extractOpponentClaims(chunks: TranscriptChunk[]) {
  return chunks.flatMap((chunk) => {
    const candidates = splitSentences(chunk.text).filter((sentence) => CLAIM_MARKERS.some((marker) => sentence.toLowerCase().includes(marker))).slice(0, 3);
    return candidates.map((sentence, index) => ({ chunk, sentence, index }));
  }).slice(0, 12);
}

export async function POST(request: Request) {
  // Fail-closed: writes transcripts/claims into the shared store.
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as OpponentImportRequest;
  const transcript = body.transcript?.trim();
  if (!transcript || transcript.length < 120) return NextResponse.json({ error: "Missing transcript" }, { status: 400 });

  const stamp = nowIso();
  const platform = body.platform ?? "manual";
  const creator = body.creator?.trim() || "Unbekannter Gegner";
  const title = body.title?.trim() || "Gegner-Clip Upload";
  const url = body.url?.trim() || `upload://opponent/${Date.now()}`;
  const publishedAt = body.publishedAt?.trim() || stamp;
  const sourceId = `opponent-${cleanId(creator)}-${cleanId(platform)}`;
  const contentItemId = `opponent-item-${cleanId(url)}-${Date.now()}`;

  const source: MemorySource = {
    id: sourceId,
    role: "opponent",
    platform,
    label: body.sourceLabel?.trim() || `${creator} · ${platform}`,
    url,
    handle: creator,
    status: "active",
    priority: 80,
    lastScannedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };

  const contentItem: MemoryContentItem = {
    id: contentItemId,
    sourceId,
    platform,
    externalId: contentItemId,
    url,
    title,
    description: `Automatischer Gegner-Import von ${creator}`,
    publishedAt,
    language: "de",
    status: "extracted",
    transcriptStatus: "available",
    rawPayload: { importMode: "opponent-auto", creator, url, title },
    createdAt: stamp,
    updatedAt: stamp,
  };

  const rawTranscript: MemoryRawTranscript = {
    id: `raw-${contentItemId}`,
    contentItemId,
    sourceId,
    source: "manual",
    language: "de",
    text: transcript,
    confidence: 0.82,
    createdAt: stamp,
    updatedAt: stamp,
  };

  const chunks = chunkTranscript({ contentItemId, sourceId, title, url, publishedAt, transcript });
  const claimCandidates = extractOpponentClaims(chunks);

  const extractions: MemoryExtraction[] = claimCandidates.map(({ chunk, sentence, index }) => ({
    id: `opponent-extraction-${chunk.id}-${index}`,
    contentItemId,
    sourceId,
    chunkId: chunk.id,
    kind: "claim",
    statement: sentence,
    quote: sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence,
    topic: detectCategory(sentence),
    keywords: keywordsFor(sentence),
    confidence: 0.72,
    status: "suggested",
    createdAt: stamp,
    updatedAt: stamp,
  }));

  const sourceVideo: SourceVideo = {
    id: contentItemId,
    platform: platformLabel(platform),
    sourceMode: "live",
    url,
    creator,
    creatorHandle: creator,
    title,
    description: contentItem.description ?? "",
    publishedAt,
    views: 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
    transcriptSnippet: transcript.slice(0, 320),
    transcriptSource: "curated",
  };

  const claims: ClaimItem[] = extractions.map((extraction) => ({
    id: `claim-${extraction.id}`,
    stage: "needs_evidence",
    category: detectCategory(extraction.statement),
    claim: extraction.statement,
    riskScore: 76,
    relevanceScore: 72,
    checkworthiness: 82,
    verdict: "unclear",
    confidence: extraction.confidence,
    whyItMatters: "Automatisch aus Gegner-Transkript erkannt. Muss gegen Chris-Wissen und Science geprüft werden.",
    responseDraft: "",
    analysisSource: "heuristic",
    sourceVideo,
    evidence: [],
  }));

  const scanRun: MemoryScanRun = {
    id: `scan-${contentItemId}`,
    sourceId,
    startedAt: stamp,
    finishedAt: nowIso(),
    status: "finished",
    contentFound: 1,
    transcriptsCreated: 1,
    chunksCreated: chunks.length,
    extractionsCreated: extractions.length,
    errors: [],
    payload: { role: "opponent", importMode: "auto-transcript", claimsCreated: claims.length },
  };

  const configured = storeConfigured();
  const saved = configured ? {
    source: await upsertMemorySources([source]),
    content: await upsertMemoryContentItems([contentItem]),
    transcript: await upsertMemoryRawTranscripts([rawTranscript]),
    chunks: await upsertTranscriptChunks(chunks),
    extractions: await upsertMemoryExtractions(extractions),
    claims: await upsertClaims(claims),
    scanRun: await upsertMemoryScanRuns([scanRun]),
  } : null;

  return NextResponse.json({ ok: true, configured, saved, source, contentItem, chunks: chunks.length, extractions, claims });
}
