import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE_NAME = "tenex_auth";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
  res.redirect(302, "/");
}
