import * as React from "react";
import { Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ops } from "@/ops/client";
import { DriverVerification, ExpiryBadge, type VerifDriver } from "@/ops/driver-verification";

type StaffDriver = VerifDriver & { created_at: string };

type Ride = {
  id: number;
  created_at: string;
  status: string;
  pickup_label: string;
  dropoff_label: string;
  price_estimate: number;
};

const RIDE_STATUS: Record<string, string> = {
  requested: "En attente",
  accepted: "Acceptée",
  arriving: "Chauffeur en route",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

// Pilot app: verify and validate drivers, follow rides.
export function AppSection() {
  const [drivers, setDrivers] = React.useState<StaffDriver[]>([]);
  const [rides, setRides] = React.useState<Ride[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [open, setOpen] = React.useState<StaffDriver | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    // The drivers list also takes drivers with an expired document offline first.
    try {
      const [d, r] = await Promise.all([ops<{ drivers: StaffDriver[] }>("/ops/drivers"), ops<{ rides: Ride[] }>("/ops/rides")]);
      setError("");
      setDrivers(d.drivers);
      setOpen((cur) => (cur ? d.drivers.find((x) => x.user_id === cur.user_id) ?? null : null));
      setRides(r.rides);
    } catch {
      setError("Impossible de charger les données de l'application. Reconnectez-vous puis réessayez.");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const setApproved = async (driver: StaffDriver, approved: boolean) => {
    if (!window.confirm(`Retirer la validation de ${driver.first_name} ? Ce chauffeur ne pourra plus passer en ligne.`)) return;
    setBusy(driver.user_id);
    try {
      await ops(`/ops/drivers/${driver.user_id}/approval`, { method: "POST", body: { approved } });
    } catch {
      setError("La modification n'a pas été enregistrée.");
    }
    setBusy(null);
    load();
  };

  const pending = drivers.filter((d) => !d.approved).length;

  return (
    <section className="glass-card mt-6 rounded-[1.75rem] p-5 sm:p-7" aria-labelledby="app-title">
      <div className="flex items-end justify-between gap-4 border-b pb-3">
        <h2 id="app-title" className="text-lg font-bold">
          Application pilote{" "}
          {pending > 0 && <span className="ml-1 rounded-full bg-signal/20 px-2 py-0.5 text-xs font-semibold">{pending} chauffeur(s) à valider</span>}
        </h2>
        <Button variant="outline" size="sm" onClick={load} aria-label="Actualiser l'application">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-2xl border-l-4 border-warning bg-warning/10 p-3 text-sm">{error}</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Chauffeurs inscrits dans l'app</h3>
          <p className="mt-1 text-xs text-muted-foreground">Ouvrez « Vérifier » pour cocher chaque document. La validation n'est possible qu'une fois tout vérifié et en cours de validité.</p>
          <ul className="mt-3 divide-y border-y">
            {drivers.map((d) => (
              <li key={d.user_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                    {d.first_name}
                    {d.approved ? (
                      <span className="text-xs font-normal text-success">{d.online ? "● en ligne" : "validé"}</span>
                    ) : (
                      <span className="text-xs font-normal text-warning">{d.photo_path ? "à vérifier" : "photo manquante"}</span>
                    )}
                    <ExpiryBadge date={d.next_expiry} />
                  </p>
                  <p className="truncate text-muted-foreground">{d.email}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {d.vehicle} · {d.plate} · {d.category}
                  </p>
                </div>
                {busy === d.user_id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <Button variant={d.approved ? "outline" : "default"} size="sm" onClick={() => setOpen(d)}>
                      <ShieldCheck className="size-4" /> Vérifier
                    </Button>
                    {d.approved && (
                      <Button variant="outline" size="sm" onClick={() => setApproved(d, false)} aria-label={`Retirer la validation de ${d.first_name}`}>
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
            {!loading && !drivers.length && <li className="py-6 text-sm text-muted-foreground">Aucun chauffeur inscrit dans l'application.</li>}
          </ul>
        </div>
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Dernières courses</h3>
          <ul className="mt-3 divide-y border-y">
            {rides.map((r) => (
              <li key={r.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground tnum">{fmt(r.created_at)}</span>
                <span className="min-w-0 truncate">
                  {r.pickup_label} → {r.dropoff_label}
                </span>
                <span className="text-right">
                  <span className="block text-xs font-semibold">{RIDE_STATUS[r.status] ?? r.status}</span>
                  <span className="font-mono text-xs text-muted-foreground tnum">{Number(r.price_estimate).toFixed(2).replace(".", ",")} €</span>
                </span>
              </li>
            ))}
            {!loading && !rides.length && <li className="py-6 text-sm text-muted-foreground">Aucune course pour le moment.</li>}
          </ul>
        </div>
      </div>
      {open && <DriverVerification driver={open} onClose={() => setOpen(null)} onChanged={load} />}
    </section>
  );
}
