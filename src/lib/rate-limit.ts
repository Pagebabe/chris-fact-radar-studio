import { NextResponse } from "next/server";

// Lightweight per-IP soft limiter for the public LLM demo routes.
// Note: on serverless this is best-effort per warm instance, not a globally
// shared counter. It exists to blunt accidental spam / cost bursts on the free
// NVIDIA-hosted model, not as a hardened gateway. The 429 body says so honestly.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number }
): NextResponse | null {
  const now = Date.now();
  const mapKey = `${opts.key}:${clientIp(request)}`;
  const bucket = buckets.get(mapKey);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(mapKey, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (bucket.count >= opts.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: retryAfter,
        note: "Per-IP soft limit on this demo instance (serverless: best-effort per instance, not globally shared).",
      },
      { status: 429, headers: { "retry-after": String(retryAfter) } }
    );
  }

  bucket.count += 1;
  return null;
}
