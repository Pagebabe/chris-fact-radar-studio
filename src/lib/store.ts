import { hasEvaluationReadySpokenWord } from "./spoken-word";
import { normalizeClaimsSourceUrls } from "./debate-claims";
import type {
  ClaimItem,
  CreatorRecord,
  HunterCandidate,
  HunterProfile,
  HunterRun,
  MemoryContentItem,
  MemoryExtraction,
  MemoryRawTranscript,
  MemoryScanRun,
  MemorySource,
  ScienceItem,
  TranscriptChunk,
  TruthRecord,
} from "./types";

type ClaimRow = { id: string; payload: ClaimItem; stage: string };
type TranscriptSourceRow = { id: string; video_id: string; url: string; title: string; published_at?: string | null; source: TranscriptChunk["source"]; raw_transcript?: string | null; payload: Record<string, unknown> };
type TranscriptChunkRow = { id: string; source_id: string; video_id: string; chunk_index: number; start_seconds?: number | null; end_seconds?: number | null; text: string; topics: string[]; payload: TranscriptChunk };

export function storeConfigured(): boolean { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }
function headers(): Record<string, string> { const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""; return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" }; }

async function loadPayloads<T>(table: string, order = "updated_at.desc", limit = 500): Promise<T[] | null> {
  if (!storeConfigured()) return null;
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/${table}?select=payload&order=${order}&limit=${limit}`;
    const res = await fetch(url, { headers: headers(), cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as Array<{ payload: T }>).map((r) => r.payload);
  } catch { return null; }
}

async function upsertPayloads<T>(table: string, items: T[], extra: (item: T) => Record<string, unknown> = () => ({})): Promise<boolean> {
  if (!storeConfigured() || items.length === 0) return false;
  try {
    const rows = items.map((item) => ({ id: (item as { id: string }).id, payload: item, updated_at: new Date().toISOString(), ...extra(item) }));
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, { method: "POST", headers: { ...headers(), prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
    return res.ok;
  } catch { return false; }
}

export async function loadClaims(): Promise<ClaimItem[] | null> {
  if (!storeConfigured()) return null;
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/claims?select=payload&order=updated_at.desc&limit=200`;
    const res = await fetch(url, { headers: headers(), cache: "no-store" });
    if (!res.ok) return null;
    return normalizeClaimsSourceUrls(((await res.json()) as Array<{ payload: ClaimItem }>).map((row) => row.payload));
  } catch { return null; }
}

// Curated case types (debate rebuttals, external web claims) are legitimately
// public without a full spoken-word transcript, so the write path must accept
// them too — otherwise an existing public claim can be read but never updated.
// The transcript gate still applies to scraped/YouTube claims.
function isCuratedPublicType(item: ClaimItem): boolean {
  const platform = String(item.sourceVideo?.platform ?? "");
  return platform === "Debatten-Rebuttal" || platform === "Externer Web-Claim";
}

export async function upsertClaims(items: ClaimItem[]): Promise<boolean> {
  const reviewReadyItems = normalizeClaimsSourceUrls(items).filter(
    (item) => hasEvaluationReadySpokenWord(item.sourceVideo) || isCuratedPublicType(item)
  );
  if (!storeConfigured() || reviewReadyItems.length === 0) return false;
  try {
    const rows: ClaimRow[] = reviewReadyItems.map((item) => ({ id: item.id, payload: item, stage: item.stage }));
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/claims?on_conflict=id`, { method: "POST", headers: { ...headers(), prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
    return res.ok;
  } catch { return false; }
}

export async function loadCreators(): Promise<CreatorRecord[] | null> { return loadPayloads<CreatorRecord>("creators", "updated_at.desc", 500); }
export async function upsertCreators(items: CreatorRecord[]): Promise<boolean> { return upsertPayloads("creators", items); }
export async function loadTruths(): Promise<TruthRecord[] | null> { return loadPayloads<TruthRecord>("truths", "updated_at.desc", 5000); }
export async function upsertTruths(items: TruthRecord[]): Promise<boolean> { return upsertPayloads("truths", items); }

export async function loadMemorySources(): Promise<MemorySource[] | null> { return loadPayloads<MemorySource>("memory_sources", "priority.desc,updated_at.desc", 500); }
export async function upsertMemorySources(items: MemorySource[]): Promise<boolean> {
  return upsertPayloads("memory_sources", items, (source) => ({ role: source.role, platform: source.platform, status: source.status, priority: source.priority }));
}
export async function loadMemoryContentItems(): Promise<MemoryContentItem[] | null> { return loadPayloads<MemoryContentItem>("memory_content_items", "published_at.desc,updated_at.desc", 5000); }
export async function upsertMemoryContentItems(items: MemoryContentItem[]): Promise<boolean> {
  return upsertPayloads("memory_content_items", items, (item) => ({ source_id: item.sourceId, platform: item.platform, external_id: item.externalId, url: item.url, published_at: item.publishedAt ?? null, status: item.status, transcript_status: item.transcriptStatus }));
}
export async function upsertMemoryRawTranscripts(items: MemoryRawTranscript[]): Promise<boolean> { return upsertPayloads("memory_raw_transcripts", items, (item) => ({ content_item_id: item.contentItemId, source_id: item.sourceId, source: item.source, language: item.language ?? null })); }
export async function upsertMemoryExtractions(items: MemoryExtraction[]): Promise<boolean> { return upsertPayloads("memory_extractions", items, (item) => ({ content_item_id: item.contentItemId, source_id: item.sourceId, chunk_id: item.chunkId ?? null, kind: item.kind, topic: item.topic, status: item.status, confidence: item.confidence })); }
export async function upsertMemoryScanRuns(items: MemoryScanRun[]): Promise<boolean> { return upsertPayloads("memory_scan_runs", items, (item) => ({ source_id: item.sourceId ?? null, status: item.status, started_at: item.startedAt, finished_at: item.finishedAt ?? null })); }

export async function loadTranscriptChunks(topic?: string): Promise<TranscriptChunk[] | null> {
  if (!storeConfigured()) return null;
  try {
    const topicFilter = topic ? `&topics=cs.{${encodeURIComponent(topic)}}` : "";
    const url = `${process.env.SUPABASE_URL}/rest/v1/transcript_chunks?select=payload&order=updated_at.desc&limit=5000${topicFilter}`;
    const res = await fetch(url, { headers: headers(), cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as Array<{ payload: TranscriptChunk }>).map((r) => r.payload);
  } catch { return null; }
}

export async function upsertTranscriptSource(row: TranscriptSourceRow): Promise<boolean> {
  if (!storeConfigured()) return false;
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/transcript_sources?on_conflict=id`, { method: "POST", headers: { ...headers(), prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ ...row, updated_at: new Date().toISOString() }]) });
    return res.ok;
  } catch { return false; }
}

export async function upsertTranscriptChunks(items: TranscriptChunk[]): Promise<boolean> {
  if (!storeConfigured() || items.length === 0) return false;
  try {
    const rows: TranscriptChunkRow[] = items.map((chunk) => ({ id: chunk.id, source_id: chunk.sourceId ?? chunk.videoId, video_id: chunk.videoId, chunk_index: chunk.chunkIndex, start_seconds: chunk.startSeconds ?? null, end_seconds: chunk.endSeconds ?? null, text: chunk.text, topics: chunk.topics, payload: chunk }));
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/transcript_chunks?on_conflict=id`, { method: "POST", headers: { ...headers(), prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
    return res.ok;
  } catch { return false; }
}

export async function loadScienceItems(): Promise<ScienceItem[] | null> { return loadPayloads<ScienceItem>("science_items", "updated_at.desc", 50); }
export async function upsertScienceItems(items: ScienceItem[]): Promise<boolean> { return upsertPayloads("science_items", items); }
export async function loadHunterProfiles(): Promise<HunterProfile[] | null> { return loadPayloads<HunterProfile>("hunter_profiles", "updated_at.desc", 100); }
export async function upsertHunterProfiles(items: HunterProfile[]): Promise<boolean> { return upsertPayloads("hunter_profiles", items, (profile) => ({ enabled: profile.enabled })); }
export async function loadHunterCandidates(): Promise<HunterCandidate[] | null> { return loadPayloads<HunterCandidate>("hunter_candidates", "score.desc,updated_at.desc", 200); }
export async function upsertHunterCandidates(items: HunterCandidate[]): Promise<boolean> { return upsertPayloads("hunter_candidates", items, (candidate) => ({ status: candidate.status, platform: candidate.platform, score: candidate.score })); }
export async function loadHunterRuns(): Promise<HunterRun[] | null> { return loadPayloads<HunterRun>("hunter_runs", "updated_at.desc", 20); }
export async function upsertHunterRuns(items: HunterRun[]): Promise<boolean> { return upsertPayloads("hunter_runs", items, (run) => ({ ok: run.ok })); }
