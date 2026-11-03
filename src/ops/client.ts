import { api, ApiError } from "@/lib/api";

// Staff session for the ops console. The token is kept in this browser only; every staff call
// is checked by the Worker (staff row + 2-step code), so the page itself holds no data.
const KEY = "mova-ops-token";

export const session = {
  get: () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode: the session lasts for this tab only */
    }
  },
};

/** Calls the API with the staff session. */
export function ops<T = Record<string, unknown>>(path: string, opts: { method?: string; body?: unknown } = {}) {
  return api<T>(path, { ...opts, token: session.get() });
}

export { ApiError };

export type Me = { user: { id: string; email: string }; aal2: boolean; mfa_enrolled: boolean; staff: boolean; email_enabled: boolean };

export type SignupStatus = "new" | "contacted" | "interview" | "committed" | "declined";

export type SignupRow = {
  id: number;
  created_at: string;
  kind: "passenger" | "driver";
  first_name: string | null;
  email: string;
  phone: string | null;
  commune: string | null;
  details: string | null;
  has_vtc_card: boolean | null;
  status: SignupStatus;
  notes: string | null;
  updated_at: string;
};

export const STATUS_LABELS: Record<SignupStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  interview: "Entretien",
  committed: "Engagé",
  declined: "Abandon",
};

export const PASSENGER_STATUSES: SignupStatus[] = ["new", "contacted", "declined"];
export const DRIVER_STATUSES: SignupStatus[] = ["new", "contacted", "interview", "committed", "declined"];
