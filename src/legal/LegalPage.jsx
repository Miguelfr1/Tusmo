import "@fontsource/nunito/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./legal.css";

const updated = "10 septembre 2026";

function Shell({ title, children }) {
  return (
    <main className="legal-page">
      <article>
        <a className="legal-logo" href="/tusmon">
          <span aria-hidden="true" /> Tus’<em>Mon</em>
        </a>
        <p className="legal-date">Dernière mise à jour : {updated}</p>
        <h1>{title}</h1>
        {children}
        <nav aria-label="Pages légales">
          <a href="/terms">Conditions d’utilisation</a>
          <a href="/privacy">Politique de confidentialité</a>
        </nav>
      </article>
    </main>
  );
}

function Privacy() {
  return (
    <Shell title="Politique de confidentialité">
      <p>
        Tus’Mon est un jeu communautaire indépendant édité par miggs et
        accessible notamment sous forme d’activité Discord. Cette politique
        explique les données utilisées pour faire fonctionner le service.
      </p>

      <h2>Données traitées</h2>
      <ul>
        <li>identifiant Discord, nom public et identifiant du serveur utilisé ;</li>
        <li>propositions, progression, résultats et statistiques de jeu ;</li>
        <li>
          données techniques strictement nécessaires à la connexion, à la
          sécurité et à la limitation des abus.
        </li>
      </ul>
      <p>
        Tus’Mon ne demande jamais ton mot de passe Discord. Les jetons OAuth ne
        sont pas enregistrés dans la base de données du jeu.
      </p>

      <h2>Utilisation</h2>
      <p>
        Ces données servent uniquement à authentifier les joueurs, sauvegarder
        les parties, afficher les classements, empêcher les doubles parties et
        protéger le service. Elles ne sont ni vendues ni utilisées à des fins
        publicitaires.
      </p>

      <h2>Conservation</h2>
      <p>
        Les parties et classements quotidiens sont conservés jusqu’à 35 jours.
        Les statistiques générales du profil sont conservées tant que le compte
        utilise Tus’Mon ou jusqu’à une demande de suppression.
      </p>

      <h2>Services utilisés</h2>
      <p>
        Le fonctionnement repose sur Discord pour l’authentification et
        l’activité, Vercel pour l’hébergement, Upstash pour la sauvegarde et des
        catalogues Pokémon publics pour les illustrations. Ces prestataires
        peuvent traiter des données techniques selon leurs propres politiques.
      </p>

      <h2>Tes droits et contact</h2>
      <p>
        Tu peux demander l’accès, la correction ou la suppression de tes
        données en contactant <strong>miggs7123 sur Discord</strong>. Indique ton
        identifiant Discord afin que la demande puisse être vérifiée.
      </p>

      <h2>Modifications</h2>
      <p>
        Cette politique peut évoluer avec le service. La date affichée en haut
        de la page indique sa dernière mise à jour.
      </p>
    </Shell>
  );
}

function Terms() {
  return (
    <Shell title="Conditions d’utilisation">
      <p>
        En utilisant Tus’Mon, tu acceptes les présentes conditions. Si tu ne les
        acceptes pas, n’utilise pas le service.
      </p>

      <h2>Le service</h2>
      <p>
        Tus’Mon propose des jeux de lettres autour de Pokémon, des statistiques
        et des classements communautaires. Le service est indépendant et n’est
        ni affilié ni approuvé par Nintendo, Creatures, GAME FREAK, The Pokémon
        Company ou Discord.
      </p>

      <h2>Conditions d’accès</h2>
      <p>
        Tu dois respecter l’âge minimal requis par Discord et les lois de ton
        pays. Ton compte Discord sert à limiter chaque personne à une partie
        quotidienne et à enregistrer son résultat.
      </p>

      <h2>Utilisation autorisée</h2>
      <p>
        Il est interdit de tricher, automatiser des requêtes, contourner les
        limites, perturber le service, tenter d’accéder aux données d’autrui ou
        exploiter une faille. Un accès peut être limité ou suspendu en cas
        d’abus.
      </p>

      <h2>Disponibilité</h2>
      <p>
        Tus’Mon est fourni gratuitement et sans garantie de disponibilité
        permanente. Le jeu, ses règles ou certaines fonctionnalités peuvent
        être corrigés, modifiés ou interrompus.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Pokémon et les éléments associés appartiennent à leurs détenteurs
        respectifs. Le code, l’interface et les contenus originaux de Tus’Mon ne
        peuvent pas être réutilisés abusivement sans autorisation.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Dans les limites prévues par la loi, Tus’Mon ne pourra être tenu
        responsable d’une indisponibilité, d’une perte de progression ou d’un
        dommage indirect lié à l’utilisation du service.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question concernant ces conditions, contacte
        <strong> miggs7123 sur Discord</strong>.
      </p>
    </Shell>
  );
}

export default function LegalPage() {
  return location.pathname === "/privacy" ? <Privacy /> : <Terms />;
}
