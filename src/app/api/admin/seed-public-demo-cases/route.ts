import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { PUBLIC_DEMO_CLAIM_IDS, mergePublicDemoDefinitions } from "@/data/public-demo-claims";
import { loadClaims, upsertClaims } from "@/lib/store";

export async function POST(request: Request) {
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "seed-public-demo-cases") {
    return NextResponse.json({ ok: false, error: "Use confirm=seed-public-demo-cases." }, { status: 400 });
  }

  // Idempotent und Human-Gate-sicher: Inhaltsfelder kommen versioniert aus dem
  // Repo, bestehende Stage-/Entscheidungsfelder (z. B. debate-002 accepted +
  // decidedAt) überleben den Seed, weil zuerst gegen den Store gemergt wird.
  const demoIds = new Set(PUBLIC_DEMO_CLAIM_IDS);
  const claims = mergePublicDemoDefinitions((await loadClaims()) ?? []).filter((claim) => demoIds.has(claim.id));
  const saved = await upsertClaims(claims);
  return NextResponse.json({ ok: Boolean(saved), saved, count: claims.length, claims });
}
