import { Header } from "@/components/ui/header-1";
import FooterSection from "@/components/ui/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container grid min-h-[60vh] place-items-center py-14 text-center">
        <div className="max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Erreur 404</p>
          <h1 className="mt-3 font-display text-5xl font-medium sm:text-6xl">Page introuvable</h1>
          <p className="mt-4 text-lg text-muted-foreground">Cette adresse ne mène nulle part. Le trajet continue depuis l'accueil.</p>
          <Button asChild size="lg" className="mt-8">
            <a href="/">Retour à l'accueil</a>
          </Button>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
