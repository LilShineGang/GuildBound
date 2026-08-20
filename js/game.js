// ============================================================
// Guildbound (beta web) — lógica de juego
// ============================================================
import { RARITIES, RARITY_CAP_BY_ERA, ARCHETYPES, SYNERGIES, ERAS, ECON, STORAGE_KEY, EQUIPMENT_TIERS, EQUIPMENT_ITEMS } from './data.js';

let nextHeroId = 1;
let nextEquipId = 1;

export const state = {
  gold: 0,
  reputation: 0,
  tokens: 20,            // arranque: 2 pulls gratis
  heroes: [],            // { id, archetype, rarity, stars, level, equipment: { arma: null, armadura: null } }
  inventory: [],         // { id, baseId, tierId }
  team: [null, null, null], // ids de héroes (formación de 3)
  dungeon: {
    running: false,
    floor: 0,            // piso actual dentro de la corrida
    bestDepth: 0,        // mejor profundidad de esta Era
    floorProgress: 0,    // 0..1 del piso actual
    log: [],
    // Dragon Quest style variables
    combat: {
        active: false,
        enemyHp: 0,
        enemyMaxHp: 0,
        enemyName: '',
        enemyMon: 0,
        party: [] // { hero, hp, maxHp }
    }
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
export function equipStats(equipId) {
    if (!equipId) return null;
    const invItem = state.inventory.find(i => i.id === equipId);
    if (!invItem) return null;
    const base = EQUIPMENT_ITEMS.find(i => i.id === invItem.baseId);
    const tier = EQUIPMENT_TIERS.find(t => t.id === invItem.tierId);
    if (!base || !tier) return null;

    const s = {};
    for (const [k, v] of Object.entries(base.stats)) {
        s[k] = Math.round(v * tier.mult * globalMult());
    }
    return { name: `${base.name} ${tier.name}`, stats: s, type: base.type };
}

export function heroStats(hero) {
  const arch = archetypeById(hero.archetype);
  const rar = rarityById(hero.rarity);
  const mult = rar.statMult
    * (1 + ECON.levelStatGain * (hero.level - 1))
    * (1 + ECON.starStatGain * hero.stars);
  const s = {};
  for (const [k, v] of Object.entries(arch.baseStats)) s[k] = Math.round(v * mult);

  // Añadir stats de equipo si tiene
  if (hero.equipment) {
      if (hero.equipment.arma) {
          const w = equipStats(hero.equipment.arma);
          if (w) for (const [k, v] of Object.entries(w.stats)) s[k] = (s[k] || 0) + v;
      }
      if (hero.equipment.armadura) {
          const a = equipStats(hero.equipment.armadura);
          if (a) for (const [k, v] of Object.entries(a.stats)) s[k] = (s[k] || 0) + v;
      }
  }

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

  // Bonus de rol: dar más importancia al rol según las stats base
  // Tanques (alta vida/defensa) absorben más, Daño pega más, Healers escalan con el total.
  for (const h of members) {
    const s = heroStats(h);
    const arch = archetypeById(h.archetype);

    // Multiplicadores por posición para simular roles en combate automático
    let hpMult = 1, atkMult = 1, defMult = 1;
    if (arch.position === 'front') {
      hpMult = 1.3; // Tanques aguantan más
      defMult = 1.3;
    } else if (arch.position === 'back' && arch.role !== 'Sanadora') {
      atkMult = 1.3; // DPS frágiles pero pegan duro
    } else if (arch.role === 'Sanadora') {
      // Healers aumentan el HP efectivo de todo el equipo
      hp += s.atk * 2.5;
    }

    hp += s.hp * hpMult;
    atk += s.atk * atkMult;
    def += s.def * defMult;
    spd += s.spd;
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
  const hero = { id: nextHeroId++, archetype: archetype.id, rarity: rarity.id, stars: 0, level: 1, equipment: { arma: null, armadura: null } };
  state.heroes.push(hero);
  return { hero, isNew: true, rarity, archetype };
}

// ---------- Equipamiento (acciones) ----------
export function unequipItem(heroId, type) {
    const hero = heroById(heroId);
    if (!hero || !hero.equipment || !hero.equipment[type]) return false;
    hero.equipment[type] = null;
    return true;
}

export function equipItem(heroId, equipId) {
    const hero = heroById(heroId);
    const item = state.inventory.find(i => i.id === equipId);
    if (!hero || !item) return false;

    if (!hero.equipment) hero.equipment = { arma: null, armadura: null };

    const base = EQUIPMENT_ITEMS.find(i => i.id === item.baseId);
    if (!base) return false;

    // Si ya alguien más lo tiene equipado, se lo quitamos
    for (const h of state.heroes) {
        if (h.equipment) {
            if (h.equipment.arma === equipId) h.equipment.arma = null;
            if (h.equipment.armadura === equipId) h.equipment.armadura = null;
        }
    }

    hero.equipment[base.type] = equipId;
    return true;
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

  // Inicializar party
  state.dungeon.combat.party = state.team.filter(Boolean).map(id => {
      const h = heroById(id);
      const s = heroStats(h);
      return { hero: h, hp: s.hp, maxHp: s.hp, stats: s, turnCd: 0 };
  });
  state.dungeon.combat.active = false;
  return true;
}

export function stopRun() {
  state.dungeon.running = false;
  state.dungeon.floorProgress = 0;
  state.dungeon.combat.active = false;
}

function log(msg) {
  state.dungeon.log.push(msg);
  if (state.dungeon.log.length > 30) state.dungeon.log.shift();
}

function spawnEnemy(floor) {
    const isBoss = floor % ECON.bossEvery === 0;
    const ep = enemyPowerAt(floor);
    // Convertir el poder enemigo en HP/Atk rudimentario
    const maxHp = Math.round(ep * (isBoss ? 4 : 1.5));
    const atk = Math.round(ep * 0.2);

    state.dungeon.combat.active = true;
    state.dungeon.combat.enemyHp = maxHp;
    state.dungeon.combat.enemyMaxHp = maxHp;
    state.dungeon.combat.enemyName = isBoss ? 'Guardián del Bioma' : 'Monstruo Local';
    state.dungeon.combat.enemyStats = { hp: maxHp, atk, def: Math.round(ep * 0.1), spd: 10 };
    state.dungeon.combat.enemyTurnCd = 0;
}

// Avanza la mazmorra dt segundos
function tickDungeon(dt) {
  const d = state.dungeon;
  if (!d.running) return;

  if (!d.combat.active) {
      // Avanzar por el pasillo
      d.floorProgress += (dt / ECON.floorTimeSec) * 2; // Más rápido fuera de combate
      if (d.floorProgress >= 0.9) {
          spawnEnemy(d.floor);
      }
      return;
  }

  // == LÓGICA DE COMBATE (Estilo JRPG) ==
  let combatResolved = false;

  // Héroes atacan
  for (const pm of d.combat.party) {
      if (pm.hp <= 0) continue;
      pm.turnCd += dt * pm.stats.spd;
      if (pm.turnCd >= 20) {
          pm.turnCd = 0;
          const arch = archetypeById(pm.hero.archetype);

          if (arch.role === 'Sanadora') {
              // Curar al que tenga menos HP
              const target = d.combat.party.reduce((prev, curr) => (curr.hp > 0 && (curr.hp / curr.maxHp) < (prev.hp / prev.maxHp)) ? curr : prev, pm);
              if (target.hp < target.maxHp) {
                  const heal = Math.round(pm.stats.atk * 1.5);
                  target.hp = Math.min(target.maxHp, target.hp + heal);
                  log(`✨ ${arch.name} cura ${heal} HP a ${archetypeById(target.hero.archetype).name}.`);
              } else {
                  // Si todos están full, ataca
                  const dmg = Math.max(1, pm.stats.atk - d.combat.enemyStats.def);
                  d.combat.enemyHp -= dmg;
              }
          } else {
              // Ataque normal o habilidad
              let dmg = Math.max(1, pm.stats.atk - d.combat.enemyStats.def);
              if (Math.random() < 0.2) { // 20% crit/habilidad
                  dmg = Math.round(dmg * 1.8);
                  if (arch.role === 'Daño físico') log(`🗡️ ¡Critico! ${arch.name} inflige ${dmg} de daño.`);
                  else if (arch.role === 'Daño mágico') log(`🔥 ${arch.name} desata magia infligiendo ${dmg} de daño.`);
              }
              d.combat.enemyHp -= dmg;
          }

          if (d.combat.enemyHp <= 0) {
              combatResolved = true;
              break;
          }
      }
  }

  // Enemigo ataca si no ha muerto
  if (!combatResolved && d.combat.active) {
      d.combat.enemyTurnCd += dt * d.combat.enemyStats.spd;
      if (d.combat.enemyTurnCd >= 20) {
          d.combat.enemyTurnCd = 0;
          // Buscar un objetivo vivo, priorizando tanques (probabilidad)
          const alive = d.combat.party.filter(p => p.hp > 0);
          if (alive.length > 0) {
              // Favorecer al tanque
              let target = alive[Math.floor(Math.random() * alive.length)];
              const tanks = alive.filter(p => archetypeById(p.hero.archetype).role === 'Tanque');
              if (tanks.length > 0 && Math.random() < 0.6) target = tanks[Math.floor(Math.random() * tanks.length)];

              const dmg = Math.max(1, d.combat.enemyStats.atk - target.stats.def);
              target.hp -= dmg;

              if (target.hp <= 0) {
                  log(`☠️ ${archetypeById(target.hero.archetype).name} ha caído.`);
              }
          }
      }
  }

  // Verificar derrota total
  if (d.combat.party.every(p => p.hp <= 0)) {
      d.running = false;
      log(`🛑 Piso ${d.floor}: El equipo ha sido derrotado. Fin de la expedición.`);
      return;
  }

  // Enemigo derrotado
  if (combatResolved) {
      d.combat.active = false;
      d.floorProgress = 0;

      const rw = floorRewards(d.floor);
      state.gold += rw.gold;
      state.reputation += rw.rep;
      if (rw.tokens > 0) {
        state.tokens += rw.tokens;
        let dropMsg = '';
        if (Math.random() < 0.4) {
            const b = EQUIPMENT_ITEMS[Math.floor(Math.random() * EQUIPMENT_ITEMS.length)];
            const maxTier = Math.min(EQUIPMENT_TIERS.length - 1, state.era - 1);
            const t = EQUIPMENT_TIERS[Math.floor(Math.random() * (maxTier + 1))];
            state.inventory.push({ id: nextEquipId++, baseId: b.id, tierId: t.id });
            dropMsg = ` 🎁 ¡Encontraste ${b.name} ${t.name}!`;
            // Pequeño evento para avisar a la UI
            d.lastDrop = { name: `${b.name} ${t.name}`, baseId: b.id, time: Date.now() };
        }
        log(`👑 Piso ${d.floor} superado: +${rw.gold} oro, +${rw.tokens} ficha(s).${dropMsg}`);
      }

      if (d.floor > d.bestDepth) d.bestDepth = d.floor;
      d.floor += 1;

      // Curación natural entre pisos
      d.combat.party.forEach(p => { if (p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.1)); });
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
  const data = { ...state, _nextHeroId: nextHeroId, _nextEquipId: nextEquipId };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    nextHeroId = data._nextHeroId ?? 1;
    nextEquipId = data._nextEquipId ?? 1;
    delete data._nextHeroId;
    delete data._nextEquipId;
    Object.assign(state, data);

    // Migración de guardados antiguos: asegurarse que existe el inventario y equipamiento en héroes
    if (!state.inventory) state.inventory = [];
    for (const h of state.heroes) {
        if (!h.equipment) h.equipment = { arma: null, armadura: null };
    }
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
