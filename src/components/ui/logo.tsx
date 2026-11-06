import { cn } from "@/lib/utils";

export function Logo({ className, href = "./" }: { className?: string; href?: string }) {
  return (
    <a href={href} className={cn("group flex items-baseline gap-2", className)} aria-label="MovaaGo, accueil">
      <span className="font-display text-[1.7rem] font-medium leading-none tracking-[0.03em]">MovaaGo</span>
    </a>
  );
}
