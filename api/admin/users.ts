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

const TEAM_ALLOWED_PATHS = [
  "/",
  "/index",
  "/index.html",
  "/2026-team-structure",
  "/2026-team-structure.html",
  "/tenex-strategy",
  "/tenex-strategy.html",
  "/media-mix-strategy",
  "/media-mix-strategy.html",
  "/mixpanel-analysis",
  "/mixpanel-analysis.html",
  "/meta-weekly-2026-03-30",
  "/meta-weekly-2026-03-30.html",
  "/weekly-mixpanel-2026-04-05",
  "/weekly-mixpanel-2026-04-05.html",
  "/weekly-mixpanel-2026-04-12",
  "/weekly-mixpanel-2026-04-12.html",
  "/myprotein-growth",
  "/myprotein-growth.html",
  "/platform-api-research",
  "/platform-api-research.html",
  "/customer-journey-v5",
  "/customer-journey-v5.html",
  "/crm",
  "/crm.html",
  "/sns-tracker",
  "/sns-tracker.html",
  "/youtube",
  "/youtube.html",
  "/brand-design-system",
  "/brand-design-system.html",
  "/kinemedical-redesign",
  "/kinemedical-redesign.html",
  "/product-roadmap",
  "/product-roadmap.html",
  "/es808",
  "/es808.html",
  "/es808-unboxing-plan",
  "/es808-unboxing-plan.html",
  "/membership",
  "/membership.html",
  "/global-strategy",
  "/global-strategy.html",
  "/ai-usage-guide",
  "/ai-usage-guide.html",
  "/onboarding-guide",
  "/onboarding-guide.html",
  "/onboarding-guide-v2",
  "/onboarding-guide-v2.html",
  "/cs-guide-external",
  "/cs-guide-external.html",
  "/cs-optimization-plan",
  "/cs-optimization-plan.html",
  "/faq",
  "/faq.html",
  "/jungmin-request",
  "/jungmin-request.html",
  "/apr-analysis",
  "/apr-analysis.html",
  "/apr-hiring-analysis",
  "/apr-hiring-analysis.html",
  "/apr-organization-analysis",
  "/apr-organization-analysis.html",
  "/ceo-roles",
  "/ceo-roles.html",
  "/jasagyo-5gi",
  "/jasagyo-5gi.html",
  "/jasagyo-6ki-week2",
  "/jasagyo-6ki-week2.html",
  "/jasagyo-6-5",
  "/jasagyo-6-5.html",
  "/mosamo-lectures",
  "/mosamo-lectures.html",
  "/team-board",
  "/team-board.html",
];

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
      role: "team",
      allowedPaths: TEAM_ALLOWED_PATHS,
    },
    {
      username: "jeongmin.lee@tenex.kr",
      passwordHash: "$2b$10$q4gsSO9a3mPMblumLDImkuKz/ecyngg3Or.ZLlWzgtWTh7FDWBuLq",
      role: "team",
      allowedPaths: TEAM_ALLOWED_PATHS,
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
