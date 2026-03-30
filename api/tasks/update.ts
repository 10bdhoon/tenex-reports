import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";
import { getSupabaseAdmin } from "../../lib/supabase";

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

interface ChecklistItem {
  id?: string;
  text: string;
  done: boolean;
  sort_order?: number;
}

interface TaskInput {
  id: string;
  title: string;
  cat: string;
  urgency: string;
  importance: string;
  status: string;
  assignee?: string;
  due?: string | null;
  desc?: string;
  checklist?: ChecklistItem[];
  sortOrder?: number;
  priorityOrder?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
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

  const { tasks, agents } = req.body || {};
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "tasks array required" });
  }

  try {
    const supabase = getSupabaseAdmin();

    // tasks upsert (checklist 제외)
    const dbTasks = tasks.map((t: TaskInput) => ({
      id: t.id,
      title: t.title,
      cat: t.cat,
      urgency: t.urgency,
      importance: t.importance,
      status: t.status,
      assignee: t.assignee || "",
      due_date: t.due || null,
      note: t.desc || "",
      sort_order: t.sortOrder || 0,
      priority_order: t.priorityOrder || 0,
      updated_at: new Date().toISOString(),
    }));

    const { error: tasksError } = await supabase
      .from("tasks")
      .upsert(dbTasks, { onConflict: "id" });

    if (tasksError) throw tasksError;

    // DB에 없는 task 삭제
    const taskIds = dbTasks.map((t) => t.id);
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .not("id", "in", `(${taskIds.join(",")})`);

    if (deleteError) throw deleteError;

    // checklists 동기화 (task별로 delete → insert)
    for (const t of tasks as TaskInput[]) {
      if (!t.checklist) continue;

      // 기존 체크리스트 삭제
      const { error: delCheckErr } = await supabase
        .from("checklists")
        .delete()
        .eq("task_id", t.id);

      if (delCheckErr) throw delCheckErr;

      // 새 체크리스트 삽입
      if (t.checklist.length > 0) {
        const checklistRows = t.checklist.map((c, idx) => ({
          task_id: t.id,
          text: c.text,
          done: c.done || false,
          sort_order: c.sort_order ?? idx,
        }));

        const { error: insCheckErr } = await supabase
          .from("checklists")
          .insert(checklistRows);

        if (insCheckErr) throw insCheckErr;
      }
    }

    // agents upsert
    if (agents && Array.isArray(agents)) {
      const dbAgents = agents.map((a: Record<string, unknown>) => ({
        id: a.id,
        icon: a.icon || "",
        name: a.name || "",
        role: a.role || "",
        tasks: a.tasks || [],
        updated_at: new Date().toISOString(),
      }));

      const { error: agentsError } = await supabase
        .from("agents")
        .upsert(dbAgents, { onConflict: "id" });

      if (agentsError) throw agentsError;

      const agentIds = dbAgents.map((a) => a.id as string);
      const { error: agentDeleteError } = await supabase
        .from("agents")
        .delete()
        .not("id", "in", `(${agentIds.join(",")})`);

      if (agentDeleteError) throw agentDeleteError;
    }

    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Supabase update failed", detail: message });
  }
}
