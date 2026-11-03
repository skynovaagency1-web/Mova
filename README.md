# MOVA · Besançon (pilot)

Website, pilot app and staff console for MOVA, a local VTC platform in Besançon.
Everything runs on **Cloudflare**: one Worker serves the website and the API, **D1** stores the data and **R2** the driver photos.
Go-live steps: [CLOUDFLARE.md](CLOUDFLARE.md).

> **Pilot.** No payment is taken. Never collect ID or insurance documents through the site or the app: staff check them in person
> and only tick the result in the ops console.

## Stack

- Website: React 18 + TypeScript + Vite (multi-page), Tailwind CSS, UI adapted from [21st.dev](https://21st.dev) components
- API: Cloudflare Worker in `worker/src` (no framework), D1 (SQLite) schema in `worker/schema.sql`, R2 bucket `mova-driver-photos`
- App: Expo / React Native in `mobile/` (see `mobile/README.md`)

## Pages

| Path | Content |
| --- | --- |
| `/` | Landing page: estimate form, how it works, Besançon places, verification mock-up, passenger waitlist and driver interest form (saved in D1), FAQ |
| `/app.html` | Interactive phone prototype |
| `/mentions-legales.html`, `/cgu.html`, `/confidentialite.html` | Legal pages (company details still to fill in `src/components/legal-layout.tsx`) |
| `/reinitialiser.html` | Choose a new password from a reset link (app users) |
| `/ops/` | Staff console (below) |
| `404.html` | Not-found page |

## API (`/api/*`)

| Area | Routes |
| --- | --- |
| Waitlist | `POST /api/signups` |
| Accounts | `POST /api/auth/signup`, `/login`, `/logout`, `/forgot`, `/reset`, `/password`, `/mfa/enroll`, `/mfa/verify`; `GET /api/auth/me` |
| App | `GET/POST /api/me/profile`, `DELETE /api/me`, `GET /api/me/photo-url`, `GET/PATCH /api/driver`, `POST /api/driver/photo`, `GET /api/rides/current`, `POST /api/rides`, `POST /api/rides/:id/{accept,advance,cancel,location}`, `GET /api/rides/:id/{contact,driver-photo}` |
| Ops (staff + 2-step) | `/api/ops/signups` (+ `/import`), `/api/ops/drivers`, `/api/ops/drivers/:id/{checks,approval}`, `/api/ops/rides`, `/api/ops/staff`, `/api/ops/reset-link` |

Rules that used to live in Supabase policies and functions are in the Worker: prices computed server-side, one active ride per
passenger and per driver (unique indexes), approval and going online only with a complete, unexpired checklist, a new car or photo
removes approval, the driver position is wiped when a ride ends, photos are served only through short-lived signed links.
Passwords are hashed with PBKDF2-SHA256; sessions are random bearer tokens stored hashed.

## Ops console (`/ops/`)

Staff log in with e-mail + password + a 6-digit code from an authenticator app (set up on first login). Sections: waitlist
overview and pipeline (with CSV export/import), pilot app drivers (verification checklist, approval) and latest rides, and
**Équipe et accès** (invite a member, remove one, reset a lost 2-step set-up, create a password-reset link for any account).

The very first admin is created at `/ops/` with the `SETUP_CODE` secret (see CLOUDFLARE.md); this works only while the team is empty.

## Run locally

```bash
npm install
npx wrangler d1 execute mova-db --local --file worker/schema.sql   # once
npm run build && npx wrangler dev --var SETUP_CODE:test-setup     # site + API on http://localhost:8787
node worker/test/e2e.mjs                                          # API checks against the local Worker
npm run dev                                                       # live-reload site on :5173, /api proxied to :8787
```

## Demo data

Places, sample drivers and the example tariff live in `src/lib/demo-data.ts`. Prices use straight-line distance × 1.35; they are estimates.
