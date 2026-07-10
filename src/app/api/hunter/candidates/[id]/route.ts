import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { promoteHunterCandidate, rejectHunterCandidate } from "@/lib/hunter";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; reason?: string };

  if (body.action === "promote") {
    const result = await promoteHunterCandidate(decodeURIComponent(id));
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (body.action === "reject") {
    const result = await rejectHunterCandidate(decodeURIComponent(id), body.reason);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ ok: false, reason: "Unknown action" }, { status: 400 });
}
