import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Car, CheckCircle2, MapPin, Navigation, Phone, Power, Star, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/ui/header-1";
import { Logo } from "@/components/ui/logo";
import { CATEGORIES, PLACES, estimateRide, formatEuro, type Category } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Mode = "rider" | "driver";

export default function PrototypeApp() {
  const [mode, setMode] = React.useState<Mode>("rider");

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <header className="container flex h-16 items-center justify-between">
        <Logo />
        <a href="./" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour au site
        </a>
      </header>

      <main className="container grid items-start gap-10 pb-16 pt-4 lg:grid-cols-[1fr_380px]">
        <div className="max-w-xl lg:pt-10">
          <p className="font-mono text-xs text-muted-foreground">Prototype interactif · données fictives</p>
          <h1 className="font-wide mt-4 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">L'app MovaaGo, côté passager et côté chauffeur</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Tout est simulé dans votre navigateur : pas de GPS, pas de dispatch, pas de paiement. Le chauffeur, la carte et
            les montants sont fictifs.
          </p>
          <div role="tablist" aria-label="Rôle" className="mt-8 inline-grid grid-cols-2 rounded-xl border bg-card p-1">
            {(["rider", "driver"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "rider" ? <User className="size-4" /> : <Car className="size-4" />}
                {m === "rider" ? "Passager" : "Chauffeur"}
              </button>
            ))}
          </div>
          <ul className="mt-8 grid gap-2 text-sm text-muted-foreground">
            <li>• Passager : choisissez une destination, une catégorie, puis suivez la course.</li>
            <li>• Chauffeur : passez en ligne, acceptez ou refusez la demande, puis faites avancer le trajet.</li>
          </ul>
        </div>

        <PhoneFrame>{mode === "rider" ? <RiderFlow key="rider" /> : <DriverFlow key="driver" />}</PhoneFrame>
      </main>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="relative h-[720px] max-h-[calc(100vh-7rem)] min-h-[600px] overflow-hidden rounded-[2.75rem] border-[10px] border-black bg-background shadow-2xl">
        <div className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

/* ---------- Shared map ---------- */

function MiniMap({ progress, showCar }: { progress: number; showCar: boolean }) {
  // Car follows the route path; progress in [0,1].
  const pathRef = React.useRef<SVGPathElement>(null);
  const [pos, setPos] = React.useState({ x: 80, y: 120, angle: 140 });
  React.useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const total = p.getTotalLength();
    const at = total * Math.min(1, Math.max(0, progress));
    const a = p.getPointAtLength(Math.max(0, at - 1));
    const b = p.getPointAtLength(Math.min(total, at + 1));
    const pt = p.getPointAtLength(at);
    // The car is drawn nose-up, so add 90° to the path's heading.
    setPos({ x: pt.x, y: pt.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90 });
  }, [progress]);

  return (
    <svg viewBox="0 0 360 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="pgrid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="360" height="420" fill="hsl(var(--card))" />
      <rect width="360" height="420" fill="url(#pgrid)" opacity="0.6" />
      <path d="M-20 260 C 70 210, 110 100, 200 120 S 330 260, 240 310 S 110 330, 150 450" fill="none" stroke="hsl(210 70% 45% / 0.45)" strokeWidth="20" strokeLinecap="round" />
      <path d="M20 60 L 130 170 L 280 150 L 380 230" fill="none" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth="6" />
      <path ref={pathRef} d="M80 120 C 140 170, 160 200, 190 225 S 260 290, 280 330" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 8" />
      <circle cx="80" cy="120" r="9" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="5" />
      <rect x="271" y="321" width="18" height="18" rx="4" fill="hsl(var(--primary))" />
      {showCar && (
        <g style={{ transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.angle}deg)`, transition: "transform 0.3s linear" }}>
          <CarMarker />
        </g>
      )}
    </svg>
  );
}

/** Top-down car, nose pointing up, centred on (0,0). */
function CarMarker() {
  return (
    <g>
      <circle r="24" fill="hsl(var(--primary) / 0.18)" />
      <ellipse cx="1.5" cy="2.5" rx="11" ry="19" fill="black" opacity="0.35" />
      {/* wheels */}
      <rect x="-12" y="-12" width="4" height="7" rx="1.5" fill="#0b0f19" />
      <rect x="8" y="-12" width="4" height="7" rx="1.5" fill="#0b0f19" />
      <rect x="-12" y="6" width="4" height="7" rx="1.5" fill="#0b0f19" />
      <rect x="8" y="6" width="4" height="7" rx="1.5" fill="#0b0f19" />
      {/* body */}
      <path d="M-9 -12 C -9 -18, -5 -19, 0 -19 C 5 -19, 9 -18, 9 -12 L 9 13 C 9 17, 6 18, 0 18 C -6 18, -9 17, -9 13 Z" fill="hsl(var(--primary))" stroke="hsl(45 100% 30%)" strokeWidth="0.8" />
      {/* windscreen, roof, rear window */}
      <path d="M-7 -8 Q 0 -11 7 -8 L 6 -3 L -6 -3 Z" fill="#1b2438" />
      <rect x="-6" y="-3" width="12" height="9" rx="1.5" fill="hsl(45 100% 40%)" />
      <path d="M-6 6 L 6 6 L 7 10 Q 0 12 -7 10 Z" fill="#1b2438" />
      {/* roof sign */}
      <rect x="-3.5" y="-0.5" width="7" height="3" rx="1" fill="#0b0f19" />
      {/* headlights and tail lights */}
      <rect x="-7.5" y="-18" width="4" height="2" rx="1" fill="#fff8d6" />
      <rect x="3.5" y="-18" width="4" height="2" rx="1" fill="#fff8d6" />
      <rect x="-7.5" y="15.5" width="3.5" height="1.6" rx="0.8" fill="#ff4d4d" />
      <rect x="4" y="15.5" width="3.5" height="1.6" rx="0.8" fill="#ff4d4d" />
    </g>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="absolute inset-x-0 bottom-0 z-20 max-h-[85%] overflow-y-auto rounded-t-3xl border-t bg-background p-5 pb-7"
    >
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
      {children}
    </motion.div>
  );
}

/** Advances a 0→1 progress value over `seconds` while `running`. */
function useProgress(running: boolean, seconds: number, onDone?: () => void) {
  const [progress, setProgress] = React.useState(0);
  const done = React.useRef(onDone);
  done.current = onDone;
  React.useEffect(() => {
    if (!running) return;
    setProgress(0);
    const start = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / (seconds * 1000));
      setProgress(p);
      if (p >= 1) {
        window.clearInterval(id);
        done.current?.();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running, seconds]);
  return progress;
}

const DRIVER = { name: "Karim B.", initials: "KB", car: "Peugeot 508 · grise", plate: "AB-123-CD", rating: 4.9 };

/* ---------- Rider ---------- */

type RiderStep = "plan" | "searching" | "enroute" | "arrived" | "ontrip" | "done";

function RiderFlow() {
  const [step, setStep] = React.useState<RiderStep>("plan");
  const [from, setFrom] = React.useState("viotte");
  const [to, setTo] = React.useState("campus");
  const [category, setCategory] = React.useState<Category["id"]>("standard");
  const estimate = estimateRide(from, to, category);

  React.useEffect(() => {
    if (step !== "searching") return;
    const t = window.setTimeout(() => setStep("enroute"), 2200);
    return () => window.clearTimeout(t);
  }, [step]);

  const approach = useProgress(step === "enroute", 6, () => setStep("arrived"));
  const trip = useProgress(step === "ontrip", 8, () => setStep("done"));
  const mapProgress = step === "ontrip" ? trip : step === "done" ? 1 : 0;
  const fromLabel = PLACES.find((p) => p.id === from)?.short;
  const toLabel = PLACES.find((p) => p.id === to)?.short;
  const reset = () => setStep("plan");

  return (
    <div className="relative h-full">
      <MiniMap progress={mapProgress} showCar={step === "ontrip" || step === "done" || step === "arrived" || step === "enroute"} />
      <div className="absolute inset-x-4 top-10 z-10 rounded-xl border bg-background/90 px-4 py-2.5 text-sm backdrop-blur">
        <span className="text-muted-foreground">Bonjour 👋</span> <span className="font-semibold">Passager démo</span>
      </div>

      <AnimatePresence mode="wait">
        {step === "plan" && (
          <Sheet key="plan">
            <h2 className="text-lg font-bold">Où allez-vous ?</h2>
            <div className="mt-3 grid gap-2">
              <PlaceSelect icon={<MapPin className="size-4 text-primary" />} label="Départ" value={from} onChange={setFrom} />
              <PlaceSelect icon={<Navigation className="size-4 text-primary" />} label="Destination" value={to} onChange={setTo} />
            </div>
            <div className="mt-3 grid gap-2">
              {CATEGORIES.map((c) => {
                const e = estimateRide(from, to, c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    aria-pressed={category === c.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                      category === c.id ? "border-primary bg-primary/10" : "hover:border-muted-foreground",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{c.label}</span>
                      <span className="block text-xs text-muted-foreground">{c.hint}</span>
                    </span>
                    <span className="text-sm font-bold">{e ? formatEuro(e.price) : "—"}</span>
                  </button>
                );
              })}
            </div>
            <Button size="lg" className="mt-4 w-full" disabled={!estimate} onClick={() => setStep("searching")}>
              {estimate ? `Commander · ${formatEuro(estimate.price)}` : "Choisissez deux lieux différents"}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Prix fictifs · aucune commande réelle</p>
          </Sheet>
        )}

        {step === "searching" && (
          <Sheet key="searching">
            <div className="flex flex-col items-center py-4 text-center">
              <span className="relative flex size-14 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                <Car className="relative size-7 text-primary" />
              </span>
              <p className="mt-4 font-bold">Recherche d'un chauffeur…</p>
              <p className="text-sm text-muted-foreground">Simulation de mise en relation</p>
              <Button variant="outline" className="mt-5" onClick={reset}>
                Annuler
              </Button>
            </div>
          </Sheet>
        )}

        {(step === "enroute" || step === "arrived") && (
          <Sheet key="enroute">
            <p className="text-sm font-semibold text-primary">
              {step === "enroute" ? `Arrivée dans ~${Math.max(1, Math.ceil((1 - approach) * 4))} min` : "Votre chauffeur est arrivé"}
            </p>
            <DriverCard />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={reset}>
                <X className="size-4" /> Annuler
              </Button>
              {step === "arrived" ? (
                <Button onClick={() => setStep("ontrip")}>Je suis à bord</Button>
              ) : (
                <Button variant="secondary" disabled>
                  <Phone className="size-4" /> Appeler
                </Button>
              )}
            </div>
          </Sheet>
        )}

        {step === "ontrip" && (
          <Sheet key="ontrip">
            <p className="text-sm font-semibold text-primary">En route vers {toLabel}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${trip * 100}%` }} />
            </div>
            <DriverCard />
          </Sheet>
        )}

        {step === "done" && estimate && (
          <Sheet key="done">
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <p className="mt-2 text-lg font-bold">Course terminée</p>
            </div>
            <dl className="mt-4 divide-y rounded-xl border text-sm">
              <Row k="Trajet" v={`${fromLabel} → ${toLabel}`} />
              <Row k="Distance" v={`~${estimate.km.toLocaleString("fr-FR")} km`} />
              <Row k="Total (fictif)" v={formatEuro(estimate.price)} bold />
            </dl>
            <div className="mt-4 flex justify-center gap-1" aria-label="Noter la course">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="size-6 fill-primary text-primary" />
              ))}
            </div>
            <Button size="lg" className="mt-4 w-full" onClick={reset}>
              Nouvelle course
            </Button>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaceSelect({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-2">
      {icon}
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm font-medium focus:outline-none [&>option]:bg-card">
        {PLACES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.short}
          </option>
        ))}
      </select>
    </label>
  );
}

function DriverCard() {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border p-3">
      <div className="grid size-11 place-items-center rounded-full bg-primary/15 font-bold text-primary">{DRIVER.initials}</div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">
          {DRIVER.name} <span className="font-normal text-muted-foreground">★ {DRIVER.rating}</span>
        </p>
        <p className="truncate text-muted-foreground">{DRIVER.car}</p>
      </div>
      <span className="rounded-md border bg-secondary px-2 py-1 font-mono text-xs font-bold">{DRIVER.plate}</span>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3 px-3.5 py-2.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("text-right", bold && "font-bold text-primary")}>{v}</dd>
    </div>
  );
}

/* ---------- Driver ---------- */

type DriverStep = "offline" | "waiting" | "request" | "topickup" | "atpickup" | "ontrip" | "done";

const REQUEST = { from: "centre", to: "tgv", category: "standard" as const, distanceToPickup: "1,2 km" };
const ACCEPT_SECONDS = 15;

function DriverFlow() {
  const [step, setStep] = React.useState<DriverStep>("offline");
  const [earnings, setEarnings] = React.useState(0);
  const [rides, setRides] = React.useState(0);
  const [declined, setDeclined] = React.useState(false);
  const ride = estimateRide(REQUEST.from, REQUEST.to, REQUEST.category)!;
  const fromLabel = PLACES.find((p) => p.id === REQUEST.from)?.short;
  const toLabel = PLACES.find((p) => p.id === REQUEST.to)?.short;

  React.useEffect(() => {
    if (step !== "waiting") return;
    const t = window.setTimeout(() => setStep("request"), 2500);
    return () => window.clearTimeout(t);
  }, [step]);

  const countdown = useProgress(step === "request", ACCEPT_SECONDS, () => {
    setDeclined(true);
    setStep("waiting");
  });
  const approach = useProgress(step === "topickup", 5, () => setStep("atpickup"));
  const trip = useProgress(step === "ontrip", 7);
  const online = step !== "offline";

  const finish = () => {
    setEarnings((e) => e + ride.price);
    setRides((r) => r + 1);
    setStep("done");
  };

  return (
    <div className="relative h-full">
      <MiniMap progress={step === "ontrip" ? trip : 0} showCar={step === "ontrip" || step === "atpickup" || step === "topickup"} />
      <div className="absolute inset-x-4 top-10 z-10 flex items-center justify-between rounded-xl border bg-background/90 px-4 py-2.5 text-sm backdrop-blur">
        <span>
          <span className="text-muted-foreground">Aujourd'hui · </span>
          <span className="font-bold">{formatEuro(earnings)}</span>
          <span className="text-muted-foreground"> · {rides} course{rides > 1 ? "s" : ""}</span>
        </span>
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold", online ? "text-success" : "text-muted-foreground")}>
          <span className={cn("size-2 rounded-full", online ? "bg-success" : "bg-muted-foreground")} />
          {online ? "En ligne" : "Hors ligne"}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {step === "offline" && (
          <Sheet key="offline">
            <p className="text-center text-sm text-muted-foreground">Vous êtes hors ligne</p>
            <Button size="lg" className="mt-4 w-full" onClick={() => setStep("waiting")}>
              <Power className="size-4" /> Passer en ligne
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Dans la vraie app, la position ne serait partagée que pendant l'activité.
            </p>
          </Sheet>
        )}

        {step === "waiting" && (
          <Sheet key="waiting">
            <div className="flex flex-col items-center py-2 text-center">
              <span className="relative flex size-12 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-success/30" />
                <span className="relative size-4 rounded-full bg-success" />
              </span>
              <p className="mt-3 font-bold">En attente de demandes…</p>
              {declined && <p className="text-sm text-muted-foreground">Demande précédente refusée ou expirée.</p>}
              <Button variant="outline" className="mt-4" onClick={() => setStep("offline")}>
                Passer hors ligne
              </Button>
            </div>
          </Sheet>
        )}

        {step === "request" && (
          <Sheet key="request">
            <div className="flex items-center justify-between">
              <p className="font-bold">Nouvelle demande</p>
              <span className="text-sm font-semibold text-primary">{Math.ceil((1 - countdown) * ACCEPT_SECONDS)} s</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${(1 - countdown) * 100}%` }} />
            </div>
            <dl className="mt-4 divide-y rounded-xl border text-sm">
              <Row k="Prise en charge" v={`${fromLabel} · à ${REQUEST.distanceToPickup}`} />
              <Row k="Destination" v={toLabel ?? ""} />
              <Row k="Distance" v={`~${ride.km.toLocaleString("fr-FR")} km · ~${ride.minutes} min`} />
              <Row k="Montant (fictif)" v={formatEuro(ride.price)} bold />
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setDeclined(true);
                  setStep("waiting");
                }}
              >
                Refuser
              </Button>
              <Button size="lg" onClick={() => setStep("topickup")}>
                Accepter
              </Button>
            </div>
          </Sheet>
        )}

        {(step === "topickup" || step === "atpickup") && (
          <Sheet key="pickup">
            <p className="text-sm font-semibold text-primary">
              {step === "topickup" ? `Vers ${fromLabel} · ~${Math.max(1, Math.ceil((1 - approach) * 3))} min` : `Arrivé à ${fromLabel}`}
            </p>
            <PassengerCard />
            <Button size="lg" className="mt-4 w-full" disabled={step !== "atpickup"} onClick={() => setStep("ontrip")}>
              {step === "atpickup" ? "Démarrer la course" : "Navigation (simulée)…"}
            </Button>
          </Sheet>
        )}

        {step === "ontrip" && (
          <Sheet key="ontrip">
            <p className="text-sm font-semibold text-primary">Course en cours vers {toLabel}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${trip * 100}%` }} />
            </div>
            <PassengerCard />
            <Button size="lg" className="mt-4 w-full" disabled={trip < 1} onClick={finish}>
              {trip < 1 ? "En route…" : "Terminer la course"}
            </Button>
          </Sheet>
        )}

        {step === "done" && (
          <Sheet key="done">
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <p className="mt-2 text-lg font-bold">Course terminée</p>
              <p className="text-sm text-muted-foreground">+{formatEuro(ride.price)} (fictif, avant commission à définir)</p>
            </div>
            <Button size="lg" className="mt-5 w-full" onClick={() => setStep("waiting")}>
              Reprendre les demandes
            </Button>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function PassengerCard() {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border p-3">
      <div className="grid size-11 place-items-center rounded-full bg-secondary font-bold">CL</div>
      <div className="flex-1 text-sm">
        <p className="font-semibold">Camille L. (fictif)</p>
        <p className="text-muted-foreground">Téléphone vérifié · démo</p>
      </div>
    </div>
  );
}
