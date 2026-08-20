// ============================================================
// Guildbound — bootstrap v3: pantalla de carga → taberna.
// Simulación en setInterval (sigue con la pestaña oculta);
// render con rAF.
// ============================================================
import * as G from './game.js';
import * as assets from './assets.js';
import { showBootScreen } from './screens.js';
import { buildUI, refreshHUD, rerenderActive } from './ui.js';

async function boot() {
  const loaded = G.load();
  const bootUI = showBootScreen();
  await assets.loadAll(p => bootUI.progress(p));
  await bootUI.done(); // «Pulsa para entrar» (desbloquea el audio)

  buildUI();

  if (loaded) {
    const off = G.applyOfflineProgress();
    if (off) {
      const hrs = (off.seconds / 3600).toFixed(1);
      const div = document.createElement('div');
      div.className = 'toast show offline-toast';
      div.innerHTML = `💤 Mientras no estabas (${hrs}h): +${G.fmt(off.gold)} 🪙, +${G.fmt(off.rep)} 🏅`;
      document.getElementById('toast-zone').appendChild(div);
      setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 400); }, 5000);
    }
  }

  // --- Simulación (independiente del render) ---
  let lastSim = performance.now();
  let saveTimer = 0;
  let lastRunning = G.state.dungeon.running;
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(1.0, (now - lastSim) / 1000);
    lastSim = now;
    G.tick(dt);
    if (lastRunning !== G.state.dungeon.running) {
      lastRunning = G.state.dungeon.running;
      rerenderActive();
    }
    saveTimer += dt;
    if (saveTimer >= 5) { saveTimer = 0; G.save(); }
  }, 200);

  // --- Render del HUD ---
  function frame() {
    refreshHUD();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('beforeunload', () => G.save());
  window.GB = G; // consola de depuración
}

boot();
