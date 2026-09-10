const artworkRoot =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

export async function GET(request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1 || id > 1025)
    return new Response("Image inconnue", { status: 404 });

  const image = await fetch(`${artworkRoot}/${id}.png`);
  if (!image.ok) return new Response("Image indisponible", { status: 502 });

  return new Response(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
}
