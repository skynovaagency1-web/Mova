// Adapted from 21st.dev "Ride Booking Form" by ravikatiyar162.
// Changes: French copy, Besançon places as selects, date/time inputs, vehicle category,
// fictitious estimate, MovaaGo styling. The hero copy now lives in the landing page.
import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, PLACES, estimateBetween, formatEuro, type Category, type Estimate, type Place } from "@/lib/demo-data";
import { AddressInput } from "@/components/ui/address-input";


export const RideBookingForm = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const today = new Date().toISOString().slice(0, 10);
    const byId = (id: string) => PLACES.find((p) => p.id === id)!;
    const [pickup, setPickup] = React.useState<Place>(byId("viotte"));
    const [dropoff, setDropoff] = React.useState<Place>(byId("tgv"));
    const [date, setDate] = React.useState(today);
    const [time, setTime] = React.useState("");
    const [category, setCategory] = React.useState<Category["id"]>("standard");
    const [estimate, setEstimate] = React.useState<Estimate | null>(null);
    const [error, setError] = React.useState("");

    // A click on a place photo elsewhere on the page picks it as the destination.
    React.useEffect(() => {
      const onPick = (e: Event) => {
        const id = (e as CustomEvent<string>).detail;
        setDropoff(byId(id));
        setPickup((p) => (p.id === id ? byId(id === "viotte" ? "centre" : "viotte") : p));
        setEstimate(null);
      };
      window.addEventListener("mova:destination", onPick);
      return () => window.removeEventListener("mova:destination", onPick);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const result = estimateBetween(pickup, dropoff, category, time || undefined);
      if (!result) {
        setEstimate(null);
        setError("Choisissez un départ et une destination différents (au moins 300 m).");
        return;
      }
      setError("");
      setEstimate(result);
    };

    const containerVariants = {
      hidden: { opacity: 1 },
      visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
    };
    const itemVariants = {
      hidden: { y: 12, opacity: 0.001 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 18 } },
    };

    return (
      <div className={cn("w-full", className)} ref={ref} {...props}>
        <motion.form
          id="devis"
          onSubmit={handleSubmit}
          className="scroll-mt-28 border-y border-foreground/80"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-describedby="devis-note"
        >
          <motion.div variants={itemVariants} className="grid sm:grid-cols-2">
            <div className="block border-b py-3 sm:border-r sm:pr-4">
              <label htmlFor="pickup" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Départ</label>
              <AddressInput id="pickup" label="Départ" value={pickup} onChange={(p) => { setPickup(p); setEstimate(null); }} />
            </div>
            <div className="block border-b py-3 sm:pl-4">
              <label htmlFor="dropoff" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Arrivée</label>
              <AddressInput id="dropoff" label="Arrivée" value={dropoff} onChange={(p) => { setDropoff(p); setEstimate(null); }} />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 border-b">
            <label className="flex items-center gap-2 border-r py-3 pr-4">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Date</span>
              <input id="ride-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent font-mono text-sm focus:outline-none" />
            </label>
            <label className="flex items-center gap-2 py-3 pl-4">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Heure (vide = maintenant)</span>
              <input id="ride-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-transparent font-mono text-sm focus:outline-none" />
            </label>
          </motion.div>

          <motion.fieldset variants={itemVariants} className="flex flex-wrap gap-2 py-4">
            <legend className="sr-only">Catégorie de véhicule</legend>
            {CATEGORIES.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  category === c.id ? "border-foreground bg-foreground text-background" : "border-foreground/25 hover:border-foreground",
                )}
              >
                <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="sr-only" />
                {c.label} <span className={cn("font-normal", category === c.id ? "text-background/70" : "text-muted-foreground")}>· {c.hint}</span>
              </label>
            ))}
          </motion.fieldset>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t py-4">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Estimer le trajet <ArrowRight className="size-4" />
            </button>
            <div aria-live="polite" className="min-w-0">
              {error && <p className="text-sm font-medium text-warning">{error}</p>}
              {estimate && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-wide text-3xl font-black tnum">≈ {formatEuro(estimate.price)}</span>
                  <span className="font-mono text-xs text-muted-foreground tnum">
                    {estimate.km.toLocaleString("fr-FR")} km · {estimate.minutes} min{estimate.night && " · soirée"} · fictif
                  </span>
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.form>
        <p id="devis-note" className="mt-3 text-xs text-muted-foreground">
          Estimation d'exemple, calculée à vol d'oiseau. Adresses : Base Adresse Nationale. Aucune réservation n'est créée ; le tarif réel reste à définir.
        </p>
      </div>
    );
  },
);
RideBookingForm.displayName = "RideBookingForm";
