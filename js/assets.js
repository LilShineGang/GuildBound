// ============================================================
// Cargador de assets (pack CC0 "Ninja Adventure" — ver assets/CREDITS.md)
// Precarga imágenes con progreso para la pantalla de carga.
// Formato de personajes: frames 16×16, 4 columnas = direcciones
// (abajo, arriba, izquierda, derecha), filas = frames de andar.
// Monstruos: 64×64 (4 direcciones × 4 frames).
// ============================================================

export const CHAR_FOR_ARCHETYPE = { warrior: 15, mage: 4, rogue: 1, cleric: 5, ranger: 17 };
// Personajes de ambiente para la taberna (tabernera, bardo, parroquianos…)
export const TAVERN_NPCS = [2, 3, 6, 9, 10, 13, 14, 8];

// Tinte por rareza aplicado con ctx.filter (los sprites del pack
// no se pueden repaletizar por rol, pero un hue-rotate sutil +
// marco/aura de color mantiene la lectura de rareza del brief)
export const RARITY_FILTER = {
  common:    'saturate(0.75)',
  uncommon:  'none',
  rare:      'saturate(1.15) brightness(1.05)',
  epic:      'hue-rotate(18deg) saturate(1.25)',
  legendary: 'sepia(0.35) saturate(1.7) brightness(1.1)',
  mythic:    'hue-rotate(-25deg) saturate(1.6) contrast(1.1)',
};

const images = new Map();
const manifest = [];

function img(key, src) { manifest.push({ key, src }); }

// --- Manifiesto ---
for (const n of new Set([...Object.values(CHAR_FOR_ARCHETYPE), ...TAVERN_NPCS])) {
  img(`char${n}`, `assets/chars/${n}.png`);
  img(`face${n}`, `assets/faces/${n}.png`);
}
for (let n = 1; n <= 22; n++) img(`monster${n}`, `assets/monsters/${n}.png`);
for (const n of [1, 2, 3, 4, 5, 6, 8, 10, 13, 14]) img(`fx${n}`, `assets/fx/${n}.png`);
img('tileset', 'assets/env/tileset.png');
img('bubble', 'assets/hud/dialogue-bubble.png');
img('heart', 'assets/hud/heart.png');

export function loadAll(onProgress) {
  let done = 0;
  return Promise.all(manifest.map(m => new Promise(res => {
    const i = new Image();
    i.onload = i.onerror = () => {
      images.set(m.key, i);
      done++;
      onProgress?.(done / manifest.length);
      res();
    };
    i.src = m.src;
  })));
}

export function get(key) { return images.get(key); }
export function charSheet(archetypeId) { return images.get('char' + CHAR_FOR_ARCHETYPE[archetypeId]); }
export function faceOf(archetypeId) { return images.get('face' + CHAR_FOR_ARCHETYPE[archetypeId]); }

// ---- Dibujo de personajes (16px, col=dirección, fila=frame) ----
export const DIR = { down: 0, up: 1, left: 2, right: 3 };

export function drawChar(ctx, sheet, dir, frame, x, y, size, filter) {
  if (!sheet) return;
  const rows = Math.max(1, Math.floor(sheet.naturalHeight / 16));
  const f = frame % rows;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (filter && filter !== 'none') ctx.filter = filter;
  ctx.drawImage(sheet, dir * 16, f * 16, 16, 16, x, y, size, size);
  ctx.restore();
}

// ---- Monstruos (64×64 → frames 16×16, misma convención) ----
export function drawMonster(ctx, n, dir, frame, x, y, size, filter) {
  const sheet = images.get('monster' + n);
  if (!sheet) return;
  const fw = sheet.naturalWidth / 4;
  const rows = Math.max(1, Math.floor(sheet.naturalHeight / fw));
  const f = frame % rows;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (filter && filter !== 'none') ctx.filter = filter;
  ctx.drawImage(sheet, dir * fw, f * fw, fw, fw, x, y, size, size);
  ctx.restore();
}

// ---- FX en tira horizontal (frames cuadrados) ----
export function drawFx(ctx, n, t01, x, y, size) {
  const sheet = images.get('fx' + n);
  if (!sheet) return;
  const fh = sheet.naturalHeight;
  const frames = Math.max(1, Math.floor(sheet.naturalWidth / fh));
  const f = Math.min(frames - 1, Math.floor(t01 * frames));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, f * fh, 0, fh, fh, x, y, size, size);
  ctx.restore();
}

export function fxFrames(n) {
  const sheet = images.get('fx' + n);
  if (!sheet) return 1;
  return Math.max(1, Math.floor(sheet.naturalWidth / sheet.naturalHeight));
}

// ---- Tiles del tileset de entorno (16px) ----
export function drawTile(ctx, col, row, x, y, size) {
  const ts = images.get('tileset');
  if (!ts) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ts, col * 16, row * 16, 16, 16, x, y, size, size);
}

// Sombra elíptica reutilizable
export function drawShadow(ctx, cx, groundY, width, alpha = 0.32) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, groundY, width / 2, width / 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
