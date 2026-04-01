import type { VercelRequest, VercelResponse } from "@vercel/node";

// 맥미니 로컬 cron-api-server 주소
// Vercel은 외부 인터넷에서 접근 → 맥미니가 외부에 노출된 경우 사용
// 내부 전용이면 Tailscale/ngrok 또는 직접 호출 필요
// 현재는 로컬 API 서버 URL을 환경변수로 받음
const CRON_API_URL = process.env.CRON_API_URL || "http://127.0.0.1:9001";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const r = await fetch(`${CRON_API_URL}/status`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`cron-api: ${r.status}`);
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e: unknown) {
    // 로컬 서버 미응답 시 — 빈 목록 반환
    return res.status(503).json({
      ok: false,
      error: "cron-api-server unreachable",
      message: String(e),
      crons: [],
    });
  }
}
