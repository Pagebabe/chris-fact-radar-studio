import { NextResponse } from "next/server";

const ADMIN_TOKEN_ENV = "APP_ADMIN_TOKEN";
export const STUDIO_ADMIN_COOKIE = "chris_fact_radar_admin";

export function adminAuthConfigured(): boolean {
  return Boolean(process.env[ADMIN_TOKEN_ENV]);
}

export function adminUnauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Unauthorized",
      hint: `Set ${ADMIN_TOKEN_ENV} and send it as Bearer token, x-admin-token or studio cookie for protected write/admin routes.`,
    },
    { status: 401 }
  );
}

export function getExpectedAdminToken() {
  return process.env[ADMIN_TOKEN_ENV] ?? "";
}

export function isValidAdminToken(token: string | null | undefined) {
  const expected = getExpectedAdminToken();
  return Boolean(expected && token && token === expected);
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? "";
}

function presentedToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const headerToken = request.headers.get("x-admin-token")?.trim() ?? "";
  const urlToken = new URL(request.url).searchParams.get("adminToken")?.trim() ?? "";
  const cookieToken = readCookie(request, STUDIO_ADMIN_COOKIE);
  return { bearer, headerToken, urlToken, cookieToken };
}

export function requireAdmin(request: Request) {
  const expected = process.env[ADMIN_TOKEN_ENV];
  if (!expected) return null;

  const { bearer, headerToken, urlToken, cookieToken } = presentedToken(request);
  if (bearer === expected || headerToken === expected || urlToken === expected || cookieToken === expected) {
    return null;
  }

  return adminUnauthorizedResponse();
}

// Fail-closed guard for write/cost routes. Unlike requireAdmin, this denies by
// default when no admin token is configured on the server, so a fresh deploy
// never leaves DB writes or paid intake (Apify) open to the public.
export function requireAdminStrict(request: Request) {
  const expected = process.env[ADMIN_TOKEN_ENV];
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "Locked",
        hint: `This write/cost route is disabled until ${ADMIN_TOKEN_ENV} is set on the server.`,
      },
      { status: 401 }
    );
  }

  const { bearer, headerToken, urlToken, cookieToken } = presentedToken(request);
  if (bearer === expected || headerToken === expected || urlToken === expected || cookieToken === expected) {
    return null;
  }

  return adminUnauthorizedResponse();
}
