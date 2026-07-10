import { NextResponse } from "next/server";
import { adminAuthConfigured } from "@/lib/admin-auth";
import { llmConfigured } from "@/lib/llm";
import { storeConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local";
  const ref = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || "local";

  return NextResponse.json({
    ok: true,
    app: "chris-fact-radar",
    status: "live",
    timestamp: new Date().toISOString(),
    build: {
      commit: commit === "local" ? commit : commit.slice(0, 12),
      ref,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
    },
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
      "This endpoint exposes configuration presence and deployment identity only, never secret values.",
      "Use /status for the human-readable production status page.",
    ],
  });
}
