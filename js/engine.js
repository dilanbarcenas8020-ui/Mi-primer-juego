// Motor del juego: bucle principal, entidades, armas, enemigos, jefes y dibujo.

const Game = (() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const SPR = 2; // resolución de los sprites pre-renderizados
  const ENEMY_CAP = 600;

  let vw = 0, vh = 0, dpr = 1, zoom = 1, halfW = 0, halfH = 0;
  let state = 'menu'; // menu | playing | levelup | chest | stage | paused | over
  let S = null;       // estado de la partida actual
  let st = {};        // estadísticas calculadas del jugador
  let options = [];   // cartas de subida de nivel mostradas
  const menuCam = { x: 0, y: 0 };

  // ---------- Pantalla ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    zoom = Math.max(0.55, Math.min(1.2, Math.min(vw, vh) / 700));
    halfW = vw / (2 * zoom);
    halfH = vh / (2 * zoom);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Sprites ----------
  const sprites = {};

  function makeSprite(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * SPR);
    const g = c.getContext('2d');
    g.scale(SPR, SPR);
    g.translate(size / 2, size / 2);
    draw(g);
    return c;
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * f), gr = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return `rgb(${r},${gr},${b})`;
  }

  function polyPath(g, n, r, rot = -Math.PI / 2, inner = 0) {
    const pts = inner ? n * 2 : n;
    for (let i = 0; i < pts; i++) {
      const a = rot + (i / pts) * TAU;
      const rr = inner && i % 2 ? inner : r;
      i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
  }

  function shapePath(g, shape, r) {
    g.beginPath();
    switch (shape) {
      case 'blob': g.arc(0, 0, r, 0, TAU); break;
      case 'tri': g.moveTo(0, -r * 1.15); g.lineTo(r * 1.1, r * 0.85); g.lineTo(-r * 1.1, r * 0.85); g.closePath(); break;
      case 'square': {
        const s = r * 0.95, c = r * 0.35;
        g.moveTo(-s + c, -s); g.lineTo(s - c, -s); g.quadraticCurveTo(s, -s, s, -s + c);
        g.lineTo(s, s - c); g.quadraticCurveTo(s, s, s - c, s); g.lineTo(-s + c, s);
        g.quadraticCurveTo(-s, s, -s, s - c); g.lineTo(-s, -s + c); g.quadraticCurveTo(-s, -s, -s + c, -s);
        g.closePath();
        break;
      }
      case 'diamond': g.moveTo(0, -r * 1.2); g.lineTo(r, 0); g.lineTo(0, r * 1.2); g.lineTo(-r, 0); g.closePath(); break;
      case 'spiky': polyPath(g, 10, r * 1.1, 0, r * 0.8); break;
      case 'hex': polyPath(g, 6, r * 1.08, 0); break;
      case 'star': polyPath(g, 5, r * 1.25, -Math.PI / 2, r * 0.62); break;
      case 'oval': g.ellipse(0, 0, r * 1.2, r * 0.85, 0, 0, TAU); break;
      case 'drop':
        g.moveTo(0, -r * 1.35);
        g.quadraticCurveTo(r * 1.05, -r * 0.1, r * 0.9, r * 0.35);
        g.arc(0, r * 0.25, r * 0.92, 0.1, Math.PI - 0.1);
        g.quadraticCurveTo(-r * 1.05, -r * 0.1, 0, -r * 1.35);
        g.closePath();
        break;
      case 'ghost':
        g.arc(0, -r * 0.1, r, Math.PI, 0);
        g.lineTo(r, r * 0.9);
        for (let i = 0; i < 4; i++) {
          const x0 = r - (i * r) / 2;
          g.quadraticCurveTo(x0 - r / 4, r * (i % 2 ? 0.95 : 0.55), x0 - r / 2, r * 0.9);
        }
        g.closePath();
        break;
      default: g.arc(0, 0, r, 0, TAU);
    }
  }

  function enemySprite(shape, r, color, mode) {
    const size = r * 2.8 + 32;
    return makeSprite(size, g => {
      const flash = mode === 'f', elite = mode === 'e';
      g.shadowColor = elite ? '#ffd166' : color;
      g.shadowBlur = elite ? 20 : 12;
      shapePath(g, shape, r);
      g.fillStyle = flash ? '#ffffff' : shade(color, 0.32);
      g.fill();
      g.lineWidth = elite ? 3.5 : 2.5;
      g.strokeStyle = flash ? '#ffffff' : elite ? '#ffd166' : color;
      g.stroke();
      g.shadowBlur = 0;
      if (!flash) {
        const ey = -r * 0.12, ex = r * 0.36, er = Math.max(2.5, r * 0.24);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(-ex, ey, er, 0, TAU); g.arc(ex, ey, er, 0, TAU); g.fill();
        g.fillStyle = '#0a0a14';
        g.beginPath(); g.arc(-ex, ey + er * 0.25, er * 0.5, 0, TAU); g.arc(ex, ey + er * 0.25, er * 0.5, 0, TAU); g.fill();
      }
    });
  }

  // Crea (una sola vez) los sprites normal y de destello de un enemigo
  function ensureSprite(key, shape, r, color, mode = 'n') {
    if (sprites[key]) return;
    sprites[key] = enemySprite(shape, r, color, mode);
    sprites[key + '_f'] = enemySprite(shape, r, color, 'f');
  }

  function emojiSprite(emoji, size, glow) {
    return makeSprite(size + 20, g => {
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, size * 0.75);
      grad.addColorStop(0, glow);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(0, 0, size * 0.75, 0, TAU); g.fill();
      g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(emoji, 0, size * 0.06);
    });
  }

  function gemSprite(color, r) {
    return makeSprite(r * 2 + 16, g => {
      g.shadowColor = color;
      g.shadowBlur = 8;
      g.beginPath();
      g.moveTo(0, -r * 1.3); g.lineTo(r, 0); g.lineTo(0, r * 1.3); g.lineTo(-r, 0); g.closePath();
      g.fillStyle = color;
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.moveTo(0, -r * 1.3); g.lineTo(r * 0.45, -r * 0.2); g.lineTo(0, 0); g.closePath();
      g.fill();
    });
  }

  function buildSprites() {
    for (const [id, d] of Object.entries(ENEMIES)) {
      ensureSprite(id, d.shape, d.r, d.color);
      ensureSprite(id + '_e', d.shape, d.r * 1.6, d.color, 'e');
    }
    sprites.gem1 = gemSprite('#4cc9f0', 5);
    sprites.gem2 = gemSprite('#7cff6b', 6.5);
    sprites.gem3 = gemSprite('#ff4d6d', 8);
    sprites.gem4 = gemSprite('#ffd166', 10);
    sprites.coin = makeSprite(26, g => {
      g.shadowColor = '#ffd166'; g.shadowBlur = 8;
      g.fillStyle = '#ffd166';
      g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = '#b8860b'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); g.stroke();
    });
    sprites.heart = emojiSprite('❤️', 22, 'rgba(255,92,138,0.5)');
    sprites.magnet = emojiSprite('🧲', 24, 'rgba(92,242,255,0.5)');
    sprites.bomb = emojiSprite('💣', 24, 'rgba(255,159,67,0.5)');
    sprites.chest = emojiSprite('🎁', 30, 'rgba(255,209,102,0.7)');
    sprites.chest2 = emojiSprite('🎁', 36, 'rgba(199,125,255,0.85)');
    sprites.chest3 = emojiSprite('🎁', 42, 'rgba(255,0,212,0.9)');
    sprites.cupcake = emojiSprite('🧁', 28, 'rgba(255,143,199,0.7)');
    sprites.lantern = emojiSprite('🏮', 26, 'rgba(255,120,60,0.6)');
    sprites.altar = emojiSprite('⛩️', 34, 'rgba(255,209,102,0.6)');
  }
  buildSprites();

  function drawSprite(spr, x, y, scale = 1) {
    const w = spr.width / SPR * scale, h = spr.height / SPR * scale;
    ctx.drawImage(spr, x - w / 2, y - h / 2, w, h);
  }

  // ---------- Entrada ----------
  const keys = {};
  const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    Sound.init();
    if (state === 'playing' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (state === 'playing') pause();
      else if (state === 'paused') resume();
    }
    if (state === 'levelup') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= options.length) choose(n - 1);
      if (e.code === 'KeyR') reroll();
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });

  canvas.addEventListener('pointerdown', e => {
    Sound.init();
    if (state !== 'playing' || joy.active) return;
    joy.active = true;
    joy.id = e.pointerId;
    joy.ox = joy.x = e.clientX;
    joy.oy = joy.y = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', e => {
    if (!joy.active || e.pointerId !== joy.id) return;
    joy.x = e.clientX;
    joy.y = e.clientY;
    // El joystick sigue al dedo si se aleja demasiado
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
    if (d > 70) { joy.ox = joy.x - dx / d * 70; joy.oy = joy.y - dy / d * 70; }
  });
  const endJoy = e => { if (e.pointerId === joy.id) joy.active = false; };
  canvas.addEventListener('pointerup', endJoy);
  canvas.addEventListener('pointercancel', endJoy);

  function inputDir() {
    if (joy.active) {
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
      if (d < 6) return [0, 0];
      const m = Math.min(1, d / 45);
      return [dx / d * m, dy / d * m];
    }
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.KeyA) dx -= 1;
    if (keys.ArrowRight || keys.KeyD) dx += 1;
    if (keys.ArrowUp || keys.KeyW) dy -= 1;
    if (keys.ArrowDown || keys.KeyS) dy += 1;
    const d = Math.hypot(dx, dy);
    return d ? [dx / d, dy / d] : [0, 0];
  }

  // ---------- Rejilla espacial para colisiones rápidas ----------
  const CELL = 64, MARGIN = 64;
  const grid = new Map();
  const qbuf = [];

  function gkey(cx, cy) { return ((cx & 0xffff) << 16) | (cy & 0xffff); }

  function gridBuild() {
    grid.clear();
    for (const e of S.enemies) {
      if (e.dead || e.phase > 0) continue;
      const k = gkey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let a = grid.get(k);
      if (!a) { a = []; grid.set(k, a); }
      a.push(e);
    }
  }

  // Devuelve un arreglo compartido: no anidar consultas
  function gridQuery(x, y, r) {
    qbuf.length = 0;
    const R = r + MARGIN;
    const x0 = Math.floor((x - R) / CELL), x1 = Math.floor((x + R) / CELL);
    const y0 = Math.floor((y - R) / CELL), y1 = Math.floor((y + R) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const a = grid.get(gkey(cx, cy));
        if (a) for (let i = 0; i < a.length; i++) qbuf.push(a[i]);
      }
    }
    return qbuf;
  }

  // ---------- Utilidades ----------
  const rand = (a, b) => a + Math.random() * (b - a);

  function compact(arr) {
    let j = 0;
    for (let i = 0; i < arr.length; i++) if (!arr[i].dead) arr[j++] = arr[i];
    arr.length = j;
  }

  function inView(x, y, m) {
    const c = S.player;
    return Math.abs(x - c.x) < halfW + m && Math.abs(y - c.y) < halfH + m;
  }

  function targetable(e) { return !e.dead && !(e.phase > 0); }

  function nearestEnemy(x, y, maxR, exclude) {
    let best = null, bd = maxR * maxR;
    for (const e of S.enemies) {
      if (!targetable(e) || (exclude && exclude.has(e.id))) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function randomEnemyNear(x, y, R) {
    const n = S.enemies.length;
    for (let i = 0; i < 14 && n; i++) {
      const e = S.enemies[(Math.random() * n) | 0];
      if (targetable(e) && Math.abs(e.x - x) < R && Math.abs(e.y - y) < R) return e;
    }
    return nearestEnemy(x, y, R * 1.5);
  }

  function hash2(x, y) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function xpFor(level) { return Math.floor(5 + (level - 1) * 4.5 + Math.pow(level, 1.35)); }

  // ---------- Partida ----------
  function computeStats() {
    const U = Save.upgrade;
    const P = id => S.passives[id] || 0;
    const m = CHARACTERS[S.char].mods;
    const R = Save.data.rebirths; // bonos permanentes por renacer
    const prevMax = st.maxHp || 0;
    st = {
      maxHp: Math.round((100 + 15 * U('vida') + 20 * P('vitalidad')) * (m.hp || 1) * (1 + 0.05 * P('blindaje')) * (1 + R * REBIRTH.hp)),
      regen: 0.3 * U('regen') + 0.4 * P('vitalidad'),
      armor: U('armadura') + (m.armor || 0) + P('blindaje'),
      speed: 150 * (1 + 0.05 * U('velocidad') + 0.10 * P('velocidad')) * (m.speed || 1),
      pickup: 75 * (1 + 0.15 * U('iman') + 0.35 * P('iman')),
      might: (1 + 0.06 * U('poder') + 0.12 * P('poder')) * (1 + R * REBIRTH.dmg),
      cd: (1 - 0.04 * U('cadencia')) * Math.pow(0.92, P('cadencia')) * (m.cd || 1),
      area: (1 + 0.12 * P('area')) * (m.area || 1),
      crit: 0.05 + 0.03 * U('suerte') + 0.05 * P('suerte') + (m.crit || 0),
      luck: 1 + 0.1 * U('suerte') + 0.15 * P('suerte'),
      xpMul: (1 + 0.08 * U('crecimiento')) * S.map.xp * (1 + R * REBIRTH.xp),
      goldMul: (1 + 0.1 * U('codicia')) * (m.gold || 1) * (1 + R * REBIRTH.gold),
      extra: P('duplicador'),
    };
    if (prevMax && st.maxHp > prevMax) S.player.hp += st.maxHp - prevMax;
    S.player.hp = Math.min(S.player.hp, st.maxHp);
  }

  function weaponParams(id, level, evolved) {
    const d = WEAPONS[id], p = {};
    for (let i = 0; i < level; i++) Object.assign(p, d.levels[i]);
    if (evolved) Object.assign(p, d.evolved);
    delete p.text;
    return p;
  }

  function addWeapon(id) {
    S.weapons.push({ id, level: 1, evolved: false, timer: 0.4, angle: 0, orbs: [], pulse: 0, sweepT: 0, ang: 0, hit: null, p: weaponParams(id, 1, false) });
  }

  function start(charId, mapIdx) {
    Sound.init();
    const ch = CHARACTERS[charId];
    mapIdx = Math.max(0, Math.min(ALL_MAPS.length - 1, mapIdx | 0));
    const map = ALL_MAPS[mapIdx];
    const tier = map.special ? map.tier : mapIdx;
    const ms = Save.mapStat(map.id);
    st = {};
    S = {
      char: charId, map, mapIdx, tier, atkTier: map.atkTier || tier, special: map.special || null, t: 0,
      player: { x: 0, y: 0, r: 14, hp: 100, inv: 0, face: 0, color: ch.color, dead: false, slowT: 0 },
      enemies: [], bullets: [], ebullets: [], pickups: [], parts: [], texts: [], bolts: [], rings: [],
      hazards: [], beams: [], holes: [], novas: [], bigs: [], events: [],
      weapons: [], passives: {}, pool: mapEnemies(tier),
      maxW: MAX_WEAPONS + Save.upgrade('ranuraArma'), maxP: MAX_PASSIVES + Save.upgrade('ranuraPasiva'),
      xp: 0, level: 1, xpNext: xpFor(1),
      kills: 0, coins: 0, combo: 0, comboT: 0, maxCombo: 0, nextCombo: 50,
      bossKills: 0, subbosses: 0, specials: 0, specialIdx: 0, chests: 0, evolutions: 0, bonusGold: 0,
      rerolls: Save.upgrade('cambios') + 1, revives: Save.upgrade('revivir'),
      pendingLevels: 0, spawnAcc: 0, eliteT: 60, swarmT: 90, boss: null,
      stageCleared: ms.cleared, stageClearedNow: false, stageT: 0,
      shake: 0, hurtFlash: 0, whiteFlash: 0, nextId: 1, deathT: 0,
      mapBest: ms.bestLevel, recordShown: ms.bestLevel < 5, gemCount: 0,
      // Mecánicas de los niveles especiales
      zone: null, sugarT: 0, cupcakeT: 12, dropT: 8, outZone: false, inCaramel: false,
      curse: null, curseT: 40, curseLeft: 0, fireT: 0, altar: null, altarT: 25, blessT: 0, enemySpeedMul: 1,
    };
    if (S.special === 'marinela') S.zone = { x: 0, y: 0, r: 460, ox: 0, oy: 0, nx: 0, ny: 0, moveIn: 35, moving: 0, warn: false, tick: 0 };
    computeStats();
    S.player.hp = st.maxHp;
    addWeapon(ch.weapon);
    joy.active = false;
    state = 'playing';
    UI.onRunStart();
    if (!Save.data.tutorialDone) UI.hint('Muévete con WASD / flechas o arrastrando el dedo. ¡Tus armas disparan solas!', 7000);
    else if (S.special === 'marinela') UI.hint('🧁 Quédate dentro de la zona rosa: el glaseado de afuera te quema. El caramelo frena a todos.', 6500);
    else if (S.special === 'piru') UI.hint('😈 Busca faroles 🏮 para ver mejor. Los altares ⛩️ te bendicen… pero atraen una emboscada.', 6500);
    else if (!ms.cleared) UI.hint(`${map.icon} ${map.name}: llega al nivel ${BOSS_EVERY} y derrota al jefe para completar la etapa.`, 5000);
  }

  // ---------- Generación de enemigos ----------
  function spawnPos(extra = 60) {
    const a = Math.random() * TAU;
    const R = Math.hypot(halfW, halfH) + extra;
    return [S.player.x + Math.cos(a) * R, S.player.y + Math.sin(a) * R];
  }

  // La dificultad extra del mapa entra poco a poco durante los primeros 3 minutos
  function mapMul(base) {
    return 1 + (base - 1) * Math.min(1, 0.45 + 0.55 * S.t / 180);
  }

  function makeEnemy(type, x, y, elite = false) {
    if (S.enemies.length >= ENEMY_CAP) return null;
    const d = ENEMIES[type], M = S.map;
    const m = S.t / 60;
    const hpMul = (1 + m * 0.38 + m * m * 0.032) * mapMul(M.hp) * (elite ? 14 : 1);
    const e = {
      id: S.nextId++, type, x, y, elite, ai: d.ai, kind: elite ? 'elite' : 'normal', big: false, heavy: false,
      r: d.r * (elite ? 1.6 : 1),
      hp: d.hp * hpMul, maxHp: d.hp * hpMul,
      speed: d.speed * (elite ? 0.9 : 1) * (1 + Math.min(0.25, m * 0.015)) * mapMul(M.speed),
      dmg: d.dmg * (1 + m * 0.09) * mapMul(M.dmg) * (elite ? 1.5 : 1),
      xp: d.xp, coin: d.coin || 1, color: d.color, spr: type + (elite ? '_e' : ''),
      kx: 0, ky: 0, flash: 0, lh: {}, slowT: 0, slowAmt: 0, shootT: rand(1.5, 3.5),
      mode: 'walk', modeT: 0, dvx: 0, dvy: 0, phase: 0, phaseCd: rand(2, 4), bx: 0, by: 0,
    };
    S.enemies.push(e);
    return e;
  }

  function pickType() {
    const m = S.t / 60;
    let total = 0;
    const w = [];
    for (const id of S.pool) {
      const d = ENEMIES[id];
      if (m < d.from) continue;
      const wt = d.weight[0] + d.weight[1] * m;
      w.push([id, wt]);
      total += wt;
    }
    let r = Math.random() * total;
    for (const x of w) { r -= x[1]; if (r <= 0) return x[0]; }
    return 'bicho';
  }

  function spawnSwarm() {
    const n = Math.floor((30 + S.t / 60 * 6) * Math.min(1.3, S.map.spawn));
    const R = Math.max(halfW, halfH) + 40;
    const type = S.t > 300 ? 'rapido' : 'bicho';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      makeEnemy(type, S.player.x + Math.cos(a) * R, S.player.y + Math.sin(a) * R);
    }
    UI.banner('¡ENJAMBRE!', '#ffd166');
    Sound.play('swarm');
  }

  // Monstruos grandes: especial (cada 5 niveles), subjefe (cada 15) y jefe (cada 30)
  function spawnBig(kind, level) {
    const M = S.map, m = S.t / 60;
    const scale = mapMul(M.hp) * (1 + m * 0.18);
    const dmgScale = mapMul(M.dmg) * (1 + m * 0.06);
    const a = Math.random() * TAU, R = Math.min(halfW, halfH) + 90;
    const e = {
      id: S.nextId++, kind, type: kind, big: true, heavy: true, boss: kind !== 'special', level,
      x: S.player.x + Math.cos(a) * R, y: S.player.y + Math.sin(a) * R,
      xp: 0, coin: 0, kx: 0, ky: 0, flash: 0, lh: {}, slowT: 0, slowAmt: 0, elite: false,
      mode: 'walk', atkT: 2.2, lastAtk: -1, teleT: 0, dashT: 0, holdT: 0, dvx: 0, dvy: 0, rot: 0,
      spiralT: 0, spiralA: 0, spiralE: 0, blinkT: 0, bx: 0, by: 0, phase: 0, enraged: false, tier: 1, stage: false,
    };
    if (kind === 'special') {
      const d = SPECIALS[S.specialIdx++ % SPECIALS.length];
      Object.assign(e, {
        name: d.name, color: d.color, r: d.r, attacks: d.attacks, atkCd: d.cd, summon: d.summon || 'bicho',
        hp: d.hp * scale * (1 + level * 0.02), speed: d.speed * M.speed, dmg: d.dmg * dmgScale,
        spr: 'sp_' + d.name,
      });
      ensureSprite(e.spr, d.shape, d.r, d.color, 'e');
      UI.banner(`⚠️ ¡${d.name.toUpperCase()}!`, d.color, true);
      Sound.play('special');
    } else {
      const d = kind === 'boss' ? M.boss : M.subboss;
      const tier = kind === 'boss' ? Math.round(level / BOSS_EVERY) : Math.round((level + SUBBOSS_EVERY) / BOSS_EVERY);
      const isBoss = kind === 'boss';
      Object.assign(e, {
        name: d.name, color: d.color, r: isBoss ? 56 : 42, attacks: d.attacks, atkCd: isBoss ? 2.2 : 2.6,
        summon: d.summon || 'bicho', tier,
        hp: (isBoss ? BOSS_HP : SUBBOSS_HP) * scale * Math.pow(isBoss ? 2.6 : 2.4, tier - 1),
        speed: (isBoss ? 64 : 58) * M.speed, dmg: (isBoss ? 28 : 22) * dmgScale,
        spr: kind + '_' + S.mapIdx, stage: isBoss && !S.stageCleared && tier === 1,
      });
      ensureSprite(e.spr, 'spiky', e.r, d.color, 'n');
      if (isBoss) {
        UI.banner(`☠️ JEFE: ${d.name.toUpperCase()} ☠️`, d.color);
        if (e.stage) UI.hint('¡Derrota al jefe para completar la etapa y desbloquear el siguiente mapa!', 4500);
        Sound.play('boss');
      } else {
        UI.banner(`👹 SUBJEFE: ${d.name.toUpperCase()}`, d.color);
        Sound.play('boss');
      }
    }
    e.maxHp = e.hp;
    S.enemies.push(e);
    S.bigs.push(e);
  }

  function queueLevelEvent(level) {
    if (level % BOSS_EVERY === 0) S.events.push(['boss', level]);
    else if (level % SUBBOSS_EVERY === 0) S.events.push(['subboss', level]);
    else if (level % SPECIAL_EVERY === 0) S.events.push(['special', level]);
  }

  function updateSpawns(dt) {
    const m = S.t / 60, M = S.map;
    const maxAlive = Math.min(480, (30 + m * 35) * M.spawn);
    S.spawnAcc += (2 + m * 2.2) * M.spawn * dt;
    while (S.spawnAcc >= 1) {
      S.spawnAcc -= 1;
      if (S.enemies.length < maxAlive) {
        const [x, y] = spawnPos();
        makeEnemy(pickType(), x, y);
      }
    }
    S.eliteT -= dt;
    if (S.eliteT <= 0) {
      S.eliteT = 60;
      const [x, y] = spawnPos();
      makeEnemy(pickType(), x, y, true);
    }
    S.swarmT -= dt;
    if (S.swarmT <= 0) {
      S.swarmT = 150;
      spawnSwarm();
    }
    while (S.events.length) {
      const [kind, level] = S.events.shift();
      spawnBig(kind, level);
    }
  }

  // ---------- Daño ----------
  function addText(x, y, txt, color, size) {
    S.texts.push({ x, y, txt, color, size, life: 0.7, max: 0.7 });
  }

  function burst(x, y, color, n, speed = 180, size = 3) {
    for (let i = 0; i < n && S.parts.length < 700; i++) {
      const a = Math.random() * TAU, s = Math.random() * speed + 30;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, color, size });
    }
  }

  function damage(e, base, kx, ky) {
    if (!targetable(e)) return;
    let dmg = base * st.might * (S.blessT > 0 ? 1.4 : 1) * rand(0.85, 1.15);
    const crit = Math.random() < st.crit;
    if (crit) dmg *= 2.2;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.flash = 0.09;
    if (!e.heavy) {
      const res = e.elite ? 0.25 : e.type === 'tanque' ? 0.4 : 1;
      e.kx += kx * res;
      e.ky += ky * res;
    }
    if (S.texts.length < 90 || crit) addText(e.x + rand(-6, 6), e.y - e.r, dmg, crit ? '#ffd166' : '#ffffff', crit ? 20 : 13);
    Sound.play('hit');
    if (e.hp <= 0) kill(e);
  }

  function addPickup(type, x, y, value = 1, vx = 0, vy = 0) {
    S.pickups.push({ type, x, y, value, mag: false, v: 0, vx, vy, bob: Math.random() * TAU });
  }

  function dropGem(x, y, value) {
    if (S.gemCount > 300) {
      // Demasiadas gemas: suma el valor a una gema existente
      for (let i = 0; i < 6; i++) {
        const k = S.pickups[(Math.random() * S.pickups.length) | 0];
        if (k && k.type === 'gem' && !k.dead && !k.mag) { k.value += value; return; }
      }
    }
    S.gemCount++;
    addPickup('gem', x, y, value);
  }

  function scatterCoins(x, y, total) {
    const n = Math.min(30, total);
    const value = Math.ceil(total / n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = rand(80, 320);
      addPickup('coin', x, y, value, Math.cos(a) * s, Math.sin(a) * s);
    }
  }

  function kill(e) {
    e.dead = true;
    S.kills++;
    S.combo++;
    S.comboT = 2.2;
    if (S.combo > S.maxCombo) S.maxCombo = S.combo;
    if (S.combo >= S.nextCombo) {
      const bonus = Math.floor(Math.sqrt(S.combo) * 1.5);
      S.coins += bonus;
      UI.banner(`¡COMBO ${S.combo}! +${bonus} 🪙`, '#ff9f43', true);
      Sound.play('combo');
      S.nextCombo = S.nextCombo < 200 ? S.nextCombo + 50 : Math.round(S.nextCombo * 1.5 / 50) * 50;
    }
    burst(e.x, e.y, e.color, e.big ? 60 : e.elite ? 30 : 8, e.big ? 340 : 180, e.big ? 5 : 3);
    Sound.play('kill');
    if (e.big) { bigReward(e); return; }

    const d = ENEMIES[e.type];
    if (d.split) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + Math.random();
        const c = makeEnemy(d.split, e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8);
        if (c) { c.kx = Math.cos(a) * 170; c.ky = Math.sin(a) * 170; }
      }
    }
    dropGem(e.x, e.y, e.xp * (e.elite ? 8 : 1));
    const L = st.luck;
    if (e.elite) {
      scatterCoins(e.x, e.y, REWARDS.elite.coins);
      if (Math.random() < 0.25 * L) addPickup('chest', e.x, e.y, 1);
    }
    if (Math.random() < 0.035 * L * e.coin) addPickup('coin', e.x + rand(-8, 8), e.y + rand(-8, 8), 1);
    const r = Math.random();
    if (r < 0.005 * L) addPickup('heart', e.x, e.y);
    else if (r < 0.0075 * L) addPickup('magnet', e.x, e.y);
    else if (r < 0.0093 * L) addPickup('bomb', e.x, e.y);
  }

  // Los monstruos más difíciles dan más recompensas
  function bigReward(e) {
    const R = REWARDS[e.kind], tier = e.tier || 1;
    scatterCoins(e.x, e.y, R.coins * tier);
    const bonus = R.bonus * tier;
    S.bonusGold += bonus;
    addPickup('chest', e.x, e.y, R.chest);
    dropGem(e.x + 20, e.y, R.xp * tier);
    S.rings.push({ x: e.x, y: e.y, r: 10, max: e.boss ? 400 : 200, life: 0.6, color: e.color });
    if (e.kind === 'special') {
      S.specials++;
      UI.banner(`¡${e.name} derrotado! +${bonus} 🪙`, '#ffd166', true);
      S.shake = Math.max(S.shake, 0.3);
    } else if (e.kind === 'subboss') {
      S.subbosses++;
      UI.banner(`¡SUBJEFE DERROTADO! +${bonus} 🪙`, '#7cff6b');
      S.shake = 0.5;
      S.whiteFlash = 0.2;
    } else {
      S.bossKills++;
      S.shake = 0.8;
      S.whiteFlash = 0.35;
      if (e.stage) {
        S.stageCleared = true;
        S.stageClearedNow = true;
        S.stageT = 2.2;
        if (S.special) {
          Save.mapStat(S.map.id).cleared = true;
          Save.write();
          S.bonusGold += S.map.clearBonus || 0;
        } else {
          Save.clearMap(S.mapIdx);
        }
        UI.banner(S.special ? '🏆 ¡NIVEL ESPECIAL COMPLETADO!' : '🏆 ¡ETAPA COMPLETADA!', '#ffd166');
        Sound.play('stage');
      } else {
        UI.banner(`¡JEFE DERROTADO! +${bonus} 🪙`, '#7cff6b');
      }
    }
    Sound.play('boom');
  }

  // trueDmg: daño de trampas que ignora la armadura
  function hurtPlayer(amount, trueDmg = false) {
    const p = S.player;
    if (p.inv > 0 || p.dead) return;
    const dmg = Math.max(1, Math.round(trueDmg ? amount : amount - st.armor));
    p.hp -= dmg;
    p.inv = 0.45;
    S.hurtFlash = 0.3;
    S.shake = Math.max(S.shake, 0.25);
    addText(p.x, p.y - 20, '-' + dmg, '#ff5c8a', 16);
    Sound.play('hurt');
    if (p.hp <= 0) {
      if (S.revives > 0) {
        S.revives--;
        p.hp = st.maxHp * 0.5;
        p.inv = 2.5;
        clearScreen(true);
        UI.banner('✨ ¡REVIVISTE! ✨', '#5cf2ff');
        Sound.play('levelup');
      } else {
        p.hp = 0;
        p.dead = true;
        S.deathT = 1.4;
        burst(p.x, p.y, p.color, 80, 400, 5);
        S.rings.push({ x: p.x, y: p.y, r: 10, max: 300, life: 0.8, color: p.color });
        S.shake = 0.8;
        Sound.play('death');
      }
    }
  }

  function clearScreen(fromRevive) {
    for (const e of S.enemies) {
      if (e.dead || !inView(e.x, e.y, 40)) continue;
      if (e.big) { if (!fromRevive) damage(e, 400, 0, 0); }
      else damage(e, 1e6, 0, 0);
    }
    S.ebullets.length = 0;
    S.hazards.length = 0;
    S.whiteFlash = 0.35;
    S.shake = 0.5;
    S.rings.push({ x: S.player.x, y: S.player.y, r: 10, max: Math.max(halfW, halfH) * 1.3, life: 0.5, color: '#ffffff' });
    Sound.play('boom');
  }

  // ---------- Experiencia y cartas ----------
  function addXp(v) {
    S.xp += v * st.xpMul;
    while (S.xp >= S.xpNext) {
      S.xp -= S.xpNext;
      S.level++;
      S.xpNext = xpFor(S.level);
      S.pendingLevels++;
      queueLevelEvent(S.level);
    }
  }

  function weaponAvailable(id) { return (WEAPONS[id].map || 0) <= S.tier; }
  function passiveAvailable(id) { return (PASSIVES[id].map || 0) <= S.tier; }

  function describe(o) {
    if (o.kind === 'evo') {
      const d = WEAPONS[o.id];
      return { icon: d.evo.icon, name: d.evo.name, tag: '¡EVOLUCIÓN!', text: d.evo.desc, hint: `${d.icon} ${d.name} + ${PASSIVES[d.evo.passive].icon} ${PASSIVES[d.evo.passive].name}` };
    }
    if (o.kind === 'weapon') {
      const d = WEAPONS[o.id];
      const ev = PASSIVES[d.evo.passive];
      const hint = `Evoluciona con ${ev.icon} ${ev.name}`;
      if (o.isNew) return { icon: d.icon, name: d.name, tag: d.map ? 'ARMA PODEROSA' : 'NUEVA ARMA', text: d.desc, hint };
      const w = S.weapons.find(x => x.id === o.id);
      const n = o.levels || 1;
      const texts = [];
      for (let i = 0; i < n; i++) texts.push(d.levels[w.level + i].text);
      return { icon: d.icon, name: d.name, tag: `Nv ${w.level + n}`, text: texts.join(' · '), hint };
    }
    if (o.kind === 'passive') {
      const d = PASSIVES[o.id];
      const lv = S.passives[o.id] || 0;
      const n = o.levels || 1;
      const evoFor = Object.keys(WEAPONS).filter(id => WEAPONS[id].evo.passive === o.id && weaponAvailable(id)).map(id => `${WEAPONS[id].icon} ${WEAPONS[id].name}`);
      return { icon: d.icon, name: d.name, tag: o.isNew ? 'NUEVA' : `Nv ${lv + n}`, text: n > 1 ? `${d.desc} (x2)` : d.desc, hint: evoFor.length ? `Evoluciona ${evoFor.join(', ')}` : '' };
    }
    if (o.kind === 'gold') return { icon: '🪙', name: 'Bolsa de oro', tag: 'EXTRA', text: '+15 de oro', hint: '' };
    return { icon: '🍖', name: 'Carne de Piru', tag: 'EXTRA', text: 'Recupera el 50% de la vida', hint: '' };
  }

  function buildOptions(n) {
    const opts = [];
    for (const w of S.weapons) {
      if (!w.evolved && w.level >= 5 && S.passives[WEAPONS[w.id].evo.passive]) opts.push({ kind: 'evo', id: w.id });
    }
    const pool = [];
    for (const w of S.weapons) if (!w.evolved && w.level < 5) pool.push({ kind: 'weapon', id: w.id, w: 3 });
    if (S.weapons.length < S.maxW) {
      for (const id in WEAPONS) {
        if (!weaponAvailable(id) || S.weapons.find(w => w.id === id)) continue;
        pool.push({ kind: 'weapon', id, isNew: true, w: WEAPONS[id].map ? 3 : 2 });
      }
    }
    const npass = Object.keys(S.passives).length;
    for (const id in PASSIVES) {
      if (!passiveAvailable(id)) continue;
      const lv = S.passives[id] || 0;
      if (lv > 0 && lv < PASSIVES[id].max) pool.push({ kind: 'passive', id, w: 2 });
      else if (lv === 0 && npass < S.maxP) pool.push({ kind: 'passive', id, isNew: true, w: 1.5 });
    }
    // Selección ponderada sin repetir
    while (opts.length < n && pool.length) {
      let total = 0;
      for (const o of pool) total += o.w;
      let r = Math.random() * total, i = 0;
      for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
      opts.push(pool.splice(i, 1)[0]);
    }
    const extra = [{ kind: 'gold' }, { kind: 'heal' }];
    while (opts.length < n && extra.length) opts.push(extra.shift());

    for (const o of opts) {
      o.rarity = 'common';
      if (o.kind === 'evo') o.rarity = 'legend';
      else if (o.isNew) o.rarity = o.kind === 'weapon' && WEAPONS[o.id].map ? 'epic' : 'rare';
      else if (o.kind === 'weapon' || o.kind === 'passive') {
        const lv = o.kind === 'weapon' ? S.weapons.find(w => w.id === o.id).level : S.passives[o.id];
        const max = o.kind === 'weapon' ? 5 : PASSIVES[o.id].max;
        if (lv + 2 <= max && Math.random() < 0.1 * st.luck) { o.rarity = 'epic'; o.levels = 2; }
      }
      o.view = describe(o);
    }
    return opts.slice(0, n);
  }

  function applyOption(o) {
    if (o.kind === 'weapon') {
      if (o.isNew) addWeapon(o.id);
      else {
        const w = S.weapons.find(x => x.id === o.id);
        w.level = Math.min(5, w.level + (o.levels || 1));
        w.p = weaponParams(w.id, w.level, w.evolved);
      }
    } else if (o.kind === 'evo') {
      const w = S.weapons.find(x => x.id === o.id);
      w.evolved = true;
      w.p = weaponParams(w.id, w.level, true);
      S.evolutions++;
      S.whiteFlash = 0.4;
      S.rings.push({ x: S.player.x, y: S.player.y, r: 10, max: 500, life: 0.7, color: '#ffd166' });
      UI.banner('¡EVOLUCIÓN! ' + WEAPONS[o.id].evo.name, '#ffd166');
      Sound.play('evo');
    } else if (o.kind === 'passive') {
      S.passives[o.id] = Math.min(PASSIVES[o.id].max, (S.passives[o.id] || 0) + (o.levels || 1));
      computeStats();
    } else if (o.kind === 'gold') {
      S.coins += 15;
    } else {
      S.player.hp = Math.min(st.maxHp, S.player.hp + st.maxHp * 0.5);
    }
  }

  function openLevelUp() {
    state = 'levelup';
    options = buildOptions(3);
    S.rings.push({ x: S.player.x, y: S.player.y, r: 10, max: 160, life: 0.4, color: '#5cf2ff' });
    Sound.play('levelup');
    UI.showLevelUp(options, S.rerolls, S.level);
  }

  function choose(i) {
    if (state !== 'levelup' || !options[i]) return;
    applyOption(options[i]);
    S.pendingLevels--;
    Sound.play('click');
    if (S.pendingLevels > 0) openLevelUp();
    else { state = 'playing'; UI.closeOverlays(); }
  }

  function reroll() {
    if (state !== 'levelup' || S.rerolls <= 0) return;
    S.rerolls--;
    options = buildOptions(3);
    Sound.play('reveal');
    UI.showLevelUp(options, S.rerolls, S.level);
  }

  // tier 1: cofre normal, 2: de subjefe, 3: de jefe
  function openChest(tier) {
    state = 'chest';
    S.chests++;
    const r = Math.random(), L = st.luck;
    let n;
    if (tier >= 3) n = 5;
    else if (tier === 2) n = r < 0.25 * L ? 5 : 3;
    else n = r < 0.07 * L ? 5 : r < 0.32 * L ? 3 : 1;
    const items = [];
    for (let i = 0; i < n; i++) {
      const o = buildOptions(1)[0];
      if (o.rarity === 'epic' && o.levels) { o.rarity = 'common'; o.levels = 1; o.view = describe(o); }
      applyOption(o);
      items.push(o);
    }
    const gold = Math.round(rand(10, 30) * n * tier);
    S.coins += gold;
    Sound.play('chest');
    UI.showChest(items, gold, tier);
  }

  function closeChest() {
    if (state !== 'chest') return;
    state = 'playing';
    UI.closeOverlays();
  }

  function collect(k) {
    k.dead = true;
    const p = S.player;
    switch (k.type) {
      case 'gem':
        S.gemCount--;
        addXp(k.value);
        Sound.play('gem');
        break;
      case 'coin':
        S.coins += k.value;
        Sound.play('coin');
        break;
      case 'heart':
        p.hp = Math.min(st.maxHp, p.hp + 30);
        addText(p.x, p.y - 24, '+30', '#7cff6b', 16);
        Sound.play('heal');
        break;
      case 'magnet':
        for (const o of S.pickups) if (!o.dead && (o.type === 'gem' || o.type === 'coin') && !o.mag) { o.mag = true; o.v = -100; }
        S.rings.push({ x: p.x, y: p.y, r: 10, max: 600, life: 0.5, color: '#5cf2ff' });
        Sound.play('reveal');
        break;
      case 'bomb':
        clearScreen(false);
        break;
      case 'chest':
        openChest(k.value || 1);
        break;
      case 'cupcake':
        p.hp = Math.min(st.maxHp, p.hp + st.maxHp * 0.2);
        S.sugarT = 4;
        addText(p.x, p.y - 24, '🧁 +20%', '#ff8fc7', 16);
        Sound.play('heal');
        break;
    }
  }

  // ---------- Niveles especiales ----------
  // Marinela: zona segura de glaseado que se mueve, charcos de caramelo y pastelitos
  const CARAMEL_CELL = 260;

  function caramelPatch(gx, gy) {
    if (gx === 0 && gy === 0) return null; // nunca en el punto de inicio
    const h = hash2(gx + 7919, gy - 104729);
    if ((h & 15) > 3) return null;
    const C = CARAMEL_CELL;
    return { x: gx * C + 40 + ((h >>> 4) & 255) / 255 * (C - 80), y: gy * C + 40 + ((h >>> 12) & 255) / 255 * (C - 80), r: 45 + ((h >>> 20) & 31) };
  }

  function inCaramel(x, y) {
    const gx = Math.floor(x / CARAMEL_CELL), gy = Math.floor(y / CARAMEL_CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const c = caramelPatch(gx + dx, gy + dy);
        if (c && (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) < c.r * c.r) return true;
      }
    }
    return false;
  }

  function updateMarinela(dt) {
    const z = S.zone, p = S.player;
    z.moveIn -= dt;
    if (!z.warn && z.moveIn <= 6) {
      z.warn = true;
      const a = Math.random() * TAU, d = rand(300, 460);
      z.nx = z.x + Math.cos(a) * d;
      z.ny = z.y + Math.sin(a) * d;
      UI.banner('🍥 ¡El glaseado se mueve!', '#ff8fc7', true);
      Sound.play('warn');
    }
    if (z.moveIn <= 0) {
      if (z.moving === 0) { z.ox = z.x; z.oy = z.y; }
      z.moving += dt;
      const k = Math.min(1, z.moving / 4);
      z.x = z.ox + (z.nx - z.ox) * k;
      z.y = z.oy + (z.ny - z.oy) * k;
      if (k >= 1) { z.moveIn = 25; z.moving = 0; z.warn = false; }
    }
    // La zona se encoge con el tiempo
    z.r = Math.max(260, 460 - S.t * 0.4);
    S.outZone = !p.dead && Math.hypot(p.x - z.x, p.y - z.y) > z.r;
    if (S.outZone) {
      z.tick -= dt;
      if (z.tick <= 0) { z.tick = 0.5; hurtPlayer(st.maxHp * 0.045, true); }
    } else {
      z.tick = 0.3;
    }
    S.inCaramel = inCaramel(p.x, p.y);
    S.sugarT = Math.max(0, S.sugarT - dt);
    // Lluvia de chispas de chocolate dentro de la zona
    S.dropT -= dt;
    if (S.dropT <= 0 && !p.dead) {
      S.dropT = 5;
      const n = 3 + Math.floor(S.t / 90);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const d = i === 0 ? rand(0, 80) : Math.sqrt(Math.random()) * z.r;
        const cx = i === 0 ? p.x : z.x, cy = i === 0 ? p.y : z.y;
        addHazard({ type: 'blast', x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 55, delay: 1.2 + i * 0.05, dmg: 10 * mapMul(S.map.dmg) * (1 + S.t / 60 * 0.06), color: '170,95,55' });
      }
    }
    S.cupcakeT -= dt;
    if (S.cupcakeT <= 0) {
      S.cupcakeT = 16;
      let n = 0;
      for (const k of S.pickups) if (k.type === 'cupcake' && !k.dead) n++;
      if (n < 2) {
        const a = Math.random() * TAU, d = rand(0.2, 0.75) * z.r;
        addPickup('cupcake', z.x + Math.cos(a) * d, z.y + Math.sin(a) * d);
      }
    }
  }

  // Piru: oscuridad, faroles, maldiciones y altares
  const LANTERN_CELL = 380;

  function lanternAt(gx, gy) {
    const h = hash2(gx - 3571, gy + 2903);
    if ((h & 7) !== 0) return null;
    const C = LANTERN_CELL;
    return { x: gx * C + 60 + ((h >>> 3) & 255) / 255 * (C - 120), y: gy * C + 60 + ((h >>> 11) & 255) / 255 * (C - 120) };
  }

  function lanternsInView(cx, cy, margin) {
    const out = [];
    const C = LANTERN_CELL;
    const gx0 = Math.floor((cx - halfW - margin) / C), gx1 = Math.floor((cx + halfW + margin) / C);
    const gy0 = Math.floor((cy - halfH - margin) / C), gy1 = Math.floor((cy + halfH + margin) / C);
    for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) { const l = lanternAt(gx, gy); if (l) out.push(l); }
    return out;
  }

  function lightRadius() {
    let r = 250;
    if (S.curse && S.curse.id === 'eclipse') r *= 0.55;
    if (S.blessT > 0) r *= 1.5;
    return r;
  }

  function blessing() {
    const p = S.player;
    S.blessT = 20;
    S.whiteFlash = 0.25;
    UI.banner('✨ ¡BENDICIÓN! +40% de daño y más luz', '#ffd166');
    // A cambio, una emboscada te rodea
    const n = 18 + Math.floor(S.t / 60 * 2), R = 300;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      makeEnemy(pickType(), p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
    }
    UI.banner('⚠️ ¡EMBOSCADA!', '#ff2828', true);
    Sound.play('swarm');
  }

  function updatePiru(dt) {
    const p = S.player;
    S.blessT = Math.max(0, S.blessT - dt);
    if (S.curse) {
      S.curseLeft -= dt;
      if (S.curse.id === 'infierno') {
        S.fireT -= dt;
        if (S.fireT <= 0 && !p.dead) {
          S.fireT = 0.6;
          const a = Math.random() * TAU, r = rand(0, 150);
          addHazard({ type: 'blast', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 50, delay: 1.0, dmg: 14 * mapMul(S.map.dmg) * (1 + S.t / 60 * 0.06), color: '255,60,40' });
        }
      }
      if (S.curseLeft <= 0) {
        UI.banner(`${S.curse.icon} ${S.curse.name} terminó`, '#c0c0c0', true);
        S.curse = null;
        S.curseT = 45;
      }
    } else {
      S.curseT -= dt;
      if (S.curseT <= 0) {
        S.curse = CURSES[(Math.random() * CURSES.length) | 0];
        S.curseLeft = 15;
        S.fireT = 0;
        UI.banner(`${S.curse.icon} MALDICIÓN: ${S.curse.name.toUpperCase()}`, '#ff2828');
        UI.hint(`${S.curse.icon} ${S.curse.desc} durante 15 segundos.`, 3000);
        Sound.play('boss');
      }
    }
    S.enemySpeedMul = S.curse && S.curse.id === 'frenesi' ? 1.35 : 1;
    if (S.curse && S.curse.id === 'sangria' && !p.dead) p.hp = Math.max(1, p.hp - st.maxHp * 0.012 * dt);
    if (S.altar) {
      const A = S.altar;
      A.life -= dt;
      const inside = !p.dead && Math.hypot(p.x - A.x, p.y - A.y) < A.r;
      A.charge = inside ? A.charge + dt : Math.max(0, A.charge - dt * 0.5);
      if (A.charge >= 3) { S.altar = null; S.altarT = 40; blessing(); }
      else if (A.life <= 0) { S.altar = null; S.altarT = 30; }
    } else {
      S.altarT -= dt;
      if (S.altarT <= 0 && !p.dead) {
        const a = Math.random() * TAU, d = rand(280, 380);
        S.altar = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 60, charge: 0, life: 25 };
        UI.banner('⛩️ Apareció un altar: quédate 3 s encima', '#ffd166', true);
      }
    }
  }

  // ---------- Peligros (ataques con aviso previo) ----------
  // blast: círculo que explota tras un retraso · puddle: charco que hace daño
  // line: rayo con aviso · wave: onda expansiva que hay que esquivar
  function addHazard(h) {
    if (S.hazards.length < 120) S.hazards.push(Object.assign({ t: 0 }, h));
  }

  function distToPlayer(x, y) {
    return Math.hypot(S.player.x - x, S.player.y - y);
  }

  function updateHazards(dt) {
    const p = S.player;
    for (const h of S.hazards) {
      h.t += dt;
      if (h.type === 'blast') {
        if (h.t < h.delay) continue;
        h.dead = true;
        if (!p.dead && distToPlayer(h.x, h.y) < h.r + p.r * 0.5) hurtPlayer(h.dmg);
        S.rings.push({ x: h.x, y: h.y, r: h.r * 0.3, max: h.r, life: 0.3, color: `rgb(${h.color})` });
        burst(h.x, h.y, `rgb(${h.color})`, 10, 160, 3);
        Sound.play(h.then === 'puddle' ? 'splash' : 'boom');
        if (h.then === 'puddle') addHazard({ type: 'puddle', x: h.x, y: h.y, r: h.r * 0.95, life: 3.5, dmg: h.dmg * 0.45, tick: 0, color: h.color });
        if (h.then === 'wave') addHazard({ type: 'wave', x: h.x, y: h.y, r: h.r * 0.5, maxR: h.r * 0.5 + 340, speed: 380, width: 26, dmg: h.dmg * 0.8, hit: false, color: h.color });
      } else if (h.type === 'puddle') {
        if (h.t >= h.life) { h.dead = true; continue; }
        h.tick -= dt;
        if (h.tick <= 0 && !p.dead && distToPlayer(h.x, h.y) < h.r + p.r * 0.3) { h.tick = 0.5; hurtPlayer(h.dmg); }
      } else if (h.type === 'line') {
        if (!h.fired) {
          if (h.t < h.delay) continue;
          h.fired = true;
          h.ft = 0;
          const c = Math.cos(h.a), s = Math.sin(h.a);
          const rx = p.x - h.x, ry = p.y - h.y;
          const along = rx * c + ry * s, perp = Math.abs(rx * s - ry * c);
          if (!p.dead && along >= -p.r && along <= h.len && perp < h.w / 2 + p.r * 0.6) hurtPlayer(h.dmg);
          Sound.play('laser');
        } else {
          h.ft += dt;
          if (h.ft > 0.22) h.dead = true;
        }
      } else if (h.type === 'wave') {
        h.r += h.speed * dt;
        if (!h.hit && !p.dead && Math.abs(distToPlayer(h.x, h.y) - h.r) < h.width / 2 + p.r * 0.5) { h.hit = true; hurtPlayer(h.dmg); }
        if (h.r >= h.maxR) h.dead = true;
      }
    }
    compact(S.hazards);
  }

  function ebullet(x, y, a, spd, r, dmg, slow) {
    if (S.ebullets.length >= 450) return;
    S.ebullets.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r, dmg, life: 6, slow: !!slow });
  }

  // ---------- Ataques de monstruos grandes ----------
  function bigAttack(e, name) {
    const p = S.player, M = S.atkTier, isBoss = e.kind === 'boss', isSub = e.kind === 'subboss';
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, aim = Math.atan2(dy, dx);
    const more = e.enraged ? 1.35 : 1;
    switch (name) {
      case 'ring': {
        const n = Math.round((10 + M * 2 + (isBoss ? 6 : isSub ? 3 : 0)) * more);
        const off = Math.random() * TAU, spd = 150 + M * 12;
        for (let i = 0; i < n; i++) ebullet(e.x, e.y, off + (i / n) * TAU, spd, 7, e.dmg * 0.5);
        if (e.enraged) for (let i = 0; i < n; i++) ebullet(e.x, e.y, off + ((i + 0.5) / n) * TAU, spd * 0.7, 7, e.dmg * 0.5);
        Sound.play('zap');
        break;
      }
      case 'fan': {
        const n = 5 + M + (isBoss ? 2 : 0);
        const frost = S.map.id === 'glaciar';
        for (let i = 0; i < n; i++) ebullet(e.x, e.y, aim + (i - (n - 1) / 2) * 0.13, 230, 7, e.dmg * 0.55, frost);
        Sound.play('zap');
        break;
      }
      case 'spiral':
        e.spiralT = isBoss ? 2.2 : 1.6;
        e.spiralE = 0;
        e.spiralA = aim;
        break;
      case 'dash':
        e.mode = 'tele';
        e.teleT = e.kind === 'special' ? 0.6 : 0.75;
        e.dvx = dx / d;
        e.dvy = dy / d;
        break;
      case 'slam':
        e.mode = 'hold';
        e.holdT = 0.95;
        addHazard({ type: 'blast', x: e.x, y: e.y, r: e.r + 90, delay: 0.9, dmg: e.dmg, color: '255,80,80', then: 'wave' });
        Sound.play('warn');
        break;
      case 'mortar': {
        const n = (e.kind === 'special' ? 3 : 4) + Math.floor(M / 2) + (e.enraged ? 2 : 0);
        const toxic = S.map.id === 'pantano';
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU, r = i === 0 ? 0 : rand(50, 150);
          addHazard({
            type: 'blast', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 55, delay: 1.1 + i * 0.12,
            dmg: e.dmg * 0.9, color: toxic ? '156,255,61' : '255,159,67', then: toxic ? 'puddle' : null,
          });
        }
        Sound.play('warn');
        break;
      }
      case 'summon': {
        const n = (isBoss ? 6 : 4) + M;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          makeEnemy(e.summon, e.x + Math.cos(a) * e.r * 1.7, e.y + Math.sin(a) * e.r * 1.7);
        }
        burst(e.x, e.y, e.color, 20, 200, 4);
        Sound.play('swarm');
        break;
      }
      case 'laser': {
        const k = isBoss ? 3 : 1;
        for (let j = 0; j < k; j++) {
          addHazard({ type: 'line', x: e.x, y: e.y, a: aim + (j - (k - 1) / 2) * 0.4, len: 950, w: 34, delay: 1.0, dmg: e.dmg * 1.2, color: '255,0,212' });
        }
        Sound.play('warn');
        break;
      }
      case 'blink': {
        e.blinkT = 0.6;
        const a = Math.random() * TAU;
        e.bx = p.x + Math.cos(a) * 170;
        e.by = p.y + Math.sin(a) * 170;
        Sound.play('blink');
        break;
      }
    }
  }

  function updateBig(e, dt) {
    const p = S.player;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    e.rot += dt * (e.mode === 'dash' ? 8 : 1);
    if (e.boss && !e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true;
      e.speed *= 1.15;
      UI.banner(`¡${e.name} se enfurece!`, e.color, true);
      burst(e.x, e.y, e.color, 30, 260, 4);
    }
    if (e.spiralT > 0) {
      e.spiralT -= dt;
      e.spiralE -= dt;
      while (e.spiralE <= 0) {
        e.spiralE += 0.075;
        const arms = e.kind === 'boss' ? 3 : 2;
        for (let k = 0; k < arms; k++) ebullet(e.x, e.y, e.spiralA + (k * TAU) / arms, 150 + S.atkTier * 10, 6, e.dmg * 0.45);
        e.spiralA += 0.33;
      }
    }
    if (e.blinkT > 0) {
      e.blinkT -= dt;
      e.phase = Math.max(0.001, e.blinkT);
      if (e.blinkT <= 0) {
        e.x = e.bx;
        e.y = e.by;
        e.phase = 0;
        for (let i = 0; i < 8; i++) ebullet(e.x, e.y, (i / 8) * TAU, 170, 7, e.dmg * 0.5);
        burst(e.x, e.y, e.color, 20, 200, 4);
      }
      return;
    }
    if (e.mode === 'walk') {
      const sp = e.speed * (e.slowT > 0 ? 0.75 : 1) * (d > 700 ? 3 : 1) * S.enemySpeedMul;
      e.x += dx / d * sp * dt;
      e.y += dy / d * sp * dt;
      e.atkT -= dt;
      if (e.atkT <= 0) {
        let i = (Math.random() * e.attacks.length) | 0;
        if (e.attacks.length > 1 && i === e.lastAtk) i = (i + 1) % e.attacks.length;
        e.lastAtk = i;
        bigAttack(e, e.attacks[i]);
        e.atkT = e.atkCd * (e.enraged ? 0.7 : 1);
      }
    } else if (e.mode === 'tele') {
      e.teleT -= dt;
      if (e.teleT <= 0) { e.mode = 'dash'; e.dashT = 0.6; }
    } else if (e.mode === 'dash') {
      e.x += e.dvx * 500 * dt;
      e.y += e.dvy * 500 * dt;
      e.dashT -= dt;
      if (Math.random() < 0.6) burst(e.x, e.y, e.color, 1, 60, 4);
      if (e.dashT <= 0) e.mode = 'walk';
    } else if (e.mode === 'hold') {
      e.holdT -= dt;
      if (e.holdT <= 0) e.mode = 'walk';
    }
  }

  // ---------- Actualización ----------
  function updatePlayer(dt) {
    const p = S.player;
    if (p.dead) return;
    const [dx, dy] = inputDir();
    let sp = st.speed * (p.slowT > 0 ? 0.55 : 1);
    if (S.special === 'marinela') {
      if (S.outZone) sp *= 0.7;
      if (S.inCaramel) sp *= 0.45;
      if (S.sugarT > 0) sp *= 1.35;
    }
    p.x += dx * sp * dt;
    p.y += dy * sp * dt;
    if (dx || dy) {
      p.face = Math.atan2(dy, dx);
      if (Math.random() < 0.5) S.parts.push({ x: p.x - Math.cos(p.face) * 12, y: p.y - Math.sin(p.face) * 12, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.35, max: 0.35, color: p.slowT > 0 ? '#a0e9ff' : p.color, size: 2.5 });
    }
    p.inv = Math.max(0, p.inv - dt);
    p.slowT = Math.max(0, p.slowT - dt);
    if (st.regen && !(S.curse && S.curse.id === 'sangria')) p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
  }

  function updateEnemies(dt) {
    const p = S.player;
    const farR = Math.hypot(halfW, halfH) * 1.6;
    for (const e of S.enemies) {
      if (e.dead) continue;
      e.flash -= dt;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.big) {
        updateBig(e, dt);
      } else {
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        let sp = e.speed * (e.slowT > 0 ? 1 - e.slowAmt : 1);
        let mx = dx / d, my = dy / d;
        switch (e.ai) {
          case 'ranged':
            if (d < 170) { mx = -mx; my = -my; } else if (d < 230) { mx = 0; my = 0; }
            e.shootT -= dt;
            if (e.shootT <= 0 && d < 440 && !p.dead) {
              e.shootT = 2.6;
              ebullet(e.x, e.y, Math.atan2(dy, dx), 190, 6, e.dmg);
            }
            break;
          case 'spitter':
            if (d < 220) { mx = -mx; my = -my; } else if (d < 300) { mx = 0; my = 0; }
            e.shootT -= dt;
            if (e.shootT <= 0 && d < 480 && !p.dead) {
              e.shootT = 3.4;
              addHazard({ type: 'blast', x: p.x, y: p.y, r: 48, delay: 1.0, dmg: e.dmg, color: '156,255,61', then: 'puddle' });
              Sound.play('spit');
            }
            break;
          case 'charger':
            if (e.mode === 'tele') {
              mx = my = 0;
              e.modeT -= dt;
              if (e.modeT <= 0) { e.mode = 'dash'; e.modeT = 0.45; }
            } else if (e.mode === 'dash') {
              mx = e.dvx; my = e.dvy; sp = 520;
              e.modeT -= dt;
              if (e.modeT <= 0) e.mode = 'walk';
            } else {
              e.shootT -= dt;
              if (e.shootT <= 0 && d < 340) { e.shootT = 3.6; e.mode = 'tele'; e.modeT = 0.7; e.dvx = dx / d; e.dvy = dy / d; }
            }
            break;
          case 'frost':
            if (d < 200) { mx = -mx; my = -my; } else if (d < 260) { mx = 0; my = 0; }
            e.shootT -= dt;
            if (e.shootT <= 0 && d < 460 && !p.dead) {
              e.shootT = 3;
              const a = Math.atan2(dy, dx);
              for (let i = -1; i <= 1; i++) ebullet(e.x, e.y, a + i * 0.2, 200, 6, e.dmg, true);
            }
            break;
          case 'bomber':
            if (e.mode === 'arm') {
              mx = my = 0;
              e.modeT -= dt;
              if (e.modeT <= 0) {
                // Explota: no da recompensas
                e.dead = true;
                if (!p.dead && d < 85 + p.r * 0.5) hurtPlayer(e.dmg);
                S.rings.push({ x: e.x, y: e.y, r: 10, max: 85, life: 0.3, color: '#ff6a00' });
                burst(e.x, e.y, '#ff6a00', 20, 220, 4);
                Sound.play('boom');
                continue;
              }
            } else if (d < 65) { e.mode = 'arm'; e.modeT = 0.7; }
            break;
          case 'summoner':
            if (d < 260) { mx = -mx; my = -my; } else if (d < 340) { mx = 0; my = 0; }
            e.shootT -= dt;
            if (e.shootT <= 0 && d < 520) {
              e.shootT = 5.5;
              for (let i = 0; i < 3; i++) {
                const a = (i / 3) * TAU;
                makeEnemy('diablillo', e.x + Math.cos(a) * 28, e.y + Math.sin(a) * 28);
              }
              burst(e.x, e.y, e.color, 10, 150, 3);
            }
            break;
          case 'phaser':
            if (e.phase > 0) {
              mx = my = 0;
              e.phase -= dt;
              if (e.phase <= 0) { e.x = e.bx; e.y = e.by; e.phase = 0; e.phaseCd = rand(3.5, 5.5); }
            } else {
              e.phaseCd -= dt;
              if (e.phaseCd <= 0 && d < 520) {
                e.phase = 0.6;
                const a = Math.random() * TAU;
                e.bx = p.x + Math.cos(a) * 130;
                e.by = p.y + Math.sin(a) * 130;
                Sound.play('blink');
              }
            }
            break;
          case 'sniper':
            if (d < 330) { mx = -mx; my = -my; } else if (d < 420) { mx = 0; my = 0; }
            e.shootT -= dt;
            if (e.shootT <= 0 && d < 700 && !p.dead) {
              e.shootT = 4.5;
              addHazard({ type: 'line', x: e.x, y: e.y, a: Math.atan2(dy, dx), len: 900, w: 14, delay: 1.0, dmg: e.dmg, color: '255,43,214' });
            }
            break;
        }
        sp *= S.enemySpeedMul;
        if (S.special === 'marinela' && inCaramel(e.x, e.y)) sp *= 0.5;
        e.x += (mx * sp + e.kx) * dt;
        e.y += (my * sp + e.ky) * dt;
        const k = Math.min(1, dt * 8);
        e.kx -= e.kx * k;
        e.ky -= e.ky * k;
        if (d > farR && e.mode === 'walk' && !(e.phase > 0)) {
          // Enemigo muy lejos: reaparece al otro lado de la pantalla
          const [nx, ny] = spawnPos();
          e.x = nx; e.y = ny;
        }
        // Separación para que no se amontonen
        if (!(e.phase > 0)) {
          const list = gridQuery(e.x, e.y, e.r);
          for (let i = 0; i < list.length; i++) {
            const o = list[i];
            if (o === e || o.dead) continue;
            const ox = e.x - o.x, oy = e.y - o.y, rr = e.r + o.r, d2 = ox * ox + oy * oy;
            if (d2 < rr * rr && d2 > 0.01) {
              const dd = Math.sqrt(d2), push = (rr - dd) * 0.3;
              e.x += ox / dd * push;
              e.y += oy / dd * push;
            }
          }
        }
      }
      if (e.phase > 0) continue;
      const cx = p.x - e.x, cy = p.y - e.y, cr = e.r + p.r * 0.75;
      if (cx * cx + cy * cy < cr * cr) hurtPlayer(e.dmg);
    }
  }

  function jagged(pts) {
    const out = [pts[0], pts[1]];
    for (let i = 2; i < pts.length; i += 2) {
      const x0 = pts[i - 2], y0 = pts[i - 1], x1 = pts[i], y1 = pts[i + 1];
      for (let s = 1; s <= 4; s++) {
        const t = s / 4, j = s < 4 ? 12 : 0;
        out.push(x0 + (x1 - x0) * t + rand(-j, j), y0 + (y1 - y0) * t + rand(-j, j));
      }
    }
    return out;
  }

  // Rayo láser: daña a todos los enemigos en la línea
  function fireBeam(x, y, a, len, width, dmg, color) {
    const c = Math.cos(a), s = Math.sin(a);
    for (const e of S.enemies) {
      if (!targetable(e)) continue;
      const rx = e.x - x, ry = e.y - y;
      const along = rx * c + ry * s;
      if (along < -e.r || along > len + e.r) continue;
      if (Math.abs(rx * s - ry * c) > width / 2 + e.r) continue;
      damage(e, dmg, c * 90, s * 90);
    }
    S.beams.push({ x, y, a, len, width, life: 0.2, max: 0.2, color });
  }

  function updateWeapons(dt) {
    const p = S.player;
    if (p.dead) return;
    const extra = st.extra;
    for (const w of S.weapons) {
      const q = w.p;
      switch (w.id) {
        case 'blaster': {
          w.timer -= dt;
          if (w.timer > 0) break;
          const t = nearestEnemy(p.x, p.y, 520);
          if (!t) { w.timer = 0.1; break; }
          w.timer = q.cd * st.cd;
          const base = Math.atan2(t.y - p.y, t.x - p.x);
          const n = q.count + extra;
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.14;
            S.bullets.push({ kind: 'shot', x: p.x, y: p.y, vx: Math.cos(a) * q.speed, vy: Math.sin(a) * q.speed, r: q.size * st.area, dmg: q.dmg, pierce: q.pierce, life: 1.3, hit: new Set(), color: w.evolved ? '#ffffff' : '#5cf2ff' });
          }
          Sound.play('shoot');
          break;
        }
        case 'orbes': {
          w.angle += q.spin * dt;
          const R = q.radius * st.area, sz = q.size * st.area;
          const n = q.count + extra;
          w.orbs.length = 0;
          for (let i = 0; i < n; i++) {
            const a = w.angle + (i * TAU) / n;
            const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
            w.orbs.push(ox, oy);
            const list = gridQuery(ox, oy, sz);
            for (let j = 0; j < list.length; j++) {
              const e = list[j];
              if (e.dead) continue;
              const dx = e.x - ox, dy = e.y - oy, rr = e.r + sz;
              if (dx * dx + dy * dy > rr * rr) continue;
              if (S.t - (e.lh.orbes || -9) < q.hitCd) continue;
              e.lh.orbes = S.t;
              const d = Math.hypot(dx, dy) || 1;
              damage(e, q.dmg, dx / d * 150, dy / d * 150);
            }
          }
          break;
        }
        case 'aura': {
          w.pulse += dt;
          w.timer -= dt;
          if (w.timer > 0) break;
          w.timer = q.tick * Math.max(0.6, st.cd);
          const R = q.radius * st.area;
          const list = gridQuery(p.x, p.y, R);
          for (let j = 0; j < list.length; j++) {
            const e = list[j];
            if (e.dead) continue;
            const dx = e.x - p.x, dy = e.y - p.y, rr = R + e.r;
            if (dx * dx + dy * dy > rr * rr) continue;
            const d = Math.hypot(dx, dy) || 1;
            damage(e, q.dmg, dx / d * 50, dy / d * 50);
            if (q.slow) { e.slowT = 0.6; e.slowAmt = q.slow; }
          }
          break;
        }
        case 'rayo': {
          w.timer -= dt;
          if (w.timer > 0) break;
          if (!S.enemies.length) { w.timer = 0.2; break; }
          w.timer = q.cd * st.cd;
          for (let s = 0; s < q.strikes + extra; s++) {
            let cur = randomEnemyNear(p.x, p.y, Math.min(halfW, halfH) + 60);
            if (!cur) break;
            const hit = new Set();
            const pts = [cur.x + rand(-60, 60), cur.y - 280];
            for (let c = 0; c <= q.chains && cur; c++) {
              hit.add(cur.id);
              pts.push(cur.x, cur.y);
              damage(cur, q.dmg, 0, 0);
              burst(cur.x, cur.y, '#ffe066', 3, 120, 2);
              cur = nearestEnemy(cur.x, cur.y, q.range * st.area, hit);
            }
            S.bolts.push({ pts: jagged(pts), life: 0.22, max: 0.22, color: w.evolved ? '#ffffff' : '#ffe066' });
          }
          Sound.play('zap');
          break;
        }
        case 'cuchillas': {
          w.timer -= dt;
          if (w.timer > 0) break;
          w.timer = q.cd * st.cd;
          const t = nearestEnemy(p.x, p.y, 600);
          const base = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.face;
          const out = 0.45, n = q.count + extra;
          for (let i = 0; i < n; i++) {
            const a = base + (i * TAU) / n;
            S.bullets.push({ kind: 'blade', x: p.x, y: p.y, dx: Math.cos(a), dy: Math.sin(a), v0: (2 * q.range) / out, out, t: 0, life: 4, r: q.size * st.area, dmg: q.dmg, hitCd: q.hitCd, hm: new Map(), spin: 0, color: w.evolved ? '#d4ffcc' : '#7cff6b' });
          }
          break;
        }
        case 'misiles': {
          w.timer -= dt;
          if (w.timer > 0) break;
          if (!nearestEnemy(p.x, p.y, 600)) { w.timer = 0.2; break; }
          w.timer = q.cd * st.cd;
          for (let i = 0; i < q.count + extra; i++) {
            S.bullets.push({ kind: 'missile', x: p.x, y: p.y, a: Math.random() * TAU, speed: q.speed, target: randomEnemyNear(p.x, p.y, 420), life: 3, r: 6, dmg: q.dmg, blast: q.blast * st.area, color: w.evolved ? '#ffb3c6' : '#ff5c8a' });
          }
          break;
        }
        case 'laser': {
          w.timer -= dt;
          if (w.timer > 0) break;
          const len = q.len * st.area;
          const first = nearestEnemy(p.x, p.y, len);
          if (!first) { w.timer = 0.15; break; }
          w.timer = q.cd * st.cd;
          const color = w.evolved ? '#ffffff' : WEAPONS.laser.color;
          for (let i = 0; i < q.count + extra; i++) {
            const t = i === 0 ? first : randomEnemyNear(p.x, p.y, len * 0.75);
            if (!t) break;
            fireBeam(p.x, p.y, Math.atan2(t.y - p.y, t.x - p.x), len, q.width * st.area, q.dmg, color);
          }
          Sound.play('laser');
          break;
        }
        case 'guadana': {
          const R = q.radius * st.area;
          if (w.sweepT > 0) {
            const prev = w.ang;
            w.sweepT -= dt;
            w.ang = w.a0 + (1 - Math.max(0, w.sweepT) / q.sweep) * TAU;
            const step = w.ang - prev;
            const list = gridQuery(p.x, p.y, R);
            for (let j = 0; j < list.length; j++) {
              const e = list[j];
              if (e.dead) continue;
              const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
              if (d > R + e.r) continue;
              const ea = Math.atan2(dy, dx), tol = e.r / d;
              for (let b = 0; b < q.blades; b++) {
                const key = e.id * 4 + b;
                if (w.hit.has(key)) continue;
                const rel = ((ea - (prev + b * Math.PI)) % TAU + TAU) % TAU;
                if (rel <= step + tol || rel >= TAU - tol) {
                  w.hit.add(key);
                  damage(e, q.dmg, dx / d * 220, dy / d * 220);
                }
              }
            }
          } else {
            w.timer -= dt;
            if (w.timer <= 0) {
              w.timer = q.cd * st.cd;
              w.sweepT = q.sweep;
              w.a0 = w.ang = Math.random() * TAU;
              w.hit = new Set();
              Sound.play('scythe');
            }
          }
          break;
        }
        case 'agujero': {
          w.timer -= dt;
          if (w.timer > 0) break;
          if (!S.enemies.length) { w.timer = 0.3; break; }
          w.timer = q.cd * st.cd;
          for (let i = 0; i < q.count + extra; i++) {
            const t = randomEnemyNear(p.x, p.y, Math.min(halfW, halfH));
            if (!t) break;
            S.holes.push({ x: t.x, y: t.y, r: q.radius * st.area, pull: q.pull, dmg: q.dmg, life: q.dur, max: q.dur, tick: 0, evolved: w.evolved, spin: 0 });
          }
          Sound.play('blink');
          break;
        }
        case 'supernova': {
          w.timer -= dt;
          if (w.timer > 0) break;
          w.timer = q.cd * st.cd;
          for (let i = 0; i < q.waves; i++) {
            S.novas.push({ x: p.x, y: p.y, r: 10, maxR: q.radius * st.area, delay: i * 0.3, dmg: q.dmg, hit: new Set(), color: w.evolved ? '#ffffff' : '#ffbe0b' });
          }
          break;
        }
      }
    }
  }

  function updateHoles(dt) {
    for (const h of S.holes) {
      h.life -= dt;
      h.spin += dt * 6;
      h.tick -= dt;
      const doTick = h.tick <= 0;
      if (doTick) h.tick = 0.25;
      const list = gridQuery(h.x, h.y, h.r);
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        if (e.dead) continue;
        const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d > h.r + e.r) continue;
        if (!e.heavy) {
          const step = Math.min(d, h.pull * dt);
          e.x += dx / d * step;
          e.y += dy / d * step;
        }
        if (doTick) damage(e, h.dmg, 0, 0);
      }
      if (h.life <= 0) {
        h.dead = true;
        if (h.evolved) {
          const list2 = gridQuery(h.x, h.y, h.r);
          for (let j = 0; j < list2.length; j++) {
            const e = list2[j];
            if (e.dead) continue;
            if (Math.hypot(e.x - h.x, e.y - h.y) <= h.r + e.r) damage(e, h.dmg * 4, 0, 0);
          }
          S.rings.push({ x: h.x, y: h.y, r: 10, max: h.r * 1.2, life: 0.4, color: '#9d4edd' });
          Sound.play('boom');
        }
      }
    }
    compact(S.holes);
  }

  function updateNovas(dt) {
    const p = S.player;
    for (const n of S.novas) {
      if (n.delay > 0) {
        n.delay -= dt;
        n.x = p.x;
        n.y = p.y;
        if (n.delay <= 0) Sound.play('nova');
        continue;
      }
      n.r += (n.maxR / 0.55) * dt;
      const list = gridQuery(n.x, n.y, n.r + 30);
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        if (e.dead || n.hit.has(e.id)) continue;
        const dx = e.x - n.x, dy = e.y - n.y, d = Math.hypot(dx, dy) || 1;
        if (Math.abs(d - n.r) > 24 + e.r) continue;
        n.hit.add(e.id);
        damage(e, n.dmg, dx / d * 200, dy / d * 200);
      }
      if (n.r >= n.maxR) n.dead = true;
    }
    compact(S.novas);
  }

  function explode(b) {
    b.dead = true;
    const list = gridQuery(b.x, b.y, b.blast);
    for (let j = 0; j < list.length; j++) {
      const e = list[j];
      if (e.dead) continue;
      const dx = e.x - b.x, dy = e.y - b.y, rr = b.blast + e.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      const d = Math.hypot(dx, dy) || 1;
      damage(e, b.dmg, dx / d * 200, dy / d * 200);
    }
    S.rings.push({ x: b.x, y: b.y, r: 5, max: b.blast, life: 0.3, color: b.color });
    burst(b.x, b.y, '#ff9f43', 14, 200, 3);
    S.shake = Math.max(S.shake, 0.12);
    Sound.play('boom');
  }

  function updateBullets(dt) {
    const p = S.player;
    for (const b of S.bullets) {
      if (b.dead) continue;
      b.life -= dt;
      if (b.kind === 'shot') {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.life <= 0) { b.dead = true; continue; }
        const list = gridQuery(b.x, b.y, b.r);
        for (let j = 0; j < list.length; j++) {
          const e = list[j];
          if (e.dead || b.hit.has(e.id)) continue;
          const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          b.hit.add(e.id);
          const sp = Math.hypot(b.vx, b.vy) || 1;
          damage(e, b.dmg, b.vx / sp * 80, b.vy / sp * 80);
          if (--b.pierce < 0) { b.dead = true; break; }
        }
      } else if (b.kind === 'blade') {
        b.t += dt;
        b.spin += dt * 18;
        if (b.t < b.out) {
          const v = b.v0 * (1 - b.t / b.out);
          b.x += b.dx * v * dt;
          b.y += b.dy * v * dt;
        } else {
          const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
          const v = Math.min(1000, 150 + (b.t - b.out) * 1200);
          b.x += dx / d * v * dt;
          b.y += dy / d * v * dt;
          if (d < 24) b.dead = true;
        }
        if (b.life <= 0) b.dead = true;
        const list = gridQuery(b.x, b.y, b.r);
        for (let j = 0; j < list.length; j++) {
          const e = list[j];
          if (e.dead) continue;
          const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          const lt = b.hm.get(e.id);
          if (lt !== undefined && S.t - lt < b.hitCd) continue;
          b.hm.set(e.id, S.t);
          damage(e, b.dmg, b.dx * 120, b.dy * 120);
        }
      } else if (b.kind === 'missile') {
        if (!b.target || !targetable(b.target)) b.target = nearestEnemy(b.x, b.y, 500);
        if (b.target) {
          const ta = Math.atan2(b.target.y - b.y, b.target.x - b.x);
          let da = ta - b.a;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          b.a += Math.max(-7 * dt, Math.min(7 * dt, da));
        }
        b.speed = Math.min(b.speed + 300 * dt, 600);
        b.x += Math.cos(b.a) * b.speed * dt;
        b.y += Math.sin(b.a) * b.speed * dt;
        if (Math.random() < 0.7 && S.parts.length < 700) S.parts.push({ x: b.x, y: b.y, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.3, max: 0.3, color: '#ff9f43', size: 2.5 });
        let hitAny = b.life <= 0;
        if (!hitAny) {
          const list = gridQuery(b.x, b.y, b.r);
          for (let j = 0; j < list.length; j++) {
            const e = list[j];
            if (e.dead) continue;
            const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
            if (dx * dx + dy * dy <= rr * rr) { hitAny = true; break; }
          }
        }
        if (hitAny) explode(b);
      }
    }
    compact(S.bullets);

    for (const b of S.ebullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { b.dead = true; continue; }
      const dx = p.x - b.x, dy = p.y - b.y, rr = b.r + p.r * 0.7;
      if (dx * dx + dy * dy < rr * rr && !p.dead) {
        b.dead = true;
        if (b.slow) p.slowT = 1.6;
        hurtPlayer(b.dmg);
      }
    }
    compact(S.ebullets);
  }

  function updatePickups(dt) {
    const p = S.player;
    const pr = st.pickup;
    for (const k of S.pickups) {
      if (k.dead) continue;
      k.bob += dt * 4;
      if (k.vx || k.vy) {
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        const f = Math.min(1, dt * 4);
        k.vx -= k.vx * f;
        k.vy -= k.vy * f;
        if (Math.abs(k.vx) + Math.abs(k.vy) < 5) k.vx = k.vy = 0;
      }
      if (p.dead) continue;
      const dx = p.x - k.x, dy = p.y - k.y, d2 = dx * dx + dy * dy;
      if (!k.mag && d2 < pr * pr) { k.mag = true; k.v = -140; }
      if (k.mag) {
        k.v = Math.min(k.v + 1500 * dt, 950);
        const d = Math.sqrt(d2) || 1;
        const step = Math.min(d, k.v * dt);
        k.x += dx / d * step;
        k.y += dy / d * step;
        if (d < p.r + 8) {
          if (k.type === 'chest' && state !== 'playing') continue;
          collect(k);
        }
      }
    }
    compact(S.pickups);
  }

  function updateFx(dt) {
    for (const q of S.parts) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.94;
      q.vy *= 0.94;
      q.life -= dt;
      if (q.life <= 0) q.dead = true;
    }
    compact(S.parts);
    for (const t of S.texts) { t.y -= 40 * dt; t.life -= dt; if (t.life <= 0) t.dead = true; }
    compact(S.texts);
    for (const b of S.bolts) { b.life -= dt; if (b.life <= 0) b.dead = true; }
    compact(S.bolts);
    for (const b of S.beams) { b.life -= dt; if (b.life <= 0) b.dead = true; }
    compact(S.beams);
    for (const r of S.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 10); if (r.life <= 0) r.dead = true; }
    compact(S.rings);
    S.shake = Math.max(0, S.shake - dt);
    S.hurtFlash = Math.max(0, S.hurtFlash - dt);
    S.whiteFlash = Math.max(0, S.whiteFlash - dt);
  }

  // Elige qué monstruo grande muestra la barra de vida superior
  function updateBossBar() {
    compact(S.bigs);
    let best = null, rank = -1;
    for (const e of S.bigs) {
      const r = e.kind === 'boss' ? 2 : e.kind === 'subboss' ? 1 : 0;
      if (r > rank) { rank = r; best = e; }
    }
    S.boss = best;
  }

  function update(dt) {
    if (S.deathT > 0) {
      S.deathT -= dt;
      dt *= 0.3;
      if (S.deathT <= 0) { endRun('death'); return; }
    } else {
      S.t += dt;
      updateSpawns(dt);
    }
    if (S.special === 'marinela') updateMarinela(dt);
    else if (S.special === 'piru') updatePiru(dt);
    gridBuild();
    updatePlayer(dt);
    updateEnemies(dt);
    updateWeapons(dt);
    updateBullets(dt);
    updateHoles(dt);
    updateNovas(dt);
    updateHazards(dt);
    compact(S.enemies);
    updateBossBar();
    updatePickups(dt);
    updateFx(dt);

    if (S.comboT > 0) {
      S.comboT -= dt;
      if (S.comboT <= 0) { S.combo = 0; S.nextCombo = 50; }
    }
    if (!S.recordShown && S.level > S.mapBest) {
      S.recordShown = true;
      UI.banner('🏆 ¡NUEVO RÉCORD DE NIVEL EN ESTE MAPA!', '#5cf2ff', true);
      Sound.play('combo');
    }
    if (S.stageT > 0 && !S.player.dead) {
      S.stageT -= dt;
      if (S.stageT <= 0 && state === 'playing') { openStage(); return; }
    }
    if (state === 'playing' && S.pendingLevels > 0 && !S.player.dead) openLevelUp();
  }

  // ---------- Etapa completada ----------
  function openStage() {
    state = 'stage';
    joy.active = false;
    Sound.play('win');
    UI.showStageClear({ map: S.map, mapIdx: S.mapIdx, special: S.special, next: S.special ? null : (MAPS[S.mapIdx + 1] || null), level: S.level });
  }

  function stageContinue() {
    if (state !== 'stage') return;
    state = 'playing';
    UI.closeOverlays();
    UI.hint(`Sigue luchando: cada ${BOSS_EVERY} niveles aparece un jefe más fuerte con mejores recompensas.`, 4500);
  }

  function stageAscend() {
    if (state !== 'stage') return;
    endRun('ascend');
  }

  // ---------- Fin de partida ----------
  function endRun(result) {
    if (state === 'over') return;
    state = 'over';
    const sd = Save.data, s = sd.stats, M = S.map;
    const won = result === 'ascend';
    const time = Math.floor(S.t);
    const timeBonus = Math.floor(S.t / 60) * 15;
    const bossBonus = S.bonusGold;
    const total = Math.round((S.coins + timeBonus + bossBonus) * st.goldMul * M.gold);
    const records = [];
    const ms = Save.mapStat(M.id);
    if (S.level > ms.bestLevel) { if (ms.bestLevel > 0) records.push('Nivel en ' + M.name); ms.bestLevel = S.level; }
    if (time > ms.bestTime) ms.bestTime = time;
    if (time > s.bestTime) { if (s.bestTime > 0) records.push('Tiempo'); s.bestTime = time; }
    if (S.level > s.bestLevel) s.bestLevel = S.level;
    if (S.maxCombo > s.maxCombo) { if (s.maxCombo > 0) records.push('Combo'); s.maxCombo = S.maxCombo; }
    s.kills += S.kills;
    s.runs++;
    s.bossKills += S.bossKills;
    s.subbosses += S.subbosses;
    s.specials += S.specials;
    s.evolutions += S.evolutions;
    s.chests += S.chests;
    s.goldEarned += total;
    if (S.stageClearedNow) s.wins++;
    sd.gold += total;
    sd.lifetime.kills += S.kills;
    sd.lifetime.runs++;
    sd.lifetime.goldEarned += total;
    sd.tutorialDone = true;
    if (won && !S.special && S.mapIdx + 1 < sd.mapsUnlocked) sd.mapSel = S.mapIdx + 1;
    Save.write();
    UI.showGameOver({
      result, won, stageClearedNow: S.stageClearedNow, map: M, mapIdx: S.mapIdx, special: S.special,
      next: S.special ? null : (MAPS[S.mapIdx + 1] || null),
      time: S.t, level: S.level, kills: S.kills, maxCombo: S.maxCombo,
      bossKills: S.bossKills, subbosses: S.subbosses, specials: S.specials,
      coins: S.coins, timeBonus, bossBonus, mult: st.goldMul, mapMult: M.gold, total, records,
      build: build(),
    });
  }

  function pause() {
    if (state !== 'playing' || S.deathT > 0) return;
    state = 'paused';
    joy.active = false;
    UI.showPause(build(), st);
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    UI.closeOverlays();
  }

  function quit() {
    if (state === 'paused') endRun('quit');
  }

  function toMenu() {
    state = 'menu';
    S = null;
  }

  function build() {
    if (!S) return [];
    const out = S.weapons.map(w => {
      const d = WEAPONS[w.id];
      return { icon: w.evolved ? d.evo.icon : d.icon, name: w.evolved ? d.evo.name : d.name, level: w.evolved ? '★' : w.level, evolved: w.evolved, kind: 'weapon' };
    });
    for (const id in S.passives) out.push({ icon: PASSIVES[id].icon, name: PASSIVES[id].name, level: S.passives[id], kind: 'passive' });
    return out;
  }

  // ---------- Dibujo ----------
  function theme() { return S ? S.map : (ALL_MAPS[Save.data.mapSel] || MAPS[0]); }

  function drawGrid(cx, cy, T) {
    const step = 64;
    const x0 = Math.floor((cx - halfW) / step) * step, x1 = cx + halfW;
    const y0 = Math.floor((cy - halfH) / step) * step, y1 = cy + halfH;
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${T.grid},0.07)`;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) { ctx.moveTo(x, cy - halfH); ctx.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += step) { ctx.moveTo(cx - halfW, y); ctx.lineTo(x1, y); }
    ctx.stroke();
    ctx.strokeStyle = `rgba(${T.grid2},0.12)`;
    ctx.beginPath();
    const big = step * 4;
    for (let x = Math.floor((cx - halfW) / big) * big; x <= x1; x += big) { ctx.moveTo(x, cy - halfH); ctx.lineTo(x, y1); }
    for (let y = Math.floor((cy - halfH) / big) * big; y <= y1; y += big) { ctx.moveTo(cx - halfW, y); ctx.lineTo(x1, y); }
    ctx.stroke();
  }

  // Decoración fija del mapa (siempre igual en el mismo lugar)
  function drawDecor(cx, cy, T) {
    const C = 160;
    const gx0 = Math.floor((cx - halfW) / C), gx1 = Math.floor((cx + halfW) / C);
    const gy0 = Math.floor((cy - halfH) / C), gy1 = Math.floor((cy + halfH) / C);
    const t = performance.now() / 1000;
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const h = hash2(gx, gy);
        if ((h & 7) > 2) continue;
        const x = gx * C + ((h >>> 3) & 127) / 127 * C;
        const y = gy * C + ((h >>> 10) & 127) / 127 * C;
        const s = 3 + ((h >>> 17) & 7);
        ctx.fillStyle = T.decor[(h >>> 20) % T.decor.length];
        ctx.globalAlpha = 0.16 + 0.08 * Math.sin(t * 1.5 + (h & 31));
        ctx.beginPath();
        switch (T.id) {
          case 'ciudad': ctx.rect(x - s, y - s, s * 2, s * 2); break;
          case 'pantano': ctx.arc(x, y, s * 1.4, 0, TAU); break;
          case 'glaciar': ctx.moveTo(x, y - s * 2); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 2); ctx.lineTo(x - s, y); ctx.closePath(); break;
          case 'volcan': ctx.arc(x, y + Math.sin(t * 2 + h) * 3, s, 0, TAU); break;
          default: ctx.rect(x - s * 1.5, y - 1, s * 3, 2); ctx.rect(x - 1, y - s * 1.5, 2, s * 3);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const p = S.player;
    if (p.dead) return;
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0) return;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0b1e';
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 0.62, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 0.32 + Math.sin(t * 6) * 1.2, 0, TAU);
    ctx.fill();
    if (p.slowT > 0) {
      ctx.strokeStyle = 'rgba(160,233,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, p.r + 5, 0, TAU); ctx.stroke();
    }
    ctx.rotate(p.face);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.r + 9, 0);
    ctx.lineTo(p.r + 2, -6);
    ctx.lineTo(p.r + 2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Barra de vida
    const w = 34, frac = Math.max(0, Math.min(1, p.hp / st.maxHp));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - w / 2, p.y + p.r + 8, w, 5);
    ctx.fillStyle = frac > 0.5 ? '#7cff6b' : frac > 0.25 ? '#ffd166' : '#ff5c8a';
    ctx.fillRect(p.x - w / 2, p.y + p.r + 8, w * frac, 5);
  }

  function drawTeleLine(x, y, a, len, w, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = `rgba(255,60,90,${alpha})`;
    ctx.fillRect(0, -w / 2, len, w);
    ctx.restore();
  }

  function drawHazards(t) {
    for (const h of S.hazards) {
      if (h.type === 'blast') {
        if (!inView(h.x, h.y, h.r)) continue;
        const k = Math.min(1, h.t / h.delay);
        ctx.fillStyle = `rgba(${h.color},${0.1 + 0.12 * k})`;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${h.color},0.3)`;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * k, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(${h.color},${0.6 + 0.4 * Math.sin(t * 20)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
      } else if (h.type === 'puddle') {
        if (!inView(h.x, h.y, h.r)) continue;
        const fade = Math.min(1, (h.life - h.t) / 0.5);
        ctx.fillStyle = `rgba(${h.color},${0.28 * fade})`;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${h.color},${0.5 * fade})`;
        for (let i = 0; i < 3; i++) {
          const a = t * 1.3 + i * 2.1, rr = h.r * 0.55;
          ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * rr, h.y + Math.sin(a * 1.3) * rr, 3 + (i % 2) * 2, 0, TAU); ctx.fill();
        }
      } else if (h.type === 'line') {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.a);
        if (!h.fired) {
          const k = Math.min(1, h.t / h.delay);
          ctx.fillStyle = `rgba(${h.color},${0.08 + 0.15 * k})`;
          ctx.fillRect(0, -h.w / 2, h.len, h.w);
          ctx.fillStyle = `rgba(${h.color},${0.5 + 0.5 * Math.sin(t * 30)})`;
          ctx.fillRect(0, -1, h.len, 2);
        } else {
          const a = 1 - h.ft / 0.22;
          ctx.shadowColor = `rgb(${h.color})`;
          ctx.shadowBlur = 20;
          ctx.fillStyle = `rgba(${h.color},${a})`;
          ctx.fillRect(0, -h.w / 2, h.len, h.w);
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.fillRect(0, -h.w / 6, h.len, h.w / 3);
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      } else if (h.type === 'wave') {
        ctx.strokeStyle = `rgba(${h.color},0.7)`;
        ctx.lineWidth = h.width;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
      }
    }
  }

  function drawPickups(alpha) {
    ctx.globalAlpha = alpha;
    for (const k of S.pickups) {
      if (!inView(k.x, k.y, 30)) continue;
      let spr;
      if (k.type === 'gem') spr = k.value >= 60 ? sprites.gem4 : k.value >= 25 ? sprites.gem3 : k.value >= 5 ? sprites.gem2 : sprites.gem1;
      else if (k.type === 'chest') spr = k.value >= 3 ? sprites.chest3 : k.value === 2 ? sprites.chest2 : sprites.chest;
      else spr = sprites[k.type];
      drawSprite(spr, k.x, k.y + Math.sin(k.bob) * 2, k.type === 'chest' || k.type === 'cupcake' ? 1 + Math.sin(k.bob) * 0.08 : 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawEnemyBullets() {
    for (const b of S.ebullets) {
      if (!inView(b.x, b.y, 20)) continue;
      ctx.fillStyle = b.slow ? 'rgba(160,233,255,0.35)' : 'rgba(255,90,60,0.35)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = b.slow ? '#a0e9ff' : '#ff9f43';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
    }
  }

  // Marinela: charcos de caramelo y zona de glaseado
  function drawCaramel(cx, cy) {
    const C = CARAMEL_CELL;
    const gx0 = Math.floor((cx - halfW) / C) - 1, gx1 = Math.floor((cx + halfW) / C) + 1;
    const gy0 = Math.floor((cy - halfH) / C) - 1, gy1 = Math.floor((cy + halfH) / C) + 1;
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const c = caramelPatch(gx, gy);
        if (!c) continue;
        ctx.fillStyle = 'rgba(201,123,74,0.55)';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.82, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,209,102,0.35)';
        ctx.beginPath(); ctx.ellipse(c.x - c.r * 0.25, c.y - c.r * 0.25, c.r * 0.35, c.r * 0.2, -0.5, 0, TAU); ctx.fill();
      }
    }
  }

  function drawZone(t) {
    const z = S.zone;
    ctx.beginPath();
    ctx.rect(S.player.x - halfW - 60, S.player.y - halfH - 60, halfW * 2 + 120, halfH * 2 + 120);
    ctx.arc(z.x, z.y, z.r, 0, TAU, true);
    ctx.fillStyle = `rgba(255,143,199,${0.2 + 0.05 * Math.sin(t * 3)})`;
    ctx.fill('evenodd');
    ctx.strokeStyle = '#ff8fc7';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#ff8fc7';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
    if (z.warn) {
      ctx.setLineDash([14, 12]);
      ctx.lineDashOffset = -t * 40;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(z.nx, z.ny, z.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawAltar(t) {
    const A = S.altar;
    if (!A) return;
    ctx.fillStyle = `rgba(255,209,102,${0.12 + 0.06 * Math.sin(t * 4)})`;
    ctx.beginPath(); ctx.arc(A.x, A.y, A.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(A.x, A.y, A.r, 0, TAU); ctx.stroke();
    if (A.charge > 0) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(A.x, A.y, A.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, A.charge / 3)); ctx.stroke();
    }
    drawSprite(sprites.altar, A.x, A.y - 4);
  }

  // Piru: capa de oscuridad con huecos de luz (a media resolución para ir más rápido)
  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');

  function drawDarkness(cx, cy) {
    const sc = 0.5;
    const w = Math.max(1, Math.ceil(vw * sc)), h = Math.max(1, Math.ceil(vh * sc));
    if (dark.width !== w || dark.height !== h) { dark.width = w; dark.height = h; }
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, w, h);
    dctx.fillStyle = 'rgba(3,0,6,0.95)';
    dctx.fillRect(0, 0, w, h);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (wx, wy, wr) => {
      const x = (vw / 2 + (wx - cx) * zoom) * sc, y = (vh / 2 + (wy - cy) * zoom) * sc, r = wr * zoom * sc;
      if (x < -r || y < -r || x > w + r || y > h + r) return;
      const g = dctx.createRadialGradient(x, y, r * 0.3, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath(); dctx.arc(x, y, r, 0, TAU); dctx.fill();
    };
    if (!S.player.dead) hole(S.player.x, S.player.y, lightRadius());
    for (const l of lanternsInView(cx, cy, 200)) hole(l.x, l.y, 190);
    if (S.altar) hole(S.altar.x, S.altar.y, 120);
    for (const r of S.rings) if (r.max > 60) hole(r.x, r.y, r.r * 0.9);
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0, vw, vh);
  }

  // Lo que brilla en la oscuridad: ojos, balas, avisos de peligro, objetos y faroles
  function drawGlowLayer(cx, cy, t) {
    for (const l of lanternsInView(cx, cy, 40)) drawSprite(sprites.lantern, l.x, l.y + Math.sin(t * 2 + l.x) * 2);
    drawAltar(t);
    drawHazards(t);
    drawPickups(0.85);
    const lr = lightRadius() * 0.75;
    const p = S.player;
    ctx.fillStyle = '#ff2b2b';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (const e of S.enemies) {
      if (e.dead || e.phase > 0 || !inView(e.x, e.y, 20)) continue;
      if (Math.abs(e.x - p.x) < lr && Math.abs(e.y - p.y) < lr) continue;
      const ex = e.r * 0.36, ey = e.y - e.r * 0.12, er = Math.max(1.8, e.r * 0.14);
      ctx.moveTo(e.x - ex + er, ey); ctx.arc(e.x - ex, ey, er, 0, TAU);
      ctx.moveTo(e.x + ex + er, ey); ctx.arc(e.x + ex, ey, er, 0, TAU);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    drawEnemyBullets();
  }

  function drawWorld() {
    const p = S.player;
    const t = performance.now() / 1000;
    const isDark = S.special === 'piru';

    if (S.special === 'marinela') drawZone(t);
    if (!isDark) drawHazards(t);

    // Agujeros negros
    for (const h of S.holes) {
      if (!inView(h.x, h.y, h.r)) continue;
      const a = Math.min(1, h.life / 0.3, (h.max - h.life) / 0.2 + 0.2);
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
      g.addColorStop(0, `rgba(0,0,0,${0.95 * a})`);
      g.addColorStop(0.35, `rgba(20,0,40,${0.8 * a})`);
      g.addColorStop(0.8, `rgba(157,78,221,${0.35 * a})`);
      g.addColorStop(1, 'rgba(157,78,221,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(199,125,255,${0.6 * a})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r * (0.3 + i * 0.2), h.spin + i * 2, h.spin + i * 2 + 1.6);
        ctx.stroke();
      }
    }

    // Aura (debajo de todo)
    for (const w of S.weapons) {
      if (w.id !== 'aura' || p.dead) continue;
      const R = w.p.radius * st.area * (1 + Math.sin(w.pulse * 5) * 0.03);
      const g = ctx.createRadialGradient(p.x, p.y, R * 0.2, p.x, p.y, R);
      const c = w.evolved ? '120,40,200' : '255,122,69';
      g.addColorStop(0, `rgba(${c},0.05)`);
      g.addColorStop(0.8, `rgba(${c},0.18)`);
      g.addColorStop(1, `rgba(${c},0.35)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, TAU);
      ctx.fill();
    }

    if (!isDark) drawPickups(1);

    for (const e of S.enemies) {
      if (e.dead || !inView(e.x, e.y, e.r + 30)) continue;
      const phased = e.phase > 0;
      if (phased) {
        // Aviso de dónde va a reaparecer
        ctx.strokeStyle = `rgba(${e.big ? '255,60,90' : '176,166,255'},0.6)`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.bx, e.by, e.r * (0.6 + 0.4 * Math.sin(t * 20)), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.25;
      }
      if (e.big) {
        if (e.mode === 'tele') drawTeleLine(e.x, e.y, Math.atan2(e.dvy, e.dvx), 300, e.r * 2, 0.15 + Math.sin(t * 30) * 0.08);
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.boss) ctx.rotate(e.rot);
        drawSprite(sprites[e.spr + (e.flash > 0 ? '_f' : '')], 0, 0, e.enraged ? 1 + Math.sin(t * 12) * 0.04 : 1);
        ctx.restore();
        if (!phased) {
          const w = Math.max(50, e.r * 2.2);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 18, w, 5);
          ctx.fillStyle = e.kind === 'special' ? '#ffd166' : '#ff3d6e';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 18, w * Math.max(0, e.hp / e.maxHp), 5);
          ctx.font = '700 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#fff';
          ctx.fillText(e.name, e.x, e.y - e.r - 24);
        }
      } else {
        if (e.ai === 'charger' && e.mode === 'tele') drawTeleLine(e.x, e.y, Math.atan2(e.dvy, e.dvx), 234, e.r * 2, 0.18 + Math.sin(t * 30) * 0.08);
        if (e.ai === 'bomber' && e.mode === 'arm') {
          ctx.fillStyle = `rgba(255,106,0,${0.15 + 0.15 * Math.sin(t * 40)})`;
          ctx.beginPath(); ctx.arc(e.x, e.y, 85, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,106,0,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(e.x, e.y, 85, 0, TAU); ctx.stroke();
        }
        const wob = 1 + Math.sin(t * 10 + e.id) * 0.05;
        const flashing = e.flash > 0 || (e.mode === 'arm' && Math.sin(t * 40) > 0);
        drawSprite(sprites[e.spr + (flashing ? '_f' : '')], e.x, e.y, wob);
        if (e.elite) {
          const w = e.r * 2;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
          ctx.fillStyle = '#ffd166';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, e.hp / e.maxHp), 4);
        }
      }
      if (phased) ctx.globalAlpha = 1;
    }

    // Proyectiles del jugador
    for (const b of S.bullets) {
      if (!inView(b.x, b.y, 20)) continue;
      if (b.kind === 'shot') {
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
      } else if (b.kind === 'blade') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.spin);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU;
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(Math.cos(a + 0.6) * b.r, Math.sin(a + 0.6) * b.r, Math.cos(a) * b.r * 1.2, Math.sin(a) * b.r * 1.2);
          ctx.quadraticCurveTo(Math.cos(a + 0.2) * b.r * 0.4, Math.sin(a + 0.2) * b.r * 0.4, 0, 0);
        }
        ctx.fill();
        ctx.restore();
      } else if (b.kind === 'missile') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(-6, -5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 5); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Rayos láser del jugador
    for (const b of S.beams) {
      const a = b.life / b.max;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.globalAlpha = a;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = b.color;
      ctx.fillRect(0, -b.width / 2, b.len, b.width);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -b.width / 6, b.len, b.width / 3);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Guadaña
    for (const w of S.weapons) {
      if (w.id !== 'guadana' || w.sweepT <= 0 || p.dead) continue;
      const R = w.p.radius * st.area;
      ctx.lineCap = 'round';
      for (let b = 0; b < w.p.blades; b++) {
        const a = w.ang + b * Math.PI;
        ctx.strokeStyle = w.evolved ? 'rgba(255,255,255,0.35)' : 'rgba(160,233,255,0.3)';
        ctx.lineWidth = R * 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.72, a - 1.1, a); ctx.stroke();
        ctx.strokeStyle = w.evolved ? '#ffffff' : '#a0e9ff';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#a0e9ff';
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, a - 0.7, a); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Orbes
    for (const w of S.weapons) {
      if (w.id !== 'orbes' || p.dead) continue;
      const sz = w.p.size * st.area;
      ctx.shadowBlur = 14;
      ctx.shadowColor = w.evolved ? '#8ecbff' : '#c77dff';
      for (let i = 0; i < w.orbs.length; i += 2) {
        ctx.fillStyle = w.evolved ? '#8ecbff' : '#c77dff';
        ctx.beginPath(); ctx.arc(w.orbs[i], w.orbs[i + 1], sz, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(w.orbs[i] - sz * 0.25, w.orbs[i + 1] - sz * 0.25, sz * 0.35, 0, TAU); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // Ondas de supernova
    for (const n of S.novas) {
      if (n.delay > 0) continue;
      const a = Math.max(0, 1 - n.r / n.maxR);
      ctx.strokeStyle = n.color;
      ctx.globalAlpha = 0.3 + 0.6 * a;
      ctx.lineWidth = 10 + 14 * a;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    drawPlayer();

    if (!isDark) drawEnemyBullets();

    for (const q of S.parts) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of S.bolts) {
      const a = b.life / b.max;
      for (const [wid, col] of [[6, b.color], [2, '#ffffff']]) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = col;
        ctx.lineWidth = wid;
        ctx.beginPath();
        ctx.moveTo(b.pts[0], b.pts[1]);
        for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i], b.pts[i + 1]);
        ctx.stroke();
      }
    }
    for (const r of S.rings) {
      ctx.globalAlpha = Math.max(0, r.life * 2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    for (const tx of S.texts) {
      const a = Math.min(1, tx.life / tx.max * 2);
      ctx.globalAlpha = a;
      ctx.font = `800 ${tx.size}px system-ui, sans-serif`;
      ctx.strokeText(tx.txt, tx.x, tx.y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.txt, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }

  // Flechas en el borde para objetivos fuera de la pantalla
  function drawIndicators() {
    const p = S.player;
    const targets = [];
    for (const e of S.bigs) if (!e.dead) targets.push([e.x, e.y, e.color, e.kind === 'boss' ? '☠️' : e.kind === 'subboss' ? '👹' : '⚠️']);
    for (const k of S.pickups) if (k.type === 'chest' && !k.dead) targets.push([k.x, k.y, '#ffd166', '🎁']);
    if (S.outZone) targets.push([S.zone.x, S.zone.y, '#ff8fc7', '🍥']);
    if (S.altar) targets.push([S.altar.x, S.altar.y, '#ffd166', '⛩️']);
    for (const k of S.pickups) if (k.type === 'cupcake' && !k.dead) targets.push([k.x, k.y, '#ff8fc7', '🧁']);
    for (const [x, y, color, icon] of targets) {
      const sx = (x - p.x) * zoom, sy = (y - p.y) * zoom;
      if (Math.abs(sx) < vw / 2 - 10 && Math.abs(sy) < vh / 2 - 10) continue;
      const m = 34;
      const k = Math.min((vw / 2 - m) / Math.abs(sx || 1e-6), (vh / 2 - m) / Math.abs(sy || 1e-6));
      const ix = vw / 2 + sx * k, iy = vh / 2 + sy * k;
      const a = Math.atan2(sy, sx);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
      ctx.rotate(a);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(17, -7); ctx.lineTo(17, 7); ctx.closePath(); ctx.fill();
      ctx.rotate(-a);
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 1);
      ctx.restore();
    }
  }

  function drawJoystick() {
    if (!joy.active) return;
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 45, 0, TAU); ctx.stroke();
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy), m = Math.min(d, 45);
    ctx.fillStyle = '#5cf2ff';
    ctx.beginPath();
    ctx.arc(joy.ox + (d ? dx / d * m : 0), joy.oy + (d ? dy / d * m : 0), 20, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function draw() {
    const T = theme();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, vw, vh);

    let cx, cy, sx = 0, sy = 0;
    if (S) {
      cx = S.player.x;
      cy = S.player.y;
      if (S.shake > 0) { sx = rand(-1, 1) * S.shake * 14; sy = rand(-1, 1) * S.shake * 14; }
    } else {
      cx = menuCam.x;
      cy = menuCam.y;
    }
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (vw / 2 - (cx + sx) * zoom), dpr * (vh / 2 - (cy + sy) * zoom));
    drawGrid(cx, cy, T);
    drawDecor(cx, cy, T);
    if (T.special === 'marinela') drawCaramel(cx, cy);
    if (S) {
      if (S.special !== 'piru') drawAltar(performance.now() / 1000);
      drawWorld();
      if (S.special === 'piru') {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawDarkness(cx + sx, cy + sy);
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (vw / 2 - (cx + sx) * zoom), dpr * (vh / 2 - (cy + sy) * zoom));
        drawGlowLayer(cx, cy, performance.now() / 1000);
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
    if (!S) return;

    drawIndicators();
    drawJoystick();
    const low = S.player.hp / st.maxHp < 0.3 && !S.player.dead;
    if (S.hurtFlash > 0 || low) {
      const a = Math.max(S.hurtFlash * 1.5, low ? 0.25 + Math.sin(performance.now() / 150) * 0.1 : 0);
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
      g.addColorStop(0, 'rgba(255,0,60,0)');
      g.addColorStop(1, `rgba(255,0,60,${Math.min(0.6, a)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (S.whiteFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${S.whiteFlash})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (S.outZone) {
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.25, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
      g.addColorStop(0, 'rgba(255,143,199,0)');
      g.addColorStop(1, `rgba(255,143,199,${0.35 + 0.15 * Math.sin(performance.now() / 120)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  // ---------- Bucle ----------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    try {
      if (state === 'playing') update(dt);
      else if (state === 'menu') { menuCam.x += dt * 30; menuCam.y += dt * 18; }
      draw();
      if (S && state !== 'menu') UI.updateHud(S, st);
      Sound.setIntensity(state === 'playing' || state === 'levelup' || state === 'chest' ? (S && S.boss ? 2 : 1) : 0);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    start, choose, reroll, closeChest, pause, resume, quit, toMenu, stageContinue, stageAscend,
    // Avanza la simulación sin dibujar (para pruebas automáticas)
    _step(dt) { if (state === 'playing') update(dt); },
    get state() { return state; },
    get run() { return S; },
    get stats() { return st; },
  };
})();
