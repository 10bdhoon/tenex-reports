import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const OVERRIDES_ID = "report-cat-overrides";
const CARDS_ID = "report-cards-data";
const CATEGORIES_ID = "report-categories-data";

async function supaFetch(table: string, query = "select=*") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

function parseNote(rows: unknown, fallback: unknown) {
  const note = Array.isArray(rows) && (rows as Array<{ note?: unknown }>)[0]?.note;
  if (!note) return fallback;
  try {
    const parsed = JSON.parse(String(note));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 한 번의 쿼리로 세 행(overrides/cards/categories)을 모두 읽음
    const rows = await supaFetch(
      "tasks",
      `select=id,note&id=in.(${OVERRIDES_ID},${CARDS_ID},${CATEGORIES_ID})`,
    );
    const byId: Record<string, unknown> = {};
    if (Array.isArray(rows)) {
      for (const r of rows as Array<{ id?: string }>) {
        if (r && typeof r.id === "string") byId[r.id] = r;
      }
    }
    const overrides = parseNote(byId[OVERRIDES_ID] ? [byId[OVERRIDES_ID]] : [], {});
    const cards = parseNote(byId[CARDS_ID] ? [byId[CARDS_ID]] : [], null);
    const categories = parseNote(byId[CATEGORIES_ID] ? [byId[CATEGORIES_ID]] : [], null);
    return res.json({
      overrides: overrides && typeof overrides === "object" && !Array.isArray(overrides) ? overrides : {},
      cards: Array.isArray(cards) ? cards : null,
      categories: Array.isArray(categories) ? categories : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("report data read failed:", message);
    return res.status(500).json({ error: "Failed to read report data", detail: message });
  }
}
