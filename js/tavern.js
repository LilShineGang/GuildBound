// ============================================================
// La Taberna del Gremio — lobby/menú principal.
// Escena pintada en canvas (chimenea animada, barra, tablón,
// estandarte, velas) + NPCs del pack paseando con animación de
// andar + partículas. Botones-hotspot superpuestos navegan a
// las secciones.
// ============================================================
import * as A from './assets.js';
import * as audio from './audio.js';

const W = 960, H = 520;

const HOTSPOTS = [
  { id: 'dungeon', label: '⚔ Expediciones', x: 27, y: 34, hint: 'El tablón de encargos' },
  { id: 'recruit', label: '✦ Reclutar', x: 80, y: 40, hint: 'La barra: siempre llegan forasteros' },
  { id: 'heroes', label: '🛡 Héroes', x: 51, y: 78, hint: 'La mesa de la compañía' },
  { id: 'era', label: '🏛 Era', x: 46, y: 22, hint: 'El estandarte del gremio' },
  { id: 'guild', label: '📜 Crónica', x: 10, y: 72, hint: 'Junto al fuego se cuentan historias' },
];

export function buildTavern(root, G, navigate) {
  const wrap = document.createElement('div');
  wrap.className = 'tavern-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'tavern-canvas';
  canvas.width = W; canvas.height = H;
  wrap.appendChild(canvas);

  for (const h of HOTSPOTS) {
    const b = document.createElement('button');
    b.className = 'hotspot';
    b.style.left = h.x + '%';
    b.style.top = h.y + '%';
    b.innerHTML = `<span class="hs-label">${h.label}</span><span class="hs-hint">${h.hint}</span>`;
    b.addEventListener('click', () => { audio.sfx('click'); navigate(h.id); });
    b.addEventListener('mouseenter', () => audio.sfx('click', 0.15));
    wrap.appendChild(b);
  }
  root.appendChild(wrap);

  const ctx = canvas.getContext('2d');

  // ---------- NPCs ----------
  const npcs = A.TAVERN_NPCS.slice(0, 6).map((n, i) => ({
    sheet: A.get('char' + n),
    x: 200 + i * 110 + Math.random() * 40,
    y: 380 + (i % 3) * 36,
    tx: 0, ty: 0, state: 'idle', stateT: Math.random() * 3,
    dir: A.DIR.down, frame: 0, frameT: 0,
    bubble: null, bubbleT: 0,
  }));
  const PHRASES = ['¡Por el gremio!', '¿Otra ronda?', 'Dicen que el gólem volvió…', '♪ ♫', 'Yo llegué al piso 40', '¡Eh, recluta!'];

  function tickNpc(n, dt) {
    n.stateT -= dt;
    n.frameT += dt;
    if (n.frameT > 0.16) { n.frameT = 0; n.frame++; }
    if (n.bubbleT > 0) n.bubbleT -= dt;
    if (n.state === 'idle') {
      if (n.stateT <= 0) {
        if (Math.random() < 0.25) {
          n.bubble = PHRASES[Math.floor(Math.random() * PHRASES.length)];
          n.bubbleT = 2.2;
          n.stateT = 2.5;
        } else {
          n.tx = 150 + Math.random() * 660;
          n.ty = 340 + Math.random() * 140;
          n.state = 'walk';
        }
      }
    } else {
      const dx = n.tx - n.x, dy = n.ty - n.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) { n.state = 'idle'; n.stateT = 1.5 + Math.random() * 3.5; }
      else {
        const sp = 34 * dt;
        n.x += (dx / d) * sp;
        n.y += (dy / d) * sp;
        n.dir = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? A.DIR.right : A.DIR.left)
          : (dy > 0 ? A.DIR.down : A.DIR.up);
      }
    }
  }

  // ---------- Partículas (chispas del fuego + motas de polvo) ----------
  const sparks = [];
  const motes = Array.from({ length: 26 }, () => ({
    x: Math.random() * W, y: Math.random() * H * 0.7,
    vx: 6 + Math.random() * 8, ph: Math.random() * 6,
  }));

  let t = 0, last = performance.now();

  function draw(dt) {
    // === Pared ===
    const wallGrad = ctx.createLinearGradient(0, 0, 0, 310);
    wallGrad.addColorStop(0, '#3b2a1e');
    wallGrad.addColorStop(1, '#54392a');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, 310);
    // Vigas
    ctx.fillStyle = '#2b1d13';
    for (const x of [0, 230, 460, 700, 920]) ctx.fillRect(x, 0, 18, 310);
    ctx.fillRect(0, 0, W, 26);
    ctx.fillRect(0, 296, W, 18);

    // === Suelo de tablones ===
    const floorGrad = ctx.createLinearGradient(0, 310, 0, H);
    floorGrad.addColorStop(0, '#6b4a2f');
    floorGrad.addColorStop(1, '#3f2a1a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 310, W, H - 310);
    ctx.strokeStyle = 'rgba(30,18,10,0.55)';
    ctx.lineWidth = 2;
    for (let y = 326; y < H; y += 26) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = ((i * 173) % W);
      const y = 326 + (i % 7) * 26;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke();
    }

    // === Chimenea (izquierda) ===
    ctx.fillStyle = '#4a4038';
    ctx.fillRect(48, 120, 170, 190);
    ctx.fillStyle = '#332b25';
    ctx.fillRect(64, 150, 138, 160);
    ctx.fillStyle = '#241d18';
    ctx.fillRect(78, 170, 110, 140);
    // repisa
    ctx.fillStyle = '#5c452c';
    ctx.fillRect(40, 112, 186, 16);
    // fuego animado
    const fx = 133, fy = 296;
    for (let i = 0; i < 7; i++) {
      const ph = t * 7 + i * 1.7;
      const fh = 46 + Math.sin(ph) * 12 + i * 3;
      const fw2 = 16 - i * 1.6;
      ctx.fillStyle = i < 2 ? '#ffe9a8' : i < 4 ? '#ffb347' : '#e2571b';
      ctx.globalAlpha = 0.8 - i * 0.08;
      ctx.beginPath();
      ctx.ellipse(fx + Math.sin(ph * 1.3) * 8, fy - fh / 2, fw2, fh / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // troncos
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(96, 292, 74, 10);
    ctx.fillRect(106, 300, 54, 8);
    // resplandor
    const glow = ctx.createRadialGradient(fx, fy - 20, 10, fx, fy - 20, 190 + Math.sin(t * 5) * 14);
    glow.addColorStop(0, 'rgba(255,160,60,0.30)');
    glow.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 60, 420, 460);
    // chispas
    if (Math.random() < 0.3) sparks.push({ x: fx + (Math.random() - 0.5) * 30, y: fy - 30, vy: -30 - Math.random() * 40, life: 1 });
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.y += s.vy * dt; s.x += Math.sin(t * 10 + i) * 0.5; s.life -= dt * 0.9;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      ctx.fillStyle = '#ffcf6e';
      ctx.fillRect(s.x, s.y, 3, 3);
      ctx.globalAlpha = 1;
    }

    // === Tablón de encargos ===
    ctx.fillStyle = '#5c452c';
    ctx.fillRect(240, 120, 150, 110);
    ctx.fillStyle = '#3f2f1d';
    ctx.fillRect(248, 128, 134, 94);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#e8dcc0' : '#d8c9a3';
      const px = 258 + (i % 2) * 62, py = 136 + Math.floor(i / 2) * 44;
      ctx.fillRect(px, py, 50, 36);
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(px + 6, py + 8, 38, 3);
      ctx.fillRect(px + 6, py + 16, 30, 3);
      ctx.fillRect(px + 6, py + 24, 34, 3);
      ctx.fillStyle = '#b33';
      ctx.fillRect(px + 22, py - 2, 5, 5);
    }

    // === Estandarte del gremio (Era) ===
    const era = G.eraData();
    ctx.fillStyle = '#2b1d13';
    ctx.fillRect(430, 96, 96, 8);
    ctx.fillStyle = era.biome.accent;
    ctx.beginPath();
    ctx.moveTo(438, 104); ctx.lineTo(518, 104);
    ctx.lineTo(518, 210); ctx.lineTo(478, 236); ctx.lineTo(438, 210);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(478, 104); ctx.lineTo(518, 104); ctx.lineTo(518, 210); ctx.lineTo(478, 236);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2e9c9';
    ctx.font = 'bold 34px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚜', 478, 175);
    ctx.font = 'bold 13px serif';
    ctx.fillText('ERA ' + G.state.era, 478, 200);

    // === Ventana con luz de luna ===
    ctx.fillStyle = '#1a2740';
    ctx.fillRect(560, 120, 84, 110);
    ctx.fillStyle = '#2c4a7c';
    ctx.fillRect(566, 126, 72, 98);
    ctx.fillStyle = '#cfe0ff';
    ctx.beginPath(); ctx.arc(600, 156, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c4a7c';
    ctx.beginPath(); ctx.arc(606, 152, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 4;
    ctx.strokeRect(566, 126, 72, 98);
    ctx.beginPath(); ctx.moveTo(602, 126); ctx.lineTo(602, 224); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(566, 175); ctx.lineTo(638, 175); ctx.stroke();
    // haz de luna
    ctx.fillStyle = 'rgba(180,200,255,0.07)';
    ctx.beginPath();
    ctx.moveTo(566, 126); ctx.lineTo(638, 126); ctx.lineTo(720, 360); ctx.lineTo(600, 360);
    ctx.closePath(); ctx.fill();

    // === Barra (derecha) ===
    // estantería con botellas
    ctx.fillStyle = '#3f2f1d';
    ctx.fillRect(690, 110, 240, 130);
    ctx.fillStyle = '#2b1d13';
    for (const y of [140, 180, 220]) ctx.fillRect(690, y, 240, 8);
    for (let i = 0; i < 14; i++) {
      const bx = 702 + (i % 7) * 32, by = 116 + Math.floor(i / 7) * 40;
      ctx.fillStyle = ['#7c3f4f', '#3f6b4a', '#8a6a2f', '#4a5a8c'][i % 4];
      ctx.fillRect(bx, by + 10, 12, 22);
      ctx.fillRect(bx + 4, by + 2, 4, 10);
    }
    // mostrador
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(672, 252, 288, 22);
    ctx.fillStyle = '#54392a';
    ctx.fillRect(672, 274, 288, 60);
    ctx.fillStyle = '#7c5a38';
    ctx.fillRect(672, 250, 288, 6);
    // jarras sobre la barra
    for (const mx of [710, 790, 880]) {
      ctx.fillStyle = '#c9a86a';
      ctx.fillRect(mx, 236, 14, 16);
      ctx.fillStyle = '#efe4c9';
      ctx.fillRect(mx, 233, 14, 5);
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx + 15, 240, 5, 8);
    }
    // tabernera (NPC fijo tras la barra)
    A.drawShadow(ctx, 800, 252, 40, 0.25);
    A.drawChar(ctx, A.get('char9'), A.DIR.down, Math.floor(t * 2) % 2, 776, 200, 48);

    // === Mesas redondas ===
    for (const [mx, my, r] of [[300, 430, 56], [560, 468, 62]]) {
      A.drawShadow(ctx, mx, my + 16, r * 2.4, 0.22);
      ctx.fillStyle = '#4a331f';
      ctx.beginPath(); ctx.ellipse(mx, my, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5f4428';
      ctx.beginPath(); ctx.ellipse(mx, my - 6, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(30,18,10,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(mx, my - 6, r * 0.6, r * 0.24, 0, 0, Math.PI * 2); ctx.stroke();
      // jarra + velita en mesa
      ctx.fillStyle = '#c9a86a'; ctx.fillRect(mx - 20, my - 22, 10, 12);
      ctx.fillStyle = '#efe4c9'; ctx.fillRect(mx + 12, my - 18, 6, 8);
      const cf = 3 + Math.sin(t * 9 + mx) * 1.5;
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath(); ctx.ellipse(mx + 15, my - 22, 2.5, cf, 0, 0, Math.PI * 2); ctx.fill();
    }

    // === Candelabro ===
    ctx.strokeStyle = '#2b1d13';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(480, 0); ctx.lineTo(480, 52); ctx.stroke();
    ctx.fillStyle = '#3a2c1a';
    ctx.beginPath(); ctx.ellipse(480, 62, 70, 12, 0, 0, Math.PI * 2); ctx.fill();
    for (const dx of [-58, -20, 20, 58]) {
      ctx.fillStyle = '#efe4c9';
      ctx.fillRect(478 + dx, 44, 5, 14);
      const cf = Math.sin(t * 8 + dx) * 2;
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath(); ctx.ellipse(480 + dx, 38 + cf * 0.4, 3, 6 + cf, 0, 0, Math.PI * 2); ctx.fill();
      const cg = ctx.createRadialGradient(480 + dx, 40, 2, 480 + dx, 40, 46);
      cg.addColorStop(0, 'rgba(255,210,120,0.14)');
      cg.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(480 + dx, 40, 46, 0, Math.PI * 2); ctx.fill();
    }

    // === NPCs ===
    npcs.sort((a, b) => a.y - b.y);
    for (const n of npcs) {
      tickNpc(n, dt);
      A.drawShadow(ctx, n.x, n.y + 2, 34, 0.25);
      A.drawChar(ctx, n.sheet, n.dir, n.state === 'walk' ? n.frame : 0, n.x - 24, n.y - 46, 48);
      if (n.bubbleT > 0 && n.bubble) {
        ctx.font = '12px sans-serif';
        const tw = ctx.measureText(n.bubble).width + 16;
        ctx.fillStyle = 'rgba(244,238,220,0.95)';
        ctx.beginPath();
        ctx.roundRect(n.x - tw / 2, n.y - 78, tw, 22, 8);
        ctx.fill();
        ctx.fillStyle = '#2b1d13';
        ctx.textAlign = 'center';
        ctx.fillText(n.bubble, n.x, n.y - 62);
      }
    }

    // === Motas de polvo a la luz ===
    for (const m of motes) {
      m.x += m.vx * dt;
      if (m.x > W) m.x = -4;
      ctx.globalAlpha = 0.12 + 0.1 * Math.sin(t * 2 + m.ph);
      ctx.fillStyle = '#ffe9c0';
      ctx.fillRect(m.x, m.y + Math.sin(t + m.ph) * 6, 2, 2);
      ctx.globalAlpha = 1;
    }

    // === Grading cálido + viñeta ===
    ctx.fillStyle = 'rgba(255,150,60,0.05)';
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(10,6,2,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  function frame(now) {
    if (!canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    ctx.clearRect(0, 0, W, H);
    draw(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
