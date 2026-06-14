import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tenex_session";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

const OVERRIDES_ID = "report-cat-overrides";

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-change-me");
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (cookieHeader || "").split(";")) {
    const [key, ...rest] = part.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

async function supaPost(table: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase upsert ${table}: ${res.status} ${await res.text()}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role !== "admin") return res.status(403).json({ error: "admin only" });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { overrides } = req.body || {};
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return res.status(400).json({ error: "overrides object required" });
  }

  // 빈 값/잘못된 값 정리 (href -> cat 문자열만)
  const clean: Record<string, string> = {};
  for (const [href, cat] of Object.entries(overrides as Record<string, unknown>)) {
    if (typeof href === "string" && typeof cat === "string" && cat) clean[href] = cat;
  }

  try {
    await supaPost("tasks", [{
      id: OVERRIDES_ID,
      title: OVERRIDES_ID,
      cat: "I",
      urgency: "green",
      importance: "중",
      status: "system",
      assignee: "system",
      due_date: null,
      note: JSON.stringify(clean),
      checklist: [],
      sort_order: 999998,
      priority_order: 999998,
      updated_at: new Date().toISOString(),
    }]);
    return res.json({ success: true, count: Object.keys(clean).length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Supabase update failed", detail: message });
  }
}
