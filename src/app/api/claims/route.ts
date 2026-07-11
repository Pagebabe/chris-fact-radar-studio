import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { isPublicClaim, isWritableClaim } from "@/lib/public-claims";
import { loadClaims, storeConfigured, upsertClaims } from "@/lib/store";
import { normalizeClaimsSourceUrls } from "@/lib/debate-claims";
import type { ClaimItem } from "@/lib/types";
import { mergePublicDemoDefinitions } from "@/data/public-demo-claims";

export async function GET(request: Request) {
  if (!storeConfigured()) {
    return NextResponse.json({ configured: false, claims: [], writable: false });
  }
  const claims = await loadClaims();
  const publicClaims = normalizeClaimsSourceUrls(mergePublicDemoDefinitions(claims ?? [])).filter(isPublicClaim);
  const writable = requireAdminStrict(request) === null;
  return NextResponse.json({ configured: claims !== null, claims: publicClaims, writable });
}

export async function PUT(request: Request) {
  // Fail-closed: writing claims into the shared store is an admin action.
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  if (!storeConfigured()) {
    return NextResponse.json({ configured: false, saved: false });
  }
  const body = (await request.json()) as { claims?: ClaimItem[] };
  if (!Array.isArray(body.claims)) {
    return NextResponse.json({ error: "Missing claims" }, { status: 400 });
  }
  const cleanClaims = normalizeClaimsSourceUrls(body.claims).filter(isWritableClaim);
  const saved = await upsertClaims(cleanClaims);
  return NextResponse.json({ configured: true, saved, accepted: cleanClaims.length, rejected: body.claims.length - cleanClaims.length });
}
