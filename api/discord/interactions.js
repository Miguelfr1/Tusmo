import { APPLICATION_ID, validInteraction } from "../../server/tusmon/auth.js";
import { json, readBody } from "../../server/tusmon/api.js";

export async function POST(request) {
  try {
    const body = await readBody(request, 65536);
    if (
      !validInteraction(
        body,
        request.headers.get("x-signature-ed25519"),
        request.headers.get("x-signature-timestamp"),
        process.env.DISCORD_PUBLIC_KEY,
      )
    )
      return json({ error: "Signature invalide." }, 401);
    const interaction = JSON.parse(body);
    if (interaction.type === 1) return json({ type: 1 });
    if (
      interaction.application_id !==
      (process.env.DISCORD_APPLICATION_ID || APPLICATION_ID)
    )
      return json({ error: "Application invalide." }, 403);
    if (interaction.type === 2 && interaction.data?.name === "tusmon")
      return json({ type: 12 });
    return json({
      type: 4,
      data: {
        content: "Utilise /tusmon pour ouvrir le Pokémon du jour.",
        flags: 64,
        allowed_mentions: { parse: [] },
      },
    });
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }
}
