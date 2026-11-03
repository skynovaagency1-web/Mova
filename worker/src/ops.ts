// Ops console (staff only: staff row + 2-step code): sign-ups, drivers, checks, rides, team.
import { isStaff, mailLink, makeLink, requireStaff } from "./auth";
import { CHECKS_OK, checksOk, photoUrl } from "./app";
import { ApiError, DATE_RE, body, email as parseEmail, json, nowIso, row, rows, str, type Env } from "./lib";

const STATUSES = ["new", "contacted", "interview", "committed", "declined"];

const CHECK_BOOLS = [
  "photo_checked", "identity_checked", "vtc_card_checked", "revtc_checked", "license_checked",
  "insurance_checked", "rc_pro_checked", "registration_checked",
] as const;
const CHECK_DATES = ["vtc_card_expiry", "revtc_expiry", "license_expiry", "insurance_expiry", "rc_pro_expiry", "vehicle_first_registration"] as const;

const date = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || !DATE_RE.test(v)) throw new ApiError("bad_request");
  return v;
};

/** Documents expire on their own: take drivers whose checklist is no longer valid offline. */
async function pauseExpired(env: Env) {
  await env.DB.prepare(`update drivers as d set approved = 0, online = 0, updated_at = ? where (d.approved or d.online) and not ${CHECKS_OK}`).bind(nowIso()).run();
}

export async function opsRoutes(env: Env, req: Request, path: string): Promise<Response | null> {
  if (!path.startsWith("/api/ops/")) return null;
  const a = await requireStaff(env, req);
  const method = req.method;
  const origin = new URL(req.url).origin;
  let m: RegExpMatchArray | null;

  // Sign-ups -----------------------------------------------------------------------------------
  if (path === "/api/ops/signups" && method === "GET") {
    return json({ signups: rows((await env.DB.prepare("select * from signups order by created_at desc, id desc").all()).results) });
  }

  if ((m = path.match(/^\/api\/ops\/signups\/(\d+)$/)) && method === "PATCH") {
    const b = await body(req);
    if (!STATUSES.includes(String(b.status))) throw new ApiError("bad_request");
    const notes = str(b.notes, 2000);
    const r = await env.DB.prepare("update signups set status = ?, notes = ?, updated_at = ? where id = ? returning *")
      .bind(String(b.status), notes, nowIso(), Number(m[1])).first();
    if (!r) throw new ApiError("not_found", 404);
    return json({ signup: row(r) });
  }

  // Import the CSV exported from the former console, so no waitlist entry is lost in the move.
  if (path === "/api/ops/signups/import" && method === "POST") {
    const b = await body<{ rows?: Record<string, unknown>[] }>(req);
    const list = Array.isArray(b.rows) ? b.rows.slice(0, 5000) : [];
    let added = 0;
    let skipped = 0;
    const stmts = [];
    for (const r of list) {
      try {
        const kind = r.kind === "driver" ? "driver" : r.kind === "passenger" ? "passenger" : null;
        const e = parseEmail(r.email);
        if (!kind) throw new ApiError("bad_request");
        const created = typeof r.created_at === "string" && !Number.isNaN(Date.parse(r.created_at)) ? new Date(r.created_at).toISOString() : nowIso();
        const status = STATUSES.includes(String(r.status)) ? String(r.status) : "new";
        const vtc = r.has_vtc_card === true || r.has_vtc_card === "true" ? 1 : r.has_vtc_card === false || r.has_vtc_card === "false" ? 0 : null;
        stmts.push(
          env.DB.prepare(
            `insert into signups (created_at, kind, first_name, email, phone, commune, details, has_vtc_card, consent, status, notes, updated_at)
             select ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?
             where not exists (select 1 from signups where email = ? and kind = ? and created_at = ?)`,
          ).bind(created, kind, str(r.first_name, 80), e, str(r.phone, 30), str(r.commune, 80), str(r.details, 200), vtc, status, str(r.notes, 2000), nowIso(), e, kind, created),
        );
      } catch {
        skipped++;
      }
    }
    for (let i = 0; i < stmts.length; i += 50) {
      const res = await env.DB.batch(stmts.slice(i, i + 50));
      for (const x of res) if (x.meta.changes) added++;
      else skipped++;
    }
    return json({ added, skipped });
  }

  // Drivers and rides --------------------------------------------------------------------------
  if (path === "/api/ops/drivers" && method === "GET") {
    await pauseExpired(env);
    const r = await env.DB.prepare(
      `select d.user_id, p.first_name, u.email, d.vehicle, d.plate, d.category, d.approved, d.online, d.created_at, d.photo_path,
              ${CHECKS_OK} as checks_ok,
              min(c.vtc_card_expiry, c.revtc_expiry, c.license_expiry, c.insurance_expiry, c.rc_pro_expiry) as next_expiry
         from drivers d join profiles p on p.user_id = d.user_id join users u on u.id = d.user_id
         left join driver_checks c on c.driver_id = d.user_id
        order by d.approved, d.created_at desc`,
    ).all();
    return json({ drivers: rows(r.results) });
  }

  if (path === "/api/ops/rides" && method === "GET") {
    const r = await env.DB.prepare("select id, created_at, status, pickup_label, dropoff_label, price_estimate from rides order by created_at desc, id desc limit 25").all();
    return json({ rides: rows(r.results) });
  }

  if ((m = path.match(/^\/api\/ops\/drivers\/([0-9a-f-]{36})\/(checks|approval)$/))) {
    const id = m[1];
    const d = await env.DB.prepare("select * from drivers where user_id = ?").bind(id).first<{ photo_path: string | null }>();
    if (!d) throw new ApiError("not_found", 404);

    if (m[2] === "checks" && method === "GET") {
      const c = await env.DB.prepare("select * from driver_checks where driver_id = ?").bind(id).first();
      return json({ checks: row(c), photo_url: d.photo_path ? await photoUrl(env, d.photo_path, 600) : null });
    }

    if (m[2] === "checks" && method === "PUT") {
      const b = await body(req);
      const v: Record<string, unknown> = {};
      for (const k of CHECK_BOOLS) v[k] = b[k] ? 1 : 0;
      for (const k of CHECK_DATES) v[k] = date(b[k]);
      v.vtc_card_number = str(b.vtc_card_number, 40);
      v.revtc_number = str(b.revtc_number, 40);
      v.notes = str(b.notes, 2000);
      const cols = Object.keys(v);
      await env.DB.prepare(
        `insert into driver_checks (driver_id, ${cols.join(", ")}, checked_by, updated_at) values (?, ${cols.map(() => "?").join(", ")}, ?, ?)
         on conflict (driver_id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}, checked_by = excluded.checked_by, updated_at = excluded.updated_at`,
      ).bind(id, ...cols.map((c) => v[c]), a.user.id, nowIso()).run();
      // Unticking a box or entering a past date takes the driver offline and removes approval at once.
      if (!(await checksOk(env, id))) {
        await env.DB.prepare("update drivers set approved = 0, online = 0, updated_at = ? where user_id = ? and (approved or online)").bind(nowIso(), id).run();
      }
      return json({ ok: true });
    }

    if (m[2] === "approval" && method === "POST") {
      const approved = (await body(req)).approved === true;
      if (approved && !(await checksOk(env, id))) throw new ApiError("checks_incomplete");
      await env.DB.prepare(`update drivers set approved = ?, online = case when ? then online else 0 end, updated_at = ? where user_id = ?`)
        .bind(approved ? 1 : 0, approved ? 1 : 0, nowIso(), id).run();
      return json({ ok: true });
    }
  }

  // Team and access links ----------------------------------------------------------------------
  if (path === "/api/ops/staff" && method === "GET") {
    const r = await env.DB.prepare(
      `select s.user_id, u.email, s.role, s.created_at, u.password_hash is not null as has_password, u.totp_secret is not null as has_mfa
         from staff s join users u on u.id = s.user_id order by s.created_at`,
    ).all();
    return json({ staff: r.results.map((x) => ({ ...x, has_password: !!x.has_password, has_mfa: !!x.has_mfa })), me: a.user.id });
  }

  // Add a team member: returns a link to choose a password (also e-mailed when e-mail is set up).
  if (path === "/api/ops/staff" && method === "POST") {
    const e = parseEmail((await body(req)).email);
    let u = await env.DB.prepare("select id from users where email = ?").bind(e).first<{ id: string }>();
    if (!u) {
      u = { id: crypto.randomUUID() };
      await env.DB.prepare("insert into users (id, email) values (?, ?)").bind(u.id, e).run();
    }
    const profile = await env.DB.prepare("select 1 from profiles where user_id = ?").bind(u.id).first();
    if (profile) throw new ApiError("app_account"); // keep staff accounts separate from rider/driver accounts
    await env.DB.prepare("insert or ignore into staff (user_id, role, created_at) values (?, 'admin', ?)").bind(u.id, nowIso()).run();
    const link = await makeLink(env, origin, u.id, "invite");
    return json({ link, emailed: await mailLink(env, e, link, "invite") });
  }

  if ((m = path.match(/^\/api\/ops\/staff\/([0-9a-f-]{36})$/)) && method === "DELETE") {
    if (m[1] === a.user.id) throw new ApiError("cannot_remove_self");
    await env.DB.batch([
      env.DB.prepare("delete from staff where user_id = ?").bind(m[1]),
      env.DB.prepare("delete from sessions where user_id = ?").bind(m[1]),
    ]);
    return json({ ok: true });
  }

  // Lost phone: clear a team member's 2-step set-up; they set it up again at next sign-in.
  if ((m = path.match(/^\/api\/ops\/staff\/([0-9a-f-]{36})\/reset-mfa$/)) && method === "POST") {
    if (m[1] === a.user.id) throw new ApiError("cannot_remove_self");
    await env.DB.batch([
      env.DB.prepare("update users set totp_secret = null, totp_pending = null, totp_last_step = null where id = ? and id in (select user_id from staff)").bind(m[1]),
      env.DB.prepare("delete from sessions where user_id = ?").bind(m[1]),
    ]);
    return json({ ok: true });
  }

  // Password-reset link for any account (app user or staff), to send by hand while e-mail is not set up.
  if (path === "/api/ops/reset-link" && method === "POST") {
    const e = parseEmail((await body(req)).email);
    const u = await env.DB.prepare("select id from users where email = ?").bind(e).first<{ id: string }>();
    if (!u) throw new ApiError("not_found", 404);
    const link = await makeLink(env, origin, u.id, (await isStaff(env, u.id)) ? "invite" : "reset");
    return json({ link, emailed: await mailLink(env, e, link, "reset") });
  }

  throw new ApiError("not_found", 404);
}
