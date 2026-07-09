import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function disabledResponse() {
  return NextResponse.json({
    ok: false,
    disabled: true,
    mode: "apify-manual-intake",
    reason: "Automated platform seeding has been removed. Add verified cases through manual transcript import or Apify-backed intake.",
    allowedIntake: ["manual-claim", "opponent-import", "hunter-apify"],
  }, { status: 410 });
}

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}
