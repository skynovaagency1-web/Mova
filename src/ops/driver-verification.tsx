import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, ExternalLink, Loader2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/consent";
import { cn } from "@/lib/utils";
import { ApiError, ops } from "@/ops/client";

export type VerifDriver = {
  user_id: string;
  first_name: string;
  email: string;
  vehicle: string;
  plate: string;
  category: string;
  approved: boolean;
  online: boolean;
  photo_path: string | null;
  checks_ok: boolean | null;
  next_expiry: string | null;
};

type Checks = {
  photo_checked: boolean;
  identity_checked: boolean;
  vtc_card_number: string;
  vtc_card_expiry: string;
  vtc_card_checked: boolean;
  revtc_number: string;
  revtc_expiry: string;
  revtc_checked: boolean;
  license_expiry: string;
  license_checked: boolean;
  insurance_expiry: string;
  insurance_checked: boolean;
  rc_pro_expiry: string;
  rc_pro_checked: boolean;
  registration_checked: boolean;
  vehicle_first_registration: string;
  notes: string;
};

const EMPTY: Checks = {
  photo_checked: false,
  identity_checked: false,
  vtc_card_number: "",
  vtc_card_expiry: "",
  vtc_card_checked: false,
  revtc_number: "",
  revtc_expiry: "",
  revtc_checked: false,
  license_expiry: "",
  license_checked: false,
  insurance_expiry: "",
  insurance_checked: false,
  rc_pro_expiry: "",
  rc_pro_checked: false,
  registration_checked: false,
  vehicle_first_registration: "",
  notes: "",
};

type BoolKey = { [K in keyof Checks]: Checks[K] extends boolean ? K : never }[keyof Checks];
type DateKey = "vtc_card_expiry" | "revtc_expiry" | "license_expiry" | "insurance_expiry" | "rc_pro_expiry";

type Item = {
  key: BoolKey;
  title: string;
  how: string;
  expiry?: DateKey;
  number?: "vtc_card_number" | "revtc_number";
  numberLabel?: string;
  link?: { href: string; label: string };
};

// What a VTC platform has to verify before a driver carries passengers. Only the result is kept here:
// the documents are looked at in person or through the official services, never uploaded.
const ITEMS: Item[] = [
  { key: "photo_checked", title: "Photo du chauffeur", how: "La photo envoyée depuis l'app correspond au visage et à la pièce d'identité vus en personne." },
  { key: "identity_checked", title: "Pièce d'identité", how: "Carte d'identité ou passeport en cours de validité, vu en original. Ne notez pas son numéro." },
  {
    key: "vtc_card_checked",
    title: "Carte professionnelle VTC",
    how: "Carte vue en original, puis contrôlée sur le service officiel.",
    number: "vtc_card_number",
    numberLabel: "N° de carte",
    expiry: "vtc_card_expiry",
    link: { href: "https://entreprendre.service-public.gouv.fr/vosdroits/R56319", label: "Contrôler la carte (service-public)" },
  },
  {
    key: "revtc_checked",
    title: "Inscription au registre VTC",
    how: "L'entreprise du chauffeur est inscrite au registre des exploitants VTC.",
    number: "revtc_number",
    numberLabel: "N° d'inscription",
    expiry: "revtc_expiry",
    link: { href: "https://registre-vtc.developpement-durable.gouv.fr/public/accueil", label: "Registre VTC" },
  },
  { key: "license_checked", title: "Permis de conduire", how: "Permis B depuis plus de 3 ans (2 ans en conduite accompagnée), non suspendu.", expiry: "license_expiry" },
  { key: "insurance_checked", title: "Assurance du véhicule", how: "Attestation couvrant le transport de personnes à titre onéreux, au nom du chauffeur ou de sa société.", expiry: "insurance_expiry" },
  { key: "rc_pro_checked", title: "Responsabilité civile professionnelle", how: "Attestation RC pro en cours de validité.", expiry: "rc_pro_expiry" },
  { key: "registration_checked", title: "Carte grise", how: "La carte grise correspond à la plaque et au véhicule déclarés dans l'app (VTC : moins de 7 ans, 4 portes, 5 à 9 places)." },
];

const today = () => new Date(new Date().toDateString());
const daysUntil = (d: string) => Math.round((new Date(d + "T00:00:00").getTime() - today().getTime()) / 86400000);

export function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const n = daysUntil(date);
  if (n > 30) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", n <= 0 ? "bg-warning/15 text-warning" : "bg-signal/20 text-foreground")}>
      <AlertTriangle className="size-3" />
      {n <= 0 ? "Document expiré" : `Expire dans ${n} j`}
    </span>
  );
}

function missing(c: Checks, hasPhoto: boolean): string[] {
  const out: string[] = [];
  if (!hasPhoto) out.push("Le chauffeur n'a pas encore envoyé sa photo depuis l'app.");
  for (const it of ITEMS) {
    if (!c[it.key]) out.push(`${it.title} : non vérifié`);
    if (it.expiry) {
      const d = c[it.expiry];
      if (!d) out.push(`${it.title} : date d'expiration manquante`);
      else if (daysUntil(d) <= 0) out.push(`${it.title} : expiré`);
    }
  }
  return out;
}

export function DriverVerification({ driver, onClose, onChanged }: { driver: VerifDriver; onClose: () => void; onChanged: () => void }) {
  const [c, setC] = React.useState<Checks>(EMPTY);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<"save" | "approve" | null>(null);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const r = await ops<{ checks: Record<string, unknown> | null; photo_url: string | null }>(`/ops/drivers/${driver.user_id}/checks`).catch(() => null);
      if (!alive) return;
      const data = r?.checks;
      if (data) {
        const next = { ...EMPTY };
        for (const k of Object.keys(EMPTY) as (keyof Checks)[]) {
          const v = (data as Record<string, unknown>)[k];
          if (v !== null && v !== undefined) (next as Record<string, unknown>)[k] = v;
        }
        setC(next);
      }
      setPhoto(r?.photo_url ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [driver.user_id, driver.photo_path]);

  const set = <K extends keyof Checks>(k: K, v: Checks[K]) => {
    setC((prev) => ({ ...prev, [k]: v }));
    setMessage(null);
  };

  const todo = missing(c, !!driver.photo_path);
  const done = ITEMS.filter((it) => c[it.key]).length;

  const save = async (): Promise<boolean> => {
    const row = {
      ...c,
      vtc_card_number: c.vtc_card_number.trim() || null,
      revtc_number: c.revtc_number.trim() || null,
      notes: c.notes.trim() || null,
      vtc_card_expiry: c.vtc_card_expiry || null,
      revtc_expiry: c.revtc_expiry || null,
      license_expiry: c.license_expiry || null,
      insurance_expiry: c.insurance_expiry || null,
      rc_pro_expiry: c.rc_pro_expiry || null,
      vehicle_first_registration: c.vehicle_first_registration || null,
    };
    try {
      await ops(`/ops/drivers/${driver.user_id}/checks`, { method: "PUT", body: row });
    } catch {
      setMessage({ ok: false, text: "Enregistrement impossible. Reconnectez-vous puis réessayez." });
      return false;
    }
    return true;
  };

  const onSave = async () => {
    setBusy("save");
    const ok = await save();
    setBusy(null);
    if (ok) {
      setMessage({ ok: true, text: todo.length ? "Enregistré. Le chauffeur reste en attente." : "Enregistré. Vous pouvez valider le chauffeur." });
      onChanged();
    }
  };

  const onApprove = async () => {
    setBusy("approve");
    if (!(await save())) return setBusy(null);
    try {
      await ops(`/ops/drivers/${driver.user_id}/approval`, { method: "POST", body: { approved: true } });
    } catch (error) {
      setBusy(null);
      return setMessage({
        ok: false,
        text: error instanceof ApiError && error.code === "checks_incomplete" ? "Vérification incomplète ou document expiré." : "La validation n'a pas été enregistrée.",
      });
    }
    setBusy(null);
    setMessage({ ok: true, text: `${driver.first_name} est validé et peut passer en ligne.` });
    onChanged();
  };

  // Portal: the glass section uses backdrop-filter, which would trap a fixed drawer inside it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-[#2c251d]/25 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Vérification de ${driver.first_name}`}
        className="glass-card h-full w-full max-w-xl overflow-y-auto !bg-[#f8f4f0]/90 p-6 sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/80 bg-white/60">
              {photo ? (
                <img src={photo} alt={`Photo de ${driver.first_name}`} className="size-full object-cover" />
              ) : (
                <UserRound className="size-8 text-muted-foreground" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">Vérification chauffeur</p>
              <h2 className="mt-0.5 text-2xl font-extrabold">{driver.first_name}</h2>
              <p className="truncate text-sm text-muted-foreground">{driver.email}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {driver.vehicle} · {driver.plate} · {driver.category}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
            <X className="size-5" />
          </Button>
        </div>

        {!driver.photo_path && (
          <p className="mt-4 rounded-2xl border-l-4 border-warning bg-warning/10 p-3 text-sm">
            Pas encore de photo. Le chauffeur l'ajoute depuis l'app (onglet Compte) ; elle est obligatoire pour être validé.
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(done / ITEMS.length) * 100}%` }} />
          </div>
          <span className="font-mono text-xs text-muted-foreground tnum">
            {done}/{ITEMS.length}
          </span>
        </div>

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <ol className="mt-4 grid gap-3">
            {ITEMS.map((it) => (
              <li key={it.key} className={cn("rounded-2xl border p-4", c[it.key] ? "border-success/40 bg-success/5" : "border-white/80 bg-white/50")}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={c[it.key]}
                    onChange={(e) => set(it.key, e.target.checked)}
                    disabled={it.key === "photo_checked" && !driver.photo_path}
                    className="mt-1 size-4 accent-[#2c251d]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {it.title} {it.expiry && <ExpiryBadge date={c[it.expiry] || null} />}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{it.how}</span>
                  </span>
                </label>
                {(it.number || it.expiry || it.link) && (
                  <div className="mt-3 grid gap-3 pl-7 sm:grid-cols-2">
                    {it.number && (
                      <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                        {it.numberLabel}
                        <input value={c[it.number]} onChange={(e) => set(it.number!, e.target.value)} maxLength={40} className={cn(inputClass, "py-2 text-sm font-normal")} />
                      </label>
                    )}
                    {it.expiry && (
                      <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                        Valable jusqu'au
                        <input type="date" value={c[it.expiry]} onChange={(e) => set(it.expiry!, e.target.value)} className={cn(inputClass, "py-2 text-sm font-normal")} />
                      </label>
                    )}
                    {it.link && (
                      <a href={it.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-end pb-2 text-sm font-semibold underline-offset-4 hover:underline sm:col-span-2">
                        <ExternalLink className="size-3.5" /> {it.link.label}
                      </a>
                    )}
                  </div>
                )}
                {it.key === "registration_checked" && (
                  <label className="mt-3 grid gap-1 pl-7 text-xs font-semibold text-muted-foreground sm:w-1/2">
                    1re mise en circulation
                    <input type="date" value={c.vehicle_first_registration} onChange={(e) => set("vehicle_first_registration", e.target.value)} className={cn(inputClass, "py-2 text-sm font-normal")} />
                  </label>
                )}
              </li>
            ))}
          </ol>
        )}

        <label className="mt-5 grid gap-1.5 text-sm font-semibold">
          Notes internes
          <textarea value={c.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} rows={3} className={cn(inputClass, "font-normal")} placeholder="Rendez-vous du 12/11, documents vus en original…" />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">Aucun document n'est stocké : seul le résultat de la vérification est enregistré.</p>

        {todo.length > 0 && !loading && (
          <div className="mt-5 rounded-2xl bg-foreground/5 p-4 text-sm">
            <p className="font-semibold">Avant de valider</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {todo.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="lg" onClick={onSave} disabled={!!busy || loading}>
            {busy === "save" && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </Button>
          {!driver.approved && (
            <Button size="lg" onClick={onApprove} disabled={!!busy || loading || todo.length > 0}>
              {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Valider le chauffeur
            </Button>
          )}
          {message && (
            <p role="status" className={cn("text-sm font-medium", message.ok ? "text-success" : "text-warning")}>
              {message.text}
            </p>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
