import { NextResponse } from "next/server";
import { adminAuthConfigured } from "@/lib/admin-auth";
import { llmConfigured } from "@/lib/llm";
import { storeConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "chris-fact-radar",
    status: "mvp-ready",
    timestamp: new Date().toISOString(),
    checks: {
      supabaseConfigured: storeConfigured(),
      llmConfigured: llmConfigured(),
      apifyConfigured: Boolean(process.env.APIFY_TOKEN),
      adminAuthConfigured: adminAuthConfigured(),
    },
    providers: {
      llm: llmConfigured() ? "openai-compatible" : "missing",
      chat: llmConfigured() ? "openai-compatible" : "fallback-only",
      socialIntake: Boolean(process.env.APIFY_TOKEN) ? "apify" : "manual-only",
      monitoring: "health-and-smoke-context",
      videoSourcePolicy: "apify-manual-source-urls",
    },
    notes: [
      "This endpoint exposes configuration presence only, never secret values.",
      "Use /status for the human-readable production status page.",
    ],
  });
}
