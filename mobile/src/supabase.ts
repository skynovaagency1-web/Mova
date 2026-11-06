import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

// Only refresh the session while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

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
  not_your_ride: "Cette course n'est plus active.",
  bad_position: "Position invalide.",
  bad_photo: "Photo invalide. Reprenez-la.",
  checks_incomplete: "Votre vérification MovaaGo n'est pas complète ou un document a expiré.",
  not_a_passenger: "Ce compte n'est pas un compte passager.",
  not_a_driver: "Ce compte n'est pas un compte chauffeur.",
  driver_not_approved: "Votre compte chauffeur n'est pas encore validé par MovaaGo.",
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
  if (/network|fetch/i.test(msg)) return "Pas de connexion. Vérifiez votre réseau.";
  return "Une erreur est survenue. Réessayez.";
}
