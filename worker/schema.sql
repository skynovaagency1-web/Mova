-- MOVA on Cloudflare D1 (SQLite). Replaces the former Supabase schema.
-- Safe to run more than once: every statement is "if not exists".
-- Apply: npx wrangler d1 execute mova-db --remote --file worker/schema.sql
-- All access rules live in the Worker (worker/src); the database is never exposed directly.
-- Times are ISO 8601 UTC strings; booleans are 0/1.

-- Accounts --------------------------------------------------------------------------------------
create table if not exists users (
  id text primary key,                                   -- random UUID
  email text not null unique collate nocase,
  password_hash text,                                    -- pbkdf2$<iterations>$<salt>$<hash>; null until set
  totp_secret text,                                      -- staff 2-step verification (base32), once confirmed
  totp_pending text,                                     -- secret being set up, not yet confirmed
  totp_last_step integer,                                -- last accepted code window, blocks replays
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists sessions (
  token_hash text primary key,                           -- SHA-256 of the bearer token; the token itself is never stored
  user_id text not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at integer not null,                           -- unix ms
  aal2_until integer not null default 0                  -- unix ms; 2-step code checked until then
);
create index if not exists sessions_user_idx on sessions (user_id);

-- One-time links: password reset and staff invitations.
create table if not exists auth_tokens (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null check (kind in ('reset','invite')),
  expires_at integer not null,
  used_at integer
);

-- Simple rate limiting (failed logins, sign-up bursts).
create table if not exists rate_hits (
  key text not null,
  at integer not null
);
create index if not exists rate_hits_idx on rate_hits (key, at);

-- Small key/value store (photo link signing key).
create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists staff (
  user_id text primary key references users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','support')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Website waitlist ------------------------------------------------------------------------------
create table if not exists signups (
  id integer primary key autoincrement,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  kind text not null check (kind in ('passenger','driver')),
  first_name text check (length(first_name) <= 80),
  email text not null check (length(email) <= 200),
  phone text check (length(phone) <= 30),
  commune text check (length(commune) <= 80),
  details text check (length(details) <= 200),
  has_vtc_card integer,
  consent integer not null check (consent = 1),
  status text not null default 'new' check (status in ('new','contacted','interview','committed','declined')),
  notes text check (length(notes) <= 2000),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
create index if not exists signups_created_idx on signups (created_at desc);

-- Pilot app -------------------------------------------------------------------------------------
create table if not exists profiles (
  user_id text primary key references users(id) on delete cascade,
  role text not null check (role in ('passenger','driver')),
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  phone text check (length(phone) <= 30),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists drivers (
  user_id text primary key references profiles(user_id) on delete cascade,
  vehicle text not null check (length(trim(vehicle)) between 2 and 80),
  plate text not null check (length(trim(plate)) between 4 and 15),
  category text not null default 'standard' check (category in ('standard','confort','van')),
  approved integer not null default 0,
  online integer not null default 0,
  photo_path text,
  photo_updated_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists rides (
  id integer primary key autoincrement,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  passenger_id text not null references profiles(user_id) on delete cascade,
  driver_id text references drivers(user_id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested','accepted','arriving','in_progress','completed','cancelled')),
  pickup_label text not null check (length(pickup_label) between 1 and 120),
  pickup_lat real not null check (pickup_lat between 41 and 52),
  pickup_lng real not null check (pickup_lng between -6 and 10),
  dropoff_label text not null check (length(dropoff_label) between 1 and 120),
  dropoff_lat real not null check (dropoff_lat between 41 and 52),
  dropoff_lng real not null check (dropoff_lng between -6 and 10),
  category text not null check (category in ('standard','confort','van')),
  km real not null,
  minutes integer not null,
  price_estimate real not null,
  night integer not null default 0,
  cancelled_by text check (cancelled_by in ('passenger','driver','staff')),
  accepted_at text,
  started_at text,
  completed_at text,
  cancelled_at text,
  driver_lat real check (driver_lat between 41 and 52),
  driver_lng real check (driver_lng between -6 and 10),
  driver_heading real check (driver_heading between 0 and 360),
  driver_located_at text
);
create index if not exists rides_passenger_idx on rides (passenger_id, created_at desc);
create index if not exists rides_driver_idx on rides (driver_id, created_at desc);
create index if not exists rides_open_idx on rides (created_at) where status = 'requested';
-- One active ride per passenger and per driver.
create unique index if not exists rides_one_active_passenger on rides (passenger_id)
  where status in ('requested','accepted','arriving','in_progress');
create unique index if not exists rides_one_active_driver on rides (driver_id)
  where status in ('accepted','arriving','in_progress');

-- Staff-only driver checklist. No ID or insurance document is stored, only the result of each check.
create table if not exists driver_checks (
  driver_id text primary key references drivers(user_id) on delete cascade,
  photo_checked integer not null default 0,
  identity_checked integer not null default 0,
  vtc_card_number text check (length(vtc_card_number) <= 40),
  vtc_card_expiry text,
  vtc_card_checked integer not null default 0,
  revtc_number text check (length(revtc_number) <= 40),
  revtc_expiry text,
  revtc_checked integer not null default 0,
  license_expiry text,
  license_checked integer not null default 0,
  insurance_expiry text,
  insurance_checked integer not null default 0,
  rc_pro_expiry text,
  rc_pro_checked integer not null default 0,
  registration_checked integer not null default 0,
  vehicle_first_registration text,
  notes text check (length(notes) <= 2000),
  checked_by text references users(id) on delete set null,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
