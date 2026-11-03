import * as React from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Header } from "@/components/ui/header-1";
import FooterSection from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/consent";
import { api, ApiError } from "@/lib/api";

// Opened from a reset link (…/reinitialiser.html#token=…) sent by e-mail or by the MOVA team.
export default function ResetPassword() {
  const [token] = React.useState(() => {
    const m = window.location.hash.match(/token=([A-Za-z0-9_-]+)/);
    if (m) history.replaceState(null, "", window.location.pathname);
    return m?.[1] ?? null;
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return setError("8 caractères minimum.");
    if (password !== String(f.get("confirm"))) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    setError("");
    try {
      const r = await api<{ token: string }>("/auth/reset", { method: "POST", body: { token, password } });
      // This page doesn't keep the session: sign in again in the app with the new password.
      await api("/auth/logout", { method: "POST", token: r.token }).catch(() => {});
      setDone(true);
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiError && err.code === "link_expired"
          ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau à l'équipe MOVA."
          : err instanceof ApiError && err.code === "weak_password"
            ? "Mot de passe trop court."
            : "Enregistrement impossible. Vérifiez votre connexion et réessayez.",
      );
    }
  };

  return (
    <>
      <Header />
      <main className="container grid min-h-[60vh] place-items-center py-14">
        <div className="glass-card w-full max-w-sm rounded-[1.75rem] p-7">
          {done ? (
            <div className="grid gap-3 text-center">
              <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
              <h1 className="font-display text-3xl font-medium">Mot de passe enregistré</h1>
              <p className="text-muted-foreground">Retournez dans l'application MOVA et connectez-vous avec votre nouveau mot de passe.</p>
            </div>
          ) : !token ? (
            <div className="grid gap-3">
              <h1 className="font-display text-3xl font-medium">Lien incomplet</h1>
              <p className="text-muted-foreground">Ouvrez le lien complet reçu de MOVA, ou demandez-en un nouveau à l'équipe.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <h1 className="flex items-center gap-2 font-display text-3xl font-medium">
                <KeyRound className="size-6 text-primary" aria-hidden /> Nouveau mot de passe
              </h1>
              <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
                Mot de passe (8 caractères minimum)
                <input id="reset-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
                Confirmer
                <input id="reset-confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
              </label>
              {error && <p role="alert" className="text-sm font-medium text-warning">{error}</p>}
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Enregistrer
              </Button>
            </form>
          )}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
