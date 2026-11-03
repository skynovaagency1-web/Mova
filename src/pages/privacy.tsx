import { COMPANY, Field, LegalLayout, Todo, type Section } from "@/components/legal-layout";

const Table = ({ rows }: { rows: [string, string, string][] }) => (
  <div className="overflow-x-auto">
    <table className="mt-2 w-full min-w-[34rem] text-left text-sm">
      <thead>
        <tr className="border-b border-foreground/15 font-mono text-[10px] uppercase tracking-wider">
          <th className="py-2 pr-4 font-medium">Données</th>
          <th className="py-2 pr-4 font-medium">Pourquoi</th>
          <th className="py-2 font-medium">Base légale</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b, c]) => (
          <tr key={a} className="border-b border-foreground/10 align-top last:border-0">
            <td className="py-2.5 pr-4 text-foreground">{a}</td>
            <td className="py-2.5 pr-4">{b}</td>
            <td className="py-2.5">{c}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const sections: Section[] = [
  {
    id: "responsable",
    title: "Responsable du traitement",
    body: (
      <p>
        <Field value={COMPANY.name} label="Prénom Nom (EI)" />, exerçant sous le nom MOVA, <Field value={COMPANY.address} label="adresse" />.
        Pour toute question sur vos données : <Field value={COMPANY.email} label="e-mail dédié aux données personnelles" />.
      </p>
    ),
  },
  {
    id: "site",
    title: "Sur le site web",
    body: (
      <>
        <Table
          rows={[
            ["Liste d'attente passagers : e-mail, et si vous les indiquez prénom, commune, trajet habituel", "Vous prévenir de l'ouverture et choisir la zone du pilote", "Consentement"],
            ["Formulaire chauffeurs : prénom, e-mail, et si vous les indiquez téléphone, commune, disponibilités, carte VTC déclarée", "Recruter les premiers chauffeurs", "Consentement"],
          ]}
        />
        <p>
          L'estimation de prix et le prototype d'app fonctionnent dans votre navigateur. La recherche d'adresse interroge le service public
          Géoplateforme (IGN) avec le texte saisi, sans donnée d'identité.
        </p>
      </>
    ),
  },
  {
    id: "app",
    title: "Dans l'application",
    body: (
      <>
        <Table
          rows={[
            ["Compte : e-mail, mot de passe (chiffré, jamais lisible), prénom, téléphone facultatif, rôle passager ou chauffeur", "Créer et sécuriser votre compte", "Exécution du contrat"],
            ["Courses : adresses et coordonnées de départ et d'arrivée, catégorie, prix estimé, horaires, statut", "Réserver, suivre et historiser vos courses ; traiter une réclamation", "Exécution du contrat"],
            ["Position du passager : uniquement quand vous touchez « Ma position »", "Remplir l'adresse de départ", "Exécution du contrat (à votre demande)"],
            ["Position du chauffeur : pendant une course acceptée seulement, environ toutes les 4 secondes", "Montrer au passager l'arrivée du chauffeur", "Exécution du contrat et sécurité"],
            ["Chauffeurs : véhicule, plaque, catégorie, photo du visage", "Permettre au passager de reconnaître son chauffeur", "Intérêt légitime (sécurité des passagers)"],
            ["Chauffeurs : résultat des vérifications (cases cochées, numéros de carte VTC et d'inscription au registre, dates d'expiration)", "Vérifier que chaque chauffeur peut légalement exercer", "Obligation légale"],
          ]}
        />
        <p>
          <strong>Aucun document</strong> (pièce d'identité, permis, carte VTC, attestation d'assurance) n'est téléversé ni conservé : l'équipe
          MOVA les consulte en personne ou via les services officiels et n'enregistre que le résultat.
        </p>
      </>
    ),
  },
  {
    id: "partage",
    title: "Qui voit quoi",
    body: (
      <ul>
        <li>
          <strong>Le passager</strong> voit, pour la course en cours, le prénom, la photo, le véhicule, la plaque et la position du chauffeur.
          La photo et la position ne sont plus visibles une fois la course terminée.
        </li>
        <li>
          <strong>Le chauffeur</strong> voit le prénom du passager et les adresses de la course.
        </li>
        <li>
          <strong>L'équipe MOVA</strong> accède aux données nécessaires au support et aux vérifications, depuis une console protégée par une
          double authentification.
        </li>
        <li>
          <strong>Nos prestataires</strong>, qui traitent les données pour notre compte : Cloudflare (hébergement du site, de l'application et
          des données, base en Europe de l'Ouest), IGN Géoplateforme (recherche d'adresse), Apple Plans ou Google Maps (affichage de la carte dans
          l'app), Wikimedia (photos de lieux). Certains sont établis aux États-Unis ; les transferts sont encadrés par le cadre de protection des
          données UE–États-Unis ou par des clauses contractuelles types.
        </li>
        <li>Nous ne vendons aucune donnée et n'utilisons aucune publicité ciblée.</li>
      </ul>
    ),
  },
  {
    id: "conservation",
    title: "Durées de conservation",
    body: (
      <ul>
        <li>Liste d'attente : jusqu'au lancement du service, au plus 24 mois après l'inscription.</li>
        <li>Compte : tant qu'il est actif, puis suppression dans les 30 jours suivant votre demande de clôture.</li>
        <li>Courses : 3 ans après la course, pour la gestion des réclamations et litiges.</li>
        <li>Position du chauffeur : effacée automatiquement à la fin ou à l'annulation de la course.</li>
        <li>Photo et vérifications d'un chauffeur : pendant la collaboration, puis 3 ans.</li>
        <li>
          Factures et paiements, quand ils seront disponibles : 10 ans (obligation comptable). <Todo>durées à valider avec un conseil</Todo>
        </li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies et stockage local",
    body: (
      <p>
        MOVA n'utilise ni cookie publicitaire ni outil de mesure d'audience. Le site et l'app enregistrent seulement sur votre appareil ce qui
        est nécessaire à leur fonctionnement (votre session de connexion). Ce stockage strictement nécessaire ne demande pas de consentement.
      </p>
    ),
  },
  {
    id: "securite",
    title: "Sécurité",
    body: (
      <p>
        Connexions chiffrées (HTTPS), mots de passe chiffrés, règles d'accès en base qui limitent chaque compte à ses propres données, photos
        des chauffeurs dans un espace privé accessible par liens temporaires, double authentification pour l'équipe.
      </p>
    ),
  },
  {
    id: "droits",
    title: "Vos droits",
    body: (
      <>
        <p>
          Vous pouvez accéder à vos données, les rectifier, les supprimer, en demander une copie (portabilité), vous opposer à un traitement ou
          en limiter l'usage, et retirer votre consentement à tout moment. Écrivez à <Field value={COMPANY.email} label="e-mail de contact" /> ;
          nous répondons sous un mois.
        </p>
        <p>
          Vous pouvez aussi supprimer votre compte vous-même dans l'application : <em>Compte → Supprimer mon compte</em>. Votre compte, vos
          courses et, pour les chauffeurs, votre photo sont alors effacés immédiatement.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>).
        </p>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalLayout
      current="confidentialite.html"
      title="Confidentialité"
      updated="2 novembre 2026"
      intro={<p>Les données que MOVA utilise, pourquoi, qui les voit et combien de temps elles sont gardées. En clair.</p>}
      sections={sections}
    />
  );
}
