export const inputClass =
  "w-full rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 shadow-[inset_0_1px_2px_rgba(90,70,50,0.08)] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

export function ConsentCheckbox({ id }: { id: string }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm text-muted-foreground">
      <input id={id} name="consent" type="checkbox" required className="mt-1 size-4 shrink-0 accent-[hsl(var(--primary))]" />
      <span>
        J'accepte que MOVA conserve ces informations pour me contacter au sujet du lancement à Besançon. Je peux demander
        leur suppression à tout moment.{" "}
        <a href="/confidentialite.html" className="underline underline-offset-2 hover:text-foreground">
          Confidentialité
        </a>
      </span>
    </label>
  );
}
