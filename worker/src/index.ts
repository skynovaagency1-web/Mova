// MOVA on Cloudflare: one Worker serves the website (static files from dist/) and the API (/api/*),
// with D1 for data and R2 for driver photos. Replaces the former Supabase backend.
import { authRoutes } from "./auth";
import { appRoutes } from "./app";
import { opsRoutes } from "./ops";
import { ApiError, CORS, body, clientIp, email, json, limit, str, type Env } from "./lib";

async function signup(env: Env, req: Request) {
  const b = await body(req);
  const kind = b.kind === "driver" ? "driver" : b.kind === "passenger" ? "passenger" : null;
  if (!kind || b.consent !== true) throw new ApiError("bad_request");
  await limit(env, `waitlist:${clientIp(req)}`, 20, 3600);
  await env.DB.prepare(
    "insert into signups (kind, first_name, email, phone, commune, details, has_vtc_card, consent) values (?, ?, ?, ?, ?, ?, ?, 1)",
  ).bind(
    kind, str(b.first_name, 80), email(b.email), str(b.phone, 30), str(b.commune, 80), str(b.details, 200),
    typeof b.has_vtc_card === "boolean" ? (b.has_vtc_card ? 1 : 0) : null,
  ).run();
  return json({ ok: true }, 201);
}

async function api(env: Env, req: Request, path: string) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (path === "/api/health") return json({ ok: true });
  if (path === "/api/signups" && req.method === "POST") return signup(env, req);
  return (await authRoutes(env, req, path)) ?? (await opsRoutes(env, req, path)) ?? (await appRoutes(env, req, path)) ?? json({ error: "not_found" }, 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      return await api(env, req, url.pathname);
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.code }, e.status);
      console.error(e);
      return json({ error: "server_error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
