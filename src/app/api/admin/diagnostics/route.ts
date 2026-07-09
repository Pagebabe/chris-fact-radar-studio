import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { llmConfigured } from "@/lib/llm";
import { serverLog } from "@/lib/server-log";
import { storeConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const diagnostics = {
    ok: true,
    app: "chris-fact-radar",
    status: "diagnostics-ready",
    timestamp: new Date().toISOString(),
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      vercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
    checks: {
      supabaseConfigured: storeConfigured(),
      llmConfigured: llmConfigured(),
      apifyConfigured: Boolean(process.env.APIFY_TOKEN),
      adminAuthConfigured: Boolean(process.env.APP_ADMIN_TOKEN),
    },
    providers: {
      llm: llmConfigured() ? "openai-compatible" : "missing",
      chat: llmConfigured() ? "openai-compatible" : "fallback-only",
      socialIntake: Boolean(process.env.APIFY_TOKEN) ? "apify" : "manual-only",
      monitoring: "health-and-smoke-context",
      videoSourcePolicy: "apify-manual-source-urls",
    },
    protectedRoutes: [
      "POST /api/admin/manual-seed-cases?confirm=manual-seed-cases",
      "GET /api/admin/seed-debate-cases?confirm=seed-debate-cases",
      "GET /api/admin/seed-real-cases",
      "GET /api/admin/diagnostics",
    ],
    notes: [
      "No secret values are returned.",
      "When APP_ADMIN_TOKEN is set, this endpoint requires Bearer or x-admin-token authentication.",
      "Use server logs for structured fallback/error traces.",
    ],
  };

  serverLog("info", "api.admin.diagnostics", "Diagnostics endpoint checked", {
    supabaseConfigured: diagnostics.checks.supabaseConfigured,
    llmConfigured: diagnostics.checks.llmConfigured,
    adminAuthConfigured: diagnostics.checks.adminAuthConfigured,
  });

  return NextResponse.json(diagnostics);
}
