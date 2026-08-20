// ============================================================
// Gestor de pantallas: transiciones con fundido + splash del
// nombre de sección, y pantalla de carga inicial con progreso.
// ============================================================
import * as audio from './audio.js';

const SECTION_TITLES = {
  tavern: 'La Taberna del Gremio',
  heroes: 'Salón de Héroes',
  dungeon: 'Expediciones',
  recruit: 'Reclutamiento',
  era: 'Estandarte del Gremio',
  guild: 'Crónica del Gremio',
};

let overlay = null;
let currentScreen = null;
const builders = new Map();

export function registerScreen(name, builder) { builders.set(name, builder); }
export function activeScreen() { return currentScreen; }

export function switchScreen(name, root) {
  const title = SECTION_TITLES[name] ?? '';
  transition(title, () => {
    currentScreen = name;
    root.innerHTML = '';
    root.dataset.screen = name;
    builders.get(name)?.(root);
    // música por pantalla
    if (name === 'tavern') audio.playMusic('tavern');
    else if (name === 'dungeon') audio.playMusic('dungeon');
    else if (name === 'era') audio.playMusic('era');
  });
}

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'transition-overlay';
  overlay.innerHTML = `<div class="tr-title"></div><div class="tr-orn">✦ ✦ ✦</div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function transition(title, mid) {
  const ov = ensureOverlay();
  ov.querySelector('.tr-title').textContent = title;
  ov.classList.add('active');
  setTimeout(() => {
    mid();
    setTimeout(() => ov.classList.remove('active'), 420);
  }, 380);
}

// ---------- Pantalla de carga inicial ----------
const TIPS = [
  'Las sinergias de formación dan bonus reales: prueba Guerrero + Clériga + Maga.',
  'Cada 5 pisos, un jefe custodia fichas de reclutamiento.',
  'Los duplicados no se pierden: suben estrellas (+15% de stats).',
  'Declarar una Nueva Era reinicia la corrida… pero el multiplicador es para siempre.',
  'El gremio sigue generando recursos aunque cierres el juego.',
  'Épico o superior garantizado cada 40 reclutamientos.',
];

export function showBootScreen() {
  const boot = document.createElement('div');
  boot.id = 'boot-screen';
  boot.innerHTML = `
    <div class="boot-inner">
      <h1 class="boot-title">GUILDBOUND</h1>
      <div class="boot-sub">— La Taberna del Gremio —</div>
      <div class="boot-bar"><div class="boot-fill"></div></div>
      <div class="boot-pct">0%</div>
      <div class="boot-tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div>
    </div>`;
  document.body.appendChild(boot);
  return {
    progress(p) {
      boot.querySelector('.boot-fill').style.width = `${Math.round(p * 100)}%`;
      boot.querySelector('.boot-pct').textContent = `${Math.round(p * 100)}%`;
    },
    done() {
      boot.querySelector('.boot-pct').textContent = 'Pulsa para entrar';
      boot.classList.add('ready');
      return new Promise(res => {
        boot.addEventListener('pointerdown', () => {
          audio.unlock();
          boot.classList.add('closing');
          setTimeout(() => { boot.remove(); res(); }, 500);
        }, { once: true });
      });
    },
  };
}
