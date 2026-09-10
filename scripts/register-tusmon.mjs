import { APPLICATION_ID } from "../server/tusmon/auth.js";

if (!process.env.DISCORD_BOT_TOKEN)
  throw new Error(
    "DISCORD_BOT_TOKEN is required. Use node --env-file=.env.local scripts/register-tusmon.mjs",
  );
const guild = process.env.DISCORD_TEST_GUILD_ID;
if (guild && !/^\d{17,22}$/.test(guild))
  throw new Error("Invalid test guild ID");
const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}${guild ? `/guilds/${guild}` : ""}/commands`;
// POST upserts only this named command, preserving all unrelated commands.
const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "tusmon",
    description:
      "Le Pokémon du jour : 9 générations, 6 essais, un défi pour tout le monde.",
    type: 1,
    ...(guild ? {} : { contexts: [0, 1, 2], integration_types: [0] }),
  }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok)
  throw new Error(
    `Discord command registration failed (HTTP ${response.status}). Check token and installation settings.`,
  );
console.log(
  `/tusmon registered ${guild ? "on the test server" : "globally"}. Configure the interactions endpoint before testing.`,
);
