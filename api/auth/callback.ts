import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT } from "jose";

const COOKIE_NAME = "tenex_auth";
const TOKEN_EXPIRY_DAYS = 7;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function getAllowedEmails(): string[] {
  const emails = process.env.ALLOWED_EMAILS || "";
  return emails.split(",").map((e) => e.trim().toLowerCase());
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { code, state } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).send("Missing authorization code");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send("OAuth credentials not configured");
  }

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/auth/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      return res.status(401).send("Authentication failed");
    }

    const tokenData = await tokenRes.json();

    // Get user info
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!userRes.ok) {
      return res.status(401).send("Failed to get user info");
    }

    const userInfo = await userRes.json();
    const email = (userInfo.email || "").toLowerCase();

    // Check whitelist
    const allowed = getAllowedEmails();
    if (!allowed.includes(email)) {
      return res
        .status(403)
        .send(
          `<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">` +
            `<div style="text-align:center"><h1>Access Denied</h1><p>${email} is not authorized.</p>` +
            `<a href="/api/auth/logout">Try another account</a></div></body></html>`
        );
    }

    // Create JWT
    const jwt = await new SignJWT({
      email,
      name: userInfo.name,
      picture: userInfo.picture,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_EXPIRY_DAYS}d`)
      .sign(getJwtSecret());

    // Set cookie and redirect
    const returnTo =
      typeof state === "string" && state.startsWith("/") ? state : "/";

    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TOKEN_EXPIRY_DAYS * 86400}`
    );
    res.redirect(302, returnTo);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Internal server error");
  }
}
