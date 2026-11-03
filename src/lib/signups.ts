// Waitlist sign-ups go to the MOVA API (Cloudflare Worker + D1). Visitors can only add a sign-up.
import { api } from "@/lib/api";

export type Signup = {
  kind: "passenger" | "driver";
  email: string;
  first_name?: string;
  phone?: string;
  commune?: string;
  details?: string;
  has_vtc_card?: boolean;
  consent: true;
};

const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export async function submitSignup(s: Signup): Promise<void> {
  const body = {
    ...s,
    email: s.email.trim().toLowerCase(),
    first_name: clean(s.first_name),
    phone: clean(s.phone),
    commune: clean(s.commune),
    details: clean(s.details),
  };
  await api("/signups", { method: "POST", body });
}

export const SIGNUP_ERROR =
  "L'inscription n'a pas pu être envoyée. Vérifiez votre connexion et votre e-mail, puis réessayez.";
