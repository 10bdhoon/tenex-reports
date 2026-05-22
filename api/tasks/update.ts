import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tenex_session";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

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

async function supaDelete(table: string, notInIds: string[]) {
  if (!notInIds.length) return;
  const filter = notInIds.map((id) => `"${id}"`).join(",");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=not.in.(${filter})`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`Supabase delete ${table}: ${res.status} ${await res.text()}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role !== "admin") return res.status(403).json({ error: "admin only" });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { tasks, agents, partnershipState } = req.body || {};

  try {
    // tasks 업데이트 (비어있으면 스킵 — 전체 삭제 방지)
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      const dbTasks = tasks.map((t: Record<string, unknown>) => ({
        id: t.id,
        title: t.title,
        cat: t.cat,
        urgency: t.urgency || "green",
        importance: t.importance || "중",
        status: t.status,
        assignee: t.assignee || "",
        due_date: t.due || null,
        note: t.desc || "",
        checklist: t.checklist || [],
        sort_order: t.sortOrder || 0,
        priority_order: t.priorityOrder || 0,
        updated_at: new Date().toISOString(),
      }));

      await supaPost("tasks", dbTasks);
      const taskIds = dbTasks.map((t: Record<string, unknown>) => String(t.id));
      await supaDelete("tasks", taskIds);
    }

    if (partnershipState && typeof partnershipState === "object") {
      const payload = [{
        id: "partnership-os-state",
        title: "partnership-os-state",
        cat: "I",
        urgency: "green",
        importance: "중",
        status: "system",
        assignee: "karina",
        due_date: null,
        note: JSON.stringify(partnershipState),
        checklist: [],
        sort_order: 999999,
        priority_order: 999999,
        updated_at: new Date().toISOString(),
      }];
      await supaPost("tasks", payload);
    }

    if (agents && Array.isArray(agents)) {
      const dbAgents = agents.map((a: Record<string, unknown>) => ({
        id: a.id,
        icon: a.icon || "",
        name: a.name || "",
        role: a.role || "",
        tasks: a.tasks || [],
        updated_at: new Date().toISOString(),
      }));
      await supaPost("agents", dbAgents);
      const agentIds = dbAgents.map((a: Record<string, unknown>) => String(a.id));
      await supaDelete("agents", agentIds);
    }

    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Supabase update failed", detail: message });
  }
}
