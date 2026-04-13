import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT } from "jose";
import { compare } from "bcryptjs";

const COOKIE_NAME = "tenex_session";

interface User {
  username: string;
  passwordHash: string;
  role: string;
  allowedPaths?: string[]; // undefined = 전체 접근 가능
}

function getUsers(): User[] {
  const usersEnv = process.env.USERS;
  if (usersEnv) {
    return usersEnv.split(",").map((entry) => {
      const [username, passwordHash, role, paths] = entry.split(":");
      return {
        username,
        passwordHash,
        role: role || "viewer",
        allowedPaths: paths ? paths.split("|") : undefined,
      };
    });
  }
  return [
    {
      username: "admin",
      passwordHash: "$2b$10$2NcaKPFkCGhoxKbdFpNuru0/gH8IzuViZMhN3nG/PesAYDDZNRisa",
      role: "admin",
    },
    {
      username: "almani",
      passwordHash: "$2b$10$3Dn4FzNzDwK9HSv1lDLyYuYg3kSyQIklV/E36X1Taj7EzoAGgFE8y",
      role: "viewer",
      allowedPaths: ["/crm", "/crm.html"],
    },
    {
      username: "dlsrb",
      passwordHash: "$2b$10$Dw.AWkjoyejRvRK6PNDeJe7p.Ch2PYGeeqVxpPq.to4ELNvA5wc8y",
      role: "viewer",
    },
    {
      username: "jeongmin.lee@tenex.kr",
      passwordHash: "$2b$10$q4gsSO9a3mPMblumLDImkuKz/ecyngg3Or.ZLlWzgtWTh7FDWBuLq",
      role: "viewer",
      allowedPaths: ["/ai-usage-guide", "/ai-usage-guide.html"],
    },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const users = getUsers();
  const user = users.find((u) => u.username === username);
  if (!user)
    return res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });

  const valid = await compare(password, user.passwordHash);
  if (!valid)
    return res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-change-me"
  );
  const payload: Record<string, unknown> = {
    username: user.username,
    role: user.role,
  };
  if (user.allowedPaths) {
    payload.allowedPaths = user.allowedPaths;
  }

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 86400}`
  );
  res.json({ ok: true, role: user.role });
}
