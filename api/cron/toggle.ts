import type { VercelRequest, VercelResponse } from "@vercel/node";

const CRON_API_URL = process.env.CRON_API_URL || "http://127.0.0.1:9001";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { label, action } = req.body || {};
  if (!label || !["load", "unload"].includes(action)) {
    return res.status(400).json({ error: "label and action (load/unload) required" });
  }

  try {
    const r = await fetch(`${CRON_API_URL}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, action }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    return res.status(r.ok ? 200 : 500).json(data);
  } catch (e: unknown) {
    return res.status(503).json({
      ok: false,
      error: "cron-api-server unreachable",
      message: String(e),
    });
  }
}
