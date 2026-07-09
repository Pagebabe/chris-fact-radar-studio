import type { HunterCandidate, SourceVideo } from "./types";

export const MIN_EVALUATION_TRANSCRIPT_CHARS = 160;

const EVALUATION_READY_SOURCES = new Set([
  "youtube-captions",
  "whisper",
  "manual",
  "curated",
]);

type TranscriptLike = {
  transcriptSource?: SourceVideo["transcriptSource"] | HunterCandidate["transcriptSource"] | string;
  transcriptSnippet?: string;
};

export function hasEvaluationReadySpokenWord(item: TranscriptLike): boolean {
  return spokenWordBlockReason(item) === null;
}

export function spokenWordBlockReason(item: TranscriptLike): string | null {
  const source = item.transcriptSource;
  const text = item.transcriptSnippet?.trim() ?? "";

  if (!source || source === "missing") return "kein Transkript";
  if (source === "description") return "nur Beschreibung, kein gesprochenes Wort";
  if (source === "apify") return "Apify-Text noch nicht als echtes Untertitel-/Audio-Transkript verifiziert";
  if (!EVALUATION_READY_SOURCES.has(source)) return `nicht freigegebene Transkriptquelle: ${source}`;
  if (text.length < MIN_EVALUATION_TRANSCRIPT_CHARS) return "Transkript zu kurz";

  return null;
}
