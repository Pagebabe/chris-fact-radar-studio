import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { llmConfigured, opusProxyBaseUrl, opusProxyKey, opusProxyModel } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";

function providerInfo() {
  return {
    provider: llmConfigured() ? "openai-compatible" : "none",
    baseUrl: llmConfigured() ? opusProxyBaseUrl() : undefined,
    model: llmConfigured() ? opusProxyModel() : undefined,
  };
}

async function callOpenAiCompatible(baseUrl: string, apiKey: string, model: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 60,
      temperature: 0,
      messages: [
        { role: "system", content: "Antworte extrem kurz auf Deutsch." },
        { role: "user", content: "Sag nur: Provider test ok." },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  if (!res.ok) {
    return { success: false, status: res.status, error: text.slice(0, 500) };
  }
  try {
    const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    return { success: true, status: res.status, sample: data.choices?.[0]?.message?.content?.trim() ?? "" };
  } catch {
    return { success: false, status: res.status, error: "Invalid JSON from provider", raw: text.slice(0, 500) };
  }
}

export async function GET(request: Request) {
  // Fail-open by design when no admin token is set — the rate limit keeps the
  // live provider call from becoming an unbounded public cost path.
  const limited = rateLimit(request, { key: "llm-test", limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(request.url);
  const live = url.searchParams.get("mode") === "live";
  const dryRun = url.searchParams.get("dryRun") === "1" || request.headers.get("x-diagnostics-dry-run") === "1";
  const configured = llmConfigured();
  const { provider, baseUrl, model } = providerInfo();

  if (!live) {
    return NextResponse.json({
      ok: configured,
      configured,
      provider,
      baseUrl,
      model,
      liveCall: false,
      note: configured ? "OpenAI-compatible provider is configured. Add ?mode=live to call the provider." : "No LLM key configured.",
    });
  }

  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      configured,
      provider,
      baseUrl,
      model,
      liveCall: true,
      dryRun: true,
      note: "Live provider auth path is reachable; provider call was intentionally skipped.",
    });
  }

  if (!configured) {
    return NextResponse.json({ ok: false, configured: false, provider, liveCall: false, error: "No LLM key configured." }, { status: 503 });
  }

  const result = await callOpenAiCompatible(baseUrl || opusProxyBaseUrl(), opusProxyKey() || "", model || opusProxyModel());

  return NextResponse.json({
    ok: result.success,
    configured,
    provider,
    baseUrl,
    model,
    liveCall: true,
    ...result,
  }, { status: result.success ? 200 : 502 });
}
