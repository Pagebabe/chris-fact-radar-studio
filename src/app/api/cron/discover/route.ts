import { NextResponse } from "next/server";
import { runHunter } from "@/lib/hunter";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

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
