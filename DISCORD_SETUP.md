# Tus’Mon sur Discord

Application publique : `1547555128783929396`. Le mode infini existant reste à `/` ; l’Activity utilise `/tusmon` ou la présence du paramètre Discord `frame_id`.

## Tester sans Discord ni secrets

```sh
npm install
npm run dev:tusmon
```

Ouvrir <http://127.0.0.1:4173/tusmon?demo=1>. L’API de démonstration écoute uniquement sur la boucle locale, utilise un faux compte et une base en mémoire. Les données disparaissent à l’arrêt. Aucun mode démo ni stockage en mémoire n’est activable sur l’API de production.

```sh
npm test
npm run lint
npm run build
```

## Variables privées

Le fichier `.env.local` est ignoré par Git. Ne pas utiliser de préfixe `VITE_` pour ces valeurs. Configurer également les variables nécessaires dans Vercel, puis redéployer : les fichiers locaux ne configurent pas Vercel.

| Variable | Source / usage |
| --- | --- |
| `DISCORD_PUBLIC_KEY` | Developer Portal → General Information, vérification des interactions |
| `DISCORD_CLIENT_SECRET` | Developer Portal → OAuth2, échange du code d’autorisation |
| `DISCORD_APPLICATION_ID` | Facultatif : identifiant public ci-dessus utilisé par défaut |
| `UPSTASH_REDIS_REST_URL` ou `KV_REST_API_URL` | Base Upstash Redis connectée au projet Vercel |
| `UPSTASH_REDIS_REST_TOKEN` ou `KV_REST_API_TOKEN` | Jeton lecture/écriture de cette base, pas un jeton lecture seule |
| `TUSMON_SESSION_SECRET` | Secret aléatoire indépendant, au moins 32 caractères |
| `TUSMON_DAILY_SECRET` | Autre secret aléatoire, au moins 32 caractères, stable entre déploiements |
| `DISCORD_BOT_TOKEN` | Local uniquement, sert au script d’enregistrement de commande |
| `DISCORD_TEST_GUILD_ID` | Facultatif, limite l’enregistrement de commande au serveur de test |

Générer chaque secret indépendamment, dans son propre terminal, avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Ne jamais partager le résultat dans une conversation ni un commit. Une rotation du secret quotidien change le Pokémon du jour : la programmer avant le lancement ou avec une migration des parties, pas pendant un défi actif. Le secret de session peut être réinitialisé, ce qui force simplement une reconnexion.

La production refuse les parties si la sauvegarde n’est pas configurée. Elle ne bascule jamais en stockage temporaire.

## Developer Portal

1. OAuth2 → Redirects : `https://127.0.0.1` (le SDK Embedded gère le parcours Activity).
2. Activities → URL Mappings :

   | Préfixe | Cible, sans protocole |
   | --- | --- |
   | `/` | `tusmo-sigma.vercel.app` |
   | `/pokemon-artwork` | `raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork` |
   | `/card-artwork` | `assets.tcgdex.net` |

3. Activer les Activities. Les polices sont hébergées avec le site, sans dépendance Google Fonts pour l’interface Activity.
4. Installation : activer Guild Install, avec les scopes `applications.commands` et `bot`. Aucun droit administrateur n’est nécessaire. Installer l’application sur le serveur de test via le lien d’installation du portail.
5. **Après déploiement et configuration des secrets**, General Information → Interactions Endpoint URL : `https://tusmo-sigma.vercel.app/api/discord/interactions`. Discord vérifie la signature et le ping avant d’accepter cette URL.
6. Enregistrer `/tusmon` : `npm run discord:register`. Le script utilise POST pour ne pas supprimer les autres commandes de l’application. Avec `DISCORD_TEST_GUILD_ID`, l’enregistrement est limité au serveur de test ; sinon il est global.
7. Lancer `/tusmon` dans Discord. Tester d’abord avec le compte propriétaire/développeur ; les paramètres de distribution de l’Activity déterminent l’accès des autres comptes.

Sources : [guide Discord Activity](https://docs.discord.com/developers/activities/building-an-activity), [réseau et proxy](https://docs.discord.com/developers/activities/development-guides/networking), [interactions](https://docs.discord.com/developers/interactions/overview).

## Règles et données

- 1 025 espèces, neuf générations imposées, noms français normalisés, six essais et première lettre offerte. Les propositions doivent être des noms du Pokédex de la bonne longueur. Répéter un nom consomme un essai, comme dans le jeu existant.
- Un défi et une partie par compte Discord et par jour, reset à minuit à Paris (changements d’heure inclus). Changer de serveur ou d’appareil ne donne pas une nouvelle partie.
- La solution n’est pas envoyée au client avant la fin. L’API vérifie l’identité via Discord ; les identifiants envoyés dans les actions ne font pas autorité.
- Classement : essais, puis indices ; égalités partagées. Les défaites viennent après toutes les victoires. Aucun nom de Pokémon ni proposition dans le classement ou le texte de partage.
- Portefeuille Discord séparé du site : 100 pièces de bienvenue, 30 par jour de connexion. Indices : 8 / 12 / 20. Victoire : 25 + bonus précision `(7 - essais) × 4` + 15 sans indice + 75 quotidien + bonus série plafonné à 20. La série compte les victoires sans défaite, pas les jours consécutifs.
- Une illustration du Pokémon trouvé est sélectionnée dans le catalogue JCC/Pocket déjà utilisé par le site, avec validation de l’espèce. L’illustration officielle est affichée immédiatement si la carte ne charge pas. Ce résultat n’ajoute pas de carte à l’album navigateur, les profils sont distincts.
- Le traitement atomique Redis et les identifiants de requête évitent les doubles dépenses et gains, y compris si une réponse réseau se perd.
- Données conservées : identifiant et nom public Discord, parties et résultats pendant 35 jours ; portefeuille et compteurs sans expiration automatique. Aucun token OAuth utilisateur stocké dans Redis. Session signée valable une heure, gardée uniquement en mémoire côté client. Prévoir une politique de confidentialité et un mécanisme de suppression avant une ouverture publique large.

## Validation avant ouverture

- Vérifier réellement la connexion Discord, les illustrations via le proxy et le démarrage par `/tusmon` sur ordinateur et mobile.
- Jouer depuis deux comptes, confirmer le même défi ; recharger après un indice et après une victoire.
- Vérifier l’impossibilité de rejouer le même jour, le classement du serveur et le partage sans spoiler.
- Les tests automatisés utilisent la base mémoire avec le même contrat atomique ; ils ne remplacent pas un test de l’intégration Redis réelle ni une validation visuelle dans Discord.
