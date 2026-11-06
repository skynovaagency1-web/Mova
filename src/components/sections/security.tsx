import * as React from "react";
import { BadgeCheck, FileCheck2, LifeBuoy, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

const DEMO_CODE = "123456";

const checks = [
  { icon: BadgeCheck, title: "Carte professionnelle VTC", text: "Validité contrôlée avant activation, puis à chaque échéance." },
  { icon: FileCheck2, title: "Véhicule et assurances", text: "Carte grise et assurances requises enregistrées avec leurs dates d'expiration." },
  { icon: ShieldCheck, title: "Inscription au registre", text: "Informations exploitant VTC vérifiées selon les textes applicables." },
  { icon: LifeBuoy, title: "Support humain", text: "Assistance, procédure d'incident et remboursements traités par une personne." },
];

export function Security() {
  const [digits, setDigits] = React.useState<string[]>(Array(6).fill(""));
  const [status, setStatus] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const update = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setStatus(null);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, i) => text[i] ?? ""));
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    setStatus(
      code === DEMO_CODE
        ? { ok: true, msg: "Numéro vérifié (simulation locale)." }
        : { ok: false, msg: "Code incorrect. En démo, le code est 123456." },
    );
  };

  return (
    <section id="securite" className="scroll-mt-24 py-20">
      <div className="container">
        <SectionHeading tag="03 · Sécurité" title="Des chauffeurs contrôlés, des passagers vérifiés">
          Ce que MovaaGo prévoit de vérifier avant le pilote. La liste exacte des pièces sera validée par un spécialiste.
        </SectionHeading>
      <div className="mt-10 grid items-start gap-10 md:ml-[12rem] lg:grid-cols-2">
        <div>
          <ul className="grid gap-6">
            {checks.map((c) => (
              <li key={c.title} className="flex gap-4">
                <c.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-muted-foreground">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={verify} className="rounded-md border border-foreground/15 bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Smartphone className="size-5 text-primary" /> Vérification du téléphone
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Maquette</span>
          </div>
          <div className="mt-4 rounded-lg border-l-4 border-warning bg-warning/10 p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">Aucun SMS n'est envoyé.</strong> Saisissez le code de démo{" "}
            <code className="font-bold text-foreground">123456</code> pour voir le parcours.
          </div>
          <label htmlFor="otp-0" className="mt-6 block text-sm font-medium text-muted-foreground">
            Code reçu par SMS
          </label>
          <div className="mt-2 flex gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Chiffre ${i + 1}`}
                className="h-14 w-full min-w-0 max-w-12 rounded-lg border bg-background text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ))}
          </div>
          <p aria-live="polite" className={cn("mt-3 min-h-6 text-sm font-semibold", status?.ok ? "text-success" : "text-warning")}>
            {status?.msg}
          </p>
          <Button type="submit" size="lg" className="mt-2 w-full">
            Vérifier
          </Button>
        </form>
      </div>
      </div>
    </section>
  );
}
