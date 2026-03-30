import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";
import { getSupabaseAdmin } from "../lib/supabase";

const COOKIE_NAME = "tenex_session";

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-change-me"
  );
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (cookieHeader || "").split(";")) {
    const [key, ...rest] = part.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // JWT 인증
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "admin only" });
    }
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: "id query parameter required" });
  }

  const table = (req.query.table as string) || "tasks";
  if (table !== "tasks" && table !== "agents") {
    return res.status(400).json({ error: "table must be tasks or agents" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Delete failed", detail: message });
  }
}
