import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFile } from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src", "data", "partnership-os-data.json");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    return res.status(200).json(JSON.parse(raw));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Failed to read partnership OS data", detail: message });
  }
}
