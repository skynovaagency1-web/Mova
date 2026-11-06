import { Accordion } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/ui/section-heading";

const items = [
  {
    id: "real",
    title: "Puis-je réserver une vraie course aujourd'hui ?",
    content: <p>Pas encore. MovaaGo prépare un pilote à Besançon : le parcours de réservation du site est une démonstration. Inscrivez-vous à la liste d'attente pour être prévenu de l'ouverture.</p>,
  },
  {
    id: "zone",
    title: "Quelle zone sera couverte ?",
    content: <p>Le pilote démarrera sur une zone restreinte de Besançon (trajets urbains, gares, soirées…). La zone et les horaires seront fixés après des entretiens avec passagers et chauffeurs.</p>,
  },
  {
    id: "price",
    title: "Comment les prix seront-ils calculés ?",
    content: <p>Prix fixe ou estimation, commission et frais d'annulation sont en cours de définition et feront l'objet d'une validation juridique et économique. Les montants affichés ici sont fictifs.</p>,
  },
  {
    id: "payment",
    title: "Comment se fera le paiement ?",
    content: <p>Via un prestataire de paiement agréé, adapté aux places de marché (vérification des bénéficiaires, reversement aux chauffeurs, remboursements). MovaaGo n'encaissera pas les fonds en propre sans avis spécialisé.</p>,
  },
  {
    id: "data",
    title: "Que faites-vous de mes données ?",
    content: <p>Seuls les formulaires de liste d'attente et d'intérêt chauffeur enregistrent vos informations, uniquement pour vous recontacter au sujet du lancement. Vous pouvez demander leur suppression à tout moment. Le reste du site (estimation, vérification, prototype d'app) fonctionne dans votre navigateur sans rien envoyer.</p>,
  },
  {
    id: "driver",
    title: "Je suis chauffeur VTC, comment participer ?",
    content: <p>Laissez vos coordonnées dans la section Chauffeurs : nous vous recontacterons pour un premier échange. Les documents (carte VTC, assurance…) seront demandés plus tard via un espace sécurisé, jamais par e-mail.</p>,
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 py-20">
      <div className="container">
        <SectionHeading tag="05 · Questions" title="Questions fréquentes" />
        <div className="mt-10 max-w-3xl md:ml-[12rem]">
          <Accordion items={items} defaultOpen={["real"]} />
        </div>
      </div>
    </section>
  );
}
