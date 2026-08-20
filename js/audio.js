// ============================================================
// Audio: música de ambiente + SFX (pack CC0 Ninja Adventure).
// La música arranca tras el primer gesto del usuario (política
// de autoplay). Mute persistido en localStorage.
// ============================================================

const MUSIC = {
  tavern: 'assets/music/theme-1.ogg',
  dungeon: 'assets/music/theme-3.ogg',
  boss: 'assets/music/theme-7.ogg',
  era: 'assets/music/theme-11.ogg',
};

// SFX mapeados a números del pack (elegidos por rol; ajustables)
const SFX = {
  click: 'assets/sfx/18.ogg',
  coin: 'assets/sfx/5.ogg',
  hit: 'assets/sfx/12.ogg',
  levelup: 'assets/sfx/21.ogg',
  capsule: 'assets/sfx/8.ogg',
  reveal: 'assets/sfx/25.ogg',
  boss: 'assets/sfx/alert.ogg',
};

let current = null;
let currentName = null;
let unlocked = false;
let muted = localStorage.getItem('gb-muted') === '1';
const sfxCache = new Map();

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('gb-muted', muted ? '1' : '0');
  if (current) current.volume = muted ? 0 : 0.35;
  return muted;
}

// Debe llamarse en el primer click/tap
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (currentName) playMusic(currentName, true);
}

export function playMusic(name, force = false) {
  if (name === currentName && !force) return;
  currentName = name;
  if (!unlocked) return;
  const src = MUSIC[name];
  if (!src) return;
  const next = new Audio(src);
  next.loop = true;
  next.volume = 0;
  next.play().catch(() => {});
  // crossfade sencillo
  const old = current;
  current = next;
  const target = muted ? 0 : 0.35;
  let k = 0;
  const iv = setInterval(() => {
    k += 0.06;
    next.volume = Math.min(target, target * k);
    if (old) old.volume = Math.max(0, target * (1 - k));
    if (k >= 1) { clearInterval(iv); old?.pause(); }
  }, 60);
}

export function sfx(name, volume = 0.5) {
  if (muted || !unlocked) return;
  const src = SFX[name];
  if (!src) return;
  let pool = sfxCache.get(name);
  if (!pool) { pool = []; sfxCache.set(name, pool); }
  let a = pool.find(x => x.paused || x.ended);
  if (!a) {
    if (pool.length >= 4) return;
    a = new Audio(src);
    pool.push(a);
  }
  a.volume = volume;
  a.currentTime = 0;
  a.play().catch(() => {});
}
