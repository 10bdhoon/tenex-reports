import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

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
    const [tasksRaw, agentsRaw, partnershipRaw] = await Promise.all([
      supaFetch("tasks", "select=*&order=sort_order.asc"),
      supaFetch("agents", "select=*"),
      supaFetch("tasks", "select=note&id=eq.partnership-os-state"),
    ]);

    const tasks = (tasksRaw || []).map((t: Record<string, unknown>) => ({
      id: t.id,
      title: t.title,
      cat: t.cat,
      urgency: t.urgency || "green",
      importance: t.importance || "중",
      status: t.status,
      assignee: t.assignee,
      due: t.due_date,
      desc: t.note,
      checklist: t.checklist || [],
      memo: "",
      _source: "supabase",
      sortOrder: t.sort_order,
      priorityOrder: t.priority_order,
    }));

    const agents = (agentsRaw || []).map((a: Record<string, unknown>) => ({
      id: a.id,
      icon: a.icon,
      name: a.name,
      role: a.role,
      tasks: a.tasks,
    }));

    const partnershipState = Array.isArray(partnershipRaw) && partnershipRaw[0]?.note
      ? JSON.parse(String(partnershipRaw[0].note))
      : null;

    return res.json({ updated: new Date().toISOString(), tasks, agents, partnershipState });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Supabase read failed:", message);
    return res.status(500).json({ error: "Failed to read tasks from DB", detail: message });
  }
}
