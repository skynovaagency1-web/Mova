// Shared helpers: responses, errors, crypto, rate limiting.

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ASSETS: Fetcher;
  /** Secret, set in the Cloudflare dashboard. Needed once, to create the first ops admin at /ops/. */
  SETUP_CODE?: string;
  /** Optional Cloudflare Email Service binding + sender address, for password-reset e-mails. */
  EMAIL?: { send(msg: { from: string; to: string; subject: string; text: string; html?: string }): Promise<unknown> };
  MAIL_FROM?: string;
}

/** An error whose code the apps translate into French (see errorText in the clients). */
export class ApiError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS, ...headers },
  });
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const b = await req.json();
    if (b && typeof b === "object") return b as T;
  } catch {
    /* fall through */
  }
  throw new ApiError("bad_request");
}

export const nowIso = () => new Date().toISOString();

// Strings and numbers coming from clients.
export function str(v: unknown, max: number, { required = false, min = 0 } = {}): string | null {
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
    if (required) throw new ApiError("bad_request");
    return null;
  }
  if (typeof v !== "string") throw new ApiError("bad_request");
  const s = v.trim();
  if (s.length > max || s.length < min) throw new ApiError("bad_request");
  return s;
}

export function num(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ApiError("bad_request");
  return v;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export function email(v: unknown): string {
  const e = str(v, 200, { required: true })!.toLowerCase();
  if (!EMAIL_RE.test(e)) throw new ApiError("bad_email");
  return e;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// D1 returns 0/1 for booleans: turn the known flag columns back into true/false for the apps.
const BOOL_KEYS = new Set([
  "approved", "online", "night", "has_vtc_card", "consent", "checks_ok",
  "photo_checked", "identity_checked", "vtc_card_checked", "revtc_checked", "license_checked",
  "insurance_checked", "rc_pro_checked", "registration_checked",
]);
export function row<T = Record<string, unknown>>(r: Record<string, unknown> | null | undefined): T | null {
  if (!r) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) out[k] = BOOL_KEYS.has(k) && v !== null ? Boolean(v) : v;
  return out as T;
}
export const rows = <T = Record<string, unknown>>(rs: Record<string, unknown>[]) => rs.map((r) => row<T>(r)!);

export const isUnique = (e: unknown) => /UNIQUE constraint failed/i.test(String((e as Error)?.message ?? e));

// Crypto -----------------------------------------------------------------------------------------
const enc = new TextEncoder();

export function b64url(bytes: ArrayBuffer | Uint8Array) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

export async function sha256(s: string) {
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

/** Constant-time comparison of two strings. */
export function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Workers cap PBKDF2 at 100,000 iterations. The count is stored with each hash so it can change later.
const PBKDF2_ITERATIONS = 100_000;

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return b64url(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64url(salt)}$${await pbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

const DUMMY_SALT = new Uint8Array(16);
export async function verifyPassword(password: string, stored: string | null | undefined) {
  const parts = stored?.split("$");
  if (!parts || parts.length !== 4 || parts[0] !== "pbkdf2") {
    // Same work either way, so response times don't reveal which e-mails have an account.
    await pbkdf2(password, DUMMY_SALT, PBKDF2_ITERATIONS);
    return false;
  }
  return same(await pbkdf2(password, fromB64url(parts[2]), Number(parts[1])), parts[3]);
}

export async function hmac(keyB64: string, data: string) {
  const key = await crypto.subtle.importKey("raw", fromB64url(keyB64), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** A random secret kept in the settings table, created on first use (no dashboard setup needed). */
export async function setting(env: Env, key: string) {
  const got = await env.DB.prepare("select value from settings where key = ?").bind(key).first<{ value: string }>();
  if (got) return got.value;
  await env.DB.prepare("insert or ignore into settings (key, value) values (?, ?)").bind(key, randomToken(32)).run();
  return (await env.DB.prepare("select value from settings where key = ?").bind(key).first<{ value: string }>())!.value;
}

// Rate limiting ----------------------------------------------------------------------------------
/** Counts hits for `key` in the last `windowSec`; throws once `limit` is reached. */
export async function limit(env: Env, key: string, max: number, windowSec: number, record = true) {
  const since = Date.now() - windowSec * 1000;
  const r = await env.DB.prepare("select count(*) as n from rate_hits where key = ? and at > ?").bind(key, since).first<{ n: number }>();
  if ((r?.n ?? 0) >= max) throw new ApiError("too_many_requests", 429);
  if (record) await env.DB.prepare("insert into rate_hits (key, at) values (?, ?)").bind(key, Date.now()).run();
}

export async function recordHit(env: Env, key: string) {
  await env.DB.prepare("insert into rate_hits (key, at) values (?, ?)").bind(key, Date.now()).run();
}

export const clientIp = (req: Request) => req.headers.get("CF-Connecting-IP") ?? "unknown";
