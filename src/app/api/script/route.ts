import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildFallbackScript, generateScriptWithLlm, type ScriptStyle } from "@/lib/llm";
import type { ClaimItem } from "@/lib/types";

export const maxDuration = 60;

const STYLES: ScriptStyle[] = ["sachlich", "offensiv", "humorvoll"];

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { item?: ClaimItem; style?: string };
  if (!body.item) {
    return NextResponse.json({ error: "Missing item" }, { status: 400 });
  }

  const style = STYLES.find((s) => s === body.style) ?? "sachlich";
  const llmScript = await generateScriptWithLlm(body.item, style);
  const script = llmScript ?? buildFallbackScript(body.item);
  return NextResponse.json({ script, source: llmScript ? "llm" : "fallback" });
}
