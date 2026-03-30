import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tenex_session";
const REPO = "10bdhoon/tenex-reports";
const FILE_PATH = "src/data/project-status.json";

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

  // GITHUB_TOKEN 체크
  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return res.status(500).json({ error: "GITHUB_TOKEN not configured" });
  }

  const { tasks, agents, lastUpdated } = req.body || {};
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "tasks array required" });
  }

  try {
    // 1. 현재 파일의 sha 취득
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!getRes.ok) {
      const errText = await getRes.text();
      return res.status(502).json({ error: "GitHub GET failed", detail: errText });
    }

    const fileData = await getRes.json();
    const currentSha = fileData.sha;

    // 2. 새 JSON 생성
    const newContent = {
      updated: lastUpdated || new Date().toISOString(),
      tasks,
      ...(agents ? { agents } : {}),
    };

    const contentBase64 = Buffer.from(
      JSON.stringify(newContent, null, 2),
      "utf-8"
    ).toString("base64");

    // 3. GitHub에 PUT
    const putRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "update: tasks board sync",
          content: contentBase64,
          sha: currentSha,
        }),
      }
    );

    if (!putRes.ok) {
      const errText = await putRes.text();
      return res.status(502).json({ error: "GitHub PUT failed", detail: errText });
    }

    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Internal error", detail: message });
  }
}
