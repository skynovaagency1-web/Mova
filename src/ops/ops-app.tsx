import * as React from "react";
import QRCode from "qrcode";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/consent";
import { ApiError, ops, session, type Me } from "@/ops/client";
import { api } from "@/lib/api";
import { Console } from "@/ops/console";

// Access flow: password → second factor (TOTP app) → staff check → console.
// The Worker enforces the same rules on every call (staff row + 2-step code), so the UI is only a guide.
type Gate =
  | { step: "loading" }
  | { step: "setup" }
  | { step: "signed-out" }
  | { step: "enroll" }
  | { step: "verify" }
  | { step: "not-staff" }
  | { step: "link"; token: string }
  | { step: "ready" };

// Invitation and reset links end in #token=…: read it once, then clear it from the address bar.
function linkToken() {
  const m = window.location.hash.match(/token=([A-Za-z0-9_-]+)/);
  if (m) history.replaceState(null, "", window.location.pathname + window.location.search);
  return m?.[1] ?? null;
}

export default function OpsApp() {
  const [me, setMe] = React.useState<Me | null>(null);
  const [gate, setGate] = React.useState<Gate>({ step: "loading" });

  const evaluate = React.useCallback(async () => {
    if (!session.get()) {
      const setup = await api<{ needed: boolean }>("/setup").catch(() => ({ needed: false }));
      return setGate({ step: setup.needed ? "setup" : "signed-out" });
    }
    try {
      const m = await ops<Me>("/auth/me");
      setMe(m);
      if (!m.staff) return setGate({ step: "not-staff" });
      if (!m.aal2) return setGate({ step: m.mfa_enrolled ? "verify" : "enroll" });
      setGate({ step: "ready" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) session.set(null);
      setGate({ step: "signed-out" });
    }
  }, []);

  React.useEffect(() => {
    const t = linkToken();
    if (t) setGate({ step: "link", token: t });
    else evaluate();
  }, [evaluate]);

  const signedIn = (token: string) => {
    session.set(token);
    evaluate();
  };

  const signOut = async () => {
    await ops("/auth/logout", { method: "POST" }).catch(() => {});
    session.set(null);
    setMe(null);
    evaluate();
  };

  if (gate.step === "ready" && me) return <Console email={me.user.email} emailEnabled={me.email_enabled} onSignOut={signOut} />;

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="ops-backdrop" aria-hidden />
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl font-medium tracking-[0.14em]">
          MOVA <span className="text-xl tracking-[0.3em] text-muted-foreground">OPS</span>
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">Console interne · accès réservé à l'équipe</p>
        <div className="glass-card mt-8 rounded-[1.75rem] p-7">
          {gate.step === "loading" && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />}
          {gate.step === "setup" && <Setup onDone={signedIn} />}
          {gate.step === "signed-out" && <SignIn onDone={signedIn} />}
          {gate.step === "enroll" && <Enroll onDone={evaluate} />}
          {gate.step === "verify" && <Verify onDone={evaluate} />}
          {gate.step === "link" && <SetPassword token={gate.token} onDone={signedIn} />}
          {gate.step === "not-staff" && (
            <div className="grid gap-4 text-sm">
              <p className="font-semibold">Ce compte n'a pas accès à la console.</p>
              <p className="text-muted-foreground">
                Connecté en tant que {me?.user.email}. Demandez à un administrateur MOVA de vous ajouter à l'équipe.
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

// First start only: while nobody is in the team, create the first admin with the SETUP_CODE secret
// set in the Cloudflare dashboard. The Worker refuses this once a team member exists.
function Setup({ onDone }: { onDone: (token: string) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 12) return setError("Mot de passe : 12 caractères minimum.");
    if (password !== String(f.get("confirm"))) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    setError("");
    try {
      const r = await api<{ token: string }>("/setup", { method: "POST", body: { code: f.get("code"), email: f.get("email"), password } });
      onDone(r.token);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError && err.code === "bad_setup_code" ? "Code d'installation incorrect (voir le secret SETUP_CODE dans Cloudflare)." : "Création impossible. Vérifiez l'e-mail et réessayez.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-5 text-primary" /> Premier administrateur
      </p>
      <p className="text-sm text-muted-foreground">Aucun membre de l'équipe pour l'instant. Créez le compte administrateur avec le code d'installation.</p>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Code d'installation
        <input id="ops-setup-code" name="code" required autoComplete="off" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        E-mail
        <input id="ops-setup-email" name="email" type="email" required autoComplete="username" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Mot de passe (12 caractères minimum)
        <input id="ops-setup-password" name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-muted-foreground">
        Confirmer
        <input id="ops-setup-confirm" name="confirm" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </label>
      {error && <p role="alert" className="text-sm font-medium text-warning">{error}</p>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Créer le compte
      </Button>
    </form>
  );
}

function SignIn({ onDone }: { onDone: (token: string) => void }) {
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
    const r = await api<{ email_enabled: boolean }>("/auth/forgot", { method: "POST", body: { email } }).catch(() => null);
    setBusy(false);
    setNotice(
      r?.email_enabled
        ? "Si ce compte existe, un lien pour choisir un nouveau mot de passe vient d'être envoyé."
        : "L'envoi d'e-mails n'est pas encore activé. Demandez à un administrateur un lien de réinitialisation (rubrique Équipe).",
    );
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ token: string }>("/auth/login", { method: "POST", body: { email: String(f.get("email")), password: String(f.get("password")) } });
      onDone(r.token);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError && err.code === "too_many_requests" ? "Trop de tentatives. Réessayez dans 15 minutes." : "E-mail ou mot de passe incorrect.");
    }
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

function Verify({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      await ops("/auth/mfa/verify", { method: "POST", body: { code } });
    } catch {
      setBusy(false);
      return setError("Code incorrect ou expiré. Réessayez avec le code affiché maintenant.");
    }
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
  const [factor, setFactor] = React.useState<{ qr: string; secret: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const started = React.useRef(false);
  React.useEffect(() => {
    // Run once, even under StrictMode's double effect, so only one factor is created.
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const r = await ops<{ secret: string; uri: string }>("/auth/mfa/enroll", { method: "POST" });
        setFactor({ qr: await QRCode.toDataURL(r.uri, { margin: 1, width: 352 }), secret: r.secret });
      } catch {
        setError("Impossible de démarrer la configuration. Rechargez la page.");
      }
    })();
  }, []);

  const submit = async (code: string) => {
    if (!factor) return;
    setBusy(true);
    setError("");
    try {
      await ops("/auth/mfa/verify", { method: "POST", body: { code } });
    } catch {
      setBusy(false);
      return setError("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.");
    }
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

function SetPassword({ token, onDone }: { token: string; onDone: (session: string) => void }) {
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
    try {
      const r = await api<{ token: string }>("/auth/reset", { method: "POST", body: { token, password } });
      onDone(r.token);
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiError && err.code === "link_expired"
          ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau à un administrateur."
          : "Impossible d'enregistrer ce mot de passe. Essayez-en un autre, plus long.",
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-5 text-primary" /> Choisissez votre mot de passe
      </p>
      <p className="text-sm text-muted-foreground">Vous l'utiliserez avec un code à 6 chiffres (application d'authentification) pour vos connexions.</p>
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
