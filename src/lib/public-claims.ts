import type { ClaimItem } from "@/lib/types";

export function platformOf(claim: ClaimItem) {
  return String(claim.sourceVideo?.platform ?? "");
}

export function isPublicProductionClaim(claim: ClaimItem) {
  const platform = platformOf(claim);
  const url = claim.sourceVideo?.url ?? "";

  if (claim.stage === "rejected") return false;
  if (claim.id.startsWith("debate-") && platform === "Debatten-Rebuttal") return true;
  if (claim.id.startsWith("external-web-") && platform === "Externer Web-Claim") return true;
  if (platform === "YouTube" && url.startsWith("https://www.youtube.com/watch?v=")) return true;

  return false;
}

export function publicClaimKind(claim: ClaimItem) {
  const platform = platformOf(claim);

  if (platform === "YouTube") return "youtube";
  if (platform === "Debatten-Rebuttal") return "debate";
  if (platform === "Externer Web-Claim") return "web";

  return "other";
}
