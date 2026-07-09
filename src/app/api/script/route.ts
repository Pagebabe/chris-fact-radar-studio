import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { buildFallbackScript, generateScriptWithLlm, type ScriptStyle } from "@/lib/llm";
import type { ClaimItem } from "@/lib/types";

export const maxDuration = 60;

const STYLES: ScriptStyle[] = ["sachlich", "offensiv", "humorvoll"];

export async function POST(request: Request) {
  // Reviewer-facing content demo: open, but soft per-IP rate limited for cost.
  const limited = rateLimit(request, { key: "script", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await request.json()) as { item?: ClaimItem; style?: string };
  if (!body.item) {
    return NextResponse.json({ error: "Missing item" }, { status: 400 });
  }

  const style = STYLES.find((s) => s === body.style) ?? "sachlich";
  const llmScript = await generateScriptWithLlm(body.item, style);
  const script = llmScript ?? buildFallbackScript(body.item);
  return NextResponse.json({ script, source: llmScript ? "llm" : "fallback" });
}
