// Adapted from 21st.dev "Footer" by meschacirung (Tailark): plain anchors instead of next/link, MOVA content.
import { Mail, MapPin } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const links = [
  { title: "Comment ça marche", href: "/#fonctionnement" },
  { title: "Trajets", href: "/#trajets" },
  { title: "Sécurité", href: "/#securite" },
  { title: "Devenir chauffeur", href: "/#chauffeurs" },
  { title: "Liste d'attente", href: "/#liste-attente" },
  { title: "FAQ", href: "/#faq" },
  { title: "Prototype d'app", href: "/app.html" },
  { title: "Mentions légales", href: "/mentions-legales.html" },
  { title: "Conditions d'utilisation", href: "/cgu.html" },
  { title: "Confidentialité", href: "/confidentialite.html" },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-foreground/80 py-14">
      <div className="container">
        <Logo className="w-fit" />

        <div className="my-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {links.map((link) => (
            <a key={link.title} href={link.href} className="block font-medium duration-150 hover:text-primary">
              {link.title}
            </a>
          ))}
        </div>
        <div className="my-8 flex flex-wrap gap-6 font-mono text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4" /> Besançon, Doubs
          </span>
          <span className="inline-flex items-center gap-2">
            <Mail className="size-4" /> Contact à définir
          </span>
        </div>
        <p className="max-w-2xl text-xs text-muted-foreground">
          MOVA est un nom de travail, non vérifié juridiquement. Service en préparation : aucune course ni aucun paiement
          n'est encore proposé. Seules les inscriptions à la liste d'attente sont enregistrées.
        </p>
        <span className="mt-4 block font-mono text-xs text-muted-foreground">© {new Date().getFullYear()} MOVA (projet)</span>
      </div>
    </footer>
  );
}
