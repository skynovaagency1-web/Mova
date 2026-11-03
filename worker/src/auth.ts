// Accounts, sessions, password reset, staff 2-step verification.
import {
  ApiError, body, clientIp, email as parseEmail, hashPassword, json, limit, nowIso, randomToken, recordHit, sha256,
  str, verifyPassword, type Env,
} from "./lib";
import { checkCode, newSecret, otpauthUri } from "./totp";

const DAY = 864e5;
const SESSION_DAYS = 60; // the app stays signed in; staff data also needs a fresh 2-step code (below)
const AAL2_HOURS = 12;

export type User = { id: string; email: string; password_hash: string | null; totp_secret: string | null; totp_pending: string | null; totp_last_step: number | null };
export type Auth = { user: User; tokenHash: string; aal2: boolean };

export async function getAuth(env: Env, req: Request): Promise<Auth | null> {
  const h = req.headers.get("Authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const r = await env.DB.prepare(
    `select s.expires_at, s.aal2_until, u.id, u.email, u.password_hash, u.totp_secret, u.totp_pending, u.totp_last_step
       from sessions s join users u on u.id = s.user_id where s.token_hash = ?`,
  ).bind(tokenHash).first<User & { expires_at: number; aal2_until: number }>();
  if (!r || r.expires_at < Date.now()) return null;
  const { expires_at: _e, aal2_until, ...user } = r;
  return { user, tokenHash, aal2: aal2_until > Date.now() };
}

export async function requireAuth(env: Env, req: Request) {
  const a = await getAuth(env, req);
  if (!a) throw new ApiError("not_signed_in", 401);
  return a;
}

export async function isStaff(env: Env, userId: string) {
  return !!(await env.DB.prepare("select 1 from staff where user_id = ?").bind(userId).first());
}

/** Staff data needs a staff row and a session that passed the 2-step code. */
export async function requireStaff(env: Env, req: Request) {
  const a = await requireAuth(env, req);
  if (!a.aal2) throw new ApiError("mfa_required", 403);
  if (!(await isStaff(env, a.user.id))) throw new ApiError("not_staff", 403);
  return a;
}

async function newSession(env: Env, userId: string) {
  const token = randomToken();
  await env.DB.prepare("insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)")
    .bind(await sha256(token), userId, Date.now() + SESSION_DAYS * DAY).run();
  // Housekeeping: drop expired sessions and old rate-limit rows now and then.
  if (Math.random() < 0.05) {
    await env.DB.batch([
      env.DB.prepare("delete from sessions where expires_at < ?").bind(Date.now()),
      env.DB.prepare("delete from rate_hits where at < ?").bind(Date.now() - DAY),
      env.DB.prepare("delete from auth_tokens where expires_at < ?").bind(Date.now() - 30 * DAY),
    ]);
  }
  return token;
}

function password(v: unknown, min = 8) {
  if (typeof v !== "string" || v.length < min) throw new ApiError("weak_password");
  if (v.length > 200) throw new ApiError("bad_request");
  return v;
}

export async function me(env: Env, a: Auth) {
  return {
    user: { id: a.user.id, email: a.user.email },
    aal2: a.aal2,
    mfa_enrolled: !!a.user.totp_secret,
    staff: await isStaff(env, a.user.id),
    email_enabled: emailEnabled(env),
  };
}

// E-mail (optional) ----------------------------------------------------------------------------
export const emailEnabled = (env: Env) => !!(env.EMAIL && env.MAIL_FROM);

async function sendMail(env: Env, to: string, subject: string, text: string) {
  if (!env.EMAIL || !env.MAIL_FROM) return false;
  try {
    await env.EMAIL.send({ from: env.MAIL_FROM, to, subject, text });
    return true;
  } catch (e) {
    console.error("mail failed", e);
    return false;
  }
}

/** One-time link to choose a password: reset (1 hour) or staff invitation (7 days). */
export async function makeLink(env: Env, origin: string, userId: string, kind: "reset" | "invite") {
  const token = randomToken();
  const ttl = kind === "invite" ? 7 * DAY : 3600e3;
  await env.DB.prepare("insert into auth_tokens (token_hash, user_id, kind, expires_at) values (?, ?, ?, ?)")
    .bind(await sha256(token), userId, kind, Date.now() + ttl).run();
  const page = (await isStaff(env, userId)) ? "/ops/" : "/reinitialiser.html";
  return `${origin}${page}#token=${token}`;
}

export async function mailLink(env: Env, to: string, link: string, kind: "reset" | "invite") {
  return kind === "invite"
    ? sendMail(env, to, "Votre accès à la console MOVA",
        `Bonjour,\n\nVous avez été ajouté à l'équipe MOVA. Choisissez votre mot de passe avec ce lien (valable 7 jours) :\n${link}\n\nVous configurerez ensuite la vérification en deux étapes.\n\nL'équipe MOVA`)
    : sendMail(env, to, "Réinitialiser votre mot de passe MOVA",
        `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.\n\nL'équipe MOVA`);
}

// Routes ---------------------------------------------------------------------------------------
export async function authRoutes(env: Env, req: Request, path: string): Promise<Response | null> {
  const method = req.method;
  const origin = new URL(req.url).origin;

  if (path === "/api/auth/signup" && method === "POST") {
    const b = await body(req);
    const e = parseEmail(b.email);
    const pw = password(b.password);
    await limit(env, `signup:${clientIp(req)}`, 10, 3600);
    const id = crypto.randomUUID();
    const res = await env.DB.prepare("insert or ignore into users (id, email, password_hash) values (?, ?, ?)")
      .bind(id, e, await hashPassword(pw)).run();
    if (!res.meta.changes) throw new ApiError("email_taken", 409);
    return json({ token: await newSession(env, id) });
  }

  if (path === "/api/auth/login" && method === "POST") {
    const b = await body(req);
    const e = parseEmail(b.email);
    const pw = typeof b.password === "string" ? b.password : "";
    await limit(env, `login:${e}`, 10, 900, false);
    await limit(env, `login-ip:${clientIp(req)}`, 30, 900, false);
    const u = await env.DB.prepare("select id, password_hash from users where email = ?").bind(e).first<{ id: string; password_hash: string | null }>();
    if (!(await verifyPassword(pw, u?.password_hash)) || !u) {
      await recordHit(env, `login:${e}`);
      await recordHit(env, `login-ip:${clientIp(req)}`);
      throw new ApiError("invalid_login", 401);
    }
    return json({ token: await newSession(env, u.id) });
  }

  if (path === "/api/auth/logout" && method === "POST") {
    const a = await getAuth(env, req);
    if (a) await env.DB.prepare("delete from sessions where token_hash = ?").bind(a.tokenHash).run();
    return json({ ok: true });
  }

  if (path === "/api/auth/me" && method === "GET") {
    return json(await me(env, await requireAuth(env, req)));
  }

  // Change the password of the signed-in account. Staff with 2-step set up must have passed it.
  if (path === "/api/auth/password" && method === "POST") {
    const a = await requireAuth(env, req);
    if (a.user.totp_secret && !a.aal2) throw new ApiError("mfa_required", 403);
    const b = await body(req);
    const pw = password(b.password, (await isStaff(env, a.user.id)) ? 12 : 8);
    await env.DB.batch([
      env.DB.prepare("update users set password_hash = ? where id = ?").bind(await hashPassword(pw), a.user.id),
      env.DB.prepare("delete from sessions where user_id = ? and token_hash <> ?").bind(a.user.id, a.tokenHash),
    ]);
    return json({ ok: true });
  }

  if (path === "/api/auth/forgot" && method === "POST") {
    const b = await body(req);
    const e = parseEmail(b.email);
    await limit(env, `forgot:${e}`, 3, 3600);
    await limit(env, `forgot-ip:${clientIp(req)}`, 10, 3600);
    const u = await env.DB.prepare("select id from users where email = ?").bind(e).first<{ id: string }>();
    if (u && emailEnabled(env)) await mailLink(env, e, await makeLink(env, origin, u.id, "reset"), "reset");
    // Same answer whether or not the account exists.
    return json({ email_enabled: emailEnabled(env) });
  }

  // Choose a password from a reset or invitation link. Signs in (2-step code still required for staff data).
  if (path === "/api/auth/reset" && method === "POST") {
    const b = await body(req);
    const token = str(b.token, 200, { required: true })!;
    await limit(env, `reset-ip:${clientIp(req)}`, 20, 3600);
    const t = await env.DB.prepare("select user_id, expires_at, used_at from auth_tokens where token_hash = ?")
      .bind(await sha256(token)).first<{ user_id: string; expires_at: number; used_at: number | null }>();
    if (!t || t.used_at || t.expires_at < Date.now()) throw new ApiError("link_expired");
    const pw = password(b.password, (await isStaff(env, t.user_id)) ? 12 : 8);
    await env.DB.batch([
      env.DB.prepare("update auth_tokens set used_at = ? where token_hash = ?").bind(Date.now(), await sha256(token)),
      env.DB.prepare("update users set password_hash = ? where id = ?").bind(await hashPassword(pw), t.user_id),
      env.DB.prepare("delete from sessions where user_id = ?").bind(t.user_id),
    ]);
    return json({ token: await newSession(env, t.user_id) });
  }

  // 2-step verification set-up: a new secret, confirmed by the first valid code.
  if (path === "/api/auth/mfa/enroll" && method === "POST") {
    const a = await requireAuth(env, req);
    if (a.user.totp_secret && !a.aal2) throw new ApiError("mfa_required", 403);
    const secret = newSecret();
    await env.DB.prepare("update users set totp_pending = ? where id = ?").bind(secret, a.user.id).run();
    return json({ secret, uri: otpauthUri(secret, a.user.email) });
  }

  if (path === "/api/auth/mfa/verify" && method === "POST") {
    const a = await requireAuth(env, req);
    const code = String((await body(req)).code ?? "").replace(/\s/g, "");
    await limit(env, `mfa:${a.user.id}`, 8, 900, false);
    const secret = a.user.totp_secret ?? a.user.totp_pending;
    const step = secret ? await checkCode(secret, code, a.user.totp_last_step) : null;
    if (step === null) {
      await recordHit(env, `mfa:${a.user.id}`);
      throw new ApiError("bad_code");
    }
    await env.DB.batch([
      a.user.totp_secret
        ? env.DB.prepare("update users set totp_last_step = ? where id = ?").bind(step, a.user.id)
        : env.DB.prepare("update users set totp_secret = totp_pending, totp_pending = null, totp_last_step = ? where id = ?").bind(step, a.user.id),
      env.DB.prepare("update sessions set aal2_until = ? where token_hash = ?").bind(Date.now() + AAL2_HOURS * 3600e3, a.tokenHash),
    ]);
    return json({ ok: true });
  }

  // First ops admin. Works only while nobody is staff, and only with the SETUP_CODE secret.
  if (path === "/api/setup" && method === "GET") {
    const n = await env.DB.prepare("select count(*) as n from staff").first<{ n: number }>();
    return json({ needed: !n?.n, configured: !!env.SETUP_CODE });
  }
  if (path === "/api/setup" && method === "POST") {
    const b = await body(req);
    await limit(env, `setup-ip:${clientIp(req)}`, 10, 3600);
    const n = await env.DB.prepare("select count(*) as n from staff").first<{ n: number }>();
    if (n?.n) throw new ApiError("already_set_up", 409);
    if (!env.SETUP_CODE || typeof b.code !== "string" || b.code.trim() !== env.SETUP_CODE) throw new ApiError("bad_setup_code", 403);
    const e = parseEmail(b.email);
    const hash = await hashPassword(password(b.password, 12));
    const existing = await env.DB.prepare("select id from users where email = ?").bind(e).first<{ id: string }>();
    const id = existing?.id ?? crypto.randomUUID();
    await env.DB.batch([
      existing
        ? env.DB.prepare("update users set password_hash = ? where id = ?").bind(hash, id)
        : env.DB.prepare("insert into users (id, email, password_hash) values (?, ?, ?)").bind(id, e, hash),
      env.DB.prepare("insert or ignore into staff (user_id, role, created_at) values (?, 'admin', ?)").bind(id, nowIso()),
    ]);
    return json({ token: await newSession(env, id) });
  }

  return null;
}
