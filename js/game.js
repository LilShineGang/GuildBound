// ============================================================
// Guildbound (beta web) — lógica de juego
// ============================================================
import { RARITIES, RARITY_CAP_BY_ERA, ARCHETYPES, SYNERGIES, ERAS, ECON, STORAGE_KEY } from './data.js';

let nextHeroId = 1;

export const state = {
  gold: 0,
  reputation: 0,
  tokens: 20,            // arranque: 2 pulls gratis
  heroes: [],            // { id, archetype, rarity, stars, level }
  team: [null, null, null], // ids de héroes (formación de 3)
  dungeon: {
    running: false,
    floor: 0,            // piso actual dentro de la corrida
    bestDepth: 0,        // mejor profundidad de esta Era
    floorProgress: 0,    // 0..1 del piso actual
    log: [],
  },
  era: 1,
  lifetimePrestigeMult: 1,
  pityCounter: 0,
  totalPulls: 0,
  lastSeen: Date.now(),
  eraHistory: [],        // [{era, depth, when}] — narrativa del gremio
};

// ---------- Utilidades ----------
export function eraData() { return ERAS[Math.min(state.era, ERAS.length) - 1]; }
export function nextEraData() { return state.era < ERAS.length ? ERAS[state.era] : null; }
export function rarityById(id) { return RARITIES.find(r => r.id === id); }
export function archetypeById(id) { return ARCHETYPES.find(a => a.id === id); }
export function heroById(id) { return state.heroes.find(h => h.id === id); }

export function globalMult() { return state.lifetimePrestigeMult; }

// ---------- Héroes ----------
export function heroStats(hero) {
  const arch = archetypeById(hero.archetype);
  const rar = rarityById(hero.rarity);
  const mult = rar.statMult
    * (1 + ECON.levelStatGain * (hero.level - 1))
    * (1 + ECON.starStatGain * hero.stars);
  const s = {};
  for (const [k, v] of Object.entries(arch.baseStats)) s[k] = Math.round(v * mult);
  return s;
}

export function heroPower(hero) {
  const s = heroStats(hero);
  return Math.round(s.hp * 0.25 + s.atk * 3 + s.def * 2 + s.spd * 1.5);
}

export function levelUpCost(hero) {
  return Math.ceil(ECON.levelCostBase * Math.pow(ECON.levelCostGrowth, hero.level - 1));
}

export function levelUpHero(id) {
  const h = heroById(id);
  if (!h) return false;
  const cost = levelUpCost(h);
  if (state.gold < cost) return false;
  state.gold -= cost;
  h.level += 1;
  return true;
}

// ---------- Equipo y sinergias ----------
export function activeSynergy() {
  const archs = state.team.filter(Boolean).map(id => heroById(id)?.archetype).filter(Boolean);
  if (archs.length < 3) return null;
  for (const syn of SYNERGIES) {
    const need = [...syn.combo];
    const have = [...archs];
    let ok = true;
    for (const n of need) {
      const i = have.indexOf(n);
      if (i === -1) { ok = false; break; }
      have.splice(i, 1);
    }
    if (ok) return syn;
  }
  return null;
}

export function teamPower() {
  const members = state.team.filter(Boolean).map(heroById).filter(Boolean);
  if (members.length === 0) return 0;
  let hp = 0, atk = 0, def = 0, spd = 0;
  for (const h of members) {
    const s = heroStats(h);
    hp += s.hp; atk += s.atk; def += s.def; spd += s.spd;
  }
  const syn = activeSynergy();
  if (syn) {
    hp *= syn.bonus.hpMult ?? 1;
    atk *= syn.bonus.atkMult ?? 1;
    def *= syn.bonus.defMult ?? 1;
    spd *= syn.bonus.spdMult ?? 1;
  }
  return Math.round((hp * 0.25 + atk * 3 + def * 2 + spd * 1.5) * globalMult());
}

// ---------- Gacha ----------
export function pullCost() { return ECON.pullCostTokens; }

export function canPull() { return state.tokens >= pullCost(); }

function rollRarity() {
  const cap = RARITY_CAP_BY_ERA[Math.min(state.era, RARITY_CAP_BY_ERA.length) - 1];
  const pool = RARITIES.slice(0, cap + 1);
  // Pity: garantiza Épico+ tras N pulls sin ninguno
  if (state.pityCounter >= ECON.pityThreshold - 1) {
    const epicPlus = pool.filter(r => RARITIES.indexOf(r) >= 3);
    return epicPlus[Math.floor(Math.random() * epicPlus.length)] ?? pool[pool.length - 1];
  }
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of pool) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return pool[0];
}

// Ejecuta un pull. Devuelve { hero, isNew, rarity, archetype }
export function doPull() {
  if (!canPull()) return null;
  state.tokens -= pullCost();
  state.totalPulls += 1;
  const rarity = rollRarity();
  const isEpicPlus = RARITIES.indexOf(rarity) >= 3;
  state.pityCounter = isEpicPlus ? 0 : state.pityCounter + 1;
  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  // Duplicado: mismo arquetipo + misma rareza → estrella
  const dup = state.heroes.find(h => h.archetype === archetype.id && h.rarity === rarity.id);
  if (dup && dup.stars < ECON.maxStars) {
    dup.stars += 1;
    return { hero: dup, isNew: false, rarity, archetype };
  }
  if (dup) {
    // estrellas al máximo: compensación en oro (placeholder)
    state.gold += 200 * (RARITIES.indexOf(rarity) + 1);
    return { hero: dup, isNew: false, rarity, archetype, maxed: true };
  }
  const hero = { id: nextHeroId++, archetype: archetype.id, rarity: rarity.id, stars: 0, level: 1 };
  state.heroes.push(hero);
  return { hero, isNew: true, rarity, archetype };
}

// ---------- Mazmorra (auto-battle v0: comparación de poder) ----------
export function enemyPowerAt(floor) {
  return Math.round(ECON.enemyPowerBase * Math.pow(ECON.enemyPowerGrowth, floor - 1));
}

export function floorRewards(floor) {
  const mult = globalMult();
  return {
    gold: Math.round(ECON.goldPerFloorBase * Math.pow(ECON.goldPerFloorGrowth, floor - 1) * mult),
    rep: ECON.repPerFloor * floor * 0.2 * mult,
    tokens: floor % ECON.bossEvery === 0 ? ECON.tokensPerBossFloor : 0,
  };
}

export function startRun() {
  if (state.team.filter(Boolean).length === 0) return false;
  state.dungeon.running = true;
  state.dungeon.floor = 1;
  state.dungeon.floorProgress = 0;
  state.dungeon.log = [`La expedición entra en ${eraData().biome.name}...`];
  return true;
}

export function stopRun() {
  state.dungeon.running = false;
  state.dungeon.floorProgress = 0;
}

function log(msg) {
  state.dungeon.log.push(msg);
  if (state.dungeon.log.length > 30) state.dungeon.log.shift();
}

// Avanza la mazmorra dt segundos. Devuelve eventos para la UI.
function tickDungeon(dt) {
  const d = state.dungeon;
  if (!d.running) return;
  const tp = teamPower();
  const ep = enemyPowerAt(d.floor);
  if (tp <= ep) {
    // El muro: la corrida termina
    d.running = false;
    log(`⚔️ Piso ${d.floor}: el enemigo (poder ${fmt(ep)}) supera al equipo (${fmt(tp)}). Retirada.`);
    return;
  }
  // Velocidad de piso: mejor equipo relativo → más rápido (cap x4)
  const speed = Math.min(4, Math.sqrt(tp / ep));
  d.floorProgress += (dt / ECON.floorTimeSec) * speed;
  while (d.floorProgress >= 1) {
    d.floorProgress -= 1;
    const rw = floorRewards(d.floor);
    state.gold += rw.gold;
    state.reputation += rw.rep;
    if (rw.tokens > 0) {
      state.tokens += rw.tokens;
      log(`👑 Piso ${d.floor} (JEFE): +${rw.gold} oro, +${rw.tokens} ficha(s) de reclutamiento`);
    }
    if (d.floor > d.bestDepth) d.bestDepth = d.floor;
    d.floor += 1;
    const nep = enemyPowerAt(d.floor);
    if (tp <= nep) {
      d.running = false;
      log(`🛑 Piso ${d.floor}: poder enemigo ${fmt(nep)} > equipo ${fmt(tp)}. Fin de la corrida (mejor: ${d.bestDepth}).`);
      break;
    }
  }
}

// ---------- Eras (prestigio) ----------
export function canPrestige() {
  const next = nextEraData();
  return next !== null && state.dungeon.bestDepth >= next.unlockDepth;
}

export function prestigeInfo() {
  const next = nextEraData();
  if (!next) return null;
  return { next, needDepth: next.unlockDepth, haveDepth: state.dungeon.bestDepth, newMult: next.prestigeMult };
}

export function declareNewEra() {
  if (!canPrestige()) return false;
  const next = nextEraData();
  state.eraHistory.push({ era: state.era, name: eraData().name, depth: state.dungeon.bestDepth, when: Date.now() });
  state.era += 1;
  state.lifetimePrestigeMult = next.prestigeMult;
  // Reset de la corrida actual (los héroes se conservan: convención del género)
  state.gold = 0;
  state.reputation = 0;
  state.tokens = 20;
  state.dungeon = { running: false, floor: 0, bestDepth: 0, floorProgress: 0, log: [`🏛️ ${next.name}: una nueva era comienza en ${next.biome.name}.`] };
  state.pityCounter = 0;
  return true;
}

// ---------- Tick principal + offline ----------
export function tick(dt) {
  const mult = globalMult();
  state.gold += ECON.goldPerSec * mult * dt;
  state.reputation += ECON.repPerSec * mult * dt;
  tickDungeon(dt);
  state.lastSeen = Date.now();
}

// Progreso offline: recursos pasivos a eficiencia reducida (sin mazmorra).
export function applyOfflineProgress() {
  const elapsed = (Date.now() - state.lastSeen) / 1000;
  if (elapsed < 30) return null;
  const capped = Math.min(elapsed, ECON.offlineCapHours * 3600);
  const eff = ECON.offlineEfficiency * globalMult();
  const gold = ECON.goldPerSec * eff * capped;
  const rep = ECON.repPerSec * eff * capped;
  state.gold += gold;
  state.reputation += rep;
  return { seconds: capped, gold, rep };
}

// ---------- Guardado ----------
let resetting = false;

export function save() {
  if (resetting) return; // evita que beforeunload re-guarde tras un hardReset
  const data = { ...state, _nextHeroId: nextHeroId };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    nextHeroId = data._nextHeroId ?? 1;
    delete data._nextHeroId;
    Object.assign(state, data);
    if (!Array.isArray(state.team) || state.team.length !== 3) state.team = [null, null, null];
    state.dungeon.running = false; // las corridas no persisten offline (v0)
    return true;
  } catch {
    return false;
  }
}

export function hardReset() {
  resetting = true;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ---------- Formato ----------
export function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}
