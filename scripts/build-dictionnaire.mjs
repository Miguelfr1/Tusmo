/**
 * Génère les deux listes de mots servies avec le site.
 *
 * Avant, le jeu tirait 1,08 Mo depuis raw.githubusercontent.com à chaque
 * chargement, avec un `cache-control: max-age=300` : cinq minutes plus tard,
 * le joueur retéléchargeait tout. Les fichiers produits ici partent du CDN
 * Vercel, sous un nom versionné, et se mettent en cache pour de bon.
 *
 *   node scripts/build-dictionnaire.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";

const TOUS = "https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json";
const COURANTS =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt";

// Les noms de Pokémon vont de 3 à 14 caractères : c est la plage utile pour
// proposer une tentative valide.
const MIN = 3;
const MAX = 14;

const normalise = (mot) =>
  mot
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const recuperer = async (url, type) => {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${url} : ${reponse.status}`);
  return type === "json" ? reponse.json() : reponse.text();
};

const tous = [
  ...new Set(
    (await recuperer(TOUS, "json"))
      .map(normalise)
      .filter((m) => m.length >= MIN && m.length <= MAX),
  ),
].sort();

const courants = [
  ...new Set(
    (await recuperer(COURANTS, "text"))
      .split("\n")
      .map((ligne) => ligne.split(" ")[0])
      .filter((m) => m && !/[-' ]/.test(m))
      .map(normalise)
      .filter((m) => m.length >= 5 && m.length <= 8),
  ),
]
  .slice(0, 4000)
  .filter((m) => tous.includes(m));

await mkdir("public/mots", { recursive: true });
await writeFile("public/mots/tous-v1.txt", tous.join("\n"), "utf8");
await writeFile("public/mots/courants-v1.txt", courants.join("\n"), "utf8");

console.log(`tous-v1.txt      ${tous.length} mots`);
console.log(`courants-v1.txt  ${courants.length} mots`);
