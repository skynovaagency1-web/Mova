import * as React from "react";
import { Copy, KeyRound, Loader2, RefreshCw, ShieldOff, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/consent";
import { cn } from "@/lib/utils";
import { ApiError, ops } from "@/ops/client";

type Member = { user_id: string; email: string; role: string; created_at: string; has_password: boolean; has_mfa: boolean };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

// Team access: add a member (link to choose a password), remove one, reset a lost 2-step set-up,
// and create a password-reset link for any account (also app users) while e-mail sending is off.
export function TeamSection({ emailEnabled }: { emailEnabled: boolean }) {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [meId, setMeId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [link, setLink] = React.useState<{ email: string; url: string; emailed: boolean } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await ops<{ staff: Member[]; me: string }>("/ops/staff");
      setMembers(r.staff);
      setMeId(r.me);
      setError("");
    } catch {
      setError("Impossible de charger l'équipe.");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const makeLink = async (kind: "invite" | "reset", e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    if (!email) return;
    setBusy(kind);
    setError("");
    setLink(null);
    try {
      const r = await ops<{ link: string; emailed: boolean }>(kind === "invite" ? "/ops/staff" : "/ops/reset-link", { method: "POST", body: { email } });
      setLink({ email, url: r.link, emailed: r.emailed });
      form.reset();
      if (kind === "invite") load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "not_found" ? "Aucun compte avec cet e-mail." :
        code === "app_account" ? "Cet e-mail sert déjà à un compte passager ou chauffeur. Utilisez une autre adresse pour l'équipe." :
        code === "bad_email" ? "Adresse e-mail invalide." : "Action impossible. Réessayez.",
      );
    }
    setBusy(null);
  };

  const act = async (m: Member, what: "remove" | "mfa") => {
    const q = what === "remove" ? `Retirer ${m.email} de l'équipe ?` : `Réinitialiser la vérification en deux étapes de ${m.email} ? Il la configurera à nouveau à sa prochaine connexion.`;
    if (!window.confirm(q)) return;
    setBusy(m.user_id);
    try {
      await ops(what === "remove" ? `/ops/staff/${m.user_id}` : `/ops/staff/${m.user_id}/reset-mfa`, { method: what === "remove" ? "DELETE" : "POST" });
    } catch {
      setError("Action impossible. Réessayez.");
    }
    setBusy(null);
    load();
  };

  return (
    <section className="glass-card mt-6 rounded-[1.75rem] p-5 sm:p-7" aria-labelledby="team-title">
      <div className="flex items-end justify-between gap-4 border-b pb-3">
        <h2 id="team-title" className="text-lg font-bold">Équipe et accès</h2>
        <Button variant="outline" size="sm" onClick={load} aria-label="Actualiser l'équipe">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-2xl border-l-4 border-warning bg-warning/10 p-3 text-sm">{error}</p>}
      {link && (
        <div role="status" className="mt-4 grid gap-2 rounded-2xl border border-white/80 bg-white/60 p-4 text-sm">
          <p>
            Lien pour <strong>{link.email}</strong>{link.emailed ? " (envoyé par e-mail)" : ""}. Transmettez-le à la personne : il ne sert qu'une fois.
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={link.url} className={cn(inputClass, "py-2 font-mono text-xs")} onFocus={(e) => e.currentTarget.select()} aria-label="Lien à transmettre" />
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(link.url)} aria-label="Copier le lien">
              <Copy className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLink(null)} aria-label="Fermer">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Membres de l'équipe</h3>
          <ul className="mt-3 divide-y border-y">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {m.email} {m.user_id === meId && <span className="text-xs font-normal text-muted-foreground">(vous)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Depuis le {fmt(m.created_at)} · {!m.has_password ? "invitation en attente" : m.has_mfa ? "2 étapes activée" : "2 étapes à configurer"}
                  </p>
                </div>
                {m.user_id !== meId &&
                  (busy === m.user_id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <div className="flex shrink-0 gap-2">
                      {m.has_mfa && (
                        <Button variant="outline" size="sm" onClick={() => act(m, "mfa")} aria-label={`Réinitialiser la vérification en deux étapes de ${m.email}`} title="Téléphone perdu : réinitialiser la vérification en deux étapes">
                          <ShieldOff className="size-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => act(m, "remove")} aria-label={`Retirer ${m.email} de l'équipe`}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-6">
          <form onSubmit={(e) => makeLink("invite", e)} className="grid gap-2">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Ajouter un membre</h3>
            <div className="flex gap-2">
              <input id="team-invite-email" name="email" type="email" required placeholder="prenom@mova.fr" aria-label="E-mail du nouveau membre" className={cn(inputClass, "py-2")} />
              <Button type="submit" size="sm" disabled={busy === "invite"}>
                {busy === "invite" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Inviter
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Vous obtenez un lien valable 7 jours pour choisir un mot de passe. La vérification en deux étapes est ensuite obligatoire.</p>
          </form>
          <form onSubmit={(e) => makeLink("reset", e)} className="grid gap-2">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mot de passe oublié (app ou équipe)</h3>
            <div className="flex gap-2">
              <input id="team-reset-email" name="email" type="email" required placeholder="e-mail du compte" aria-label="E-mail du compte à réinitialiser" className={cn(inputClass, "py-2")} />
              <Button type="submit" variant="outline" size="sm" disabled={busy === "reset"}>
                {busy === "reset" ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Créer un lien
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {emailEnabled
                ? "Le lien est aussi envoyé par e-mail à la personne."
                : "L'envoi d'e-mails n'est pas activé : envoyez le lien vous-même (SMS, e-mail). Vérifiez d'abord l'identité de la personne."}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
