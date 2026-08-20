// ============================================================
// Escena de mazmorra v2: sprites profesionales del pack
// (monstruos por Era, héroes animados andando/atacando),
// FX de impacto, números de daño, jefes con barra y banner.
// ============================================================
import * as A from './assets.js';
import * as audio from './audio.js';

const H = 300;

// Monstruos del pack por Era + jefe
const ERA_MONSTERS = {
  1: { pool: [1, 2, 3, 4], boss: 21 },
  2: { pool: [5, 6, 7, 8], boss: 20 },
  3: { pool: [9, 10, 11, 12], boss: 19 },
  4: { pool: [13, 14, 15, 16, 17, 18], boss: 22 },
};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

export function attachDungeonScene(container, G) {
  const canvas = document.createElement('canvas');
  canvas.className = 'dungeon-scene';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let t = 0, last = performance.now();
  let lastFloor = -1;
  let bannerT = 0, bannerText = '';
  let scrollX = 0;
  let enemies = [];
  let damageNums = [];
  let fxAnims = [];   // {n, x, y, t0, dur, size}
  let heroFx = [];

  function spawnFloor(floor) {
    const era = G.eraData();
    const cfg = ERA_MONSTERS[era.id] ?? ERA_MONSTERS[1];
    const rng = mulberry32(floor * 7919 + era.id * 104729);
    enemies = [];
    const isBoss = floor % 5 === 0;
    if (isBoss) {
      enemies.push({ mon: cfg.boss, frac: 1, phase: rng() * 6, flash: 0, dead: false, deadT: 0 });
      bannerText = `PISO ${floor} — ¡JEFE!`;
      audio.sfx('boss', 0.4);
    } else {
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        enemies.push({
          mon: cfg.pool[Math.floor(rng() * cfg.pool.length)],
          frac: (i + 1) / n, phase: rng() * 6, flash: 0, dead: false, deadT: 0,
        });
      }
      bannerText = `PISO ${floor}`;
    }
    bannerT = 1.2;
    heroFx = [0, 1, 2].map(() => ({ lunge: 0, cd: Math.random() * 0.5 }));
  }

  function addDamage(x, y, txt, color) {
    damageNums.push({ x, y, txt, life: 1, color });
    if (damageNums.length > 24) damageNums.shift();
  }

  function shadeHex(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
    const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
    return `rgb(${r},${g},${b})`;
  }

  function tri(cx, baseY, halfW, hh) {
    ctx.beginPath();
    ctx.moveTo(cx - halfW, baseY); ctx.lineTo(cx, baseY - hh); ctx.lineTo(cx + halfW, baseY);
    ctx.closePath(); ctx.fill();
  }

  function drawBackground(w, era, running, dt) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, era.biome.sky);
    sky.addColorStop(1, shadeHex(era.biome.sky, -18));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, H);
    if (running) scrollX += dt * 26;

    ctx.fillStyle = shadeHex(era.biome.sky, 12);
    const far = scrollX * 0.25;
    for (let x = -((far) % 160) - 160; x < w + 160; x += 160) {
      if (era.id === 1) { tri(x + 30, 210, 46, 120); tri(x + 95, 210, 60, 160); }
      else if (era.id === 2) {
        ctx.fillRect(x + 40, 90, 12, 120);
        ctx.beginPath(); ctx.arc(x + 46, 88, 38, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 110, 108, 30, 0, 7); ctx.fill();
        ctx.fillRect(x + 106, 118, 9, 92);
      }
      else if (era.id === 3) { tri(x + 30, 212, 34, 96); tri(x + 60, 212, 22, 140); tri(x + 120, 212, 40, 70); }
      else { ctx.fillRect(x + 30, 60, 26, 150); ctx.fillRect(x + 100, 100, 34, 112); }
    }
    if (era.id === 4) {
      const rng = mulberry32(42);
      for (let i = 0; i < 40; i++) {
        const sx = rng() * w, sy = rng() * 140;
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i));
        ctx.fillStyle = '#cfd3ff';
        ctx.fillRect(sx, sy, 2, 2);
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = shadeHex(era.biome.ground, -8);
    ctx.fillRect(0, 150, w, 62);
    const mid = scrollX * 0.6;
    for (let x = -(mid % 220) - 220; x < w + 220; x += 220) {
      ctx.fillStyle = '#3a2c1c';
      ctx.fillRect(x + 120, 158, 5, 22);
      const flick = 0.7 + 0.3 * Math.sin(t * 11 + x);
      const g = ctx.createRadialGradient(x + 122, 154, 2, x + 122, 154, 34 * flick);
      g.addColorStop(0, 'rgba(255,180,80,0.55)');
      g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x + 122, 154, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcf6e';
      ctx.fillRect(x + 120, 148, 5, 8);
    }

    ctx.fillStyle = era.biome.ground;
    ctx.fillRect(0, 212, w, H - 212);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    const g0 = scrollX % 56;
    for (let x = -g0; x < w; x += 56) {
      ctx.beginPath(); ctx.moveTo(x, 212); ctx.lineTo(x - 18, H); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, 212); ctx.lineTo(w, 212); ctx.stroke();
    const amb = ctx.createLinearGradient(0, 130, 0, H);
    amb.addColorStop(0, era.biome.accent + '00');
    amb.addColorStop(1, era.biome.accent + '22');
    ctx.fillStyle = amb;
    ctx.fillRect(0, 130, w, H - 130);
  }

  function frame(now) {
    if (!canvas.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;

    const w = canvas.clientWidth || 600;
    if (canvas.width !== w) { canvas.width = w; canvas.height = H; }

    const d = G.state.dungeon;
    const era = G.eraData();
    drawBackground(w, era, d.running, dt);

    if (d.running && d.floor !== lastFloor) { lastFloor = d.floor; spawnFloor(d.floor); }
    if (!d.running) lastFloor = -1;

    const groundY = 272;
    const team = G.state.team.filter(Boolean).map(id => G.heroById(id)).filter(Boolean);

    // --- Enemigos (pack) ---
    if (d.running && enemies.length) {
      const isBoss = d.floor % 5 === 0;
      enemies.forEach((e, i) => {
        if (!e.dead && d.floorProgress >= e.frac * 0.92) {
          e.dead = true; e.deadT = 0;
          fxAnims.push({ n: 5, x: w - 110 - i * 84, y: groundY - 70, t0: t, dur: 0.5, size: 72 });
        }
        if (e.dead) { e.deadT += dt; if (e.deadT > 0.4) return; }
        const size = isBoss ? 128 : 64;
        const ex = w - 110 - i * 84;
        e.flash = Math.max(0, e.flash - dt * 4);
        ctx.save();
        if (e.dead) { ctx.globalAlpha = 1 - e.deadT / 0.4; ctx.translate(0, -e.deadT * 40); }
        A.drawShadow(ctx, ex, groundY + 4, size * 0.6);
        const fr = Math.floor((t * 4 + e.phase) % 4);
        A.drawMonster(ctx, e.mon, A.DIR.left, fr, ex - size / 2, groundY - size + (isBoss ? 8 : 0), size,
          e.flash > 0 ? 'brightness(2.5)' : null);
        ctx.restore();
        if (isBoss && !e.dead) {
          const bw = 190;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(w / 2 - bw / 2, 14, bw, 12);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(w / 2 - bw / 2 + 2, 16, (bw - 4) * Math.max(0, 1 - d.floorProgress), 8);
          ctx.fillStyle = '#e8e3f5';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('GUARDIÁN DEL BIOMA', w / 2, 40);
        }
      });
    }

    // --- Héroes (pack, mirando a la derecha) ---
    // Ordenar visualmente: Vanguardia (front) a la derecha, medio en el centro, retaguardia (back) a la izquierda.
    const sortedTeam = team.slice(0, 3).map((h, originalIndex) => {
      const arch = G.archetypeById(h.archetype);
      return { h, originalIndex, position: arch.position };
    }).sort((a, b) => {
      const p = { 'front': 2, 'mid': 1, 'back': 0 };
      return p[a.position] - p[b.position];
    });

    sortedTeam.forEach((item, sortedIdx) => {
      const { h, originalIndex: i } = item;
      const fx = heroFx[i] ?? { lunge: 0, cd: 0 };
      if (d.running) {
        fx.cd -= dt;
        if (fx.cd <= 0) {
          fx.lunge = 1;
          fx.cd = 0.55 + Math.random() * 0.5;
          const alive = enemies.filter(e => !e.dead);
          if (alive.length) {
            const target = alive[0];
            target.flash = 0.8;
            const idx = enemies.indexOf(target);
            const isBoss = d.floor % 5 === 0;
            const ex = w - 110 - idx * 84;
            const dmg = Math.round(G.heroPower(h) * (0.08 + Math.random() * 0.07));
            addDamage(ex + (Math.random() - 0.5) * 24, groundY - (isBoss ? 110 : 60),
              dmg, i === 0 ? '#ffd166' : i === 1 ? '#9bd1ff' : '#c3f584');
            fxAnims.push({ n: [1, 2, 3][i % 3], x: ex - 30, y: groundY - 76, t0: t, dur: 0.35, size: 56 });
            audio.sfx('hit', 0.18);
          }
        }
        fx.lunge = Math.max(0, fx.lunge - dt * 3);
      } else fx.lunge = 0;
      heroFx[i] = fx;
      const hx = 60 + sortedIdx * 66;
      const size = 58;
      A.drawShadow(ctx, hx, groundY + 4, size * 0.62);
      const fr = d.running ? Math.floor((t * 6 + i * 1.7) % 8) : 0;
      A.drawChar(ctx, A.charSheet(h.archetype), A.DIR.right, fr,
        hx - size / 2 + fx.lunge * 18, groundY - size + 4, size,
        A.RARITY_FILTER[h.rarity]);
    });

    if (team.length === 0) {
      ctx.fillStyle = 'rgba(232,227,245,0.75)';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Asigna héroes al equipo en el Salón de Héroes', w / 2, 130);
    } else if (!d.running) {
      ctx.fillStyle = 'rgba(232,227,245,0.65)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('El equipo espera órdenes…', w / 2, 130);
    }

    // --- FX de impacto ---
    for (let i = fxAnims.length - 1; i >= 0; i--) {
      const f = fxAnims[i];
      const k = (t - f.t0) / f.dur;
      if (k >= 1) { fxAnims.splice(i, 1); continue; }
      A.drawFx(ctx, f.n, k, f.x, f.y, f.size);
    }

    // --- Números de daño ---
    for (let i = damageNums.length - 1; i >= 0; i--) {
      const dn = damageNums[i];
      dn.life -= dt * 1.1;
      dn.y -= dt * 46;
      if (dn.life <= 0) { damageNums.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, Math.min(1, dn.life * 1.6));
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(dn.txt, dn.x, dn.y);
      ctx.fillStyle = dn.color;
      ctx.fillText(dn.txt, dn.x, dn.y);
      ctx.globalAlpha = 1;
    }

    // --- Banner de piso ---
    if (bannerT > 0 && d.running) {
      bannerT -= dt;
      const k = Math.min(1, (1.2 - bannerT) * 4);
      ctx.globalAlpha = Math.min(1, bannerT * 2) * k;
      ctx.fillStyle = 'rgba(20,16,31,0.75)';
      const bw = 210;
      ctx.fillRect(w / 2 - bw / 2, 54, bw, 34);
      ctx.strokeStyle = era.biome.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(w / 2 - bw / 2, 54, bw, 34);
      ctx.fillStyle = '#f5c542';
      ctx.font = 'bold 17px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(bannerText, w / 2, 77);
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return canvas;
}
