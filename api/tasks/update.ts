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

    // 프론트엔드 필드명 → DB 컬럼명 매핑 후 upsert
    const dbTasks = tasks.map((t: Record<string, unknown>) => ({
      id: t.id,
      title: t.title,
      cat: t.cat,
      urgency: t.urgency,
      importance: t.importance,
      status: t.status,
      assignee: t.assignee || "",
      due_date: t.due || null,
      note: t.desc || "",
      checklist: t.checklist || [],
      sort_order: t.sortOrder || 0,
      priority_order: t.priorityOrder || 0,
      updated_at: new Date().toISOString(),
    }));

    const { error: tasksError } = await supabase
      .from("tasks")
      .upsert(dbTasks, { onConflict: "id" });

    if (tasksError) throw tasksError;

    // DB에 없는 task 삭제 (프론트에서 삭제된 task 동기화)
    const taskIds = dbTasks.map((t: { id: unknown }) => t.id);
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .not("id", "in", `(${taskIds.join(",")})`);

    if (deleteError) throw deleteError;

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

      // DB에 없는 agent 삭제
      const agentIds = dbAgents.map((a: { id: unknown }) => a.id);
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
