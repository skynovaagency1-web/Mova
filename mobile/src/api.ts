import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";

// Client for the MOVA API (Cloudflare Worker). Every rule (who may accept, cancel, see a photo…)
// is checked by the Worker; the app only shows what it is allowed to see.

const TOKEN_KEY = "mova-session";
let token: string | null | undefined;
const listeners = new Set<(signedIn: boolean) => void>();

async function setToken(t: string | null) {
  token = t;
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
  listeners.forEach((l) => l(!!t));
}

export type ApiResult<T> = { data: T | null; error: { message: string; status: number } | null };

/** Calls the API; never throws. `error.message` is the API's error code (see errorText). */
export async function call<T = Record<string, unknown>>(path: string, { method = "GET", body, raw, type }: { method?: string; body?: unknown; raw?: BodyInit; type?: string } = {}): Promise<ApiResult<T>> {
  if (token === undefined) token = await AsyncStorage.getItem(TOKEN_KEY);
  try {
    const res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : type ? { "Content-Type": type } : {}),
      },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && token && !path.startsWith("/auth/login")) await setToken(null); // session expired
      return { data: null, error: { message: data?.error ?? `http_${res.status}`, status: res.status } };
    }
    return { data: data as T, error: null };
  } catch {
    return { data: null, error: { message: "network", status: 0 } };
  }
}

/** Full URL for a path returned by the API (signed photo links). */
export const absolute = (path: string) => (path.startsWith("http") ? path : `${API_URL}${path}`);

export const auth = {
  /** Resolves once the saved session is read. */
  async signedIn() {
    if (token === undefined) token = await AsyncStorage.getItem(TOKEN_KEY);
    return !!token;
  },
  onChange(cb: (signedIn: boolean) => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async signIn(email: string, password: string) {
    const r = await call<{ token: string }>("/auth/login", { method: "POST", body: { email, password } });
    if (r.data) await setToken(r.data.token);
    return r.error;
  },
  async signUp(email: string, password: string) {
    const r = await call<{ token: string }>("/auth/signup", { method: "POST", body: { email, password } });
    if (r.data) await setToken(r.data.token);
    return r.error;
  },
  async signOut() {
    await call("/auth/logout", { method: "POST" });
    await setToken(null);
  },
  /** Deletes the account and everything attached to it. */
  async deleteAccount() {
    const r = await call("/me", { method: "DELETE" });
    if (!r.error) await setToken(null);
    return r.error;
  },
};

export type Role = "passenger" | "driver";
export type Profile = { user_id: string; role: Role; first_name: string; phone: string | null };
export type Driver = {
  user_id: string;
  vehicle: string;
  plate: string;
  category: CategoryId;
  approved: boolean;
  online: boolean;
  photo_path: string | null;
};
export type RideStatus = "requested" | "accepted" | "arriving" | "in_progress" | "completed" | "cancelled";
export type Ride = {
  id: number;
  created_at: string;
  passenger_id: string;
  driver_id: string | null;
  status: RideStatus;
  pickup_label: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_label: string;
  dropoff_lat: number;
  dropoff_lng: number;
  driver_lat: number | null;
  driver_lng: number | null;
  driver_heading: number | null;
  driver_located_at: string | null;
  category: CategoryId;
  km: number;
  minutes: number;
  price_estimate: number;
  night: boolean;
  cancelled_by: "passenger" | "driver" | "staff" | null;
};
export type Contact = { first_name: string; vehicle: string | null; plate: string | null };
export type CategoryId = "standard" | "confort" | "van";

export const ACTIVE: RideStatus[] = ["requested", "accepted", "arriving", "in_progress"];

const ERRORS: Record<string, string> = {
  invalid_login: "E-mail ou mot de passe incorrect.",
  email_taken: "Un compte existe déjà avec cet e-mail. Connectez-vous.",
  weak_password: "Mot de passe trop court : 8 caractères minimum.",
  bad_email: "Adresse e-mail invalide.",
  too_many_requests: "Trop de tentatives. Réessayez dans quelques minutes.",
  not_signed_in: "Session expirée. Reconnectez-vous.",
  staff_account: "Ce compte appartient à l'équipe MOVA et ne peut pas être supprimé ici.",
  not_your_ride: "Cette course n'est plus active.",
  bad_position: "Position invalide.",
  bad_photo: "Photo invalide. Reprenez-la.",
  checks_incomplete: "Votre vérification MOVA n'est pas complète ou un document a expiré.",
  not_a_passenger: "Ce compte n'est pas un compte passager.",
  not_a_driver: "Ce compte n'est pas un compte chauffeur.",
  driver_not_approved: "Votre compte chauffeur n'est pas encore validé par MOVA.",
  driver_not_available: "Passez en ligne pour accepter des courses.",
  ride_in_progress: "Terminez votre course avant de passer hors ligne.",
  ride_already_active: "Vous avez déjà une course en cours.",
  ride_taken: "Cette course vient d'être prise par un autre chauffeur.",
  driver_busy: "Vous avez déjà une course en cours.",
  bad_transition: "Cette étape n'est plus possible. Actualisation…",
  cannot_cancel: "Cette course ne peut plus être annulée.",
  same_place: "Choisissez un départ et une arrivée différents.",
  too_far: "Trajet trop long pour le moment.",
};

export function errorText(e: unknown) {
  const msg = (e as { message?: string })?.message ?? "";
  const code = Object.keys(ERRORS).find((k) => msg.includes(k));
  if (code) return ERRORS[code];
  if (/^network$|fetch/i.test(msg)) return "Pas de connexion. Vérifiez votre réseau.";
  return "Une erreur est survenue. Réessayez.";
}
