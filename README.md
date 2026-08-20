# Guildbound — beta web jugable

Beta del loop completo de **Guildbound** (ver `../CLAUDE.md` para el brief de
diseño). Es la fase "prototipo jugable primero" previa al port a Unity: sirve
para validar el pacing de recursos, el muro de la mazmorra, la economía del
gacha y la cadencia de Eras antes de invertir en el motor final y en arte.

## Cómo jugar

```
node server.js
# → http://localhost:8123
```

Sin dependencias: HTML + ES modules + Canvas. Guardado automático en
`localStorage` cada 5 s, con progreso offline (60% eficiencia, máx. 8 h).

## v3 — Taberna-lobby y arte profesional (2026-07-09)

- **Menú = lobby de taberna** interactivo (`js/tavern.js`): chimenea animada,
  barra con tabernera, tablón, estandarte de Era, NPCs paseando con diálogo,
  partículas y viñeta. Los botones-hotspot llevan a cada sección.
- **Pantalla de carga** con progreso y consejos + **transiciones** entre
  pantallas (`js/screens.js`).
- **Arte del pack CC0 «Ninja Adventure»** (pixel-boy) en `assets/`:
  personajes anime-chibi animados, monstruos por Era, retratos faceset,
  FX de impacto, música y SFX. Créditos: `assets/CREDITS.md`.
- **Audio** (`js/audio.js`): música por pantalla con crossfade + SFX; mute
  persistido; desbloqueo en el primer gesto (política de autoplay).
- **Gachapón**: minijuego de máquina de cápsulas (girar → caída → 3 golpes →
  estallido) en lugar del scratch original.
- Tipografía Cinzel local (`assets/fonts/`).

## Qué incluye

- **Recursos idle**: Oro, Reputación, Fichas de Reclutamiento (nombres placeholder).
- **5 arquetipos** (Guerrero, Maga, Pícaro, Clériga, Montaraz) en pixel art
  **programático**: una rejilla base por arquetipo + recolor por rareza + aura
  animada (el sistema de control de coste de arte del brief). Ver `js/sprites.js`.
- **6 rarezas** (Común → Mítico), duplicados → estrellas (+15% stats).
- **Gacha con scratch-reveal**: componente reutilizable (`js/scratch.js`),
  rascado táctil/ratón, revelado al 45%, partículas según rareza, pity de
  Épico+ cada 40 pulls.
- **Mazmorra auto-battle v0**: comparación de poder, crecimiento enemigo
  ×1.16/piso (el muro), jefes cada 5 pisos que sueltan fichas.
- **Equipo de 3 con sinergias** de composición (5 combos con bonus distintos).
- **4 Eras de prestigio** con multiplicador permanente, bioma nuevo y tier de
  rareza desbloqueado; los héroes se conservan; crónica narrativa del gremio.

## Qué NO valida esta beta (decisiones pendientes del brief)

- Números de economía: **todos PLACEHOLDER** (`js/data.js`, constante `ECON`).
  Pendiente la pasada de hoja de cálculo (drop rates, pity, curva de prestigio).
- Profundidad del combate (v0 = comparación de stats; posicionamiento/skills
  es OPEN QUESTION).
- Monetización (ads/IAP): fuera de la beta por diseño.
- El port a Unity (motor confirmado para producción) y el arte final.

## Estructura

| Archivo | Qué contiene |
|---|---|
| `js/data.js` | Constantes: rarezas, arquetipos, sinergias, Eras, economía |
| `js/sprites.js` | Pixel art programático + recolor por rareza + auras |
| `js/game.js` | Estado, tick, gacha+pity, combate, prestigio, guardado |
| `js/scratch.js` | Componente scratch-reveal reutilizable |
| `js/ui.js` | 5 pestañas: Gremio, Héroes, Mazmorra, Reclutar, Era |
| `js/main.js` | Bootstrap, bucle rAF, progreso offline |

Consola de depuración: `window.GB` expone el módulo de juego
(`GB.state`, `GB.doPull()`, etc.).
