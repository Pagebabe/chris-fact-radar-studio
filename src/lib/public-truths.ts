import type { TruthRecord } from "./types";

const TEST_URL_RE = /(?:youtube\.com|youtu\.be).*?(?:[?&]v=|\/)(?:test|testcase\d*)\b/i;
const TEST_ID_RE = /(?:^|[-_])test(?:[-_]|$)|truth-https-youtube-com-watch-v-test/i;

export function isPublicTruth(truth: TruthRecord): boolean {
  const id = String(truth.id ?? "");
  const url = String(truth.url ?? "");
  const title = String(truth.videoTitle ?? "").trim();
  const videoId = String(truth.videoId ?? "");
  const transcriptId = String(truth.transcriptId ?? "");

  if (TEST_ID_RE.test(id)) return false;
  if (TEST_URL_RE.test(url)) return false;
  if (/^(?:test|fixture|placeholder)$/i.test(title)) return false;
  if (/^(?:test|testcase\d*)$/i.test(videoId)) return false;
  if (/watch-v-test|(?:^|[-_])test(?:[-_]|$)/i.test(transcriptId)) return false;

  return Boolean(id && (truth.statement?.trim() || truth.quote?.trim()));
}

export function filterPublicTruths(truths: TruthRecord[]): TruthRecord[] {
  return truths.filter(isPublicTruth);
}
