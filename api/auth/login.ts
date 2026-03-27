import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT } from "jose";
import { compare } from "bcryptjs";

const COOKIE_NAME = "tenex_session";

interface User {
  username: string;
  passwordHash: string;
  role: string;
}

function getUsers(): User[] {
  const usersEnv = process.env.USERS;
  if (usersEnv) {
    return usersEnv.split(",").map((entry) => {
      const [username, passwordHash, role] = entry.split(":");
      return { username, passwordHash, role: role || "viewer" };
    });
  }
  return [
    {
      username: "admin",
      passwordHash: "$2b$10$2NcaKPFkCGhoxKbdFpNuru0/gH8IzuViZMhN3nG/PesAYDDZNRisa",
      role: "admin",
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
    return res
      .status(401)
      .json({ error: "아이디 또는 비밀번호가 틀렸습니다." });

  const valid = await compare(password, user.passwordHash);
  if (!valid)
    return res
      .status(401)
      .json({ error: "아이디 또는 비밀번호가 틀렸습니다." });

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-secret-change-me"
  );
  const jwt = await new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 86400}`
  );
  res.json({ ok: true });
}
