import { COMPANY, Field, LegalLayout, Todo, type Section } from "@/components/legal-layout";

const sections: Section[] = [
  {
    id: "editeur",
    title: "Éditeur",
    body: (
      <>
        <p>
          Le site et l'application MOVA sont édités par <strong><Field value={COMPANY.name} label="Prénom Nom (EI)" /></strong>, entrepreneur
          individuel exerçant sous le nom commercial MOVA (micro-entreprise).
        </p>
        <ul>
          <li>SIREN : <Field value={COMPANY.siren} label="numéro SIREN" /></li>
          <li>Adresse : <Field value={COMPANY.address} label="adresse professionnelle ou de domiciliation" /></li>
          <li>E-mail : <Field value={COMPANY.email} label="e-mail de contact" /></li>
          <li>Téléphone : <Field value={COMPANY.phone} label="téléphone" /></li>
          <li>TVA : non applicable, article 293 B du Code général des impôts.</li>
          <li>Directeur de la publication : <Field value={COMPANY.name} label="Prénom Nom" />.</li>
        </ul>
      </>
    ),
  },
  {
    id: "activite",
    title: "Activité",
    body: (
      <>
        <p>
          MOVA est une plateforme de réservation de voitures de transport avec chauffeur (VTC) qui met en relation des passagers avec
          des chauffeurs VTC professionnels et indépendants.
        </p>
        <p>
          Déclaration en tant que centrale de réservation (Code des transports, art. L3142-1 et suivants) :{" "}
          <Todo>numéro ou date de la déclaration</Todo>. Assurance de responsabilité civile professionnelle :{" "}
          <Todo>assureur et numéro de contrat</Todo>.
        </p>
        <p>
          Le service est en phase pilote à Besançon : certaines fonctions présentées sur le site (estimations, prototype d'app) sont des
          démonstrations.
        </p>
      </>
    ),
  },
  {
    id: "hebergement",
    title: "Hébergement",
    body: (
      <ul>
        <li>
          <strong>Site web, application et données (comptes, courses, liste d'attente, photos des chauffeurs)</strong> : Cloudflare, Inc.,
          101 Townsend Street, San Francisco, CA 94107, États-Unis (Cloudflare Workers, D1 et R2). La base de données est hébergée en
          Europe de l'Ouest.
        </li>
      </ul>
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    body: (
      <>
        <p>
          Les textes, l'interface, le logo et le nom MOVA sont protégés. Toute reproduction sans autorisation écrite est interdite.
          Dépôt de la marque MOVA : <Todo>numéro INPI une fois déposée</Todo>.
        </p>
        <p>
          Les photographies de lieux de Besançon proviennent de Wikimedia Commons ; leurs auteurs et licences sont cités sous chaque
          photo.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact et réclamations",
    body: (
      <>
        <p>
          Pour toute question ou réclamation : <Field value={COMPANY.email} label="e-mail de contact" />.
        </p>
        <p>
          Médiateur de la consommation : <Field value={COMPANY.mediator} label="nom et site du médiateur" />. Avant de le saisir, adressez
          d'abord une réclamation écrite à MOVA.
        </p>
        <p>
          Données personnelles : voir la <a href="/confidentialite.html">politique de confidentialité</a>. Conditions du service : voir
          les <a href="/cgu.html">conditions d'utilisation</a>.
        </p>
      </>
    ),
  },
];

export default function Legal() {
  return (
    <LegalLayout
      current="mentions-legales.html"
      title="Mentions légales"
      updated="2 novembre 2026"
      intro={<p>Qui édite MOVA, où le service est hébergé et comment nous joindre.</p>}
      sections={sections}
    />
  );
}
