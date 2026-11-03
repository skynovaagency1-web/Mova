// Adapted from 21st.dev "Header 1" by efferd: sticky header with scroll blur and animated mobile menu.
import React from "react";
import { createPortal } from "react-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { Logo } from "@/components/ui/logo";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

const links = [
  { label: "Comment ça marche", href: "/#fonctionnement" },
  { label: "Trajets", href: "/#trajets" },
  { label: "Sécurité", href: "/#securite" },
  { label: "Chauffeurs", href: "/#chauffeurs" },
  { label: "FAQ", href: "/#faq" },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  const [menuTop, setMenuTop] = React.useState(0);
  const headerRef = React.useRef<HTMLElement>(null);
  const scrolled = useScroll(10);

  React.useLayoutEffect(() => {
    if (open && headerRef.current) setMenuTop(headerRef.current.getBoundingClientRect().bottom);
  }, [open]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className={cn("sticky top-0 z-50 w-full border-b border-transparent", {
        "border-border bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75": scrolled || open,
      })}
    >
      <DemoBanner />
      <nav className="container flex h-[4.5rem] items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a key={link.label} className={buttonVariants({ variant: "ghost", className: "font-medium" })} href={link.href}>
              {link.label}
            </a>
          ))}
          <a className={buttonVariants({ variant: "outline", className: "ml-2" })} href="/app.html">
            Voir l'app
          </a>
          <a className={buttonVariants()} href="/#liste-attente">
            Liste d'attente
          </a>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen(!open)}
          className="lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Ouvrir le menu"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>
      <MobileMenu open={open} top={menuTop} className="flex flex-col justify-between gap-2">
        <div className="grid gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: "ghost", className: "justify-start text-base" })}
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <a className={buttonVariants({ variant: "outline", className: "w-full" })} href="/app.html">
            Voir l'app (démo)
          </a>
          <a onClick={() => setOpen(false)} className={buttonVariants({ className: "w-full" })} href="/#liste-attente">
            Rejoindre la liste d'attente
          </a>
        </div>
      </MobileMenu>
    </header>
  );
}

export function DemoBanner() {
  return (
    <div className="bg-board px-4 py-2 text-center font-mono text-[11px] text-board-foreground/80">
      <span className="text-signal">●</span> Service en préparation<span className="hidden sm:inline"> · réservations et paiements pas encore ouverts</span> · réservation en démo
    </div>
  );
}

type MobileMenuProps = React.ComponentProps<"div"> & { open: boolean; top: number };

function MobileMenu({ open, top, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80",
        "fixed bottom-0 left-0 right-0 z-40 flex flex-col overflow-hidden border-y lg:hidden",
      )}
      style={{ top }}
    >
      <div
        data-slot={open ? "open" : "closed"}
        className={cn("size-full p-4 ease-out data-[slot=open]:animate-in data-[slot=open]:zoom-in-95", className)}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
