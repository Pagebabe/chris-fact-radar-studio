import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}

function disabledResponse() {
  return NextResponse.json({
    ok: false,
    disabled: true,
    mode: "apify-manual-intake",
    reason: "Automated platform scanning is not an active product path. Use /api/opponent-import with checked source text or run the Apify-backed Hunter flow.",
    allowedIntake: ["opponent-import", "manual-claim", "hunter-apify"],
  }, { status: 410 });
}
