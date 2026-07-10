import { NextResponse } from "next/server";
import { requireAdminStrict } from "@/lib/admin-auth";
import { filterPublicTruths } from "@/lib/public-truths";
import { loadTruths, storeConfigured, upsertTruths } from "@/lib/store";
import type { TruthRecord } from "@/lib/types";

type TruthImportRequest = {
  topic?: string;
  statement?: string;
  quote?: string;
  url?: string;
  videoTitle?: string;
  keywords?: string;
};

function cleanId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export async function GET() {
  const truths = await loadTruths();
  const publicTruths = filterPublicTruths(truths ?? []);
  return NextResponse.json({ configured: truths !== null, truths: publicTruths });
}

export async function POST(request: Request) {
  // Fail-closed: writes into the shared truth base.
  const unauthorized = requireAdminStrict(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as TruthImportRequest;
  const topic = body.topic?.trim();
  const statement = body.statement?.trim();
  const now = new Date().toISOString();

  if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });
  if (!statement || statement.length < 12) return NextResponse.json({ error: "Missing statement" }, { status: 400 });

  const quote = body.quote?.trim() || statement;
  const truth: TruthRecord = {
    id: `manual-truth-${cleanId(topic)}-${Date.now()}`,
    topic,
    statement,
    quote,
    url: body.url?.trim() || "manual://chris-wissen",
    videoId: `manual-${Date.now()}`,
    videoTitle: body.videoTitle?.trim() || "Manuell importiertes Chris-Wissen",
    publishedAt: now,
    source: "manual",
    topics: [topic],
    keywords: body.keywords ? body.keywords.split(",").map((word) => word.trim()).filter(Boolean) : [topic],
    confidence: 0.92,
    extractedAt: now,
  };

  const saved = storeConfigured() ? await upsertTruths([truth]) : false;
  return NextResponse.json({ ok: true, saved, truth });
}
