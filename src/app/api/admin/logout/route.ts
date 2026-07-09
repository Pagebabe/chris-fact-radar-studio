import { NextResponse } from "next/server";
import { STUDIO_ADMIN_COOKIE } from "@/lib/admin-auth";
import { serverLog } from "@/lib/server-log";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/studio", request.url), { status: 303 });
  response.cookies.set(STUDIO_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  serverLog("info", "api.admin.logout", "Studio admin session cleared");
  return response;
}
