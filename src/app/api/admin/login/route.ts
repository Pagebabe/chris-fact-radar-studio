import { NextResponse } from "next/server";
import { getExpectedAdminToken, isValidAdminToken, STUDIO_ADMIN_COOKIE } from "@/lib/admin-auth";
import { serverLog } from "@/lib/server-log";

export async function POST(request: Request) {
  const expected = getExpectedAdminToken();
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("token") ?? "").trim();
  const redirectUrl = new URL("/studio", request.url);

  if (!expected) {
    serverLog("info", "api.admin.login", "Studio login bypassed because admin auth is not configured");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  if (!isValidAdminToken(token)) {
    serverLog("warn", "api.admin.login", "Invalid studio login attempt");
    redirectUrl.searchParams.set("auth", "failed");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set(STUDIO_ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  serverLog("info", "api.admin.login", "Studio unlocked with admin token");
  return response;
}
