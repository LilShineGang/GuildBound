// ============================================================
// Secuencia de reclutamiento (Temática de Taberna)
// Reemplaza a la máquina gacha.
// Un contrato sellado sobre la mesa se rompe, liberando
// energía mágica y revelando al héroe convocado.
// ============================================================
import * as A from './assets.js';
import * as audio from './audio.js';

const CW = 340, CH = 430;

export function openGachapon(reward, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'gacha-overlay';
  overlay.innerHTML = `
    <div class="gacha-box" data-rarity="${reward.rarity.id}" style="background: linear-gradient(170deg, #3a2c1a, #1a120a); border-color: #5c452c;">
      <canvas class="gacha-canvas" width="${CW}" height="${CH}"></canvas>
      <div class="gacha-ui">
        <button class="btn btn-primary btn-big gacha-action">ABRIR CONTRATO</button>
        <button class="btn gacha-skip" style="margin-left:8px;">Saltar</button>
        <div class="gacha-hint hidden">¡Toca para romper el sello!</div>
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
    : reward.isNew ? '¡Nuevo héroe firma el contrato!'
    : `Duplicado → ${'★'.repeat(reward.hero.stars)} (+15% stats)`;

  const rarIdx = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(reward.rarity.id);
  const isHot = rarIdx >= 3;
  const magicColor = reward.rarity.color;

  let state = 'idle'; // idle -> wait_tap -> burst -> done
  let t = 0, stateT = 0;
  let shake = 0;
  const sparks = [];
  let heroAlpha = 0;

  function setState(s) { state = s; stateT = 0; }

  actionBtn.addEventListener('click', () => {
    if (state !== 'idle') return;
    actionBtn.classList.add('hidden');
    skipBtn.classList.add('hidden');
    setState('wait_tap');
    hint.classList.remove('hidden');
  });

  skipBtn.addEventListener('click', () => {
    if (state === 'burst') return;
    actionBtn.classList.add('hidden');
    skipBtn.classList.add('hidden');
    hint.classList.add('hidden');
    setState('burst');
    audio.sfx('reveal', 0.6);
    spawnSparks(CW/2, CH/2, isHot ? 120 : 60, magicColor, true);
  });

  canvas.addEventListener('pointerdown', () => {
    if (state !== 'wait_tap') return;
    hint.classList.add('hidden');
    setState('burst');
    shake = 15;
    audio.sfx('reveal', 0.6);
    spawnSparks(CW/2, CH/2, isHot ? 120 : 60, magicColor, true);
  });

  overlay.querySelector('.gacha-close').addEventListener('click', () => {
    running = false;
    overlay.classList.add('closing');
    setTimeout(() => { overlay.remove(); onDone?.(); }, 250);
  });

  function spawnSparks(x, y, n, color, big = false) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (big ? 4.5 : 2.5) + Math.random() * (big ? 6 : 3);
      sparks.push({
        x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (big ? 2 : 1),
        life: 1, color, sz: 2 + Math.random() * (big ? 5 : 3),
      });
    }
  }

  let running = true;
  let last = performance.now();

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt; stateT += dt;
    ctx.clearRect(0, 0, CW, CH);

    const ox = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const oy = shake > 0 ? (Math.random() - 0.5) * shake * 0.6 : 0;
    shake = Math.max(0, shake - dt * 50);

    ctx.save();
    ctx.translate(ox, oy);

    // Fondo: Mesa de madera de la taberna
    const tableGrad = ctx.createLinearGradient(0, 0, 0, CH);
    tableGrad.addColorStop(0, '#3a2c1a');
    tableGrad.addColorStop(1, '#1a120a');
    ctx.fillStyle = tableGrad;
    ctx.fillRect(0, 0, CW, CH);

    // Dibujar pergamino si no ha estallado completamente
    if (state !== 'burst' || stateT < 0.2) {
      const scrollImg = A.get('item-scroll');
      if (scrollImg) {
          const sw = 140, sh = 140;
          // Un poco de flotación y brillo místico si está esperando tap y es alta rareza
          let yOff = 0;
          if (state === 'wait_tap') {
              yOff = Math.sin(t * 3) * 6;
              if (isHot) {
                  ctx.shadowColor = magicColor;
                  ctx.shadowBlur = 20 + Math.sin(t * 8) * 10;
              }
          }
          ctx.drawImage(scrollImg, CW/2 - sw/2, CH/2 - sh/2 + yOff, sw, sh);
          ctx.shadowBlur = 0; // reset

          // Sello de cera
          ctx.fillStyle = '#8c2f2f';
          ctx.beginPath();
          ctx.arc(CW/2, CH/2 + yOff + 10, 16, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#b03f3f';
          ctx.beginPath();
          ctx.arc(CW/2 - 2, CH/2 + yOff + 8, 8, 0, Math.PI*2);
          ctx.fill();
      }
    }

    if (state === 'burst') {
      const k = Math.min(1, stateT / 0.4);
      if (stateT < 0.2) {
        ctx.fillStyle = `rgba(255,255,255,${1 - stateT / 0.2})`;
        ctx.fillRect(0, 0, CW, CH);
      }

      ctx.save();
      ctx.translate(CW / 2, CH / 2);
      ctx.rotate(t * 0.4);
      const nRays = isHot ? 16 : 8;
      for (let i = 0; i < nRays; i++) {
        ctx.rotate((Math.PI * 2) / nRays);
        const g = ctx.createLinearGradient(0, 0, 260, 0);
        g.addColorStop(0, magicColor + '55');
        g.addColorStop(1, magicColor + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(260, -20);
        ctx.lineTo(260, 20);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      heroAlpha = Math.min(1, heroAlpha + dt * 2);
      ctx.globalAlpha = heroAlpha;
      const sc = 0.8 + 0.2 * k;
      const size = 190 * sc;

      if (reward.rarity.aura) {
        const ag = ctx.createRadialGradient(CW / 2, CH / 2, 12, CW / 2, CH / 2, size * 0.9);
        ag.addColorStop(0, reward.rarity.aura + (isHot ? '99' : '55'));
        ag.addColorStop(1, reward.rarity.aura + '00');
        ctx.fillStyle = ag;
        ctx.fillRect(0, 0, CW, CH);
      }

      A.drawShadow(ctx, CW / 2, CH / 2 + size / 2.2, size * 0.55);
      const walkF = Math.floor(t * 5) % 8;
      A.drawChar(ctx, A.charSheet(reward.hero.archetype), A.DIR.down, walkF,
        CW / 2 - size / 2, CH / 2 - size / 2, size, A.RARITY_FILTER[reward.rarity.id]);

      const face = A.faceOf(reward.hero.archetype);
      if (face && stateT > 0.4) {
        ctx.globalAlpha = Math.min(1, (stateT - 0.4) * 2.5);
        const fp = 66;
        ctx.strokeStyle = magicColor;
        ctx.lineWidth = 3;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(face, CW / 2 + size / 2 - 20, CH / 2 - size / 2, fp, fp);
        ctx.strokeRect(CW / 2 + size / 2 - 20, CH / 2 - size / 2, fp, fp);
      }

      if (stateT > 0.8 && info.classList.contains('hidden')) {
        info.classList.remove('hidden');
        box.classList.add('revealed');
      }
    }

    ctx.globalAlpha = 1;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15;
      p.life -= dt * 1.5;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
