import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const COOKIE_NAME = "tenex_session";
const DATA_PATH = path.join(process.cwd(), "src", "data", "partnership-os-data.json");

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

  const { instagramCreators, dmLogs, humanReviewInbox, followupQueue, creatorHistories } = req.body || {};

  try {
    const current = JSON.parse(await readFile(DATA_PATH, "utf-8"));

    const next = {
      ...current,
      instagramCreators: Array.isArray(instagramCreators) ? instagramCreators : current.instagramCreators,
      dmLogs: Array.isArray(dmLogs) ? dmLogs : current.dmLogs,
      humanReviewInbox: Array.isArray(humanReviewInbox) ? humanReviewInbox : current.humanReviewInbox,
      followupQueue: Array.isArray(followupQueue) ? followupQueue : current.followupQueue,
      creatorHistories: creatorHistories && typeof creatorHistories === "object" ? creatorHistories : current.creatorHistories,
    };

    await writeFile(DATA_PATH, JSON.stringify(next, null, 2) + "\n", "utf-8");
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Failed to update partnership OS data", detail: message });
  }
}
