import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, env_url: !!process.env.SUPABASE_URL, env_key: !!process.env.SUPABASE_ANON_KEY });
}
