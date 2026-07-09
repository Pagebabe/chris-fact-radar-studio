import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadClaims, storeConfigured, upsertClaims } from "@/lib/store";
import type { ClaimItem } from "@/lib/types";

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

function isDebateClaim(claim: ClaimItem) {
  return claim.id.startsWith("debate-") && String(claim.sourceVideo?.platform) === "Debatten-Rebuttal";
}

function isExternalWebClaim(claim: ClaimItem) {
  return claim.id.startsWith("external-web-") && String(claim.sourceVideo?.platform) === "Externer Web-Claim";
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
  return true;
}

function isProductionClaim(claim: ClaimItem) {
  return isDebateClaim(claim) || isExternalWebClaim(claim) || isVerifiedYoutubeClaim(claim);
}

function isPublicClaim(claim: ClaimItem) {
  if (claim.id === "system-placeholder") return false;
  if (claim.stage === "rejected") return false;
  if (claim.sourceVideo?.id === "system-placeholder-video") return false;
  if (!isProductionClaim(claim)) return false;
  return true;
}

function isWritableClaim(claim: ClaimItem) {
  if (!isPublicClaim(claim)) return false;
  if (!claim.sourceVideo?.url) return false;
  return true;
}

export async function GET() {
  if (!storeConfigured()) {
    return NextResponse.json({ configured: false, claims: [] });
  }
  const claims = await loadClaims();
  const publicClaims = (claims ?? []).filter(isPublicClaim);
  return NextResponse.json({ configured: claims !== null, claims: publicClaims });
}

export async function PUT(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  if (!storeConfigured()) {
    return NextResponse.json({ configured: false, saved: false });
  }
  const body = (await request.json()) as { claims?: ClaimItem[] };
  if (!Array.isArray(body.claims)) {
    return NextResponse.json({ error: "Missing claims" }, { status: 400 });
  }
  const cleanClaims = body.claims.filter(isWritableClaim);
  const saved = await upsertClaims(cleanClaims);
  return NextResponse.json({ configured: true, saved, accepted: cleanClaims.length, rejected: body.claims.length - cleanClaims.length });
}
