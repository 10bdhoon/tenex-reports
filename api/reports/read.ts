import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const OVERRIDES_ID = "report-cat-overrides";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rows = await supaFetch("tasks", `select=note&id=eq.${OVERRIDES_ID}`);
    const note = Array.isArray(rows) && rows[0]?.note ? String(rows[0].note) : "{}";
    let overrides: Record<string, string> = {};
    try {
      overrides = JSON.parse(note) || {};
    } catch {
      overrides = {};
    }
    return res.json({ overrides });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("report overrides read failed:", message);
    return res.status(500).json({ error: "Failed to read report overrides", detail: message });
  }
}
