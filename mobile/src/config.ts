// Address of the MOVA website + API (the Cloudflare Worker). Change it here, or set
// EXPO_PUBLIC_API_URL, once the site has its own domain (e.g. https://mova-besancon.fr).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://mova.skynovaagency1.workers.dev").replace(/\/$/, "");
