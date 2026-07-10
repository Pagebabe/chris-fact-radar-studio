import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { setCreatorWatchStatus } from "@/lib/hunter";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { watched?: boolean };
  const result = await setCreatorWatchStatus(decodeURIComponent(id), Boolean(body.watched));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
