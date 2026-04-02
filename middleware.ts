import { next } from "@vercel/edge";
import { jwtVerify } from "jose";

const COOKIE_NAME = "tenex_session";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "fallback-secret-change-me";
  return new TextEncoder().encode(secret);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

export default async function middleware(req: Request) {
  const url = new URL(req.url);

  // Allow login page, auth API routes, and public FAQ page
  if (
    url.pathname === "/login" ||
    url.pathname === "/login.html" ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/tasks") ||
    url.pathname === "/faq" ||
    url.pathname === "/faq.html" ||
    url.pathname.startsWith("/faq") ||
    url.pathname === "/sns-tracker" ||
    url.pathname === "/sns-tracker.html" ||
    url.pathname.startsWith("/data/") ||
    url.pathname === "/careers" ||
    url.pathname === "/careers.html" ||
    url.pathname === "/careers-culture" ||
    url.pathname === "/careers-culture.html" ||
    url.pathname === "/careers-benefit" ||
    url.pathname === "/careers-benefit.html" ||
    url.pathname === "/careers-process" ||
    url.pathname === "/careers-process.html" ||
    url.pathname === "/careers-jobs" ||
    url.pathname === "/careers-jobs.html" ||
    url.pathname === "/chatbot-widget.js" ||
    url.pathname.startsWith("/api/kakao-webhook")
  ) {
    return next();
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());

      // Admin-only paths
      const isAdminPath =
        url.pathname === "/admin" ||
        url.pathname === "/admin.html" ||
        url.pathname.startsWith("/api/admin");
      if (isAdminPath && payload.role !== "admin") {
        // Non-admin trying to access admin page → redirect to home
        return Response.redirect(new URL("/index.html", url.origin), 302);
      }

      const ADMIN_ONLY_PATHS = [
        '/funding', '/funding.html',
        '/profit-simulation', '/profit-simulation.html',
        '/2026-team-structure', '/2026-team-structure.html',
        '/cron-dashboard', '/cron-dashboard.html',
        '/deploy-dashboard', '/deploy-dashboard.html',
        '/heartbeat-dashboard', '/heartbeat-dashboard.html',
        '/project-status', '/project-status.html',
        '/agent-team-plan', '/agent-team-plan.html',
        '/ai-system', '/ai-system.html',
        '/openclaw-overview', '/openclaw-overview.html',
        '/system-status', '/system-status.html',
        '/security-dashboard', '/security-dashboard.html',
        '/skills-dashboard', '/skills-dashboard.html',
      ];

      const isRestrictedPath = ADMIN_ONLY_PATHS.some(p => url.pathname === p);
      if (isRestrictedPath && payload.role !== 'admin') {
        return Response.redirect(new URL('/index.html', url.origin), 302);
      }

      // Role-based path restriction
      const allowedPaths = payload.allowedPaths as string[] | undefined;
      if (allowedPaths && allowedPaths.length > 0) {
        const path = url.pathname;
        const allowed = allowedPaths.some(
          (p) => path === p || path.startsWith(p + "?") || path === p + ".html"
        );
        if (!allowed) {
          // Redirect to first allowed path
          return Response.redirect(new URL(allowedPaths[0], url.origin), 302);
        }
      }

      return next();
    } catch {
      // Invalid token — fall through to redirect
    }
  }

  const returnTo = url.pathname + url.search;
  const loginUrl = new URL("/login.html", url.origin);
  if (returnTo && returnTo !== "/") {
    loginUrl.searchParams.set("returnTo", returnTo);
  }

  return Response.redirect(loginUrl.toString(), 302);
}
