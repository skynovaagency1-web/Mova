// End-to-end check of the API against a local Worker.
// 1. npx wrangler d1 execute mova-db --local --file worker/schema.sql
// 2. npx wrangler dev --var SETUP_CODE:test-setup     (in another terminal)
// 3. node worker/test/e2e.mjs
import { createHmac } from "node:crypto";

const BASE = process.env.API ?? "http://localhost:8787";
const run = Date.now().toString(36);
let failures = 0;

async function call(path, { token, method = "GET", body, raw, type } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(type ? { "Content-Type": type } : {}) },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.arrayBuffer();
  return { status: res.status, data };
}

function ok(cond, label, extra) {
  if (cond) console.log("  ✓", label);
  else {
    failures++;
    console.log("  ✗", label, extra === undefined ? "" : JSON.stringify(extra));
  }
}

function totp(secret, offset = 0) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret) bits += A.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const h = createHmac("sha1", key).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

console.log("Waitlist");
ok((await call("/api/signups", { method: "POST", body: { kind: "driver", email: `d${run}@ex.fr`, first_name: "Ana", has_vtc_card: true, consent: true } })).status === 201, "driver interest saved");
ok((await call("/api/signups", { method: "POST", body: { kind: "passenger", email: "nope", consent: true } })).status === 400, "bad e-mail refused");
ok((await call("/api/signups", { method: "POST", body: { kind: "passenger", email: `p${run}@ex.fr` } })).status === 400, "no consent refused");

console.log("Ops: first admin, 2-step");
const setup = await call("/api/setup");
let staffToken;
const adminEmail = `admin${run}@mova.fr`;
if (setup.data.needed) {
  ok((await call("/api/setup", { method: "POST", body: { code: "wrong", email: adminEmail, password: "a-long-password-1" } })).status === 403, "wrong setup code refused");
  const s = await call("/api/setup", { method: "POST", body: { code: "test-setup", email: adminEmail, password: "a-long-password-1" } });
  ok(s.status === 200, "first admin created", s.data);
  staffToken = s.data.token;
} else {
  console.log("  (setup already done in this local DB; reset .wrangler/state to rerun this part)");
}
if (staffToken) {
  ok((await call("/api/ops/signups", { token: staffToken })).data.error === "mfa_required", "staff data needs the 2-step code");
  const en = await call("/api/auth/mfa/enroll", { method: "POST", token: staffToken });
  ok(!!en.data.secret && en.data.uri.startsWith("otpauth://"), "2-step set-up started");
  ok((await call("/api/auth/mfa/verify", { method: "POST", token: staffToken, body: { code: "000000" } })).status === 400, "wrong code refused");
  ok((await call("/api/auth/mfa/verify", { method: "POST", token: staffToken, body: { code: totp(en.data.secret) } })).status === 200, "right code accepted");
  const replay = await call("/api/auth/mfa/verify", { method: "POST", token: staffToken, body: { code: totp(en.data.secret) } });
  ok(replay.status === 400, "same code cannot be reused");
  const me = await call("/api/auth/me", { token: staffToken });
  ok(me.data.staff && me.data.aal2 && me.data.mfa_enrolled, "me: staff, 2-step done", me.data);
  const list = await call("/api/ops/signups", { token: staffToken });
  ok(list.data.signups?.some((r) => r.email === `d${run}@ex.fr` && r.has_vtc_card === true), "sign-ups listed with booleans");
  const id = list.data.signups.find((r) => r.email === `d${run}@ex.fr`).id;
  ok((await call(`/api/ops/signups/${id}`, { method: "PATCH", token: staffToken, body: { status: "interview", notes: "rdv lundi" } })).data.signup?.status === "interview", "sign-up status saved");
  const imp = await call("/api/ops/signups/import", { method: "POST", token: staffToken, body: { rows: [{ created_at: "2026-10-01T10:00:00Z", kind: "passenger", email: `old${run}@ex.fr`, status: "contacted" }, { created_at: "2026-10-01T10:00:00Z", kind: "passenger", email: `old${run}@ex.fr` }, { kind: "x", email: "bad" }] } });
  ok(imp.data.added === 1 && imp.data.skipped === 2, "CSV import skips duplicates and bad rows", imp.data);
  // Fresh login needs the code again.
  const login = await call("/api/auth/login", { method: "POST", body: { email: adminEmail, password: "a-long-password-1" } });
  ok(login.status === 200 && (await call("/api/auth/me", { token: login.data.token })).data.aal2 === false, "new session starts without 2-step");
  ok((await call("/api/auth/mfa/enroll", { method: "POST", token: login.data.token })).status === 403, "cannot replace 2-step without passing it");
}

console.log("App accounts");
const pEmail = `pass${run}@ex.fr`;
const p = await call("/api/auth/signup", { method: "POST", body: { email: pEmail, password: "password1" } });
ok(p.status === 200, "passenger account created");
ok((await call("/api/auth/signup", { method: "POST", body: { email: pEmail.toUpperCase(), password: "password1" } })).data.error === "email_taken", "same e-mail refused");
ok((await call("/api/auth/login", { method: "POST", body: { email: pEmail, password: "wrong-pass" } })).data.error === "invalid_login", "wrong password refused");
const P = p.data.token;
ok((await call("/api/me/profile", { token: P })).data.profile === null, "no profile yet");
ok((await call("/api/me/profile", { method: "POST", token: P, body: { role: "passenger", first_name: "Léa" } })).data.profile?.role === "passenger", "passenger profile");

const d = await call("/api/auth/signup", { method: "POST", body: { email: `drv${run}@ex.fr`, password: "password1" } });
const D = d.data.token;
await call("/api/me/profile", { method: "POST", token: D, body: { role: "driver", first_name: "Karim", vehicle: "Toyota Corolla", plate: "ab-123-cd", category: "standard" } });
let drv = (await call("/api/driver", { token: D })).data.driver;
ok(drv?.plate === "AB-123-CD" && drv.approved === false, "driver registered, not approved");
ok((await call("/api/driver", { method: "PATCH", token: D, body: { online: true } })).data.error === "driver_not_approved", "cannot go online before approval");

console.log("Photo (R2)");
const jpeg = new Uint8Array(4000).fill(7);
const up = await call("/api/driver/photo", { method: "POST", token: D, raw: jpeg, type: "image/jpeg" });
ok(!!up.data.photo_path, "photo uploaded", up.data);
const purl = await call(`/api/me/photo-url?path=${encodeURIComponent(up.data.photo_path)}`, { token: D });
ok(purl.data.url?.startsWith("/api/photos/"), "signed link for own photo");
const img = await call(purl.data.url);
ok(img.status === 200 && img.data.byteLength === 4000, "photo served with signature");
ok((await call(purl.data.url.replace(/sig=[^&]+/, "sig=bad"))).status === 403, "bad signature refused");
ok((await call(`/api/me/photo-url?path=${encodeURIComponent(up.data.photo_path)}`, { token: P })).status === 403, "passenger without ride cannot see it");

console.log("Driver checks and approval");
if (staffToken) {
  const uid = (await call("/api/auth/me", { token: D })).data.user.id;
  ok((await call(`/api/ops/drivers/${uid}/approval`, { method: "POST", token: staffToken, body: { approved: true } })).data.error === "checks_incomplete", "approval blocked until checks done");
  const future = "2030-01-01";
  const checks = { photo_checked: true, identity_checked: true, vtc_card_checked: true, revtc_checked: true, license_checked: true, insurance_checked: true, rc_pro_checked: true, registration_checked: true, vtc_card_expiry: future, revtc_expiry: future, license_expiry: future, insurance_expiry: future, rc_pro_expiry: future, vtc_card_number: "VTC-1" };
  ok((await call(`/api/ops/drivers/${uid}/checks`, { method: "PUT", token: staffToken, body: checks })).status === 200, "checks saved");
  const got = await call(`/api/ops/drivers/${uid}/checks`, { token: staffToken });
  ok(got.data.checks?.rc_pro_checked === true && !!got.data.photo_url, "checks read back with photo link");
  ok((await call(`/api/ops/drivers/${uid}/approval`, { method: "POST", token: staffToken, body: { approved: true } })).status === 200, "driver approved");
  const dl = await call("/api/ops/drivers", { token: staffToken });
  const row = dl.data.drivers.find((x) => x.user_id === uid);
  ok(row?.approved === true && row.checks_ok === true && row.next_expiry === future && row.email === `drv${run}@ex.fr`, "drivers list", row);
  ok((await call("/api/driver", { method: "PATCH", token: D, body: { online: true } })).data.driver?.online === true, "driver online");

  console.log("Ride");
  const BESANCON = { pickup_label: "Gare Viotte", pickup_lat: 47.2472, pickup_lng: 6.0225, dropoff_label: "Hôpital Minjoz", dropoff_lat: 47.2196, dropoff_lng: 5.9501, category: "standard" };
  const r = await call("/api/rides", { method: "POST", token: P, body: BESANCON });
  ok(r.data.ride?.status === "requested" && r.data.ride.price_estimate >= 8 && r.data.ride.km > 3, "ride requested, price computed", r.data);
  ok((await call("/api/rides", { method: "POST", token: P, body: BESANCON })).data.error === "ride_already_active", "one active ride per passenger");
  ok((await call("/api/rides", { method: "POST", token: D, body: BESANCON })).data.error === "not_a_passenger", "drivers cannot book");
  const id = r.data.ride.id;
  ok((await call("/api/driver", { token: D })).data.requests?.some((x) => x.id === id), "driver sees the request");
  ok((await call(`/api/rides/${id}/accept`, { method: "POST", token: D })).data.ride?.status === "accepted", "driver accepts");
  ok((await call(`/api/rides/${id}/accept`, { method: "POST", token: D })).data.error === "ride_taken", "cannot accept twice");
  ok((await call("/api/driver", { method: "PATCH", token: D, body: { online: false } })).data.error === "ride_in_progress", "cannot go offline mid-ride");
  ok((await call(`/api/rides/${id}/location`, { method: "POST", token: D, body: { lat: 47.24, lng: 6.0, heading: 90 } })).status === 200, "driver position sent");
  ok((await call(`/api/rides/${id}/location`, { method: "POST", token: P, body: { lat: 47.24, lng: 6.0 } })).data.error === "not_your_ride", "passenger cannot send a position");
  const cur = await call("/api/rides/current", { token: P });
  ok(cur.data.ride?.driver_lat === 47.24 && cur.data.ride.driver_heading === 90, "passenger sees the car");
  const contactP = await call(`/api/rides/${id}/contact`, { token: P });
  ok(contactP.data.contact?.first_name === "Karim" && contactP.data.contact.plate === "AB-123-CD", "passenger sees driver and plate");
  const contactD = await call(`/api/rides/${id}/contact`, { token: D });
  ok(contactD.data.contact?.first_name === "Léa" && contactD.data.contact.plate === null, "driver sees passenger first name only");
  const ph = await call(`/api/rides/${id}/driver-photo`, { token: P });
  ok(ph.data.url && (await call(ph.data.url)).status === 200, "passenger sees driver photo during ride");
  ok((await call(`/api/rides/${id}/advance`, { method: "POST", token: D, body: { status: "completed" } })).data.error === "bad_transition", "cannot skip steps");
  for (const st of ["arriving", "in_progress"]) await call(`/api/rides/${id}/advance`, { method: "POST", token: D, body: { status: st } });
  ok((await call(`/api/rides/${id}/cancel`, { method: "POST", token: P })).data.error === "cannot_cancel", "cannot cancel once on board");
  const done = await call(`/api/rides/${id}/advance`, { method: "POST", token: D, body: { status: "completed" } });
  ok(done.data.ride?.status === "completed" && done.data.ride.driver_lat === null, "completed, position wiped");
  ok((await call(`/api/rides/${id}/driver-photo`, { token: P })).data.url === null, "photo hidden after the ride");

  console.log("Checks follow");
  await call(`/api/ops/drivers/${uid}/checks`, { method: "PUT", token: staffToken, body: { ...checks, insurance_expiry: "2020-01-01" } });
  drv = (await call("/api/driver", { token: D })).data.driver;
  ok(drv.approved === false && drv.online === false, "expired document takes the driver offline");
  await call(`/api/ops/drivers/${uid}/checks`, { method: "PUT", token: staffToken, body: checks });
  await call(`/api/ops/drivers/${uid}/approval`, { method: "POST", token: staffToken, body: { approved: true } });
  drv = (await call("/api/driver", { method: "PATCH", token: D, body: { plate: "ZZ-999-ZZ" } })).data.driver;
  ok(drv?.approved === false && drv.plate === "ZZ-999-ZZ", "new plate removes approval");
  const c2 = await call(`/api/ops/drivers/${uid}/checks`, { token: staffToken });
  ok(c2.data.checks.registration_checked === false && c2.data.checks.insurance_checked === false, "new car resets car checks");

  console.log("Team and links");
  const inv = await call("/api/ops/staff", { method: "POST", token: staffToken, body: { email: `ops2${run}@mova.fr` } });
  ok(inv.data.link?.includes("/ops/#token="), "invite link", inv.data);
  const token = inv.data.link.split("#token=")[1];
  ok((await call("/api/auth/reset", { method: "POST", body: { token, password: "short" } })).data.error === "weak_password", "staff password needs 12+ characters");
  const set = await call("/api/auth/reset", { method: "POST", body: { token, password: "another-long-pass" } });
  ok(set.status === 200 && !!set.data.token, "invite: password chosen, signed in");
  ok((await call("/api/auth/reset", { method: "POST", body: { token, password: "another-long-pass" } })).data.error === "link_expired", "link works once");
  const rl = await call("/api/ops/reset-link", { method: "POST", token: staffToken, body: { email: pEmail } });
  ok(rl.data.link?.includes("/reinitialiser.html#token="), "reset link for an app user");
  const reset = await call("/api/auth/reset", { method: "POST", body: { token: rl.data.link.split("#token=")[1], password: "newpassword" } });
  ok(reset.status === 200, "app user password reset");
  ok((await call("/api/auth/me", { token: P })).status === 401, "old sessions signed out after reset");
  ok((await call("/api/auth/login", { method: "POST", body: { email: pEmail, password: "newpassword" } })).status === 200, "login with the new password");
  ok((await call("/api/ops/staff", { token: P })).status === 401 || (await call("/api/ops/staff", { token: D })).data.error === "mfa_required", "app users cannot reach ops");
}

console.log("Account deletion");
ok((await call("/api/me", { method: "DELETE", token: D })).status === 200, "driver deletes account");
ok((await call("/api/auth/login", { method: "POST", body: { email: `drv${run}@ex.fr`, password: "password1" } })).data.error === "invalid_login", "account gone");

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
