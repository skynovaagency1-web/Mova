import { ArrowUpRight } from "lucide-react";

export function AppTeaser() {
  return (
    <section className="py-20">
      <div className="container">
        <a
          href="/app.html"
          className="group grid items-end gap-6 border-y border-foreground/80 py-10 transition-colors hover:bg-card md:grid-cols-[12rem_1fr_auto]"
        >
          <p className="font-mono text-xs text-muted-foreground">04 · Prototype</p>
          <div>
            <p className="font-wide text-3xl font-black leading-none tracking-tight sm:text-5xl">Essayez l'app</p>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Commandez une course fictive, puis passez côté chauffeur pour accepter la demande et faire avancer le trajet.
            </p>
          </div>
          <ArrowUpRight className="size-12 text-primary transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  );
}
