// ============================================================
// Guildbound (beta web) — datos y constantes de economía
// TODOS los números de economía son PLACEHOLDER: pendientes de
// la pasada de modelo económico en hoja de cálculo (ver CLAUDE.md).
// ============================================================

export const RARITIES = [
  { id: 'common',    name: 'Común',      color: '#9aa5b1', aura: null,        statMult: 1.00, weight: 55 },
  { id: 'uncommon',  name: 'Infrecuente',color: '#5cb85c', aura: null,        statMult: 1.25, weight: 27 },
  { id: 'rare',      name: 'Raro',       color: '#3f8efc', aura: '#3f8efc',   statMult: 1.60, weight: 12 },
  { id: 'epic',      name: 'Épico',      color: '#a855f7', aura: '#a855f7',   statMult: 2.10, weight: 4.5 },
  { id: 'legendary', name: 'Legendario', color: '#f59e0b', aura: '#f59e0b',   statMult: 2.80, weight: 1.3 },
  { id: 'mythic',    name: 'Mítico',     color: '#ef4444', aura: '#ff6b6b',   statMult: 3.80, weight: 0.2 },
];

// Índice de rareza máxima desbloqueada por Era (0-based en RARITIES)
// Era 1 → hasta Épico; cada Era nueva desbloquea un tier.
export const RARITY_CAP_BY_ERA = [3, 4, 5, 5];

export const ARCHETYPES = [
  {
    id: 'warrior', name: 'Guerrero', role: 'Tanque',
    desc: 'Primera línea. Absorbe daño y protege a la retaguardia.',
    baseStats: { hp: 220, atk: 18, def: 24, spd: 8 },
    position: 'front',
  },
  {
    id: 'mage', name: 'Maga', role: 'Daño mágico',
    desc: 'Retaguardia. Daño en área devastador pero frágil.',
    baseStats: { hp: 110, atk: 34, def: 8, spd: 10 },
    position: 'back',
  },
  {
    id: 'rogue', name: 'Pícaro', role: 'Daño físico',
    desc: 'Línea media. Golpes críticos rápidos a objetivos únicos.',
    baseStats: { hp: 140, atk: 28, def: 12, spd: 16 },
    position: 'mid',
  },
  {
    id: 'cleric', name: 'Clériga', role: 'Sanadora',
    desc: 'Retaguardia. Mantiene al equipo en pie en corridas largas.',
    baseStats: { hp: 150, atk: 12, def: 14, spd: 9 },
    position: 'back',
  },
  {
    id: 'ranger', name: 'Montaraz', role: 'Daño a distancia',
    desc: 'Línea media. Daño constante y fiable a cualquier fila.',
    baseStats: { hp: 130, atk: 26, def: 10, spd: 13 },
    position: 'mid',
  },
];

// Sinergias de equipo (formación de 3): esto es lo que da decisiones
// de build reales (pilar de diseño nº1).
export const SYNERGIES = [
  {
    id: 'muro-clasico', name: 'Muro Clásico',
    combo: ['warrior', 'cleric', 'mage'],
    desc: 'Guerrero + Clériga + Maga: formación libro de texto.',
    bonus: { hpMult: 1.25, atkMult: 1.10 },
  },
  {
    id: 'cuchillas-gemelas', name: 'Cuchillas en la Niebla',
    combo: ['rogue', 'rogue', 'ranger'],
    desc: 'Dos Pícaros + Montaraz: velocidad y críticos brutales.',
    bonus: { atkMult: 1.35, spdMult: 1.20 },
  },
  {
    id: 'tormenta-arcana', name: 'Tormenta Arcana',
    combo: ['mage', 'mage', 'cleric'],
    desc: 'Dos Magas + Clériga: bombardeo sostenido.',
    bonus: { atkMult: 1.30, hpMult: 1.05 },
  },
  {
    id: 'caceria', name: 'Cacería Coordinada',
    combo: ['ranger', 'ranger', 'warrior'],
    desc: 'Dos Montaraces + Guerrero: fuego de cobertura tras el escudo.',
    bonus: { atkMult: 1.20, defMult: 1.20 },
  },
  {
    id: 'vanguardia', name: 'Vanguardia de Hierro',
    combo: ['warrior', 'warrior', 'cleric'],
    desc: 'Dos Guerreros + Clériga: avance lento pero imparable.',
    bonus: { hpMult: 1.40, defMult: 1.25 },
  },
];

// Eras del Gremio (prestigio). El multiplicador es permanente y acumulativo.
export const ERAS = [
  {
    id: 1, name: 'Gremio Fundacional',
    desc: 'Un puñado de aventureros y un tablón de anuncios.',
    unlockDepth: 0, prestigeMult: 1,
    biome: { name: 'Catacumbas Olvidadas', sky: '#1a1626', ground: '#3d3450', accent: '#7c6f98' },
  },
  {
    id: 2, name: 'Gremio Renombrado',
    desc: 'Vuestro estandarte ya se reconoce en tres provincias.',
    unlockDepth: 25, prestigeMult: 2.5,
    biome: { name: 'Bosque Hundido', sky: '#0f2418', ground: '#1e4530', accent: '#4a9e6b' },
  },
  {
    id: 3, name: 'Gremio Legendario',
    desc: 'Los bardos componen canciones sobre vuestras gestas.',
    unlockDepth: 60, prestigeMult: 6,
    biome: { name: 'Desierto de Cristal', sky: '#2b1d0e', ground: '#5c4322', accent: '#d4a24e' },
  },
  {
    id: 4, name: 'Orden Mítica',
    desc: 'Ya no sois un gremio: sois una leyenda viviente.',
    unlockDepth: 110, prestigeMult: 15,
    biome: { name: 'Abismo Estelar', sky: '#0d0a2b', ground: '#241d5c', accent: '#6c5ce7' },
  },
];

// --- Economía ---
export const ECON = {
  // Generación pasiva base por segundo
  goldPerSec: 2.0,           // Aumentado para un inicio más fluido
  repPerSec: 0.1,            // Aumentado
  // Tokens de reclutamiento: se ganan por profundidad de mazmorra y logros
  tokensPerBossFloor: 2,     // 2 tokens por jefe (ayuda al gacha inicial)
  pullCostTokens: 10,
  pityThreshold: 30,         // pulls sin Épico+ → Épico+ garantizado (bajado de 40 a 30)
  // Mazmorra
  floorTimeSec: 5,           // duración base de un piso (ligeramente más rápido)
  bossEvery: 5,
  enemyPowerBase: 50,        // Inicio algo más fácil
  enemyPowerGrowth: 1.12,    // Crecimiento exponencial más suave (retrasar el muro brutal)
  goldPerFloorBase: 12,      // Más oro en mazmorra
  goldPerFloorGrowth: 1.15,  // El oro crece un poco mejor que antes
  repPerFloor: 1.0,          // Más reputación en mazmorra
  // Héroes
  levelCostBase: 30,         // Coste base ligeramente mayor pero con mejor economía global
  levelCostGrowth: 1.18,     // Crecimiento del coste un poco más suave
  levelStatGain: 0.08,       // +8% stats por nivel (hace que subir de nivel impacte más)
  starStatGain: 0.20,        // +20% stats por estrella (hace que los duplicados sean más gratificantes)
  maxStars: 5,
  // Progreso offline
  offlineCapHours: 12,       // Aumentado a 12 horas para mejor QoL
  offlineEfficiency: 0.75,   // Eficiencia mejorada al 75%
};

// --- Equipamiento ---
export const EQUIPMENT_TYPES = ['arma', 'armadura'];
export const EQUIPMENT_TIERS = [
  { id: 'wood', name: 'Madera', mult: 1.1 },
  { id: 'iron', name: 'Hierro', mult: 1.3 },
  { id: 'steel', name: 'Acero', mult: 1.6 },
  { id: 'mithril', name: 'Mitrilo', mult: 2.1 }
];
export const EQUIPMENT_ITEMS = [
  { id: 'sword', type: 'arma', name: 'Espada de', stats: { atk: 15, spd: 2 } },
  { id: 'staff', type: 'arma', name: 'Báculo de', stats: { atk: 22, spd: 0 } },
  { id: 'bow', type: 'arma', name: 'Arco de', stats: { atk: 18, spd: 5 } },
  { id: 'dagger', type: 'arma', name: 'Daga de', stats: { atk: 12, spd: 10 } },
  { id: 'plate', type: 'armadura', name: 'Coraza de', stats: { hp: 50, def: 15 } },
  { id: 'robe', type: 'armadura', name: 'Túnica de', stats: { hp: 20, def: 5, spd: 4 } },
  { id: 'leather', type: 'armadura', name: 'Cuero de', stats: { hp: 35, def: 8, spd: 8 } }
];

export const STORAGE_KEY = 'guildbound-beta-save-v1';
