import { NextResponse } from "next/server";

export function requireCronStrict(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Locked", hint: "Cron route is disabled until CRON_SECRET is configured." },
      { status: 401 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
