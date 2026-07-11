import type { ClaimItem } from "./types";
import { isYoutubeSearchUrl, youtubeWatchUrl } from "./youtube";

export const DEBATE_VIDEO_ID = "zO3ZPZKRkBM";

export const DEBATE_CANONICAL_URLS: Record<string, string> = {
  "debate-001": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=143s",
  "debate-002": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=277s",
  "debate-003": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=802s",
  "debate-004": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1219s",
  "debate-005": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1319s",
  "debate-006": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1802s",
  "debate-007": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=7340s",
  "debate-008": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=6100s",
};

export function isDebateClaimId(id: string) {
  return Object.prototype.hasOwnProperty.call(DEBATE_CANONICAL_URLS, id);
}

export function normalizeClaimSourceUrls(claim: ClaimItem): ClaimItem {
  const canonicalDebateUrl = DEBATE_CANONICAL_URLS[claim.id];
  const normalizedSourceUrl = canonicalDebateUrl ?? youtubeWatchUrl(claim.sourceVideo?.url) ?? claim.sourceVideo.url;
  const normalizedChrisUrl = claim.chrisPosition?.url
    ? DEBATE_CANONICAL_URLS[claim.id] && isYoutubeSearchUrl(claim.chrisPosition.url)
      ? DEBATE_CANONICAL_URLS[claim.id]
      : youtubeWatchUrl(claim.chrisPosition.url) ?? claim.chrisPosition.url
    : undefined;

  return {
    ...claim,
    sourceVideo: {
      ...claim.sourceVideo,
      id: canonicalDebateUrl ? `yt-${DEBATE_VIDEO_ID}` : claim.sourceVideo.id,
      url: normalizedSourceUrl,
    },
    ...(claim.chrisPosition && normalizedChrisUrl ? { chrisPosition: { ...claim.chrisPosition, url: normalizedChrisUrl } } : {}),
  };
}

export function normalizeClaimsSourceUrls(claims: ClaimItem[]) {
  return claims.map(normalizeClaimSourceUrls);
}
