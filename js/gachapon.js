// ============================================================
// Minijuego de reclutamiento: máquina de cápsulas (gachapón).
// Sustituye al scratch-reveal. Secuencia:
//   1. GIRAR → la palanca gira, la máquina tiembla, las cápsulas
//      del domo se agitan.
//   2. Cae una cápsula y rebota. Su color/destello telegrafiá la
//      rareza (anticipación estilo gacha moderno).
//   3. El jugador la GOLPEA 3 veces (clic/tap) → grietas + shake.
//   4. Estalla: haces de luz + partículas + héroe revelado.
// ============================================================
import * as A from './assets.js';
import * as audio from './audio.js';

const CW = 340, CH = 430;

export function openGachapon(reward, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'gacha-overlay';
  overlay.innerHTML = `
    <div class="gacha-box" data-rarity="${reward.rarity.id}">
      <canvas class="gacha-canvas" width="${CW}" height="${CH}"></canvas>
      <div class="gacha-ui">
        <button class="btn btn-primary btn-big gacha-action">GIRAR</button>
        <button class="btn gacha-skip" style="margin-left:8px;">Saltar</button>
        <div class="gacha-hint hidden">¡Golpéala para abrirla!</div>
      </div>
      <div class="gacha-info hidden">
        <div class="gacha-rarity" style="color:${reward.rarity.color}">${reward.rarity.name}</div>
        <div class="gacha-name">${reward.archetype.name}</div>
        <div class="gacha-sub"></div>
        <button class="btn btn-primary gacha-close">Continuar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('.gacha-canvas');
  const ctx = canvas.getContext('2d');
  const actionBtn = overlay.querySelector('.gacha-action');
  const skipBtn = overlay.querySelector('.gacha-skip');
  const hint = overlay.querySelector('.gacha-hint');
  const info = overlay.querySelector('.gacha-info');
  const box = overlay.querySelector('.gacha-box');
  const sub = overlay.querySelector('.gacha-sub');

  sub.textContent = reward.maxed ? '¡Estrellas al máximo! Compensación en oro.'
    : reward.isNew ? '¡Nuevo héroe se une al gremio!'
    : `Duplicado → ${'★'.repeat(reward.hero.stars)} (+15% stats)`;

  // Cápsula: el color superior insinúa la rareza. Común/infrecuente
  // salen apagadas; épico+ brillan y sueltan chispas al caer.
  const rarIdx = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(reward.rarity.id);
  const capsuleTop = reward.rarity.color;
  const isHot = rarIdx >= 3;

  // Cápsulas decorativas del domo
  const domeCaps = [];
  for (let i = 0; i < 9; i++) {
    domeCaps.push({
      x: 90 + (i % 3) * 55 + Math.random() * 22,
      y: 92 + Math.floor(i / 3) * 26 + Math.random() * 10,
      hue: [200, 140, 30, 320, 260][i % 5],
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Estado de la secuencia
  let state = 'idle'; // idle → spin → drop → tap → burst → done
  let t = 0, stateT = 0;
  let leverAngle = 0;
  let shake = 0;
  let capsule = { x: CW / 2, y: 285, vy: 0, r: 34, taps: 0, squish: 0 };
  const sparks = [];
  let heroAlpha = 0;

  function setState(s) { state = s; stateT = 0; }

  actionBtn.addEventListener('click', () => {
    if (state !== 'idle') return;
    actionBtn.classList.add('hidden');
    skipBtn.classList.add('hidden');
    setState('spin');
  });

  skipBtn.addEventListener('click', () => {
    if (state !== 'idle' && state !== 'tap' && state !== 'drop' && state !== 'spin') return;
    actionBtn.classList.add('hidden');
    skipBtn.classList.add('hidden');
    hint.classList.add('hidden');
    capsule.y = 380;
    capsule.taps = 3;
    setState('burst');
    audio.sfx('reveal', 0.6);
    spawnSparks(CW/2, 380, isHot ? 90 : 45, capsuleTop, true);
  });

  canvas.addEventListener('pointerdown', e => {
    if (state !== 'tap') return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (CW / r.width);
    const y = (e.clientY - r.top) * (CH / r.height);
    const dx = x - capsule.x, dy = y - capsule.y;
    if (dx * dx + dy * dy < 70 * 70) {
      capsule.taps++;
      capsule.squish = 1;
      shake = 8 + capsule.taps * 3;
      audio.sfx('hit', 0.4);
      spawnSparks(capsule.x, capsule.y, 6 + capsule.taps * 4, capsuleTop);
      if (capsule.taps >= 3) {
        hint.classList.add('hidden');
        setState('burst');
        audio.sfx('reveal', 0.6);
        spawnSparks(capsule.x, capsule.y, isHot ? 70 : 36, capsuleTop, true);
      }
    }
  });

  overlay.querySelector('.gacha-close').addEventListener('click', () => {
    running = false;
    overlay.classList.add('closing');
    setTimeout(() => { overlay.remove(); onDone?.(); }, 250);
  });

  function spawnSparks(x, y, n, color, big = false) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (big ? 3.4 : 1.8) + Math.random() * (big ? 4.5 : 2);
      sparks.push({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (big ? 1.5 : 0.5),
        life: 1, color, sz: 2 + Math.random() * (big ? 4 : 2),
      });
    }
  }

  // ---------- Dibujo ----------
  function drawMachine(ox, oy) {
    // Cuerpo
    ctx.fillStyle = '#2d2547';
    rr(ox + 60, oy + 170, 220, 150, 14);
    ctx.fillStyle = '#241d3a';
    rr(ox + 74, oy + 184, 192, 74, 10);
    // Boca de salida
    ctx.fillStyle = '#14101f';
    rr(ox + 120, oy + 262, 100, 46, 10);
    ctx.strokeStyle = '#3a3158';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox + 120, oy + 262, 100, 46);
    // Domo
    ctx.fillStyle = 'rgba(160,170,220,0.16)';
    ctx.beginPath();
    ctx.arc(ox + CW / 2, oy + 170, 108, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,205,240,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ox + CW / 2, oy + 170, 108, Math.PI, 0);
    ctx.stroke();
    // Cápsulas dentro del domo (se agitan en spin)
    const agit = state === 'spin' ? Math.min(1, stateT * 2) : 0;
    for (const c of domeCaps) {
      const jx = agit * Math.sin(t * 17 + c.phase) * 7;
      const jy = agit * Math.abs(Math.sin(t * 23 + c.phase * 2)) * -13;
      drawCapsule(ox + c.x + jx, oy + c.y + jy, 15, `hsl(${c.hue} 60% 55%)`, '#e8e3f5');
    }
    // Brillo del domo
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.ellipse(ox + CW / 2 - 42, oy + 118, 30, 14, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // Palanca
    ctx.save();
    ctx.translate(ox + CW / 2, oy + 222);
    ctx.rotate(leverAngle);
    ctx.fillStyle = '#3a3158';
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9a91b5';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(-5, -46, 10, 34);
    ctx.beginPath(); ctx.arc(0, -48, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Pies
    ctx.fillStyle = '#1d1730';
    rr(ox + 74, oy + 316, 40, 16, 5);
    rr(ox + 226, oy + 316, 40, 16, 5);
  }

  function drawCapsule(x, y, r, topColor, botColor, squish = 0, cracks = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + squish * 0.18, 1 - squish * 0.18);
    // mitad inferior
    ctx.fillStyle = botColor;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fill();
    // mitad superior
    ctx.fillStyle = topColor;
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fill();
    // línea central
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    // grietas
    if (cracks > 0) {
      ctx.strokeStyle = 'rgba(20,16,31,0.85)';
      ctx.lineWidth = 2;
      for (let i = 0; i < cracks; i++) {
        const a = 0.8 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
        ctx.lineTo(Math.cos(a + 0.3) * r * 0.65, Math.sin(a + 0.3) * r * 0.65);
        ctx.lineTo(Math.cos(a + 0.1) * r * 0.95, Math.sin(a + 0.1) * r * 0.95);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  let running = true;
  let last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt; stateT += dt;
    ctx.clearRect(0, 0, CW, CH);

    // shake global
    const ox = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const oy = shake > 0 ? (Math.random() - 0.5) * shake * 0.6 : 0;
    shake = Math.max(0, shake - dt * 40);

    // La máquina siempre visible; atenuada cuando el foco es la cápsula
    drawMachine(ox, oy);
    if (state === 'tap' || state === 'burst') {
      ctx.fillStyle = 'rgba(10, 8, 20, 0.6)';
      ctx.fillRect(0, 0, CW, CH);
    }

    if (state === 'spin') {
      leverAngle += dt * 9;
      shake = Math.max(shake, 3);
      if (stateT > 1.4) {
        capsule.y = 285; capsule.vy = 0;
        setState('drop');
      }
    }

    if (state === 'drop') {
      capsule.vy += dt * 900;
      capsule.y += capsule.vy * dt;
      const floor = 380;
      if (capsule.y > floor) {
        capsule.y = floor;
        capsule.vy = -capsule.vy * 0.45;
        shake = 6;
        spawnSparks(capsule.x, floor + 10, isHot ? 14 : 6, capsuleTop);
        if (Math.abs(capsule.vy) < 60) {
          setState('tap');
          hint.classList.remove('hidden');
        }
      }
      drawCapsule(capsule.x + ox, capsule.y + oy, capsule.r, capsuleTop, '#cfd3e8');
    }

    if (state === 'tap') {
      capsule.squish = Math.max(0, capsule.squish - dt * 6);
      const pulse = isHot ? 1 + Math.sin(t * 6) * 0.04 : 1;
      // halo de anticipación para rarezas altas
      if (isHot) {
        const g = ctx.createRadialGradient(capsule.x, capsule.y, 10, capsule.x, capsule.y, 90);
        g.addColorStop(0, reward.rarity.color + '44');
        g.addColorStop(1, reward.rarity.color + '00');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CW, CH);
      }
      drawCapsule(capsule.x + ox, capsule.y + oy, capsule.r * 1.6 * pulse, capsuleTop, '#cfd3e8',
        capsule.squish, capsule.taps);
    }

    if (state === 'burst') {
      // flash blanco + haces de luz + héroe apareciendo
      const k = Math.min(1, stateT / 0.35);
      if (stateT < 0.18) {
        ctx.fillStyle = `rgba(255,255,255,${1 - stateT / 0.18})`;
        ctx.fillRect(0, 0, CW, CH);
      }
      // haces girando
      ctx.save();
      ctx.translate(CW / 2, CH / 2 - 20);
      ctx.rotate(t * 0.4);
      const nRays = isHot ? 12 : 8;
      for (let i = 0; i < nRays; i++) {
        ctx.rotate((Math.PI * 2) / nRays);
        const g = ctx.createLinearGradient(0, 0, 240, 0);
        g.addColorStop(0, reward.rarity.color + '55');
        g.addColorStop(1, reward.rarity.color + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(240, -18);
        ctx.lineTo(240, 18);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      heroAlpha = Math.min(1, heroAlpha + dt * 2.2);
      ctx.save();
      ctx.globalAlpha = heroAlpha;
      const sc = 0.7 + 0.3 * k;
      const size = 190 * sc;
      // aura de rareza
      if (reward.rarity.aura) {
        const ag = ctx.createRadialGradient(CW / 2, CH / 2 - 20, 12, CW / 2, CH / 2 - 20, size * 0.85);
      ag.addColorStop(0, reward.rarity.aura + '99'); // Stronger aura
        ag.addColorStop(1, reward.rarity.aura + '00');
        ctx.fillStyle = ag;
        ctx.fillRect(0, 0, CW, CH);

      // Add floating particles for high rarities
      if (isHot && Math.random() < 0.2) {
          spawnSparks(CW/2 + (Math.random()-0.5)*150, CH/2 + (Math.random()-0.5)*150, 1, reward.rarity.color, false);
      }
      }
      A.drawShadow(ctx, CW / 2, CH / 2 - 20 + size / 2, size * 0.55);
      const walkF = Math.floor(t * 5) % 8;
      A.drawChar(ctx, A.charSheet(reward.hero.archetype), A.DIR.down, walkF,
        CW / 2 - size / 2, CH / 2 - 20 - size / 2, size, A.RARITY_FILTER[reward.rarity.id]);
      // retrato faceset flotando junto al héroe
      const face = A.faceOf(reward.hero.archetype);
      if (face && stateT > 0.5) {
        ctx.globalAlpha = Math.min(1, (stateT - 0.5) * 2.5);
        const fp = 62;
        ctx.strokeStyle = reward.rarity.color;
        ctx.lineWidth = 3;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(face, CW / 2 + size / 2 - 18, CH / 2 - 20 - size / 2, fp, fp);
        ctx.strokeRect(CW / 2 + size / 2 - 18, CH / 2 - 20 - size / 2, fp, fp);
      }
      ctx.restore();
      if (stateT > 0.9 && info.classList.contains('hidden')) {
        info.classList.remove('hidden');
        box.classList.add('revealed');
      }
    }

    // partículas
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.12;
      p.life -= dt * 1.4;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
