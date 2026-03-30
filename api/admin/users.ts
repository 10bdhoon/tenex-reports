import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

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

interface User {
  username: string;
  passwordHash: string;
  role: string;
  allowedPaths?: string[];
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
      passwordHash: "$2b$10$c0F0NehSkD.mWLBAU0tXCe.VosZnKd56j1amqfXheYpJouIMxzJHm",
      role: "viewer",
    },
    {
      username: "wpgud",
      passwordHash: "$2b$10$3Gmm4CozTb.exZqr2n4SW.egqhQZiUnyaI3RbwTSTtf55HXwYt6HO",
      role: "viewer",
    },
  ];
}

async function verifyAdmin(req: VercelRequest): Promise<boolean> {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: admin only" });
  }

  const users = getUsers();

  if (req.method === "GET") {
    // Return users without passwordHash for security
    const safeUsers = users.map(({ passwordHash: _h, ...rest }) => rest);
    return res.json({ users: safeUsers });
  }

  // All write operations are informational only (can't mutate env vars at runtime)
  // They return the new USERS env string for manual Vercel update

  if (req.method === "POST") {
    // Add user: expects { username, passwordHash, role, allowedPaths }
    const { username, passwordHash, role, allowedPaths } = req.body || {};
    if (!username || !passwordHash) {
      return res.status(400).json({ error: "username and passwordHash required" });
    }
    if (users.find((u) => u.username === username)) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const newUser: User = {
      username,
      passwordHash,
      role: role || "viewer",
      allowedPaths: allowedPaths || undefined,
    };
    const updated = [...users, newUser];
    return res.json({ usersEnvString: buildEnvString(updated), users: updated.map(({ passwordHash: _h, ...r }) => r) });
  }

  if (req.method === "DELETE") {
    const { username } = req.query as { username?: string };
    if (!username) return res.status(400).json({ error: "username required" });
    if (username === "admin") return res.status(400).json({ error: "Cannot delete admin" });
    const updated = users.filter((u) => u.username !== username);
    return res.json({ usersEnvString: buildEnvString(updated), users: updated.map(({ passwordHash: _h, ...r }) => r) });
  }

  if (req.method === "PUT") {
    // Change password: expects { username, newPasswordHash }
    const { username, newPasswordHash } = req.body || {};
    if (!username || !newPasswordHash) {
      return res.status(400).json({ error: "username and newPasswordHash required" });
    }
    const updated = users.map((u) =>
      u.username === username ? { ...u, passwordHash: newPasswordHash } : u
    );
    return res.json({ usersEnvString: buildEnvString(updated), users: updated.map(({ passwordHash: _h, ...r }) => r) });
  }

  if (req.method === "PATCH") {
    // Update allowedPaths and/or role: expects { username, allowedPaths?, role? }
    const { username, allowedPaths, role } = req.body || {};
    if (!username) return res.status(400).json({ error: "username required" });
    const updated = users.map((u) => {
      if (u.username !== username) return u;
      const patch: Partial<User> = {};
      if (allowedPaths !== undefined) {
        patch.allowedPaths = allowedPaths && allowedPaths.length ? allowedPaths : undefined;
      }
      if (role !== undefined) {
        patch.role = role;
      }
      return { ...u, ...patch };
    });
    return res.json({ usersEnvString: buildEnvString(updated), users: updated.map(({ passwordHash: _h, ...r }) => r) });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function buildEnvString(users: User[]): string {
  return users
    .map((u) => {
      const parts = [u.username, u.passwordHash, u.role];
      if (u.allowedPaths && u.allowedPaths.length > 0) {
        parts.push(u.allowedPaths.join("|"));
      }
      return parts.join(":");
    })
    .join(",");
}
