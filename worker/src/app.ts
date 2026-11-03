// Pilot app: profiles, drivers, rides, driver photos. Ports the former database functions:
// passengers request and cancel, approved online drivers accept and move rides forward,
// prices are computed here and never trusted from the app.
import { requireAuth, isStaff, type Auth } from "./auth";
import { ApiError, body, hmac, isUnique, json, num, nowIso, row, rows, setting, str, type Env } from "./lib";

const ACTIVE_DRIVER = "('accepted','arriving','in_progress')";
const CATEGORIES: Record<string, number> = { standard: 1, confort: 1.3, van: 1.55 };

/** SQL: true when driver `d` has a photo and a complete, unexpired checklist. */
export const CHECKS_OK = `(d.photo_path is not null and exists (
  select 1 from driver_checks c where c.driver_id = d.user_id
    and c.photo_checked and c.identity_checked and c.vtc_card_checked and c.revtc_checked
    and c.license_checked and c.insurance_checked and c.rc_pro_checked and c.registration_checked
    and c.vtc_card_expiry > date('now') and c.revtc_expiry > date('now')
    and c.license_expiry > date('now') and c.insurance_expiry > date('now') and c.rc_pro_expiry > date('now')))`;

export async function checksOk(env: Env, driverId: string) {
  const r = await env.DB.prepare(`select ${CHECKS_OK} as ok from drivers d where d.user_id = ?`).bind(driverId).first<{ ok: number }>();
  return !!r?.ok;
}

const profileOf = (env: Env, uid: string) => env.DB.prepare("select * from profiles where user_id = ?").bind(uid).first();
const driverOf = (env: Env, uid: string) => env.DB.prepare("select * from drivers where user_id = ?").bind(uid).first();

// Photo links: short-lived signed URLs, so <img> tags work without sending the session token.
export async function photoUrl(env: Env, path: string, seconds = 3600) {
  const exp = Date.now() + seconds * 1000;
  const sig = await hmac(await setting(env, "photo_key"), `${path}:${exp}`);
  return `/api/photos/${path}?exp=${exp}&sig=${sig}`;
}

function parisHour() {
  return Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).format(new Date()));
}

function rad(d: number) {
  return (d * Math.PI) / 180;
}

/** Driver changes to their own details or online status. Editing the car removes approval. */
async function updateDriver(env: Env, uid: string, b: Record<string, unknown>) {
  const d = await driverOf(env, uid);
  if (!d) throw new ApiError("not_a_driver");
  const vehicle = b.vehicle !== undefined ? str(b.vehicle, 80, { required: true, min: 2 }) : null;
  const plate = b.plate !== undefined ? str(b.plate, 15, { required: true, min: 4 })!.toUpperCase() : null;
  const category = b.category !== undefined ? String(b.category) : null;
  if (category && !(category in CATEGORIES)) throw new ApiError("bad_category");
  const online = typeof b.online === "boolean" ? b.online : null;

  const newCar = (vehicle !== null && vehicle !== d.vehicle) || (plate !== null && plate !== d.plate);
  if (online === true && !d.approved) throw new ApiError("driver_not_approved");
  if (online === false || newCar) {
    const busy = await env.DB.prepare(`select 1 from rides where driver_id = ? and status in ${ACTIVE_DRIVER}`).bind(uid).first();
    if (busy) throw new ApiError("ride_in_progress");
  }
  if (online === true && !d.online && !newCar && !(await checksOk(env, uid))) throw new ApiError("checks_incomplete");

  const stmts = [
    env.DB.prepare(
      `update drivers set vehicle = coalesce(?, vehicle), plate = coalesce(?, plate), category = coalesce(?, category),
         approved = case when ? then 0 else approved end,
         online = case when ? then 0 else coalesce(?, online) end, updated_at = ?
       where user_id = ? returning *`,
    ).bind(vehicle, plate, category, newCar ? 1 : 0, newCar ? 1 : 0, online === null ? null : online ? 1 : 0, nowIso(), uid),
  ];
  // A new car: registration and insurance have to be checked again.
  if (newCar) stmts.push(env.DB.prepare("update driver_checks set registration_checked = 0, insurance_checked = 0, updated_at = ? where driver_id = ?").bind(nowIso(), uid));
  const [res] = await env.DB.batch(stmts);
  return row(res.results[0] as Record<string, unknown>);
}

async function ride(env: Env, sql: string, ...binds: unknown[]) {
  const r = await env.DB.prepare(sql).bind(...binds).first();
  return row(r as Record<string, unknown> | null);
}

export async function appRoutes(env: Env, req: Request, path: string): Promise<Response | null> {
  const method = req.method;
  let m: RegExpMatchArray | null;

  // Driver photos: served only with a valid signature (issued below to whoever may see it).
  if ((m = path.match(/^\/api\/photos\/([0-9a-f-]{36}\/[A-Za-z0-9_.-]{1,80})$/)) && method === "GET") {
    const u = new URL(req.url);
    const exp = Number(u.searchParams.get("exp"));
    const sig = u.searchParams.get("sig") ?? "";
    if (!exp || exp < Date.now() || sig !== (await hmac(await setting(env, "photo_key"), `${m[1]}:${exp}`))) {
      return new Response("Lien expiré", { status: 403 });
    }
    const obj = await env.PHOTOS.get(m[1]);
    if (!obj) return new Response("Introuvable", { status: 404 });
    return new Response(obj.body, {
      headers: { "Content-Type": obj.httpMetadata?.contentType ?? "image/jpeg", "Cache-Control": "private, max-age=600", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (!path.startsWith("/api/me") && !path.startsWith("/api/driver") && !path.startsWith("/api/rides")) return null;
  const a: Auth = await requireAuth(env, req);
  const uid = a.user.id;

  // Profile ------------------------------------------------------------------------------------
  if (path === "/api/me/profile" && method === "GET") {
    return json({ profile: row(await profileOf(env, uid)) });
  }

  // First launch: role (once per account) + first name, and the car for drivers.
  if (path === "/api/me/profile" && method === "POST") {
    const b = await body(req);
    const role = b.role === "driver" ? "driver" : b.role === "passenger" ? "passenger" : null;
    if (!role) throw new ApiError("bad_request");
    const first = str(b.first_name, 80, { required: true })!;
    const stmts = [env.DB.prepare("insert or ignore into profiles (user_id, role, first_name) values (?, ?, ?)").bind(uid, role, first)];
    if (role === "driver") {
      const vehicle = str(b.vehicle, 80, { required: true, min: 2 })!;
      const plate = str(b.plate, 15, { required: true, min: 4 })!.toUpperCase();
      const category = String(b.category ?? "standard");
      if (!(category in CATEGORIES)) throw new ApiError("bad_category");
      stmts.push(
        env.DB.prepare(
          "insert or ignore into drivers (user_id, vehicle, plate, category) select ?, ?, ?, ? where exists (select 1 from profiles where user_id = ? and role = 'driver')",
        ).bind(uid, vehicle, plate, category, uid),
      );
    }
    await env.DB.batch(stmts);
    return json({ profile: row(await profileOf(env, uid)) });
  }

  // Delete the account and everything attached to it (rides, driver record, photos).
  if (path === "/api/me" && method === "DELETE") {
    const busy = await env.DB.prepare(
      `select 1 from rides where (passenger_id = ? and status in ('requested','accepted','arriving','in_progress'))
          or (driver_id = ? and status in ${ACTIVE_DRIVER})`,
    ).bind(uid, uid).first();
    if (busy) throw new ApiError("ride_in_progress");
    if (await isStaff(env, uid)) throw new ApiError("staff_account");
    const listed = await env.PHOTOS.list({ prefix: `${uid}/` });
    if (listed.objects.length) await env.PHOTOS.delete(listed.objects.map((o) => o.key));
    await env.DB.prepare("delete from users where id = ?").bind(uid).run();
    return json({ ok: true });
  }

  // Signed link to a photo: own photo, or the driver of the passenger's active ride.
  if (path === "/api/me/photo-url" && method === "GET") {
    const p = new URL(req.url).searchParams.get("path") ?? "";
    if (!/^[0-9a-f-]{36}\/[A-Za-z0-9_.-]{1,80}$/.test(p)) throw new ApiError("bad_photo");
    const owner = p.split("/")[0];
    const allowed =
      owner === uid ||
      (a.aal2 && (await isStaff(env, uid))) ||
      !!(await env.DB.prepare(`select 1 from rides where passenger_id = ? and driver_id = ? and status in ${ACTIVE_DRIVER}`).bind(uid, owner).first());
    if (!allowed) throw new ApiError("forbidden", 403);
    return json({ url: await photoUrl(env, p) });
  }

  // Driver ------------------------------------------------------------------------------------
  if (path === "/api/driver" && method === "GET") {
    const d = row(await driverOf(env, uid));
    const mine = await ride(env, `select * from rides where driver_id = ? and status in ${ACTIVE_DRIVER} limit 1`, uid);
    let open: unknown[] = [];
    if (d && (d as { approved: boolean }).approved && (d as { online: boolean }).online && !mine) {
      open = rows((await env.DB.prepare("select * from rides where status = 'requested' order by created_at limit 20").all()).results);
    }
    return json({ driver: d, ride: mine, requests: open });
  }

  if (path === "/api/driver" && method === "PATCH") {
    return json({ driver: await updateDriver(env, uid, await body(req)) });
  }

  // Required photo, taken live in the app. A new photo sends the driver back to verification.
  if (path === "/api/driver/photo" && method === "POST") {
    if (!(await driverOf(env, uid))) throw new ApiError("not_a_driver");
    const type = (req.headers.get("Content-Type") ?? "").split(";")[0].trim();
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw new ApiError("bad_photo");
    const busy = await env.DB.prepare(`select 1 from rides where driver_id = ? and status in ${ACTIVE_DRIVER}`).bind(uid).first();
    if (busy) throw new ApiError("ride_in_progress");
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength < 1000 || bytes.byteLength > 5 * 1024 * 1024) throw new ApiError("bad_photo");
    const key = `${uid}/${Date.now()}.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;
    await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: type } });
    const t = nowIso();
    await env.DB.batch([
      env.DB.prepare("update driver_checks set photo_checked = 0, updated_at = ? where driver_id = ?").bind(t, uid),
      env.DB.prepare("update drivers set photo_path = ?, photo_updated_at = ?, approved = 0, online = 0, updated_at = ? where user_id = ?").bind(key, t, t, uid),
    ]);
    return json({ photo_path: key });
  }

  // Rides -------------------------------------------------------------------------------------
  if (path === "/api/rides/current" && method === "GET") {
    return json({ ride: await ride(env, "select * from rides where passenger_id = ? order by created_at desc, id desc limit 1", uid) });
  }

  if (path === "/api/rides" && method === "POST") {
    const p = await profileOf(env, uid);
    if (!p || p.role !== "passenger") throw new ApiError("not_a_passenger");
    const b = await body(req);
    const factor = CATEGORIES[String(b.category)];
    if (!factor) throw new ApiError("bad_category");
    const [plat, plng, dlat, dlng] = [num(b.pickup_lat), num(b.pickup_lng), num(b.dropoff_lat), num(b.dropoff_lng)];
    for (const [lat, lng] of [[plat, plng], [dlat, dlng]]) if (lat < 41 || lat > 52 || lng < -6 || lng > 10) throw new ApiError("bad_position");
    const pl = str(b.pickup_label, 120, { required: true })!;
    const dl = str(b.dropoff_label, 120, { required: true })!;
    // Straight-line distance x 1.35, same example tariff as the website.
    const km =
      2 * 6371 * Math.asin(Math.sqrt(Math.sin(rad(dlat - plat) / 2) ** 2 + Math.cos(rad(plat)) * Math.cos(rad(dlat)) * Math.sin(rad(dlng - plng) / 2) ** 2)) * 1.35;
    if (km < 0.3) throw new ApiError("same_place");
    if (km > 150) throw new ApiError("too_far");
    const h = parisHour();
    const night = h >= 21 || h < 6;
    const raw = (4 + km * 1.9) * factor * (night ? 1.2 : 1);
    try {
      const r = await ride(
        env,
        `insert into rides (passenger_id, pickup_label, pickup_lat, pickup_lng, dropoff_label, dropoff_lat, dropoff_lng, category, km, minutes, price_estimate, night)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) returning *`,
        uid, pl, plat, plng, dl, dlat, dlng, String(b.category), Math.round(km * 10) / 10, Math.round((km / 24) * 60 + 3), Math.max(8, Math.round(raw * 2) / 2), night ? 1 : 0,
      );
      return json({ ride: r });
    } catch (e) {
      if (isUnique(e)) throw new ApiError("ride_already_active");
      throw e;
    }
  }

  if ((m = path.match(/^\/api\/rides\/(\d+)\/(accept|advance|cancel|location|contact|driver-photo)$/))) {
    const id = Number(m[1]);
    const action = m[2];
    const t = nowIso();

    if (action === "accept" && method === "POST") {
      const ok = await env.DB.prepare("select 1 from drivers where user_id = ? and approved and online").bind(uid).first();
      if (!ok) throw new ApiError("driver_not_available");
      try {
        const r = await ride(env, "update rides set driver_id = ?, status = 'accepted', accepted_at = ?, updated_at = ? where id = ? and status = 'requested' and driver_id is null returning *", uid, t, t, id);
        if (!r) throw new ApiError("ride_taken");
        return json({ ride: r });
      } catch (e) {
        if (isUnique(e)) throw new ApiError("driver_busy");
        throw e;
      }
    }

    if (action === "advance" && method === "POST") {
      const to = String((await body(req)).status);
      const from = { arriving: "accepted", in_progress: "arriving", completed: "in_progress" }[to];
      if (!from) throw new ApiError("bad_transition");
      const clear = to === "completed" ? ", driver_lat = null, driver_lng = null, driver_heading = null, driver_located_at = null" : "";
      const r = await ride(
        env,
        `update rides set status = ?, updated_at = ?,
           started_at = case when ? = 'in_progress' then ? else started_at end,
           completed_at = case when ? = 'completed' then ? else completed_at end${clear}
         where id = ? and driver_id = ? and status = ? returning *`,
        to, t, to, t, to, t, id, uid, from,
      );
      if (!r) throw new ApiError("bad_transition");
      return json({ ride: r });
    }

    if (action === "cancel" && method === "POST") {
      const r = await ride(
        env,
        `update rides set status = 'cancelled', cancelled_at = ?, updated_at = ?,
           cancelled_by = case when passenger_id = ? then 'passenger' else 'driver' end,
           driver_lat = null, driver_lng = null, driver_heading = null, driver_located_at = null
         where id = ? and ((passenger_id = ? and status in ('requested','accepted','arriving'))
                        or (driver_id = ? and status in ('accepted','arriving'))) returning *`,
        t, t, uid, id, uid, uid,
      );
      if (!r) throw new ApiError("cannot_cancel");
      return json({ ride: r });
    }

    // Live position of the assigned driver during the ride; wiped when the ride ends.
    if (action === "location" && method === "POST") {
      const b = await body(req);
      const lat = num(b.lat);
      const lng = num(b.lng);
      if (lat < 41 || lat > 52 || lng < -6 || lng > 10) throw new ApiError("bad_position");
      const hd = typeof b.heading === "number" && b.heading >= 0 && b.heading <= 360 ? b.heading : null;
      const res = await env.DB.prepare(`update rides set driver_lat = ?, driver_lng = ?, driver_heading = ?, driver_located_at = ? where id = ? and driver_id = ? and status in ${ACTIVE_DRIVER}`)
        .bind(lat, lng, hd, t, id, uid).run();
      if (!res.meta.changes) throw new ApiError("not_your_ride");
      return json({ ok: true });
    }

    // The other side of a ride: first name, plus the car for the passenger. Nothing else is shared.
    if (action === "contact" && method === "GET") {
      const c = await env.DB.prepare(
        `select p.first_name,
                case when r.passenger_id = ?1 then d.vehicle end as vehicle,
                case when r.passenger_id = ?1 then d.plate end as plate
           from rides r
           join profiles p on p.user_id = case when r.passenger_id = ?1 then r.driver_id else r.passenger_id end
           left join drivers d on d.user_id = r.driver_id
          where r.id = ?2 and r.status in ('accepted','arriving','in_progress','completed')
            and (r.passenger_id = ?1 or r.driver_id = ?1)`,
      ).bind(uid, id).first();
      return json({ contact: c ?? null });
    }

    // Passenger side: a signed link to the photo of the driver on their active ride.
    if (action === "driver-photo" && method === "GET") {
      const r = await env.DB.prepare(
        `select d.photo_path from rides r join drivers d on d.user_id = r.driver_id
          where r.id = ? and r.passenger_id = ? and r.status in ${ACTIVE_DRIVER}`,
      ).bind(id, uid).first<{ photo_path: string | null }>();
      return json({ url: r?.photo_path ? await photoUrl(env, r.photo_path) : null });
    }
  }

  return null;
}
