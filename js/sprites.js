// ============================================================
// Pixel art programático v2:
//  - 1 rejilla base por arquetipo + recolor por rareza (pilar de coste)
//  - Pipeline de detalle: Scale2x → luz de borde → sombreado inferior
//  - Sombra elíptica en suelo, bob de idle, tinte de golpe
//  - Sprites de enemigos con tinte por bioma
// ============================================================

// Roles: . transparente | O contorno | S piel | s piel sombra
// H pelo | h pelo sombra | A armadura clara | a armadura sombra
// B ropa/secundario | b ropa sombra | M metal claro | m metal sombra
// W madera/cuero | w cuero sombra | E ojos/gema | C capa/adorno | c capa sombra
// F pluma/detalle | G brillo especular | R rojo vivo | V verde veneno

const BASE_PALETTE = {
  O: { h: 250, s: 25, l: 10 },
  S: { h: 27,  s: 55, l: 72 },
  s: { h: 22,  s: 45, l: 58 },
  H: { h: 28,  s: 45, l: 38 },
  h: { h: 26,  s: 45, l: 26 },
  A: { h: 220, s: 12, l: 62 },
  a: { h: 220, s: 14, l: 44 },
  B: { h: 220, s: 18, l: 40 },
  b: { h: 222, s: 20, l: 28 },
  M: { h: 210, s: 8,  l: 78 },
  m: { h: 212, s: 10, l: 55 },
  W: { h: 28,  s: 42, l: 42 },
  w: { h: 26,  s: 42, l: 30 },
  E: { h: 195, s: 90, l: 62 },
  C: { h: 355, s: 55, l: 48 },
  c: { h: 355, s: 55, l: 34 },
  F: { h: 45,  s: 70, l: 60 },
  G: { h: 0,   s: 0,  l: 96 },
  R: { h: 0,   s: 75, l: 52 },
  V: { h: 110, s: 60, l: 45 },
};

const RECOLOR = ['A', 'a', 'B', 'b', 'C', 'c', 'E'];

const RARITY_TINT = {
  common:    { h: 220, s: 0.35 },
  uncommon:  { h: 130, s: 0.75 },
  rare:      { h: 215, s: 0.95 },
  epic:      { h: 275, s: 0.95 },
  legendary: { h: 40,  s: 1.05 },
  mythic:    { h: 0,   s: 1.05 },
};

function hslStr(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function roleRgb(role, rarityId) {
  const base = BASE_PALETTE[role];
  if (!base) return null;
  if (rarityId && RECOLOR.includes(role) && RARITY_TINT[rarityId]) {
    const t = RARITY_TINT[rarityId];
    const s = Math.min(95, Math.round(base.s * t.s + 30));
    return hslToRgb(t.h, role === 'E' ? 95 : s, base.l);
  }
  return hslToRgb(base.h, base.s, base.l);
}

// ---- Rejillas de héroes (idénticas a v1: la base compartida es el pilar de coste) ----
const GRIDS = {
  warrior: [
    '.........FFF............',
    '........FFFFF...........',
    '.........OOO............',
    '.......OOMMMOO..........',
    '......OMMMMMMMO.........',
    '......OMMGMMMMO.........',
    '......OMmOOOmMO.........',
    '......OMmEOEmMO.........',
    '......OMmOOOmMO.........',
    '.......OmmmmmO..........',
    '......OOAAAAAOO.........',
    '....OOAAAAAAAAAOO..MMO..',
    '...OMaAAGAAAAAaMO.OMMO..',
    '..OMMaAAAAAAAaMMOOMMO...',
    '..OMmOaAAAAAaOmMOMMO....',
    '..OMmO.aaaaa.OmMMMO.....',
    '..OMmO.OBBBO..OMMO......',
    '..OCCO.OBbBO..OmO.......',
    '..OCcO.ObBbO..OWO.......',
    '..OCcO.OBbBO..OwO.......',
    '...OO..ObBbO..OWO.......',
    '.......OBbBO..OwO.......',
    '......OaabbaO.OWO.......',
    '......OaObbOaOOwO.......',
    '......OaObbOa..O........',
    '......ObObbOb...........',
    '.....OOboOOobOO.........',
    '.....ObbO..ObbO.........',
    '.....OmmO..OmmO.........',
    '....OmmmO..OmmmO........',
    '....OOOOO..OOOOO........',
  ],
  mage: [
    '...........O............',
    '..........OCO...........',
    '.........OCCCO..........',
    '........OCCcCCO.........',
    '.......OCCCcCCCO........',
    '......OCCCCcCCCCO.......',
    '....OOCCCCCcCCCCOO......',
    '..OOCCCCCCCcCCCCCCOO....',
    '..OccccccccccccccccO....',
    '.....OHHHHHHHHO.........',
    '....OHSSSSSSSSHO........',
    '....OHSOESSEOSHO...OEO..',
    '....OHSSSSSSSSHO..OEEEO.',
    '.....OSSssssSO....OGEO..',
    '......OssssO.......OWO..',
    '.....OBBBBBBO......OwO..',
    '....OBBBbBBBBO.....OWO..',
    '...OBBBBbBBBBBO....OwO..',
    '...OBsOBbBBOsBO....OWO..',
    '...OBSOBbBBOSBOOOOOwO...',
    '...ObbOBbbBObbOSSSWO....',
    '....OOOBbbBOOOOOOOO.....',
    '......OBbbBO............',
    '......OBbbbBO...........',
    '.....OBBbbbBBO..........',
    '.....OBbbbbbBO..........',
    '....OBBbbbbbBBO.........',
    '....ObbbbbbbbbO.........',
    '...OBBbbbbbbbBBO........',
    '...ObbbbbbbbbbbO........',
    '...OOOOOOOOOOOOO........',
  ],
  rogue: [
    '........OOOOO...........',
    '.......OBBBBBO..........',
    '......OBBBBBBBO.........',
    '.....OBBbbbbbBBO........',
    '.....ObbOOOOObbO........',
    '.....Obb.OOO.bbO........',
    '.....OOsOEOEOsOO........',
    '......OsSOOOSsO.........',
    '......OsSSSSSsO.........',
    '.......OssssssO.........',
    '.......OObbOO...........',
    '.....OObBBBBbOO.........',
    '....ObbBBBBBBbbO........',
    '...OwbBBBBBBBBbwO.......',
    '..OWwbBBbbbbBBbwWO......',
    '..OMO.bBbBBbBb.OMO......',
    '..OmO.ObbbbbbO.OmO......',
    '..OMO..ObbbbO...OMO.....',
    '...O...OwwwwO....O......',
    '.......OwWWwO...........',
    '.......ObbbbO...........',
    '......ObbObbbO..........',
    '......ObbObbbO..........',
    '......ObbO.bbO..........',
    '......Obb..bbO..........',
    '.....OObO..ObOO.........',
    '.....ObbO..ObbO.........',
    '.....ObbO..ObbO.........',
    '....ObbbO..ObbbO........',
    '....OOOOO..OOOOO........',
  ],
  cleric: [
    '........EEEEE...........',
    '.......E.....E..........',
    '........OOOO............',
    '.......OHHHHO...........',
    '......OHSSSSHO..........',
    '......OSOESEOSO.....OMO.',
    '......OSSSSSSO.....OMGMO',
    '......OsSSSSsO......OMO.',
    '.......OssssO.......OWO.',
    '......OAAAAAAO......OwO.',
    '.....OAAAAAAAAO.....OWO.',
    '....OAAABBBBAAAO....OwO.',
    '...OAAABBbBBBAAAO...OWO.',
    '...OAsOBBbBBOsAO....OwO.',
    '...OASOBBbBBOSAOOOOOWO..',
    '...OaaOBBbBBOaaOSSSWO...',
    '....OOOBBbBBOOOOOOOO....',
    '......OBBbBBO...........',
    '......OBBbbBO...........',
    '......OBBCbBO...........',
    '.....OBBCCCbBO..........',
    '.....OBBbCbbBO..........',
    '.....OBBbCbbBO..........',
    '....OBBBbbbbBBO.........',
    '....OBBbbbbbbBO.........',
    '...OBBBbbbbbbBBO........',
    '...OBbbbbbbbbbbO........',
    '...OOOOOOOOOOOOO........',
  ],
  ranger: [
    '.......OOOOOO...........',
    '......OBBBBBBO..........',
    '.....OBBBBBBBBO....OO...',
    '.....ObbbbbbbbO...OWO...',
    '......OHHHHHHO...OWO....',
    '.....OHSSSSSSHO..OwO....',
    '.....OSOESSEOSO..OWO....',
    '.....OSSSSSSSO..OwO.....',
    '.....OsSSSSssO..OWO.....',
    '......OssssO...OwO......',
    '.....OOBBBBOO..OWO......',
    '....ObBBBBBBbO.OwO......',
    '...ObbBBBBBBbbOWO.......',
    '..OwbBBBbbBBBwWO........',
    '..OWwBBbBBbBWwO.........',
    '..OWO.BbBBbBOO..........',
    '..OwO.ObbbbO.O..........',
    '..OWO.OwwwwO.OO.........',
    '...O..OwWWwO..O.........',
    '......ObbbbO...O........',
    '.....ObbObbbO..O........',
    '.....ObbObbbO.OWO.......',
    '.....ObbO.bbO..O........',
    '.....Obb..bbO...........',
    '....OObO..ObOO..........',
    '....OwwO..OwwO..........',
    '....OwwO..OwwO..........',
    '...OwwwO..OwwwO.........',
    '...OOOOO..OOOOO.........',
  ],
};

// ---- Enemigos (rol A/B se tiñe con el acento del bioma) ----
const ENEMY_GRIDS = {
  slime: [
    '......OOOO......',
    '....OOAAAAOO....',
    '...OAAAGAAAAO...',
    '..OAAAAAAAAAAO..',
    '..OAOOAAAAOOAO..',
    '.OAAOEAAAAEOAAO.',
    '.OAAAAAAAAAAAAO.',
    '.OAAAAOOOOAAAAO.',
    '.OaAAAAAAAAAAaO.',
    '..OaaAAAAAAaaO..',
    '...OOaaaaaaOO...',
    '.....OOOOOO.....',
  ],
  skeleton: [
    '.....OOOO.......',
    '....OMMMMO......',
    '....OMGMMO......',
    '....OmOOmO..OO..',
    '....OmEEmO.OMO..',
    '.....OmmO..OMO..',
    '....OOMMOO.OMO..',
    '...OMOMMOMOOMO..',
    '...OmOMMOmOMO...',
    '...OmOmmOOMO....',
    '....OOMMOO......',
    '....OMOOMO......',
    '....OmO.OmO.....',
    '...OOmO.OmOO....',
    '...OmmO.OmmO....',
    '...OOOO.OOOO....',
  ],
  bat: [
    'OO....OOOO....OO',
    'OAO..OAAAAO..OAO',
    'OAAOOAAAAAAOOAAO',
    '.OAAAAOEEOAAAAO.',
    '.OAAAAAOOAAAAAO.',
    '..OAAOAAAAOAAO..',
    '...OO.OAAO.OO...',
    '......OOOO......',
  ],
  golem: [
    '......OOOOOOOO......',
    '.....OAAAAAAAAO.....',
    '....OAAGAAAAAAAO....',
    '....OAOOOAAOOOAO....',
    '....OAORROAORROAO...',
    '....OAAOOAAAOOAAO...',
    '.....OAAAAAAAAO.....',
    '..OOOOaAAAAAAaOOOO..',
    '.OAAAAOAAAAAAOAAAAO.',
    'OAAOAAOAAAAAAOAAOAAO',
    'OAAOAAOaAAAAaOAAOAAO',
    'OaaOAAOAAAAAAOAAOaaO',
    '.OOOaaOAAAAAAOaaOOO.',
    '....OOOaAAAAaOOO....',
    '......OaAAAAaO......',
    '.....OAAOOOOAAO.....',
    '.....OAAO..OAAO.....',
    '....OaAAO..OAAaO....',
    '....OOOOO..OOOOO....',
  ],
};

function normalizeGrid(rows) {
  const w = Math.max(...rows.map(r => r.length));
  return { w, h: rows.length, rows: rows.map(r => r.padEnd(w, '.')) };
}

const NORM = {};
for (const [k, v] of Object.entries(GRIDS)) NORM[k] = normalizeGrid(v);
const ENORM = {};
for (const [k, v] of Object.entries(ENEMY_GRIDS)) ENORM[k] = normalizeGrid(v);

// ============================================================
// Pipeline de detalle: rejilla → índices → Scale2x → sombreado
// Cacheado como ImageData listo para putImage / drawImage.
// ============================================================

function gridToIndex(norm) {
  const { w, h, rows } = norm;
  const idx = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch !== '.' && ch !== ' ') idx[y * w + x] = ch;
    }
  return { w, h, idx };
}

// Scale2x clásico: duplica resolución redondeando esquinas
function scale2x({ w, h, idx }) {
  const W = w * 2, H = h * 2;
  const out = new Array(W * H).fill(null);
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : idx[y * w + x];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = get(x, y);
      const A = get(x, y - 1), B = get(x + 1, y), C = get(x - 1, y), D = get(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      const ox = x * 2, oy = y * 2;
      out[oy * W + ox] = e0;
      out[oy * W + ox + 1] = e1;
      out[(oy + 1) * W + ox] = e2;
      out[(oy + 1) * W + ox + 1] = e3;
    }
  return { w: W, h: H, idx: out };
}

// Colorea + luz de borde superior + sombra inferior + ligera
// oclusión junto al contorno → sensación de volumen.
function shade({ w, h, idx }, rarityId, tintFn) {
  const img = new Uint8ClampedArray(w * h * 4);
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : idx[y * w + x];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const role = idx[y * w + x];
      if (!role) continue;
      let rgb = tintFn ? tintFn(role) : roleRgb(role, rarityId);
      if (!rgb) continue;
      let [r, g, b] = rgb;
      if (role !== 'O') {
        const above = get(x, y - 1), below = get(x, y + 1);
        if (above === null || above === undefined) { r = Math.min(255, r + 46); g = Math.min(255, g + 46); b = Math.min(255, b + 40); }
        else if (above === 'O' && get(x, y - 2) == null) { r = Math.min(255, r + 26); g = Math.min(255, g + 26); b = Math.min(255, b + 22); }
        if (below === null) { r = Math.max(0, r - 34); g = Math.max(0, g - 34); b = Math.max(0, b - 28); }
        if (get(x - 1, y) === 'O') { r = Math.max(0, r - 14); g = Math.max(0, g - 14); b = Math.max(0, b - 10); }
      }
      const o = (y * w + x) * 4;
      img[o] = r; img[o + 1] = g; img[o + 2] = b; img[o + 3] = 255;
    }
  return new ImageData(img, w, h);
}

const heroCache = new Map();   // arch/rarity -> {canvas, w, h}
const enemyCache = new Map();  // type/tint -> {canvas, w, h}

function bakeToCanvas(imageData) {
  const c = document.createElement('canvas');
  c.width = imageData.width; c.height = imageData.height;
  c.getContext('2d').putImageData(imageData, 0, 0);
  return c;
}

function heroBitmap(archetypeId, rarityId) {
  const key = archetypeId + '/' + rarityId;
  if (heroCache.has(key)) return heroCache.get(key);
  const scaled = scale2x(gridToIndex(NORM[archetypeId]));
  const img = shade(scaled, rarityId);
  const entry = { canvas: bakeToCanvas(img), w: scaled.w, h: scaled.h };
  heroCache.set(key, entry);
  return entry;
}

function enemyBitmap(type, tintHue) {
  const key = type + '/' + tintHue;
  if (enemyCache.has(key)) return enemyCache.get(key);
  const scaled = scale2x(gridToIndex(ENORM[type]));
  const tintFn = role => {
    const base = BASE_PALETTE[role];
    if (!base) return null;
    if (role === 'A' || role === 'a') {
      return hslToRgb(tintHue, 45, role === 'A' ? 48 : 34);
    }
    return hslToRgb(base.h, base.s, base.l);
  };
  const img = shade(scaled, null, tintFn);
  const entry = { canvas: bakeToCanvas(img), w: scaled.w, h: scaled.h };
  enemyCache.set(key, entry);
  return entry;
}

export function spriteSize(archetypeId) {
  const g = NORM[archetypeId];
  return { w: g.w, h: g.h };
}

// ---- API de dibujo ----

// Sombra elíptica en el suelo
export function drawShadow(ctx, cx, groundY, width) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, width / 2, width / 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Héroe "en mundo": anclado al suelo, con sombra, bob y volteo.
// opts: { flip, bob (0..1 fase), flash (0..1), lunge (px hacia delante) }
export function drawHeroWorld(ctx, archetypeId, rarityId, cx, groundY, pixel, t, opts = {}) {
  const bm = heroBitmap(archetypeId, rarityId);
  const w = bm.w * pixel, h = bm.h * pixel;
  const bobY = Math.round(Math.sin((t + (opts.bobPhase ?? 0)) * 3.1) * pixel);
  const lunge = opts.lunge ?? 0;
  drawShadow(ctx, cx, groundY, w * 0.6);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx + (opts.flip ? -lunge : lunge), groundY - h + bobY);
  if (opts.flip) { ctx.scale(-1, 1); ctx.translate(-0, 0); }
  ctx.drawImage(bm.canvas, opts.flip ? -w / 2 : -w / 2, 0, w, h);
  if (opts.flash > 0) {
    ctx.globalAlpha = opts.flash;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2, 0, w, h);
  }
  ctx.restore();
}

export function drawEnemyWorld(ctx, type, tintHue, cx, groundY, pixel, t, opts = {}) {
  const bm = enemyBitmap(type, tintHue);
  const w = bm.w * pixel, h = bm.h * pixel;
  const hover = type === 'bat' ? Math.sin(t * 4 + (opts.bobPhase ?? 0)) * pixel * 3 - h * 0.6 : 0;
  const squish = type === 'slime' ? Math.sin(t * 5 + (opts.bobPhase ?? 0)) * 0.06 : 0;
  drawShadow(ctx, cx, groundY, w * 0.6);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx - (opts.lunge ?? 0), groundY + hover);
  ctx.scale(1 + squish, 1 - squish);
  ctx.drawImage(bm.canvas, -w / 2, -h, w, h);
  if (opts.flash > 0) {
    ctx.globalAlpha = opts.flash;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2, -h, w, h);
  }
  ctx.restore();
}

// Aura animada (igual que v1 pero sobre el bitmap detallado)
export function drawAura(ctx, rarity, cx, cy, radius, t) {
  if (!rarity.aura) return;
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius * pulse);
  grad.addColorStop(0, rarity.aura + '55');
  grad.addColorStop(0.7, rarity.aura + '22');
  grad.addColorStop(1, rarity.aura + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
  ctx.fill();
  const idx = ['epic', 'legendary', 'mythic'].indexOf(rarity.id);
  if (idx >= 0) {
    const n = 4 + idx * 3;
    for (let i = 0; i < n; i++) {
      const ang = t * (0.6 + idx * 0.25) + (i / n) * Math.PI * 2;
      const r = radius * (0.75 + 0.18 * Math.sin(t * 1.7 + i * 2.1));
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r * 0.75;
      const sz = 2 + ((i + idx) % 3);
      ctx.fillStyle = rarity.aura;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
  }
}

// Retrato para paneles/cartas (compatible con la API v1)
export function renderHeroCanvas(canvas, archetypeId, rarity, t = 0) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bm = heroBitmap(archetypeId, rarity.id);
  const scale = Math.max(1, Math.floor(Math.min(canvas.width / (bm.w + 10), canvas.height / (bm.h + 6))));
  const w = bm.w * scale, h = bm.h * scale;
  const x = Math.floor((canvas.width - w) / 2);
  const groundY = Math.floor((canvas.height + h) / 2);
  drawAura(ctx, rarity, canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.42, t);
  drawShadow(ctx, canvas.width / 2, groundY, w * 0.62);
  const bobY = Math.round(Math.sin(t * 3.1) * scale * 0.6);
  ctx.drawImage(bm.canvas, x, groundY - h + bobY, w, h);
}

// Sprite estático (para el gachapón u otros usos)
export function drawSprite(ctx, archetypeId, rarityId, x, y, scale) {
  const bm = heroBitmap(archetypeId, rarityId);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bm.canvas, x, y, bm.w * scale, bm.h * scale);
}
