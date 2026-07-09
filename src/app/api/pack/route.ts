import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { generateContentPackWithLlm, type ScriptStyle } from "@/lib/llm";
import { buildFallbackPack } from "@/lib/pack";
import { logServerError, serverLog } from "@/lib/server-log";
import type { ClaimItem } from "@/lib/types";

export const maxDuration = 15;

const STYLES: ScriptStyle[] = ["sachlich", "offensiv", "humorvoll"];

async function readJson(request: Request): Promise<{ item?: ClaimItem; style?: string } | null> {
  try {
    return (await request.json()) as { item?: ClaimItem; style?: string };
  } catch (error) {
    logServerError("api.pack", "Invalid JSON request body", error);
    return null;
  }
}

function isUsableClaimItem(value: unknown): value is ClaimItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ClaimItem>;
  return Boolean(
    typeof item.id === "string" &&
    typeof item.claim === "string" &&
    item.claim.trim().length >= 10 &&
    item.sourceVideo &&
    typeof item.sourceVideo === "object"
  );
}

function fallbackResponse(item: ClaimItem, style: ScriptStyle, reason: string) {
  const pack = buildFallbackPack(item);
  serverLog("info", "api.pack", "Generated content pack with deterministic fallback", {
    claimId: item.id,
    style,
    reason,
  });
  return NextResponse.json({ pack, source: "fallback", reason });
}

export async function POST(request: Request) {
  // Reviewer-facing content demo: open, but soft per-IP rate limited for cost.
  const limited = rateLimit(request, { key: "pack", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = await readJson(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isUsableClaimItem(body.item)) {
    serverLog("warn", "api.pack", "Rejected missing or invalid content pack item", {
      hasItem: Boolean(body.item),
      style: body.style,
    });
    return NextResponse.json({ error: "Missing or invalid item" }, { status: 400 });
  }

  const style = STYLES.find((s) => s === body.style) ?? "sachlich";
  const forceFallback = request.headers.get("x-force-fallback") === "1";
  if (forceFallback) {
    return fallbackResponse(body.item, style, "forced-by-test-or-diagnostics");
  }

  try {
    const llmPack = await generateContentPackWithLlm(body.item, style);
    if (llmPack) {
      serverLog("info", "api.pack", "Generated content pack with provider", {
        claimId: body.item.id,
        style,
      });
      return NextResponse.json({ pack: llmPack, source: "llm" });
    }
  } catch (error) {
    logServerError("api.pack", "LLM content pack generation failed; using fallback", error, {
      claimId: body.item.id,
      style,
    });
  }

  return fallbackResponse(body.item, style, "provider-unavailable-fast-fallback");
}
