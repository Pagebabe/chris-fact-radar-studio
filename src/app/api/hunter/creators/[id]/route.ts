import { NextResponse } from "next/server";
import { setCreatorWatchStatus } from "@/lib/hunter";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { watched?: boolean };
  const result = await setCreatorWatchStatus(decodeURIComponent(id), Boolean(body.watched));
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
