import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseClient } from "../lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseClient();

    // tasks 조회 (checklist는 jsonb 컬럼)
    const { data: tasksRaw, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .order("sort_order", { ascending: true });

    if (tasksError) throw tasksError;

    // agents 조회
    const { data: agentsRaw, error: agentsError } = await supabase
      .from("agents")
      .select("*");

    if (agentsError) throw agentsError;

    // DB 컬럼명 → 프론트엔드 필드명 매핑
    const tasks = (tasksRaw || []).map((t: Record<string, unknown>) => ({
      id: t.id,
      title: t.title,
      cat: t.cat,
      urgency: t.urgency,
      importance: t.importance,
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

    return res.json({
      updated: new Date().toISOString(),
      tasks,
      agents,
    });
  } catch (err) {
    // Supabase 실패 시 JSON 폴백
    console.error("Supabase read failed, falling back to JSON:", err);
    try {
      const fs = await import("fs");
      const path = await import("path");
      const jsonPath = path.join(process.cwd(), "src", "data", "project-status.json");
      const raw = fs.readFileSync(jsonPath, "utf-8");
      return res.json(JSON.parse(raw));
    } catch (fallbackErr) {
      return res.status(500).json({ error: "Failed to read tasks", detail: String(fallbackErr) });
    }
  }
}
