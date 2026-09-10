export async function GET(request) {
  try {
    const source = new URL(request.url).searchParams.get("url") || "";
    const cardUrl = new URL(source);
    if (
      cardUrl.protocol !== "https:" ||
      cardUrl.hostname !== "assets.tcgdex.net" ||
      !cardUrl.pathname.endsWith("/high.webp")
    )
      return new Response("Carte inconnue", { status: 404 });

    const image = await fetch(cardUrl, {
      signal: AbortSignal.timeout(12000),
    });
    if (!image.ok) return new Response("Image indisponible", { status: 502 });

    return new Response(image.body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
      },
    });
  } catch {
    return new Response("Image indisponible", { status: 502 });
  }
}
