import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tenex_session";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

const OVERRIDES_ID = "report-cat-overrides";
const CARDS_ID = "report-cards-data";
const CATEGORIES_ID = "report-categories-data";

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

function kvRow(id: string, note: string) {
  return {
    id,
    title: id,
    cat: "I",
    urgency: "green",
    importance: "중",
    status: "system",
    assignee: "system",
    due_date: null,
    note,
    checklist: [],
    sort_order: 999998,
    priority_order: 999998,
    updated_at: new Date().toISOString(),
  };
}

// 카드 정규화: 필수 필드(href/title) 검증, 허용 필드만 통과, href 중복 제거
function cleanCards(input: unknown): { cards: Array<Record<string, unknown>>; error?: string } {
  if (!Array.isArray(input)) return { cards: [], error: "cards must be an array" };
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const href = typeof r.href === "string" ? r.href.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!href || !title) return { cards: [], error: "each card needs non-empty href and title" };
    if (seen.has(href)) return { cards: [], error: `duplicate href: ${href}` };
    seen.add(href);
    const card: Record<string, unknown> = {
      href,
      title,
      icon: typeof r.icon === "string" ? r.icon : "📄",
      desc: typeof r.desc === "string" ? r.desc : "",
      date: typeof r.date === "string" ? r.date : "",
      cat: typeof r.cat === "string" && r.cat ? r.cat : "I",
    };
    if (typeof r.sub === "string" && r.sub) card.sub = r.sub;
    if (r.adminOnly === true) card.adminOnly = true;
    out.push(card);
  }
  return { cards: out };
}

// 카테고리 정규화: 필수 필드(key/label) 검증, key 중복 제거
function cleanCategories(input: unknown): { categories: Array<Record<string, unknown>>; error?: string } {
  if (!Array.isArray(input)) return { categories: [], error: "categories must be an array" };
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const key = typeof r.key === "string" ? r.key.trim() : "";
    const label = typeof r.label === "string" ? r.label.trim() : "";
    if (!key || !label) return { categories: [], error: "each category needs non-empty key and label" };
    if (seen.has(key)) return { categories: [], error: `duplicate category key: ${key}` };
    seen.add(key);
    const cat: Record<string, unknown> = {
      key,
      icon: typeof r.icon === "string" ? r.icon : "📁",
      label,
    };
    if (r.pinned === true) cat.pinned = true;
    if (Array.isArray(r.subs)) {
      cat.subs = (r.subs as unknown[]).filter((s) => typeof s === "string" && s).map((s) => s as string);
    }
    out.push(cat);
  }
  return { categories: out };
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

  const body = (req.body || {}) as Record<string, unknown>;
  const hasOverrides = "overrides" in body;
  const hasCards = "cards" in body;
  const hasCategories = "categories" in body;

  if (!hasOverrides && !hasCards && !hasCategories) {
    return res.status(400).json({ error: "overrides, cards, or categories required" });
  }

  const rows: Array<ReturnType<typeof kvRow>> = [];
  const result: Record<string, number> = {};

  if (hasOverrides) {
    const overrides = body.overrides;
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      return res.status(400).json({ error: "overrides must be an object" });
    }
    const clean: Record<string, string> = {};
    for (const [href, cat] of Object.entries(overrides as Record<string, unknown>)) {
      if (typeof href === "string" && typeof cat === "string" && cat) clean[href] = cat;
    }
    rows.push(kvRow(OVERRIDES_ID, JSON.stringify(clean)));
    result.overrides = Object.keys(clean).length;
  }

  if (hasCards) {
    const { cards, error } = cleanCards(body.cards);
    if (error) return res.status(400).json({ error });
    rows.push(kvRow(CARDS_ID, JSON.stringify(cards)));
    result.cards = cards.length;
  }

  if (hasCategories) {
    const { categories, error } = cleanCategories(body.categories);
    if (error) return res.status(400).json({ error });
    rows.push(kvRow(CATEGORIES_ID, JSON.stringify(categories)));
    result.categories = categories.length;
  }

  try {
    await supaPost("tasks", rows);
    return res.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Supabase update failed", detail: message });
  }
}
