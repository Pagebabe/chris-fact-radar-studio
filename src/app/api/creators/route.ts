import { type NextRequest, NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { loadCreators, upsertCreators } from "@/lib/store";
import type { CreatorRecord } from "@/lib/types";

export async function GET() {
  const creators = await loadCreators();
  return NextResponse.json({ configured: creators !== null, creators: creators ?? [] });
}

export async function PUT(req: NextRequest) {
  const unauthorized = requireAdminStrict(req);
  if (unauthorized) return unauthorized;

  const body = (await req.json()) as { creators: CreatorRecord[] };
  const ok = await upsertCreators(body.creators ?? []);
  return NextResponse.json({ ok });
}
