import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/consent";
import { ARRIVED_FROM_EMAIL_LINK, supabase } from "@/ops/supabase";
import { Console } from "@/ops/console";

// Access flow: password → second factor (TOTP app) → staff check → console.
// The database enforces the same rules (aal2 + mova_staff row), so the UI is only a guide.
type Gate =
  | { step: "loading" }
  | { step: "signed-out" }
  | { step: "enroll" }
  | { step: "verify"; factorId: string }
  | { step: "not-staff" }
  | { step: "set-password" }
  | { step: "ready" };

export default function OpsApp() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [gate, setGate] = React.useState<Gate>({ step: "loading" });
  const needsPassword = React.useRef(ARRIVED_FROM_EMAIL_LINK);

  const evaluate = React.useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) return setGate({ step: "signed-out" });
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp.find((f) => f.status === "verified");
      return setGate(totp ? { step: "verify", factorId: totp.id } : { step: "enroll" });
    }
    const { data: staff } = await supabase.from("mova_staff").select("user_id").eq("user_id", s.user.id).maybeSingle();
    if (!staff) return setGate({ step: "not-staff" });
    setGate(needsPassword.current ? { step: "set-password" } : { step: "ready" });
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") evaluate(null);
      if (event === "PASSWORD_RECOVERY") needsPassword.current = true;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "MFA_CHALLENGE_VERIFIED") evaluate(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [evaluate]);

  const signOut = () => supabase.auth.signOut();

  if (gate.step === "ready" && session) return <Console email={session.user.email ?? ""} onSignOut={signOut} />;

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="ops-backdrop" aria-hidden />
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl font-medium tracking-[0.14em]">
          MovaaGo <span className="text-xl tracking-[0.3em] text-muted-foreground">OPS</span>
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">Console interne · accès réservé à l'équipe</p>
        <div className="glass-card mt-8 rounded-[1.75rem] p-7">
          {gate.step === "loading" && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />}
          {gate.step === "signed-out" && <SignIn />}
          {gate.step === "enroll" && <Enroll onDone={() => supabase.auth.getSession().then(({ data }) => evaluate(data.session))} />}
          {gate.step === "verify" && <Verify factorId={gate.factorId} onDone={() => supabase.auth.getSession().then(({ data }) => evaluate(data.session))} />}
          {gate.step === "set-password" && (
            <SetPassword
              onDone={() => {
                needsPassword.current = false;
                setGate({ step: "ready" });
              }}
            />
          )}
          {gate.step === "not-staff" && (
            <div className="grid gap-4 text-sm">
              <p className="font-semibold">Ce compte n'a pas accès à la console.</p>
              <p className="text-muted-foreground">
                Connecté en tant que {session?.user.email}. Demandez à un administrateur MovaaGo de vous ajouter à l'équipe.
              </p>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="size-4" /> Se déconnecter
              </Button>
            </div>
          )}
        </div>
        {(gate.step === "enroll" || gate.step === "verify") && (
          <button onClick={signOut} className="mt-4 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Utiliser un autre compte
          </button>
        )}
      </div>
    </div>
  );
}

function SignIn() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);

  const forgot = async () => {
    const email = String(new FormData(formRef.current!).get("email") ?? "").trim();
    setError("");
    setNotice("");
    if (!email) return setError("Saisissez d'abord votre e-mail.");
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    setBusy(false);
    setNotice("Si ce compte existe, un lien pour choisir un nouveau mot de passe vient d'être envoyé.");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) setError("E-mail ou mot de passe incorrect.");
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        E-mail
        <input id="ops-email" name="email" type="email" required autoComplete="username" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Mot de passe
        <input id="ops-password" name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {error && <p role="alert" className="text-sm font-medium text-warning">{error}</p>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Se connecter
      </Button>
      <button type="button" onClick={forgot} disabled={busy} className="justify-self-start text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
        Mot de passe oublié ?
      </button>
    </form>
  );
}

function CodeForm({ onSubmit, busy, error, label }: { onSubmit: (code: string) => void; busy: boolean; error: string; label: string }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(String(new FormData(e.currentTarget).get("code")).replace(/\s/g, ""));
      }}
    >
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        {label}
        <input
          id="ops-code"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          className={`${inputClass} text-center font-mono text-xl tracking-[0.4em]`}
          placeholder="000000"
        />
      </label>
      {error && <p role="alert" className="text-sm font-medium text-warning">{error}</p>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Valider
      </Button>
    </form>
  );
}

function Verify({ factorId, onDone }: { factorId: string; onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (code: string) => {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return setError("Code incorrect ou expiré. Réessayez avec le code affiché maintenant.");
    onDone();
  };

  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-5 text-primary" /> Vérification en deux étapes
      </p>
      <p className="text-sm text-muted-foreground">Saisissez le code à 6 chiffres de votre application d'authentification.</p>
      <CodeForm onSubmit={submit} busy={busy} error={error} label="Code" />
    </div>
  );
}

function Enroll({ onDone }: { onDone: () => void }) {
  const [factor, setFactor] = React.useState<{ id: string; qr: string; secret: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const started = React.useRef(false);
  React.useEffect(() => {
    // Run once, even under StrictMode's double effect, so only one factor is created.
    if (started.current) return;
    started.current = true;
    (async () => {
      // Drop half-finished enrolments from earlier attempts before starting a new one.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `MovaaGo Ops ${Date.now()}` });
      if (error || !data) return setError("Impossible de démarrer la configuration. Rechargez la page.");
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  const submit = async (code: string) => {
    if (!factor) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (error) return setError("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.");
    onDone();
  };

  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-5 text-primary" /> Activez la vérification en deux étapes
      </p>
      <p className="text-sm text-muted-foreground">
        Obligatoire pour accéder aux données. Scannez ce code avec Google Authenticator, Microsoft Authenticator ou 1Password.
      </p>
      {factor ? (
        <>
          <img src={factor.qr} alt="QR code à scanner dans votre application d'authentification" className="mx-auto size-44 rounded bg-white p-2" />
          <p className="break-all text-center font-mono text-[11px] text-muted-foreground">Clé manuelle : {factor.secret}</p>
          <CodeForm onSubmit={submit} busy={busy} error={error} label="Code affiché dans l'application" />
        </>
      ) : error ? (
        <p role="alert" className="text-sm font-medium text-warning">{error}</p>
      ) : (
        <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

function SetPassword({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 12) return setError("12 caractères minimum.");
    if (password !== String(f.get("confirm"))) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError("Impossible d'enregistrer ce mot de passe. Essayez-en un autre, plus long.");
    onDone();
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-5 text-primary" /> Choisissez votre mot de passe
      </p>
      <p className="text-sm text-muted-foreground">Vous l'utiliserez avec votre code à 6 chiffres pour vos prochaines connexions.</p>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Nouveau mot de passe
        <input id="ops-new-password" name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Confirmer
        <input id="ops-confirm-password" name="confirm" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      {error && <p role="alert" className="text-sm font-medium text-warning">{error}</p>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Enregistrer
      </Button>
    </form>
  );
}
