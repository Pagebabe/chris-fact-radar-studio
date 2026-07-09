import type { ClaimItem } from "./types";

export function buildMarkdownExport(item: ClaimItem): string {
  const evidence = item.evidence
    .map((source) => `- ${source.publisher}: ${source.title} (${source.url})`)
    .join("\n");

  return [
    `# ${item.sourceVideo.title}`,
    "",
    `Creator: ${item.sourceVideo.creator}`,
    `Platform: ${item.sourceVideo.platform}`,
    `Transcript source: ${item.sourceVideo.transcriptSource ?? "unknown"}`,
    `Claim: ${item.claim}`,
    `Verdict: ${item.verdict}`,
    `Confidence: ${item.confidence}%`,
    "",
    "## Why it matters",
    item.whyItMatters,
    "",
    "## Evidence",
    evidence,
    "",
    "## Response draft",
    item.responseDraft,
  ].join("\n");
}
