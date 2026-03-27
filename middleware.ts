import { next } from "@vercel/edge";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tenex_session";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "fallback-secret-change-me";
  return new TextEncoder().encode(secret);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

export default async function middleware(req: Request) {
  const url = new URL(req.url);

  // Allow login page and auth API routes
  if (url.pathname === "/login" || url.pathname === "/login.html" || url.pathname.startsWith("/api/auth")) {
    return next();
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];

  if (token) {
    try {
      await jwtVerify(token, getJwtSecret());
      return next();
    } catch {
      // Invalid token — fall through to redirect
    }
  }

  const returnTo = url.pathname + url.search;
  const loginUrl = new URL("/login.html", url.origin);
  if (returnTo && returnTo !== "/") {
    loginUrl.searchParams.set("returnTo", returnTo);
  }

  return Response.redirect(loginUrl.toString(), 302);
}
