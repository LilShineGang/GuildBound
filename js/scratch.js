// ============================================================
// Componente scratch-reveal reutilizable — el momento más pulido
// del juego (pilar de diseño nº3). Se usa para: pulls de
// reclutamiento y (futuro) recompensas diarias / de Era.
// ============================================================
import { renderHeroCanvas } from './sprites.js';

// Abre el overlay de revelado. reward = { hero, isNew, rarity, archetype, maxed }
// onDone se llama al cerrar.
export function openScratchReveal(reward, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'scratch-overlay';
  overlay.innerHTML = `
    <div class="scratch-card" data-rarity="${reward.rarity.id}">
      <div class="scratch-stage">
        <canvas class="scratch-hero" width="280" height="320"></canvas>
        <canvas class="scratch-mask" width="280" height="320"></canvas>
      </div>
      <div class="scratch-info hidden">
        <div class="scratch-rarity" style="color:${reward.rarity.color}">${reward.rarity.name}</div>
        <div class="scratch-name">${reward.archetype.name}</div>
        <div class="scratch-sub"></div>
        <button class="btn btn-primary scratch-close">Continuar</button>
      </div>
      <div class="scratch-hint">✦ Rasca para revelar a tu recluta ✦</div>
    </div>`;
  document.body.appendChild(overlay);

  const card = overlay.querySelector('.scratch-card');
  const heroCanvas = overlay.querySelector('.scratch-hero');
  const mask = overlay.querySelector('.scratch-mask');
  const info = overlay.querySelector('.scratch-info');
  const hint = overlay.querySelector('.scratch-hint');
  const sub = overlay.querySelector('.scratch-sub');

  if (reward.maxed) {
    sub.textContent = '¡Estrellas al máximo! Compensación en oro.';
  } else if (reward.isNew) {
    sub.textContent = '¡Nuevo héroe se une al gremio!';
  } else {
    sub.textContent = `Duplicado → ${'★'.repeat(reward.hero.stars)} (+15% stats)`;
  }

  // Animación del héroe bajo la máscara
  let running = true;
  const t0 = performance.now();
  function animate() {
    if (!running) return;
    renderHeroCanvas(heroCanvas, reward.hero.archetype, reward.rarity, (performance.now() - t0) / 1000);
    requestAnimationFrame(animate);
  }
  animate();

  // Máscara de rascado
  const mctx = mask.getContext('2d');
  const grad = mctx.createLinearGradient(0, 0, 280, 320);
  grad.addColorStop(0, '#4a4458');
  grad.addColorStop(0.5, '#6b6478');
  grad.addColorStop(1, '#3a3448');
  mctx.fillStyle = grad;
  mctx.fillRect(0, 0, 280, 320);
  mctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 60; i++) {
    mctx.fillRect(Math.random() * 280, Math.random() * 320, 2, 2);
  }
  mctx.font = '20px monospace';
  mctx.textAlign = 'center';
  mctx.fillStyle = 'rgba(255,255,255,0.25)';
  mctx.fillText('?', 140, 168);

  let scratching = false;
  let revealed = false;

  function scratchAt(clientX, clientY) {
    const r = mask.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * mask.width;
    const y = ((clientY - r.top) / r.height) * mask.height;
    mctx.globalCompositeOperation = 'destination-out';
    mctx.beginPath();
    mctx.arc(x, y, 26, 0, Math.PI * 2);
    mctx.fill();
    mctx.globalCompositeOperation = 'source-over';
    checkProgress();
  }

  let lastCheck = 0;
  function checkProgress(force = false) {
    const now = performance.now();
    if ((!force && now - lastCheck < 150) || revealed) return;
    lastCheck = now;
    const img = mctx.getImageData(0, 0, mask.width, mask.height).data;
    let clear = 0, total = 0;
    for (let i = 3; i < img.length; i += 16 * 4) { // muestreo
      total++;
      if (img[i] < 40) clear++;
    }
    if (clear / total > 0.45) reveal();
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    mask.style.transition = 'opacity 0.5s';
    mask.style.opacity = '0';
    hint.classList.add('hidden');
    setTimeout(() => {
      info.classList.remove('hidden');
      card.classList.add('revealed');
      burst();
    }, 350);
  }

  // Explosión de partículas al revelar
  function burst() {
    const n = { common: 8, uncommon: 12, rare: 18, epic: 28, legendary: 42, mythic: 60 }[reward.rarity.id] ?? 10;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'burst-particle';
      p.style.background = reward.rarity.color;
      p.style.left = '50%';
      p.style.top = '40%';
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 130;
      p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
      p.style.animationDelay = `${Math.random() * 0.15}s`;
      card.appendChild(p);
      setTimeout(() => p.remove(), 1400);
    }
  }

  mask.addEventListener('pointerdown', e => { scratching = true; scratchAt(e.clientX, e.clientY); });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  function onMove(e) { if (scratching) scratchAt(e.clientX, e.clientY); }
  function onUp() { if (scratching) { scratching = false; checkProgress(true); } }

  overlay.querySelector('.scratch-close').addEventListener('click', close);
  function close() {
    running = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    overlay.classList.add('closing');
    setTimeout(() => { overlay.remove(); onDone?.(); }, 250);
  }
}
