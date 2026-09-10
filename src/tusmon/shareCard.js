// Renders the end-of-game card that gets posted to the channel: the player's
// avatar next to their grid, so the result is shareable without spoiling the
// answer for anyone who has not played yet.
const PALETTE = {
  ink: "#183e34",
  green: "#21644c",
  muted: "#73806d",
  card: "#fffefb",
  line: "#dce2d5",
  empty: "#f5f6ee",
  emptyLine: "#d9dfd0",
  correct: "#327454",
  present: "#edc760",
  absent: "#788477",
};
const WIDTH = 560;
const HEIGHT = 300;
const SCALE = 2;
const ROWS = 6;

export function avatarUrl(user) {
  if (!user?.id) return "";
  if (user.avatar)
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
  // Users without an avatar get one of Discord's six default images.
  const index = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    // The canvas is exported as a blob, so the avatar has to come in clean.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawPokeball(ctx, x, y, size) {
  const radius = size / 2;
  ctx.save();
  ctx.translate(x + radius, y + radius);
  ctx.fillStyle = PALETTE.card;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.green;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = radius * 0.11;
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(radius, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.card;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAvatar(ctx, image, x, y, size) {
  const radius = size / 2;
  if (!image) {
    drawPokeball(ctx, x, y, size);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
  }
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius - 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGrid(ctx, round, x, y, width, height) {
  const columns = round.length;
  const gap = 5;
  // Capped so a short Pokémon name does not blow the tiles up out of scale.
  const tile = Math.min(
    (width - (columns - 1) * gap) / columns,
    (height - (ROWS - 1) * gap) / ROWS,
    30,
  );
  const gridWidth = tile * columns + (columns - 1) * gap;
  const gridHeight = tile * ROWS + (ROWS - 1) * gap;
  const left = x + (width - gridWidth) / 2;
  const top = y + (height - gridHeight) / 2;
  for (let row = 0; row < ROWS; row += 1) {
    const marks = round.rows[row]?.marks;
    for (let column = 0; column < columns; column += 1) {
      const mark = marks?.[column];
      roundedRect(
        ctx,
        left + column * (tile + gap),
        top + row * (tile + gap),
        tile,
        tile,
        tile * 0.22,
      );
      ctx.fillStyle = mark ? PALETTE[mark] : PALETTE.empty;
      ctx.fill();
      if (!mark) {
        ctx.strokeStyle = PALETTE.emptyLine;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
}

/**
 * Draws the shareable result and hands back a PNG blob.
 * @returns {Promise<Blob|null>} null when the browser refuses to export.
 */
export async function renderShareCard({ round, user }) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx?.roundRect) return null;
  ctx.scale(SCALE, SCALE);
  try {
    await document.fonts.ready;
  } catch {
    // Falling back to the system font is better than skipping the share.
  }
  const avatar = await loadImage(avatarUrl(user));

  ctx.fillStyle = PALETTE.card;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Same corner glow as the app background, so the card reads as Tus’Mon.
  const glow = ctx.createRadialGradient(
    WIDTH * 0.82,
    0,
    0,
    WIDTH * 0.82,
    0,
    WIDTH * 0.55,
  );
  glow.addColorStop(0, "#e6edcc99");
  glow.addColorStop(1, "#e6edcc00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 2;
  roundedRect(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 22);
  ctx.stroke();

  const score = round.status === "won" ? `${round.rows.length}/6` : "X/6";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = PALETTE.ink;
  ctx.font = "800 26px Nunito, sans-serif";
  ctx.fillText(`Tus’Mon n°${round.number} · ${score}`, WIDTH / 2, 48);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = "600 13px Inter, sans-serif";
  ctx.fillText(
    round.status === "won"
      ? "a trouvé le Pokémon du jour"
      : "a séché sur le Pokémon du jour",
    WIDTH / 2,
    70,
  );

  const bodyTop = 92;
  const bodyHeight = HEIGHT - bodyTop - 28;
  const avatarSize = 140;
  drawAvatar(
    ctx,
    avatar,
    58,
    bodyTop + (bodyHeight - avatarSize) / 2,
    avatarSize,
  );
  drawGrid(ctx, round, 246, bodyTop, 266, bodyHeight);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
