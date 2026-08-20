// ============================================================
// Visual de héroes con sprites del pack: canvas animados
// (andar en bucle), retrato faceset, y lectura de rareza vía
// filtro de color + anillo/aura. Ticker propio autogestionado.
// ============================================================
import * as A from './assets.js';
import { RARITIES } from './data.js';

const live = new Set(); // { canvas, archetype, rarityId, mode }

export function rarityDef(id) { return RARITIES.find(r => r.id === id); }

// mode: 'idle' (respira quieto) | 'walk' (anda mirando abajo)
export function attachHeroCanvas(canvas, archetype, rarityId, mode = 'walk') {
  live.add({ canvas, archetype, rarityId, mode, ph: Math.random() * 6 });
}

let started = false;
export function startTicker() {
  if (started) return;
  started = true;
  let last = performance.now();
  function frame(now) {
    const t = now / 1000;
    for (const item of [...live]) {
      if (!item.canvas.isConnected) { live.delete(item); continue; }
      render(item, t);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function render({ canvas, archetype, rarityId, mode, ph }, t) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const rar = rarityDef(rarityId);
  const size = Math.min(w, h * 0.82);
  const x = (w - size) / 2;
  const groundY = h * 0.88;

  // aura de rareza
  if (rar?.aura) {
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.2 + ph);
    const g = ctx.createRadialGradient(w / 2, h * 0.55, size * 0.1, w / 2, h * 0.55, size * 0.62 * pulse);
    g.addColorStop(0, rar.aura + '4d');
    g.addColorStop(1, rar.aura + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  A.drawShadow(ctx, w / 2, groundY, size * 0.55, 0.28);
  const frame = mode === 'walk' ? Math.floor((t * 5 + ph) % 8) : 0;
  const bob = mode === 'idle' ? Math.sin(t * 2.5 + ph) * size * 0.015 : 0;
  A.drawChar(ctx, A.charSheet(archetype), A.DIR.down, frame, x, groundY - size + bob, size,
    A.RARITY_FILTER[rarityId]);

  // anillo de rareza bajo los pies
  if (rar) {
    ctx.strokeStyle = rar.color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1.5, size * 0.02);
    ctx.beginPath();
    ctx.ellipse(w / 2, groundY, size * 0.3, size * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// Retrato faceset con marco de rareza (devuelve un elemento DOM)
export function facePortrait(archetype, rarityId, px = 76) {
  const rar = rarityDef(rarityId);
  const div = document.createElement('div');
  div.className = 'face-portrait';
  div.style.width = div.style.height = px + 'px';
  div.style.borderColor = rar?.color ?? '#666';
  const face = A.faceOf(archetype);
  if (face) {
    const c = document.createElement('canvas');
    c.width = px; c.height = px;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (A.RARITY_FILTER[rarityId] !== 'none') ctx.filter = A.RARITY_FILTER[rarityId];
    ctx.drawImage(face, 0, 0, px, px);
    div.appendChild(c);
  }
  return div;
}
