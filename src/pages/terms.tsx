import { COMPANY, Field, LegalLayout, Todo, type Section } from "@/components/legal-layout";

const sections: Section[] = [
  {
    id: "objet",
    title: "Objet",
    body: (
      <>
        <p>
          Ces conditions encadrent l'utilisation du site et de l'application MOVA, édités par <Field value={COMPANY.name} label="Prénom Nom (EI)" />{" "}
          (« MOVA »). MOVA est une centrale de réservation de VTC : elle met en relation des passagers avec des chauffeurs VTC professionnels
          et indépendants, qui réalisent les courses.
        </p>
        <p>Créer un compte ou réserver une course vaut acceptation de ces conditions.</p>
      </>
    ),
  },
  {
    id: "pilote",
    title: "Phase pilote",
    body: (
      <p>
        MOVA est en phase pilote à Besançon et ses environs. Le service peut être limité à certaines zones et horaires, évoluer, ou être
        interrompu. Les fonctions présentées comme des démonstrations sur le site ne permettent pas de réserver.
      </p>
    ),
  },
  {
    id: "compte",
    title: "Compte",
    body: (
      <ul>
        <li>Vous devez avoir 18 ans ou plus et fournir des informations exactes.</li>
        <li>Votre compte est personnel. Gardez votre mot de passe secret ; signalez-nous toute utilisation suspecte.</li>
        <li>Vous pouvez clôturer votre compte à tout moment en écrivant à <Field value={COMPANY.email} label="e-mail de contact" />.</li>
        <li>MOVA peut suspendre un compte en cas de fraude, de comportement dangereux ou de manquement à ces conditions.</li>
      </ul>
    ),
  },
  {
    id: "reservation",
    title: "Réservation et prix",
    body: (
      <>
        <p>
          Vous indiquez un départ, une arrivée et une catégorie de véhicule. Le prix est affiché avant de confirmer. La course est réservée dès
          qu'un chauffeur l'accepte ; vous voyez alors son prénom, sa photo, son véhicule et sa plaque.
        </p>
        <p>
          Les VTC fonctionnent uniquement sur réservation préalable : un chauffeur MOVA ne peut pas être hélé dans la rue.
        </p>
        <p>
          Paiement : <Todo>modalités pendant le pilote (paiement en ligne à venir)</Todo>. Une facture est disponible sur demande.
        </p>
      </>
    ),
  },
  {
    id: "annulation",
    title: "Annulation",
    body: (
      <ul>
        <li>Pendant le pilote, vous pouvez annuler sans frais tant que le passager n'est pas à bord.</li>
        <li>Si le chauffeur annule, vous êtes prévenu dans l'app et pouvez commander une autre course.</li>
        <li>
          Frais d'annulation tardive ou d'attente : <Todo>à définir avant le lancement payant</Todo>. Ils seront toujours affichés avant la réservation.
        </li>
      </ul>
    ),
  },
  {
    id: "passagers",
    title: "Engagements du passager",
    body: (
      <ul>
        <li>Être présent au point de départ à l'heure, vérifier la photo et la plaque avant de monter.</li>
        <li>Respecter le chauffeur et le véhicule ; attacher sa ceinture.</li>
        <li>Prévoir un siège adapté pour un enfant qui en a besoin, sauf accord préalable.</li>
        <li>Toute dégradation ou salissure importante peut être facturée après constat.</li>
      </ul>
    ),
  },
  {
    id: "chauffeurs",
    title: "Chauffeurs",
    body: (
      <>
        <p>Les chauffeurs sont des professionnels indépendants. Avant d'être validé, chaque chauffeur doit justifier en personne :</p>
        <ul>
          <li>d'une pièce d'identité et d'une photo récente, montrée aux passagers ;</li>
          <li>d'une carte professionnelle VTC valide et d'une inscription au registre des exploitants VTC ;</li>
          <li>d'un permis de conduire valide ;</li>
          <li>d'une assurance couvrant le transport de personnes à titre onéreux et d'une responsabilité civile professionnelle ;</li>
          <li>d'un véhicule conforme dont la carte grise correspond à la plaque déclarée.</li>
        </ul>
        <p>
          Un document expiré ou un changement de véhicule suspend automatiquement le chauffeur jusqu'à une nouvelle vérification. Pendant une
          course, le chauffeur partage sa position avec le passager. Le chauffeur reste libre d'accepter ou non une course.
        </p>
      </>
    ),
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    body: (
      <>
        <p>
          Conformément au Code des transports, MOVA répond envers le passager de la bonne exécution de la course réservée par son
          intermédiaire, sans préjudice de son recours contre le chauffeur. <Todo>formulation à faire valider par un avocat</Todo>
        </p>
        <p>
          MOVA ne saurait être tenue responsable d'un retard ou d'une impossibilité dus à un cas de force majeure, aux conditions de circulation
          ou à une information inexacte fournie par l'utilisateur. Le service peut être momentanément indisponible pour maintenance.
        </p>
      </>
    ),
  },
  {
    id: "securite",
    title: "Sécurité et signalement",
    body: (
      <p>
        En cas d'urgence, appelez le 112. Pour signaler un incident, un comportement inapproprié ou un objet oublié, écrivez à{" "}
        <Field value={COMPANY.email} label="e-mail de contact" /> en indiquant le numéro de course affiché dans l'app.
      </p>
    ),
  },
  {
    id: "donnees",
    title: "Données personnelles",
    body: (
      <p>
        Le traitement de vos données est décrit dans la <a href="/confidentialite.html">politique de confidentialité</a>.
      </p>
    ),
  },
  {
    id: "modifications",
    title: "Modifications",
    body: <p>MOVA peut modifier ces conditions. Les changements importants sont annoncés dans l'app avant leur entrée en vigueur.</p>,
  },
  {
    id: "litiges",
    title: "Droit applicable et litiges",
    body: (
      <p>
        Ces conditions sont soumises au droit français. En cas de désaccord, contactez d'abord MOVA par écrit. À défaut de solution, vous pouvez
        saisir gratuitement le médiateur de la consommation : <Field value={COMPANY.mediator} label="nom et site du médiateur" />. Les tribunaux
        français sont compétents.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalLayout
      current="cgu.html"
      title="Conditions d'utilisation"
      updated="2 novembre 2026"
      intro={<p>Les règles du service MOVA pour les passagers et les chauffeurs.</p>}
      sections={sections}
    />
  );
}
