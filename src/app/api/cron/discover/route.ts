import { NextResponse } from "next/server";
import { requireCronStrict } from "@/lib/cron-auth";
import { runHunter } from "@/lib/hunter";

export const maxDuration = 300;

export async function GET(request: Request) {
  const unauthorized = requireCronStrict(request);
  if (unauthorized) return unauthorized;

  const result = await runHunter();
  return NextResponse.json({
    ok: result.run.ok,
    configured: result.configured,
    run: result.run,
    candidates: result.candidates.length,
    claims: result.claims.length,
    creators: result.creators.length,
  });
}
