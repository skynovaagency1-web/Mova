import type { CategoryId } from "./api";

// Pilot pick-up points in Besançon. Real address search and maps come in the next step.
export type Place = { id: string; label: string; short: string; lat: number; lng: number };

export const PLACES: Place[] = [
  { id: "viotte", label: "Gare Besançon-Viotte", short: "Gare Viotte", lat: 47.247, lng: 6.0222 },
  { id: "centre", label: "Centre-ville (Place du 8 Septembre)", short: "Centre-ville", lat: 47.2378, lng: 6.0241 },
  { id: "battant", label: "Quartier Battant", short: "Battant", lat: 47.241, lng: 6.018 },
  { id: "citadelle", label: "Citadelle de Besançon", short: "Citadelle", lat: 47.231, lng: 6.032 },
  { id: "tgv", label: "Gare Besançon Franche-Comté TGV", short: "Gare TGV", lat: 47.3075, lng: 5.9535 },
  { id: "chu", label: "CHU Jean Minjoz", short: "CHU Minjoz", lat: 47.2236, lng: 5.9466 },
  { id: "campus", label: "Campus de la Bouloie / Témis", short: "Campus Bouloie", lat: 47.249, lng: 5.993 },
  { id: "planoise", label: "Planoise", short: "Planoise", lat: 47.223, lng: 5.96 },
  { id: "micropolis", label: "Micropolis", short: "Micropolis", lat: 47.2206, lng: 5.9814 },
  { id: "chalezeule", label: "Chalezeule / Marnières", short: "Chalezeule", lat: 47.262, lng: 6.07 },
];

export const CATEGORIES: { id: CategoryId; label: string; hint: string; factor: number }[] = [
  { id: "standard", label: "Standard", hint: "Berline, 4 places", factor: 1 },
  { id: "confort", label: "Confort", hint: "Berline premium", factor: 1.3 },
  { id: "van", label: "Van", hint: "Jusqu'à 7 places", factor: 1.55 },
];

// Preview only: the database computes the price that is stored with the ride.
export function previewPrice(a: Place, b: Place, category: CategoryId) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(h)) * 1.35;
  const hour = new Date().getHours();
  const night = hour >= 21 || hour < 6;
  const factor = CATEGORIES.find((c) => c.id === category)!.factor;
  const price = Math.max(8, Math.round((4 + km * 1.9) * factor * (night ? 1.2 : 1) * 2) / 2);
  return { km: Math.round(km * 10) / 10, minutes: Math.round((km / 24) * 60 + 3), price, night };
}

export const euro = (n: number) => `${Number(n).toFixed(Number(n) % 1 ? 2 : 0).replace(".", ",")} €`;
