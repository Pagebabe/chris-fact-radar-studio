import { hasEvaluationReadySpokenWord } from "@/lib/spoken-word";
import type { ClaimItem } from "@/lib/types";

// Single source of truth for "which claims may be shown/served publicly".
// Homepage, /status and GET /api/claims all import from here so the visible
// count is always consistent (previously the homepage used a looser filter and
// showed a higher number than the API returned). The self/trust blocks below
// keep Christian's own brand and reputable institutions from being surfaced as
// review targets.

const SELF_BLOCK = [
  "christianwolf",
  "christian-wolf",
  "christian.wolf",
  "@christianwolf",
  "more nutrition",
  "morenutrition",
  "esn",
  "oace",
  "tqg",
  "got7",
  "abnehmenohneverzicht",
  "proteinfasten",
  "morewand",
  "einwandfrei",
];

const TRUST_BLOCK = [
  "ard",
  "zdf",
  "ndr",
  "wdr",
  "swr",
  "quarks",
  "dge",
  "verbraucherzentrale",
  "eat smarter",
  "maithink",
  "mai think",
  "nano doku",
  "3sat",
  "terra x",
  "arte",
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "");
}

function textOf(claim: ClaimItem) {
  return [claim.claim, claim.sourceVideo?.creator, claim.sourceVideo?.title, claim.sourceVideo?.url]
    .filter(Boolean)
    .join(" ");
}

function hasAny(text: string, terms: string[]) {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

export function platformOf(claim: ClaimItem) {
  return String(claim.sourceVideo?.platform ?? "");
}

// Auch für Intake-Kandidaten nutzbar: Eigenmarke und seriöse
// Wissenschafts-/Institutionsquellen sind keine Review-Ziele.
export function isBlockedSourceText(text: string) {
  return hasAny(text, SELF_BLOCK) || hasAny(text, TRUST_BLOCK);
}

function isDebateClaim(claim: ClaimItem) {
  return claim.id.startsWith("debate-") && platformOf(claim) === "Debatten-Rebuttal";
}

function isExternalWebClaim(claim: ClaimItem) {
  return claim.id.startsWith("external-web-") && platformOf(claim) === "Externer Web-Claim";
}

function isVerifiedYoutubeClaim(claim: ClaimItem) {
  const url = claim.sourceVideo?.url ?? "";
  const text = textOf(claim);
  if (!url.startsWith("https://www.youtube.com/watch?v=")) return false;
  if (claim.sourceVideo?.sourceMode !== "live") return false;
  if (hasAny(text, SELF_BLOCK)) return false;
  if (hasAny(text, TRUST_BLOCK)) return false;
  if (!claim.claim || claim.claim.trim().length < 30) return false;
  if (claim.claim.trim() === claim.sourceVideo?.title?.trim()) return false;
  // Gleiche Messlatte wie der heutige Intake: ohne evaluation-ready Transkript
  // des gesprochenen Worts (Captions/Whisper/manuell/kuratiert) ist ein
  // YouTube-Fall nicht öffentlich. Alt-Treffer auf Beschreibungsbasis fallen raus.
  if (!hasEvaluationReadySpokenWord(claim.sourceVideo)) return false;
  return true;
}

function isProductionClaim(claim: ClaimItem) {
  return isDebateClaim(claim) || isExternalWebClaim(claim) || isVerifiedYoutubeClaim(claim);
}

// The public/production filter. Named for backwards-compat with existing imports.
export function isPublicProductionClaim(claim: ClaimItem) {
  if (claim.id === "system-placeholder") return false;
  if (claim.stage === "rejected") return false;
  if (claim.sourceVideo?.id === "system-placeholder-video") return false;
  if (!isProductionClaim(claim)) return false;
  return true;
}

// Alias for API code that reads more naturally as "is this claim public".
export const isPublicClaim = isPublicProductionClaim;

export function isWritableClaim(claim: ClaimItem) {
  if (!isPublicProductionClaim(claim)) return false;
  if (!claim.sourceVideo?.url) return false;
  return true;
}

export function publicClaimKind(claim: ClaimItem) {
  const platform = platformOf(claim);

  if (platform === "YouTube") return "youtube";
  if (platform === "Debatten-Rebuttal") return "debate";
  if (platform === "Externer Web-Claim") return "web";

  return "other";
}
