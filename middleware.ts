import { next } from "@vercel/edge";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tenex_auth";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
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

  // Skip auth routes
  if (url.pathname.startsWith("/api/auth")) {
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

  // Store the original URL to redirect back after login
  const returnTo = url.pathname + url.search;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("GOOGLE_CLIENT_ID is not configured", { status: 500 });
  }

  const redirectUri = `${url.origin}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    state: returnTo,
    prompt: "select_account",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return Response.redirect(googleAuthUrl, 302);
}
