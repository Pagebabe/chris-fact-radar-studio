import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { DEBATE_CANONICAL_URLS, isDebateClaimId, normalizeClaimSourceUrls } from "@/lib/debate-claims";
import { loadClaims, storeConfigured, upsertClaims } from "@/lib/store";

export async function POST(request: Request) {
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  if (!storeConfigured()) {
    return NextResponse.json({ configured: false, changed: 0, updates: [] });
  }

  const claims = await loadClaims();
  if (!claims) return NextResponse.json({ configured: true, error: "Could not load claims" }, { status: 500 });

  const debateClaims = claims.filter((claim) => isDebateClaimId(claim.id));
  const updates = debateClaims.map((before) => {
    const after = normalizeClaimSourceUrls(before);
    return {
      id: before.id,
      previousUrl: before.sourceVideo.url,
      nextUrl: DEBATE_CANONICAL_URLS[before.id],
      changed: before.sourceVideo.url !== after.sourceVideo.url || before.sourceVideo.id !== after.sourceVideo.id,
      claim: after,
    };
  });
  const changedClaims = updates.filter((update) => update.changed).map((update) => update.claim);
  const saved = changedClaims.length > 0 ? await upsertClaims(changedClaims) : true;

  return NextResponse.json({
    configured: true,
    saved,
    changed: changedClaims.length,
    updates: updates.map((update) => ({
      id: update.id,
      previousUrl: update.previousUrl,
      nextUrl: update.nextUrl,
      changed: update.changed,
    })),
  });
}
