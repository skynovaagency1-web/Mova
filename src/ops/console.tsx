import * as React from "react";
import { AppSection } from "@/ops/app-section";
import { Download, Loader2, LogOut, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/consent";
import { cn } from "@/lib/utils";
import {
  DRIVER_STATUSES,
  PASSENGER_STATUSES,
  STATUS_LABELS,
  supabase,
  type SignupRow,
  type SignupStatus,
} from "@/ops/supabase";

type Tab = "driver" | "passenger";

const statusStyle: Record<SignupStatus, string> = {
  new: "bg-signal/15 text-foreground",
  contacted: "bg-secondary text-foreground",
  interview: "bg-primary/10 text-primary",
  committed: "bg-primary text-primary-foreground",
  declined: "bg-transparent text-muted-foreground line-through",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export function Console({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [rows, setRows] = React.useState<SignupRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("driver");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<SignupStatus | "all">("all");
  const [openId, setOpenId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("mova_signups").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) return setError("Impossible de charger les inscriptions. Reconnectez-vous puis réessayez.");
    setError("");
    setRows((data ?? []) as SignupRow[]);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const drivers = rows.filter((r) => r.kind === "driver");
  const passengers = rows.filter((r) => r.kind === "passenger");
  const weekAgo = Date.now() - 7 * 864e5;
  const stats = [
    { label: "Passagers inscrits", value: passengers.length },
    { label: "Chauffeurs intéressés", value: drivers.length },
    { label: "Avec carte VTC", value: drivers.filter((d) => d.has_vtc_card).length },
    { label: "Chauffeurs engagés", value: drivers.filter((d) => d.status === "committed").length, goal: 5 },
    { label: "Nouveaux (7 jours)", value: rows.filter((r) => Date.parse(r.created_at) > weekAgo).length },
  ];

  const statuses = tab === "driver" ? DRIVER_STATUSES : PASSENGER_STATUSES;
  const q = query.trim().toLowerCase();
  const list = (tab === "driver" ? drivers : passengers).filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (!q || [r.first_name, r.email, r.phone, r.commune, r.details, r.notes].some((v) => v?.toLowerCase().includes(q))),
  );
  const open = rows.find((r) => r.id === openId) ?? null;

  const topValues = (key: "commune" | "details", from: SignupRow[]) => {
    const counts = new Map<string, number>();
    for (const r of from) {
      const v = r[key]?.trim();
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const exportCsv = () => {
    const cols: (keyof SignupRow)[] = ["created_at", "kind", "status", "first_name", "email", "phone", "commune", "details", "has_vtc_card", "notes"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...list.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mova-${tab === "driver" ? "chauffeurs" : "passagers"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaved = (updated: SignupRow) => setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));

  return (
    <div className="min-h-screen">
      <div className="ops-backdrop" aria-hidden />
      <header className="sticky top-0 z-40 border-b border-white/60 bg-[#f4efea]/60 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <p className="font-display text-2xl font-medium tracking-[0.14em]">
            MovaaGo <span className="text-sm tracking-[0.3em] text-muted-foreground">OPS</span>
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{email}</span>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="size-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {error && (
          <p role="alert" className="glass-card mb-6 rounded-2xl border-l-4 !border-l-warning p-3 text-sm">
            {error}
          </p>
        )}

        <section aria-label="Vue d'ensemble" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-[1.5rem] p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-4xl font-medium tnum">
                {loading ? "–" : s.value}
                {s.goal && <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">/ objectif {s.goal}</span>}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <TopList title="Communes les plus citées" items={topValues("commune", rows)} />
          <TopList title="Trajets demandés (passagers)" items={topValues("details", passengers)} />
        </section>

        <section className="glass-card mt-6 rounded-[1.75rem] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b">
            <div role="tablist" className="flex gap-6">
              {(["driver", "passenger"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => {
                    setTab(t);
                    setStatus("all");
                  }}
                  className={cn(
                    "-mb-px border-b-2 pb-3 text-lg font-bold transition-colors",
                    tab === t ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "driver" ? "Chauffeurs" : "Passagers"}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">{t === "driver" ? drivers.length : passengers.length}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-3">
              <label className="relative">
                <span className="sr-only">Rechercher</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input id="ops-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, e-mail, commune…" className={cn(inputClass, "w-56 py-2 pl-9")} />
              </label>
              <label>
                <span className="sr-only">Filtrer par statut</span>
                <select id="ops-status" value={status} onChange={(e) => setStatus(e.target.value as SignupStatus | "all")} className={cn(inputClass, "w-auto py-2")}>
                  <option value="all">Tous les statuts</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              <Button variant="outline" size="sm" onClick={load} aria-label="Actualiser">
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!list.length}>
                <Download className="size-4" /> CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pr-4 font-normal">Inscrit le</th>
                  <th className="py-3 pr-4 font-normal">Nom</th>
                  <th className="py-3 pr-4 font-normal">Contact</th>
                  <th className="py-3 pr-4 font-normal">Commune</th>
                  <th className="py-3 pr-4 font-normal">{tab === "driver" ? "Disponibilités" : "Trajet"}</th>
                  {tab === "driver" && <th className="py-3 pr-4 font-normal">Carte VTC</th>}
                  <th className="py-3 font-normal">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer align-top hover:bg-white/50">
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground tnum">{fmtDate(r.created_at)}</td>
                    <td className="py-3 pr-4 font-semibold">
                      <button className="text-left hover:underline" onClick={() => setOpenId(r.id)}>
                        {r.first_name || "—"}
                      </button>
                      {r.notes && <span className="ml-2 font-mono text-[10px] font-normal text-muted-foreground">note</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="block">{r.email}</span>
                      {r.phone && <span className="block font-mono text-xs text-muted-foreground">{r.phone}</span>}
                    </td>
                    <td className="py-3 pr-4">{r.commune || "—"}</td>
                    <td className="py-3 pr-4">{r.details || "—"}</td>
                    {tab === "driver" && <td className="py-3 pr-4">{r.has_vtc_card ? "Oui" : "Non déclarée"}</td>}
                    <td className="py-3">
                      <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyle[r.status])}>{STATUS_LABELS[r.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !list.length && (
              <p className="py-12 text-center text-muted-foreground">
                {rows.length ? "Aucune inscription ne correspond à ces filtres." : "Pas encore d'inscription sur la liste d'attente."}
              </p>
            )}
            {loading && <Loader2 className="mx-auto my-12 size-6 animate-spin text-muted-foreground" />}
          </div>
        </section>

        <AppSection />
      </main>

      {open && <DetailPanel row={open} onClose={() => setOpenId(null)} onSaved={onSaved} />}
    </div>
  );
}

function TopList({ title, items }: { title: string; items: [string, number][] }) {
  const max = Math.max(1, ...items.map((i) => i[1]));
  return (
    <div className="glass-card rounded-[1.5rem] p-5">
      <p className="text-xs text-muted-foreground">{title}</p>
      {items.length ? (
        <ul className="mt-3 grid gap-2">
          {items.map(([label, n]) => (
            <li key={label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
              <span className="relative min-w-0">
                <span className="absolute inset-y-0 left-0 rounded-sm bg-primary/10" style={{ width: `${(n / max) * 100}%` }} />
                <span className="relative block truncate px-2 py-0.5">{label}</span>
              </span>
              <span className="font-mono text-xs tnum">{n}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Pas encore de données.</p>
      )}
    </div>
  );
}

function DetailPanel({ row, onClose, onSaved }: { row: SignupRow; onClose: () => void; onSaved: (r: SignupRow) => void }) {
  const [status, setStatus] = React.useState<SignupStatus>(row.status);
  const [notes, setNotes] = React.useState(row.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const statuses = row.kind === "driver" ? DRIVER_STATUSES : PASSENGER_STATUSES;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase
      .from("mova_signups")
      .update({ status, notes: notes.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("*")
      .single();
    setBusy(false);
    if (error || !data) return setMessage({ ok: false, text: "Enregistrement impossible. Reconnectez-vous puis réessayez." });
    onSaved(data as SignupRow);
    setMessage({ ok: true, text: "Enregistré." });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#2c251d]/25 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche de ${row.first_name || row.email}`}
        className="glass-card h-full w-full max-w-md overflow-y-auto !bg-[#f8f4f0]/90 p-6 sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{row.kind === "driver" ? "Chauffeur" : "Passager"} · inscrit le {fmtDate(row.created_at)}</p>
            <h2 className="mt-1 text-2xl font-extrabold">{row.first_name || row.email}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
            <X className="size-5" />
          </Button>
        </div>

        <dl className="mt-6 divide-y border-y text-sm">
          {[
            ["E-mail", row.email],
            ["Téléphone", row.phone],
            ["Commune", row.commune],
            [row.kind === "driver" ? "Disponibilités" : "Trajet principal", row.details],
            ...(row.kind === "driver" ? [["Carte VTC", row.has_vtc_card ? "Déclarée (à vérifier)" : "Non déclarée"]] : []),
            ["Mis à jour", fmtDate(row.updated_at)],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Statut</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {statuses.map((s) => (
              <label
                key={s}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  status === s ? "border-foreground bg-foreground text-background" : "border-foreground/25 hover:border-foreground",
                )}
              >
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
                {STATUS_LABELS[s]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 grid gap-1.5 text-sm font-semibold">
          Notes internes
          <textarea
            id="ops-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={6}
            className={cn(inputClass, "font-normal")}
            placeholder="Appel du 12/11 : disponible le soir, véhicule Toyota Corolla hybride…"
          />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">Ne notez ni numéro de pièce d'identité, ni données de santé.</p>

        <div className="mt-6 flex items-center gap-3">
          <Button size="lg" onClick={save} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </Button>
          {message && (
            <p role="status" className={cn("text-sm font-medium", message.ok ? "text-success" : "text-warning")}>
              {message.text}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
