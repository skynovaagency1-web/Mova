import { ArrowRight, Clock3, GraduationCap, Luggage, Moon, Stethoscope, TrainFront } from "lucide-react";
import { Header } from "@/components/ui/header-1";
import { RideBookingForm } from "@/components/ui/ride-booking-form";
import Features from "@/components/ui/features-01";
import FooterSection from "@/components/ui/footer";
import { DepartureBoard } from "@/components/sections/departure-board";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Security } from "@/components/sections/security";
import { Drivers } from "@/components/sections/drivers";
import { AppTeaser } from "@/components/sections/app-teaser";
import { Faq } from "@/components/sections/faq";
import { Waitlist } from "@/components/sections/waitlist";
import globe from "@/assets/globe.jpg";
import touch from "@/assets/touch.jpg";
import { PLACES } from "@/lib/demo-data";
import { PHOTO_CREDITS, PLACE_PHOTOS } from "@/lib/place-photos";

const useCases = [
  { icon: TrainFront, title: "Gares Viotte et Besançon TGV", description: "Rejoindre Auxon ou Viotte sans chercher de place ni rater le train.", footnote: "Centre → TGV · ≈ 12 km" },
  { icon: Moon, title: "Soirées", description: "Rentrer de Battant ou du centre quand les bus se font rares.", footnote: "Horaires à définir" },
  { icon: Stethoscope, title: "CHU Minjoz", description: "Rendez-vous médicaux et visites, avec un trajet planifié à l'avance.", footnote: "Accessibilité à préciser" },
  { icon: GraduationCap, title: "La Bouloie, Témis, Micropolis", description: "Des trajets courts et réguliers entre campus, zones d'activité et salons.", footnote: "Demande à mesurer" },
  { icon: Luggage, title: "Bagages et groupes", description: "Un van jusqu'à 7 places pour les familles et les valises.", footnote: "Catégorie à confirmer" },
  { icon: Clock3, title: "Immédiat ou planifié", description: "Réserver maintenant ou la veille, avec un prix affiché avant de confirmer.", footnote: "Mode à trancher" },
];

export default function Landing() {
  return (
    <>
      <Header />
      <main>
        <section className="container pt-4">
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#cdbba8]">
            <img src={globe} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_50%] opacity-95" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#2c251d]/25 via-transparent to-[#2c251d]/35" />
            <div className="flex min-h-[560px] flex-col items-center justify-between px-6 pb-8 pt-24 text-center sm:min-h-[640px] lg:min-h-[720px]">
              <div>
                <h1 className="font-display text-[17vw] font-medium leading-[0.85] tracking-[0.01em] text-[#f6f1ec] drop-shadow-[0_2px_24px_rgba(44,37,29,0.25)] sm:text-[8rem] lg:text-[11rem]">
                  MovaaGo
                </h1>
                <a href="#liste-attente" className="group mt-8 inline-flex items-center gap-1 rounded-full bg-[#3a3528]/90 py-1.5 pl-5 pr-1.5 text-sm text-[#f6f1ec] backdrop-blur transition hover:bg-[#3a3528]">
                  Rejoindre la liste d'attente
                  <span className="ml-2 grid size-8 place-items-center rounded-full bg-[#f6f1ec]/15 transition group-hover:translate-x-0.5">
                    <ArrowRight className="size-4" />
                  </span>
                </a>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#f6f1ec]/85">47°14′N · 6°01′E — VTC local, en préparation</p>
            </div>
          </div>
        </section>

        <section className="container grid gap-8 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <h2 className="font-display text-4xl uppercase leading-[1.05] tracking-[0.14em] sm:text-5xl">
            Votre trajet,
            <br />à l'heure.
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground lg:justify-self-end">
            MovaaGo met en relation les Bisontins avec des chauffeurs VTC indépendants de la ville. Prix connu avant de partir,
            chauffeurs vérifiés, support local.
          </p>
        </section>

        <PhotoStrip />

        <Places />

        <section className="pb-20 pt-16">
          <div className="container grid items-start gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Estimer un trajet</p>
              <RideBookingForm className="mt-6" />
            </div>
            <div className="lg:pt-10">
              <DepartureBoard />
            </div>
          </div>
        </section>
        <Waitlist />
        <HowItWorks />
        <Features
          id="trajets"
          tag="02 · Trajets"
          title="Les trajets que nous voulons tester"
          subtitle="Nous ne présumons pas la demande : ces usages seront mesurés pendant le pilote."
          features={useCases}
        />
        <Security />
        <Drivers />
        <AppTeaser />
        <Faq />
      </main>
      <FooterSection />
    </>
  );
}

// Row of soft, slightly turned photo cards, after the moodboard the founder chose.
function PhotoStrip() {
  const cards = [
    { kind: "img" as const, src: touch, pos: "50% 30%", rot: "-rotate-[5deg]", h: "h-64 sm:h-80" },
    { kind: "text" as const, title: "Prix connu", text: "Affiché avant de confirmer, sans surprise à l'arrivée.", tone: "bg-[#2c251d] text-[#f4efea]", rot: "rotate-[2deg]", h: "h-56 sm:h-72" },
    { kind: "img" as const, src: globe, pos: "62% 45%", rot: "-rotate-[1deg]", h: "h-72 sm:h-96" },
    { kind: "text" as const, title: "Chauffeurs vérifiés", text: "Carte VTC, assurance et véhicule contrôlés par l'équipe.", tone: "glass-sand text-foreground", rot: "rotate-[4deg]", h: "h-56 sm:h-72" },
    { kind: "img" as const, src: touch, pos: "50% 75%", rot: "-rotate-[3deg]", h: "h-64 sm:h-80" },
  ];
  return (
    <section aria-label="L'esprit MovaaGo" className="snap-x overflow-x-auto py-10 [scrollbar-width:none]">
      <div className="mx-auto flex w-max items-center gap-5 px-6 sm:gap-7">
        {cards.map((c, i) => (
          <div key={i} className={`snap-center ${c.rot} ${c.h} w-44 shrink-0 overflow-hidden rounded-[1.75rem] shadow-[0_24px_50px_-20px_rgba(90,70,50,0.45)] sm:w-60`}>
            {c.kind === "img" ? (
              <img src={c.src} alt="" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: c.pos }} />
            ) : (
              <div className={`${c.tone} flex h-full flex-col justify-end gap-2 p-6`}>
                <p className="font-display text-3xl leading-none">{c.title}</p>
                <p className="text-sm opacity-75">{c.text}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// The pilot places as photo cards; a click picks the place as destination in the estimate form.
function Places() {
  const pick = (id: string) => {
    window.dispatchEvent(new CustomEvent("mova:destination", { detail: id }));
    document.getElementById("devis")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return (
    <section id="lieux" aria-labelledby="lieux-title" className="container pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="lieux-title" className="font-display text-4xl sm:text-5xl">Où allez-vous ?</h2>
        <p className="max-w-sm text-sm text-muted-foreground">Les lieux du pilote à Besançon. Touchez une photo pour estimer le trajet.</p>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-y-10">
        {PLACES.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => pick(p.id)}
              className={`group relative block aspect-[4/5] w-full overflow-hidden rounded-[1.5rem] bg-[#d8c9b9] text-left shadow-[0_18px_40px_-22px_rgba(90,70,50,0.55)] ring-2 ring-white/60 transition hover:-translate-y-1 hover:ring-white ${i % 2 ? "lg:translate-y-6" : ""}`}
            >
              <img src={PLACE_PHOTOS[p.id]?.uri} alt={p.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#2c251d]/75" />
              <span className="absolute inset-x-4 bottom-4 font-display text-2xl leading-none text-white">{p.short}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-[11px] text-muted-foreground lg:mt-12">{PHOTO_CREDITS}</p>
    </section>
  );
}
