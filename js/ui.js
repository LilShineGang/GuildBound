// ============================================================
// Guildbound — UI v3: taberna-lobby + pantallas de sección
// con sprites profesionales del pack (ver assets/CREDITS.md).
// ============================================================
import { RARITIES, ARCHETYPES, SYNERGIES, ERAS, ECON } from './data.js';
import * as G from './game.js';
import * as A from './assets.js';
import * as audio from './audio.js';
import { registerScreen, switchScreen, activeScreen } from './screens.js';
import { buildTavern } from './tavern.js';
import { attachHeroCanvas, startTicker, facePortrait } from './heroVisual.js';
import { openGachapon } from './gachapon.js';
import { attachDungeonScene } from './dungeonScene.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

let screenRoot = null;
let selectedHeroId = null;

// ---------- Estructura ----------
export function buildUI() {
  document.body.innerHTML = `
    <header id="topbar">
      <div id="era-badge"></div>
      <div id="resources">
        <span class="res" title="Oro">🪙 <b id="res-gold">0</b></span>
        <span class="res" title="Reputación">🏅 <b id="res-rep">0</b></span>
        <span class="res" title="Fichas">🎟️ <b id="res-tokens">0</b></span>
        <button id="mute-btn" title="Sonido">${audio.isMuted() ? '🔇' : '🔊'}</button>
      </div>
    </header>
    <main id="screen-root"></main>
    <div id="toast-zone"></div>`;
  screenRoot = $('#screen-root');
  $('#mute-btn').addEventListener('click', () => {
    $('#mute-btn').textContent = audio.toggleMute() ? '🔇' : '🔊';
  });
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  registerScreen('tavern', root => buildTavern(root, G, goTo));
  registerScreen('heroes', root => section(root, 'Salón de Héroes', renderHeroes));
  registerScreen('dungeon', root => section(root, 'Expediciones', renderDungeon));
  registerScreen('recruit', root => section(root, 'Reclutamiento', renderRecruit));
  registerScreen('era', root => section(root, 'Estandarte del Gremio', renderEra));
  registerScreen('guild', root => section(root, 'Crónica del Gremio', renderGuild));

  startTicker();
  goTo('tavern');
}

export function goTo(name) { switchScreen(name, screenRoot); }

function section(root, title, renderFn) {
  const head = document.createElement('div');
  head.className = 'section-head';
  head.innerHTML = `
    <button class="btn-back">← Taberna</button>
    <h1 class="section-title">${title}</h1>
    <div class="section-orn">❖</div>`;
  head.querySelector('.btn-back').addEventListener('click', () => { audio.sfx('click'); goTo('tavern'); });
  root.appendChild(head);
  const body = document.createElement('div');
  body.className = 'section-body';
  root.appendChild(body);
  renderFn(body);
}

function rerenderSection() {
  const name = activeScreen();
  if (!name || name === 'tavern') return;
  const body = $('.section-body');
  if (!body) return;
  body.innerHTML = '';
  ({ heroes: renderHeroes, dungeon: renderDungeon, recruit: renderRecruit, era: renderEra, guild: renderGuild })[name]?.(body);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#toast-zone').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

// ---------- HUD ----------
export function refreshHUD() {
  const gold = $('#res-gold');
  if (!gold) return;
  gold.textContent = G.fmt(G.state.gold);
  $('#res-rep').textContent = G.fmt(G.state.reputation);
  $('#res-tokens').textContent = G.fmt(G.state.tokens);
  const era = G.eraData();
  $('#era-badge').innerHTML = `<span class="era-num">Era ${G.state.era}</span> ${era.name} <span class="era-mult">×${era.prestigeMult}</span>`;
  if (activeScreen() === 'dungeon') refreshDungeonLive();
}

export function rerenderActive() { rerenderSection(); }

// ---------- Crónica (Gremio) ----------
function renderGuild(p) {
  const era = G.eraData();
  const syn = G.activeSynergy();
  const teamCount = G.state.team.filter(Boolean).length;
  p.innerHTML = `
    <div class="card biome-card" style="--sky:${era.biome.sky};--accent:${era.biome.accent}">
      <h2>${era.name}</h2>
      <p class="muted">${era.desc}</p>
      <p>📍 Bioma: <b>${era.biome.name}</b> · Multiplicador permanente: <b>×${era.prestigeMult}</b></p>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>Producción pasiva</h3>
        <p>🪙 ${(ECON.goldPerSec * G.globalMult()).toFixed(1)}/s &nbsp; 🏅 ${(ECON.repPerSec * G.globalMult()).toFixed(2)}/s</p>
        <p class="muted">Se genera incluso con el juego cerrado (${Math.round(ECON.offlineEfficiency * 100)}%, máx. ${ECON.offlineCapHours}h).</p>
      </div>
      <div class="card">
        <h3>Estado del gremio</h3>
        <p>Héroes: <b>${G.state.heroes.length}</b> · Equipo: <b>${teamCount}/3</b> · Poder: <b>${G.fmt(G.teamPower())}</b></p>
        <p>Sinergia: ${syn ? `<b class="syn-active">✦ ${syn.name}</b>` : '<span class="muted">ninguna</span>'}</p>
        <p>Mejor profundidad: <b>${G.state.dungeon.bestDepth}</b></p>
      </div>
    </div>
    <div class="card">
      <h3>Crónica</h3>
      ${G.state.eraHistory.length === 0
        ? '<p class="muted">Vuestra historia está por escribir. Cada Era quedará registrada aquí.</p>'
        : G.state.eraHistory.map(h => `<p>📜 <b>${h.name}</b> — alcanzó el piso ${h.depth}.</p>`).join('')}
    </div>
    <div class="card muted small">
      Beta · guardado automático · <a href="#" id="hard-reset">reiniciar todo</a> ·
      arte CC0 «Ninja Adventure» de pixel-boy
    </div>`;
  $('#hard-reset').addEventListener('click', e => {
    e.preventDefault();
    if (confirm('¿Borrar TODO el progreso?')) G.hardReset();
  });
}

// ---------- Héroes ----------
function starStr(n) { return n > 0 ? '★'.repeat(n) : '—'; }

function renderHeroes(p) {
  const heroes = [...G.state.heroes].sort((a, b) =>
    RARITIES.findIndex(r => r.id === b.rarity) - RARITIES.findIndex(r => r.id === a.rarity) || b.level - a.level);
  p.innerHTML = `
    <div class="card">
      <h3>Equipo de expedición <span class="muted small">(toca héroe y luego hueco)</span></h3>
      <div id="team-row">${G.state.team.map((id, i) => teamSlotHTML(id, i)).join('')}</div>
      <div id="syn-info"></div>
    </div>
    <div id="hero-detail"></div>
    <div class="grid-heroes" id="hero-grid">
      ${heroes.length === 0 ? '<p class="muted">Aún no hay héroes. Pasa por la barra de la taberna.</p>' : heroes.map(heroCardHTML).join('')}
    </div>`;

  updateSynInfo();
  $$('.hero-card canvas, .team-slot canvas').forEach(c => {
    if (c.dataset.arch) attachHeroCanvas(c, c.dataset.arch, c.dataset.rar, 'walk');
  });
  $$('.hero-card').forEach(el => el.addEventListener('click', () => {
    audio.sfx('click');
    selectedHeroId = +el.dataset.id;
    $$('.hero-card').forEach(c => c.classList.toggle('selected', +c.dataset.id === selectedHeroId));
    renderHeroDetail();
    $('#hero-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  $$('.team-slot').forEach(el => el.addEventListener('click', () => {
    const i = +el.dataset.slot;
    audio.sfx('click');
    if (G.state.team[i]) { G.state.team[i] = null; rerenderSection(); }
    else if (selectedHeroId && !G.state.team.includes(selectedHeroId)) { G.state.team[i] = selectedHeroId; rerenderSection(); }
    else toast('Selecciona primero un héroe de la colección.');
  }));
  if (selectedHeroId) renderHeroDetail();
}

function teamSlotHTML(id, i) {
  const h = id ? G.heroById(id) : null;
  if (!h) return `<div class="team-slot empty" data-slot="${i}"><span>+</span></div>`;
  const arch = G.archetypeById(h.archetype);
  const rar = G.rarityById(h.rarity);
  return `<div class="team-slot" data-slot="${i}" data-rarity="${rar.id}">
    <canvas width="84" height="100" data-arch="${h.archetype}" data-rar="${h.rarity}"></canvas>
    <div class="slot-name" style="color:${rar.color}">${arch.name}</div>
  </div>`;
}

function heroCardHTML(h) {
  const arch = G.archetypeById(h.archetype);
  const rar = G.rarityById(h.rarity);
  const inTeam = G.state.team.includes(h.id);
  return `<div class="hero-card ${selectedHeroId === h.id ? 'selected' : ''}" data-id="${h.id}" data-rarity="${rar.id}">
    ${inTeam ? '<div class="in-team">EN EQUIPO</div>' : ''}
    <canvas width="110" height="120" data-arch="${h.archetype}" data-rar="${h.rarity}"></canvas>
    <div class="hc-name" style="color:${rar.color}">${arch.name}</div>
    <div class="hc-sub">${rar.name} · Nv ${h.level} · ${starStr(h.stars)}</div>
    <div class="hc-power">⚡ ${G.fmt(G.heroPower(h))}</div>
  </div>`;
}

function renderHeroDetail() {
  const h = G.heroById(selectedHeroId);
  const box = $('#hero-detail');
  if (!h || !box) { if (box) box.innerHTML = ''; return; }
  const arch = G.archetypeById(h.archetype);
  const rar = G.rarityById(h.rarity);
  const s = G.heroStats(h);
  const cost = G.levelUpCost(h);
  box.innerHTML = `
    <div class="card hero-panel" data-rarity="${rar.id}">
      <div class="hp-left">
        <div class="hp-face"></div>
        <canvas id="detail-canvas" width="170" height="200"></canvas>
      </div>
      <div class="hp-info">
        <h2 style="color:${rar.color}">${arch.name} <span class="hp-rarity">${rar.name}</span></h2>
        <p class="muted">${arch.desc}</p>
        <p><b>${arch.role}</b> · ${arch.position === 'front' ? 'Vanguardia' : arch.position === 'mid' ? 'Línea media' : 'Retaguardia'} · Nivel ${h.level} · ${starStr(h.stars)}</p>
        <div class="stat-row">
          <span>❤️ ${G.fmt(s.hp)}</span><span>⚔️ ${G.fmt(s.atk)}</span><span>🛡️ ${G.fmt(s.def)}</span><span>💨 ${G.fmt(s.spd)}</span>
        </div>
        <p>Poder: <b>⚡ ${G.fmt(G.heroPower(h))}</b></p>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-levelup" ${G.state.gold < cost ? 'disabled' : ''}>
            Subir a Nv ${h.level + 1} — 🪙 ${G.fmt(cost)}
          </button>
          <button class="btn btn-primary" id="btn-levelup-10" ${G.state.gold < cost ? 'disabled' : ''}>
            Subir máx (hasta 10)
          </button>
        </div>
      </div>
    </div>`;
  box.querySelector('.hp-face').appendChild(facePortrait(h.archetype, h.rarity, 84));
  attachHeroCanvas($('#detail-canvas'), h.archetype, h.rarity, 'walk');

  $('#btn-levelup').addEventListener('click', () => {
    if (G.levelUpHero(h.id)) {
      audio.sfx('levelup');
      renderHeroDetail();
      toast(`${arch.name} sube a nivel ${h.level}.`);
    }
  });

  $('#btn-levelup-10').addEventListener('click', () => {
    let levelsGained = 0;
    for(let i=0; i<10; i++) {
        if (G.levelUpHero(h.id)) levelsGained++;
        else break;
    }
    if (levelsGained > 0) {
      audio.sfx('levelup');
      renderHeroDetail();
      toast(`${arch.name} sube ${levelsGained} nivel(es).`);
    }
  });
}

function updateSynInfo() {
  const el = $('#syn-info');
  if (!el) return;
  const syn = G.activeSynergy();
  el.innerHTML = syn
    ? `<p class="syn-active">✦ Sinergia activa: <b>${syn.name}</b> — ${syn.desc}</p>`
    : `<p class="muted small">Sin sinergia. Combos: ${SYNERGIES.map(s => s.name).join(' · ')}</p>`;
}

// ---------- Expediciones ----------
function renderDungeon(p) {
  const era = G.eraData();
  const d = G.state.dungeon;
  p.innerHTML = `
    <div class="card biome-card scene-card" style="--sky:${era.biome.sky};--accent:${era.biome.accent}">
      <h2>⚔️ ${era.biome.name}</h2>
      <div id="scene-holder"></div>
      <p>Poder del equipo: <b id="dg-power">${G.fmt(G.teamPower())}</b> · Mejor profundidad: <b id="dg-best">${d.bestDepth}</b></p>
      <div id="dg-status"></div>
      <div class="floor-bar"><div id="dg-progress"></div></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="btn-run">${d.running ? 'Retirada' : 'Iniciar expedición'}</button>
      </div>
    </div>
    <div class="card">
      <h3>Registro de expedición</h3>
      <div id="dg-log" class="log"></div>
    </div>`;
  $('#btn-run').addEventListener('click', () => {
    audio.sfx('click');
    if (G.state.dungeon.running) { G.stopRun(); }
    else if (!G.startRun()) toast('Necesitas al menos 1 héroe en el equipo.');
    rerenderSection();
  });
  attachDungeonScene($('#scene-holder'), G);
  refreshDungeonLive();
}

function refreshDungeonLive() {
  const d = G.state.dungeon;
  const st = $('#dg-status'); if (!st) return;
  const ep = d.floor > 0 ? G.enemyPowerAt(d.floor) : G.enemyPowerAt(1);
  st.innerHTML = d.running
    ? `<p>🏃 Piso <b>${d.floor}</b> — enemigo: poder ${G.fmt(ep)} ${d.floor % ECON.bossEvery === 0 ? '👑 JEFE' : ''}</p>`
    : `<p class="muted">Expedición detenida. Piso 1: poder ${G.fmt(G.enemyPowerAt(1))}.</p>`;
  const bar = $('#dg-progress');
  if (bar) bar.style.width = `${Math.round((d.running ? d.floorProgress : 0) * 100)}%`;
  const best = $('#dg-best'); if (best) best.textContent = d.bestDepth;
  const pw = $('#dg-power'); if (pw) pw.textContent = G.fmt(G.teamPower());
  const logEl = $('#dg-log');
  if (logEl) logEl.innerHTML = d.log.slice().reverse().map(l => `<div>${l}</div>`).join('');
  const btn = $('#btn-run');
  if (btn) btn.textContent = d.running ? 'Retirada' : 'Iniciar expedición';
}

// ---------- Reclutamiento ----------
function renderRecruit(p) {
  const cap = G.state.era <= 1 ? 'Épico' : G.state.era === 2 ? 'Legendario' : 'Mítico';
  p.innerHTML = `
    <div class="card recruit-card">
      <h2>✨ La forastera de la barra</h2>
      <p class="muted">«¿Buscas espadas para tu compañía? Gira la máquina y veamos quién responde a la llamada…»</p>
      <p>Coste: 🎟️ <b>${G.pullCost()}</b> · Tienes: <b>${G.fmt(G.state.tokens)}</b></p>
      <p class="muted">Pity: Épico+ garantizado cada ${ECON.pityThreshold} — llevas <b>${G.state.pityCounter}/${ECON.pityThreshold}</b>.
      Rareza máx. de la Era: <b>${cap}</b>.</p>
      <div class="btn-row">
        <button class="btn btn-primary btn-big" id="btn-pull" ${G.canPull() ? '' : 'disabled'}>Invocar recluta 🎟️${G.pullCost()}</button>
      </div>
      <div class="rates small muted">
        ${RARITIES.slice(0, G.state.era <= 1 ? 4 : G.state.era === 2 ? 5 : 6).map(r => `<span style="color:${r.color}">${r.name} ${r.weight}%</span>`).join(' · ')}
      </div>
    </div>
    <div class="card small muted">
      🎟️ Las fichas caen de los <b>jefes</b> (cada ${ECON.bossEvery} pisos). Duplicado → +1★ (máx ${ECON.maxStars}).
    </div>`;
  $('#btn-pull')?.addEventListener('click', () => {
    const reward = G.doPull();
    if (!reward) return;
    audio.sfx('capsule');
    openGachapon(reward, () => rerenderSection());
  });
}

// ---------- Era ----------
function renderEra(p) {
  const info = G.prestigeInfo();
  const era = G.eraData();
  p.innerHTML = `
    <div class="card">
      <h2>🌟 Declarar una Nueva Era</h2>
      <p>Era actual: <b>${era.name}</b> (×${era.prestigeMult} permanente)</p>
      ${info ? `
        <p>Siguiente: <b>${info.next.name}</b> — «${info.next.desc}»</p>
        <ul>
          <li>Multiplicador permanente: <b>×${info.newMult}</b></li>
          <li>Nuevo bioma: <b>${info.next.biome.name}</b></li>
          <li>Desbloquea rareza: <b>${RARITIES[Math.min(3 + info.next.id - 1, 5)].name}</b></li>
        </ul>
        <p>Requisito: piso <b>${info.needDepth}</b> — llevas <b>${info.haveDepth}</b>.</p>
        <div class="era-req-bar"><div style="width:${Math.min(100, Math.round(info.haveDepth / info.needDepth * 100))}%"></div></div>
        <p class="muted small">Se reinician: oro, reputación, fichas, profundidad. Se conservan: héroes, niveles, estrellas.</p>
        <div class="btn-row">
          <button class="btn btn-era" id="btn-prestige" ${G.canPrestige() ? '' : 'disabled'}>🏛️ Fundar ${info.next.name}</button>
        </div>`
        : `<p class="syn-active">Habéis alcanzado la cima: <b>Orden Mítica</b>. (Fin del contenido de la beta.)</p>`}
    </div>
    <div class="card">
      <h3>Escalera de Eras</h3>
      ${ERAS.map(e => `<p class="${e.id === G.state.era ? 'syn-active' : e.id < G.state.era ? '' : 'muted'}">
        ${e.id < G.state.era ? '✅' : e.id === G.state.era ? '📍' : '🔒'} <b>Era ${e.id}: ${e.name}</b> — ×${e.prestigeMult} · ${e.biome.name}
      </p>`).join('')}
    </div>`;
  $('#btn-prestige')?.addEventListener('click', () => {
    if (!G.canPrestige()) return;
    const next = G.prestigeInfo().next;
    if (confirm(`¿Fundar «${next.name}»? Se reinicia la corrida a cambio de ×${next.newMult} permanente.`)) {
      G.declareNewEra();
      audio.sfx('reveal');
      toast(`🏛️ ¡Nueva era: ${next.name}!`);
      goTo('tavern');
    }
  });
}
