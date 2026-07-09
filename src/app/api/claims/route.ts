import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isPublicClaim, isWritableClaim } from "@/lib/public-claims";
import { loadClaims, storeConfigured, upsertClaims } from "@/lib/store";
import type { ClaimItem } from "@/lib/types";

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
