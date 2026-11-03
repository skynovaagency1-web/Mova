// Time-based one-time codes (RFC 6238, 30 s, 6 digits, SHA-1): what Google Authenticator,
// Microsoft Authenticator and 1Password produce.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function decode(secret: string) {
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

async function codeAt(secret: string, step: number) {
  const msg = new Uint8Array(8);
  let s = step;
  for (let i = 7; i >= 0; i--) {
    msg[i] = s & 0xff;
    s = Math.floor(s / 256);
  }
  const key = await crypto.subtle.importKey("raw", decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** Returns the matching time step (one step of clock drift allowed either way), or null. */
export async function checkCode(secret: string, code: string, notAfterStep?: number | null) {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(Date.now() / 30_000);
  for (const step of [now, now - 1, now + 1]) {
    if (notAfterStep != null && step <= notAfterStep) continue; // each code works once
    if ((await codeAt(secret, step)) === code) return step;
  }
  return null;
}

export const otpauthUri = (secret: string, account: string) =>
  `otpauth://totp/${encodeURIComponent(`MOVA Ops:${account}`)}?secret=${secret}&issuer=${encodeURIComponent("MOVA Ops")}&algorithm=SHA1&digits=6&period=30`;
