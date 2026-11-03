import * as React from "react";
import { Header } from "@/components/ui/header-1";
import FooterSection from "@/components/ui/footer";
import { cn } from "@/lib/utils";

// Details the owner still has to provide. Shown highlighted so nothing goes live half-filled by accident.
export const Todo = ({ children }: { children: React.ReactNode }) => (
  <mark className="rounded-md bg-[#d9c3a8]/60 px-1.5 py-0.5 font-medium text-foreground">{children}</mark>
);

// Company details in one place: fill these once and every legal page updates.
export const COMPANY = {
  name: null as string | null, // "Prénom Nom (EI)" as on the SIRENE register, with the trade name MOVA
  siren: null as string | null,
  address: null as string | null,
  email: null as string | null,
  phone: null as string | null,
  mediator: null as string | null, // consumer mediator: name + website
};

export const Field = ({ value, label }: { value: string | null; label: string }) => (value ? <>{value}</> : <Todo>{label}</Todo>);

export type Section = { id: string; title: string; body: React.ReactNode };

export const LEGAL_PAGES = [
  { href: "/mentions-legales.html", label: "Mentions légales" },
  { href: "/cgu.html", label: "Conditions d'utilisation" },
  { href: "/confidentialite.html", label: "Confidentialité" },
];

export function LegalLayout({ title, intro, updated, current, sections }: { title: string; intro: React.ReactNode; updated: string; current: string; sections: Section[] }) {
  return (
    <>
      <Header />
      <main className="container py-10 sm:py-14">
        <nav aria-label="Pages légales" className="flex flex-wrap gap-2">
          {LEGAL_PAGES.map((p) => (
            <a
              key={p.href}
              href={p.href}
              aria-current={p.href.endsWith(current) ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                p.href.endsWith(current) ? "bg-foreground text-background" : "glass hover:bg-white/80",
              )}
            >
              {p.label}
            </a>
          ))}
        </nav>

        <header className="mt-10 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mise à jour : {updated}</p>
          <h1 className="mt-3 font-display text-5xl font-medium leading-[1.02] sm:text-6xl">{title}</h1>
          <div className="mt-5 text-lg leading-relaxed text-muted-foreground">{intro}</div>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass-card rounded-[1.5rem] p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sommaire</p>
              <ol className="mt-3 space-y-1.5 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="flex gap-2 text-muted-foreground transition hover:text-foreground">
                      <span className="font-mono text-xs tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <article className="glass-card min-w-0 max-w-3xl rounded-[1.75rem] p-6 sm:p-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 border-b border-foreground/10 py-7 first:pt-0 last:border-0 last:pb-0">
                <h2 className="flex items-baseline gap-3 font-display text-2xl font-medium sm:text-3xl">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </h2>
                <div className="legal-body mt-3 space-y-3 leading-relaxed text-muted-foreground [&_li]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
                  {s.body}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
