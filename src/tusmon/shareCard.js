// Renders the end-of-game card that gets posted to the channel: every player
// who finished in that activity, their avatar above their grid, so the result
// is shareable without spoiling the answer for anyone who has not played yet.
const PALETTE = {
  ink: "#183e34",
  green: "#21644c",
  muted: "#73806d",
  card: "#fffefb",
  panel: "#fdfdf7",
  line: "#dce2d5",
  empty: "#f5f6ee",
  emptyLine: "#d9dfd0",
  correct: "#327454",
  present: "#edc760",
  absent: "#788477",
};
const ROWS = 6;
const SCALE = 2;
const PAD = 16;
const TITLE_H = 38;
const PANEL_PAD = 12;
const PANEL_GAP = 9;
// Beyond four the card would stretch off the message, so players wrap.
const PER_ROW = 4;
// Marks travel between players in their shortest form, so a whole grid fits in
// a handful of bytes.
const MARKS = { c: "correct", p: "present", a: "absent" };

export function avatarUrl(user) {
  if (!user?.id) return "";
  if (user.avatar)
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  // Users without an avatar get one of Discord's six default images.
  const index = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function packMarks(rows) {
  const letter = { correct: "c", present: "p", absent: "a" };
  return rows.map((row) => row.marks.map((mark) => letter[mark]).join(""));
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
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius - 1.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGrid(ctx, player, x, y, tile, gap) {
  for (let row = 0; row < ROWS; row += 1) {
    const marks = player.marks[row] || "";
    for (let column = 0; column < player.length; column += 1) {
      const mark = MARKS[marks[column]];
      roundedRect(
        ctx,
        x + column * (tile + gap),
        y + row * (tile + gap),
        tile,
        tile,
        tile * 0.22,
      );
      ctx.fillStyle = mark ? PALETTE[mark] : PALETTE.empty;
      ctx.fill();
      if (!mark) {
        ctx.strokeStyle = PALETTE.emptyLine;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

/**
 * A solo card sits the grid next to the avatar; from two players on, everyone
 * who played today gets their own small column, kept to the same overall size.
 */
function layout(players) {
  const solo = players.length === 1;
  const tile = solo ? 18 : 12;
  const gap = solo ? 3 : 2;
  const avatar = solo ? 88 : 44;
  const length = Math.max(...players.map((player) => player.length));
  const gridWidth = length * tile + (length - 1) * gap;
  const gridHeight = ROWS * tile + (ROWS - 1) * gap;
  const panelWidth =
    PANEL_PAD * 2 +
    (solo ? avatar + 14 + gridWidth : Math.max(avatar, gridWidth));
  const panelHeight =
    PANEL_PAD * 2 +
    (solo ? Math.max(avatar, gridHeight) : avatar + 8 + gridHeight);
  const columns = Math.min(players.length, PER_ROW);
  const rows = Math.ceil(players.length / PER_ROW);
  return {
    solo,
    tile,
    gap,
    avatar,
    columns,
    gridWidth,
    gridHeight,
    panelWidth,
    panelHeight,
    width: PAD * 2 + panelWidth * columns + PANEL_GAP * (columns - 1),
    height: PAD * 2 + TITLE_H + panelHeight * rows + PANEL_GAP * (rows - 1),
  };
}

/**
 * Draws the shareable result and hands back a PNG blob.
 * @returns {Promise<Blob|null>} null when the browser refuses to export.
 */
export async function renderShareCard({ number, players }) {
  if (!players?.length) return null;
  const box = layout(players);
  const canvas = document.createElement("canvas");
  canvas.width = box.width * SCALE;
  canvas.height = box.height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx?.roundRect) return null;
  ctx.scale(SCALE, SCALE);
  try {
    await document.fonts.ready;
  } catch {
    // Falling back to the system font is better than skipping the share.
  }
  const avatars = await Promise.all(
    players.map((player) => loadImage(avatarUrl(player))),
  );

  ctx.fillStyle = PALETTE.card;
  ctx.fillRect(0, 0, box.width, box.height);
  // Same corner glow as the app background, so the card reads as Tus’Mon.
  const glow = ctx.createRadialGradient(
    box.width * 0.82,
    0,
    0,
    box.width * 0.82,
    0,
    box.width * 0.6,
  );
  glow.addColorStop(0, "#e6edcc99");
  glow.addColorStop(1, "#e6edcc00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, box.width, box.height);
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 2;
  roundedRect(ctx, 1, 1, box.width - 2, box.height - 2, 18);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = PALETTE.ink;
  ctx.font = "800 20px Nunito, sans-serif";
  ctx.fillText(`Tus’Mon n°${number}`, box.width / 2, PAD + 22);

  players.forEach((player, index) => {
    const left = PAD + (index % box.columns) * (box.panelWidth + PANEL_GAP);
    const top =
      PAD +
      TITLE_H +
      Math.floor(index / box.columns) * (box.panelHeight + PANEL_GAP);
    roundedRect(ctx, left, top, box.panelWidth, box.panelHeight, 14);
    ctx.fillStyle = PALETTE.panel;
    ctx.fill();
    ctx.strokeStyle = PALETTE.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (box.solo) {
      drawAvatar(
        ctx,
        avatars[index],
        left + PANEL_PAD,
        top + (box.panelHeight - box.avatar) / 2,
        box.avatar,
      );
      drawGrid(
        ctx,
        player,
        left + PANEL_PAD + box.avatar + 14,
        top + (box.panelHeight - box.gridHeight) / 2,
        box.tile,
        box.gap,
      );
    } else {
      drawAvatar(
        ctx,
        avatars[index],
        left + (box.panelWidth - box.avatar) / 2,
        top + PANEL_PAD,
        box.avatar,
      );
      drawGrid(
        ctx,
        player,
        left + (box.panelWidth - box.gridWidth) / 2,
        top + PANEL_PAD + box.avatar + 8,
        box.tile,
        box.gap,
      );
    }
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
