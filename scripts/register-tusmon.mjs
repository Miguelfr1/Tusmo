import { APPLICATION_ID } from "../server/tusmon/auth.js";

if (!process.env.DISCORD_BOT_TOKEN)
  throw new Error(
    "DISCORD_BOT_TOKEN is required. Use node --env-file=.env.local scripts/register-tusmon.mjs",
  );
const guild = process.env.DISCORD_TEST_GUILD_ID;
if (guild && !/^\d{17,22}$/.test(guild))
  throw new Error("Invalid test guild ID");
const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}${guild ? `/guilds/${guild}` : ""}/commands`;
const commands = [
  {
    name: "tusmon",
    description:
      "Le Pokémon du jour : 9 générations, 6 essais, un défi pour tout le monde.",
  },
  {
    name: "stats",
    description: "Le classement Tus’Mon du jour, sur ce serveur et partout.",
  },
];
// POST upserts only the named command, preserving all unrelated commands.
for (const command of commands) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...command,
      type: 1,
      ...(guild ? {} : { contexts: [0, 1, 2], integration_types: [0, 1] }),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `Discord command registration failed for /${command.name} (HTTP ${response.status}). Check token and installation settings.`,
    );
  console.log(
    `/${command.name} registered ${guild ? "on the test server" : "globally"}.`,
  );
}
console.log("Configure the interactions endpoint before testing.");
