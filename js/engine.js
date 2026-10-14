// Motor del juego: bucle principal, entidades, armas, enemigos y dibujo.

const Game = (() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const SPR = 2; // resolución de los sprites pre-renderizados

  let vw = 0, vh = 0, dpr = 1, zoom = 1, halfW = 0, halfH = 0;
  let state = 'menu'; // menu | playing | levelup | chest | paused | over
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

  function shapePath(g, shape, r) {
    g.beginPath();
    if (shape === 'blob') {
      g.arc(0, 0, r, 0, TAU);
    } else if (shape === 'tri') {
      g.moveTo(0, -r * 1.15); g.lineTo(r * 1.1, r * 0.85); g.lineTo(-r * 1.1, r * 0.85); g.closePath();
    } else if (shape === 'square') {
      const s = r * 0.95, c = r * 0.35;
      g.moveTo(-s + c, -s); g.lineTo(s - c, -s); g.quadraticCurveTo(s, -s, s, -s + c);
      g.lineTo(s, s - c); g.quadraticCurveTo(s, s, s - c, s); g.lineTo(-s + c, s);
      g.quadraticCurveTo(-s, s, -s, s - c); g.lineTo(-s, -s + c); g.quadraticCurveTo(-s, -s, -s + c, -s);
      g.closePath();
    } else if (shape === 'diamond') {
      g.moveTo(0, -r * 1.2); g.lineTo(r, 0); g.lineTo(0, r * 1.2); g.lineTo(-r, 0); g.closePath();
    } else if (shape === 'spiky') {
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU, rr = i % 2 ? r * 0.8 : r * 1.1;
        i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
    }
  }

  function enemySprite(shape, r, color, mode) {
    const size = r * 2.6 + 30;
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
      sprites[id] = enemySprite(d.shape, d.r, d.color, 'n');
      sprites[id + '_f'] = enemySprite(d.shape, d.r, d.color, 'f');
      sprites[id + '_e'] = enemySprite(d.shape, d.r * 1.6, d.color, 'e');
      sprites[id + '_e_f'] = enemySprite(d.shape, d.r * 1.6, d.color, 'f');
    }
    BOSSES.forEach((b, i) => {
      const r = b.final ? 56 : 44;
      sprites['boss' + i] = enemySprite('spiky', r, b.color, 'n');
      sprites['boss' + i + '_f'] = enemySprite('spiky', r, b.color, 'f');
    });
    sprites.gem1 = gemSprite('#4cc9f0', 5);
    sprites.gem2 = gemSprite('#7cff6b', 6.5);
    sprites.gem3 = gemSprite('#ff4d6d', 8);
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
  const CELL = 64, MARGIN = 60;
  const grid = new Map();
  const qbuf = [];

  function gkey(cx, cy) { return ((cx & 0xffff) << 16) | (cy & 0xffff); }

  function gridBuild() {
    grid.clear();
    for (const e of S.enemies) {
      if (e.dead) continue;
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

  function nearestEnemy(x, y, maxR, exclude) {
    let best = null, bd = maxR * maxR;
    for (const e of S.enemies) {
      if (e.dead || (exclude && exclude.has(e.id))) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function randomEnemyNear(x, y, R) {
    const n = S.enemies.length;
    for (let i = 0; i < 14 && n; i++) {
      const e = S.enemies[(Math.random() * n) | 0];
      if (!e.dead && Math.abs(e.x - x) < R && Math.abs(e.y - y) < R) return e;
    }
    return nearestEnemy(x, y, R * 1.5);
  }

  function xpFor(level) { return Math.floor(5 + (level - 1) * 4.5 + Math.pow(level, 1.35)); }

  // ---------- Partida ----------
  function computeStats() {
    const U = Save.upgrade;
    const P = id => S.passives[id] || 0;
    const m = CHARACTERS[S.char].mods;
    const prevMax = st.maxHp || 0;
    st = {
      maxHp: Math.round((100 + 15 * U('vida') + 20 * P('vitalidad')) * (m.hp || 1)),
      regen: 0.3 * U('regen') + 0.4 * P('vitalidad'),
      armor: U('armadura') + (m.armor || 0),
      speed: 150 * (1 + 0.05 * U('velocidad') + 0.10 * P('velocidad')) * (m.speed || 1),
      pickup: 75 * (1 + 0.15 * U('iman') + 0.35 * P('iman')),
      might: 1 + 0.06 * U('poder') + 0.12 * P('poder'),
      cd: (1 - 0.04 * U('cadencia')) * Math.pow(0.92, P('cadencia')) * (m.cd || 1),
      area: (1 + 0.12 * P('area')) * (m.area || 1),
      crit: 0.05 + 0.03 * U('suerte') + 0.05 * P('suerte') + (m.crit || 0),
      luck: 1 + 0.1 * U('suerte') + 0.15 * P('suerte'),
      xpMul: 1 + 0.08 * U('crecimiento'),
      goldMul: (1 + 0.1 * U('codicia')) * (m.gold || 1),
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
    S.weapons.push({ id, level: 1, evolved: false, timer: 0.4, angle: 0, orbs: [], pulse: 0, p: weaponParams(id, 1, false) });
  }

  function start(charId) {
    Sound.init();
    const ch = CHARACTERS[charId];
    st = {};
    S = {
      char: charId, t: 0,
      player: { x: 0, y: 0, r: 14, hp: 100, inv: 0, face: 0, color: ch.color, dead: false },
      enemies: [], bullets: [], ebullets: [], pickups: [], parts: [], texts: [], bolts: [], rings: [],
      weapons: [], passives: {},
      xp: 0, level: 1, xpNext: xpFor(1),
      kills: 0, coins: 0, combo: 0, comboT: 0, maxCombo: 0, nextCombo: 50,
      bossKills: 0, chests: 0, evolutions: 0,
      rerolls: Save.upgrade('cambios') + 1, revives: Save.upgrade('revivir'),
      pendingLevels: 0, spawnAcc: 0, eliteT: 45, bossIdx: 0, swarmIdx: 0, boss: null,
      shake: 0, hurtFlash: 0, whiteFlash: 0, nextId: 1, deathT: 0, winT: 0, won: false,
      recordShown: Save.data.stats.bestTime < 30, gemCount: 0,
    };
    computeStats();
    S.player.hp = st.maxHp;
    addWeapon(ch.weapon);
    joy.active = false;
    state = 'playing';
    UI.onRunStart();
    if (!Save.data.tutorialDone) UI.hint('Muévete con WASD / flechas o arrastrando el dedo. ¡Tus armas disparan solas!', 7000);
  }

  // ---------- Generación de enemigos ----------
  function spawnPos(extra = 60) {
    const a = Math.random() * TAU;
    const R = Math.hypot(halfW, halfH) + extra;
    return [S.player.x + Math.cos(a) * R, S.player.y + Math.sin(a) * R];
  }

  function makeEnemy(type, x, y, elite = false) {
    const d = ENEMIES[type];
    const m = S.t / 60;
    const hpMul = (1 + m * 0.35 + m * m * 0.03) * (elite ? 14 : 1);
    const e = {
      id: S.nextId++, type, x, y, elite, boss: false,
      r: d.r * (elite ? 1.6 : 1),
      hp: d.hp * hpMul, maxHp: d.hp * hpMul,
      speed: d.speed * (elite ? 0.9 : 1) * (1 + Math.min(0.25, m * 0.015)),
      dmg: d.dmg * (1 + m * 0.09) * (elite ? 1.5 : 1),
      xp: d.xp, color: d.color, spr: type + (elite ? '_e' : ''),
      kx: 0, ky: 0, flash: 0, lh: {}, slowT: 0, slowAmt: 0, shootT: rand(1, 3),
    };
    S.enemies.push(e);
    return e;
  }

  function pickType() {
    const m = S.t / 60;
    const w = [['bicho', 10]];
    if (m >= 1) w.push(['rapido', 4 + m]);
    if (m >= 2) w.push(['tanque', 1.5 + m * 0.3]);
    if (m >= 3) w.push(['tirador', 2 + m * 0.2]);
    let total = 0;
    for (const x of w) total += x[1];
    let r = Math.random() * total;
    for (const x of w) { r -= x[1]; if (r <= 0) return x[0]; }
    return 'bicho';
  }

  function spawnSwarm() {
    const n = Math.floor(30 + S.t / 60 * 6);
    const R = Math.max(halfW, halfH) + 40;
    const type = S.t > 300 ? 'rapido' : 'bicho';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      makeEnemy(type, S.player.x + Math.cos(a) * R, S.player.y + Math.sin(a) * R);
    }
    UI.banner('¡ENJAMBRE!', '#ffd166');
    Sound.play('swarm');
  }

  function spawnBoss(idx) {
    const def = BOSSES[idx];
    const a = Math.random() * TAU, R = Math.min(halfW, halfH) + 80;
    const e = {
      id: S.nextId++, type: 'jefe', boss: true, final: !!def.final, name: def.name, idx,
      x: S.player.x + Math.cos(a) * R, y: S.player.y + Math.sin(a) * R,
      r: def.final ? 56 : 44, hp: def.hp, maxHp: def.hp, speed: def.final ? 70 : 62,
      dmg: 26 + idx * 6, xp: 0, color: def.color, spr: 'boss' + idx, elite: false,
      kx: 0, ky: 0, flash: 0, lh: {}, slowT: 0, slowAmt: 0,
      mode: 'walk', atkT: 2.5, alt: 0, teleT: 0, dashT: 0, dvx: 0, dvy: 0, rot: 0,
    };
    S.enemies.push(e);
    S.boss = e;
    UI.banner(def.final ? '☠️ ' + def.name.toUpperCase() + ' ☠️' : '¡JEFE: ' + def.name.toUpperCase() + '!', def.color);
    Sound.play('boss');
  }

  function updateSpawns(dt) {
    const m = S.t / 60;
    const maxAlive = Math.min(450, 30 + m * 35);
    S.spawnAcc += (2 + m * 2.2) * dt;
    while (S.spawnAcc >= 1) {
      S.spawnAcc -= 1;
      if (S.enemies.length < maxAlive) {
        const [x, y] = spawnPos();
        makeEnemy(pickType(), x, y);
      }
    }
    S.eliteT -= dt;
    if (S.eliteT <= 0) {
      S.eliteT = 55;
      const [x, y] = spawnPos();
      makeEnemy(pickType(), x, y, true);
    }
    if (S.swarmIdx < SWARMS.length && S.t >= SWARMS[S.swarmIdx]) { S.swarmIdx++; spawnSwarm(); }
    if (S.bossIdx < BOSSES.length && S.t >= BOSSES[S.bossIdx].at) { spawnBoss(S.bossIdx); S.bossIdx++; }
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
    if (e.dead) return;
    let dmg = base * st.might * rand(0.85, 1.15);
    const crit = Math.random() < st.crit;
    if (crit) dmg *= 2.2;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.flash = 0.09;
    if (!e.boss) {
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
    burst(e.x, e.y, e.color, e.boss ? 70 : e.elite ? 30 : 8, e.boss ? 360 : 180, e.boss ? 5 : 3);
    Sound.play('kill');

    if (e.boss) {
      S.bossKills++;
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * TAU, s = rand(80, 320);
        addPickup('coin', e.x, e.y, 2, Math.cos(a) * s, Math.sin(a) * s);
      }
      addPickup('chest', e.x, e.y);
      dropGem(e.x + 20, e.y, 60);
      S.shake = 0.7;
      S.whiteFlash = 0.3;
      S.rings.push({ x: e.x, y: e.y, r: 10, max: 400, life: 0.6, color: e.color });
      Sound.play('boom');
      if (S.boss === e) S.boss = S.enemies.find(o => o.boss && !o.dead) || null;
      if (e.final) {
        S.won = true;
        S.winT = 3;
        UI.banner('¡VICTORIA!', '#ffd166');
        Sound.play('win');
      } else {
        UI.banner('¡JEFE DERROTADO!', '#7cff6b');
      }
      return;
    }

    dropGem(e.x, e.y, e.xp * (e.elite ? 8 : 1));
    if (e.elite) addPickup('chest', e.x, e.y);
    const L = st.luck;
    if (Math.random() < 0.035 * L) addPickup('coin', e.x + rand(-8, 8), e.y + rand(-8, 8), 1);
    const r = Math.random();
    if (r < 0.005 * L) addPickup('heart', e.x, e.y);
    else if (r < 0.0075 * L) addPickup('magnet', e.x, e.y);
    else if (r < 0.0093 * L) addPickup('bomb', e.x, e.y);
  }

  function hurtPlayer(amount) {
    const p = S.player;
    if (p.inv > 0 || p.dead || S.won) return;
    const dmg = Math.max(1, Math.round(amount - st.armor));
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
      if (e.boss) damage(e, fromRevive ? 0 : 400, 0, 0);
      else damage(e, 1e6, 0, 0);
    }
    S.ebullets.length = 0;
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
    }
  }

  function describe(o) {
    if (o.kind === 'evo') {
      const d = WEAPONS[o.id];
      return { icon: d.evo.icon, name: d.evo.name, tag: '¡EVOLUCIÓN!', text: d.evo.desc, hint: `${d.icon} ${d.name} + ${PASSIVES[d.evo.passive].icon} ${PASSIVES[d.evo.passive].name}` };
    }
    if (o.kind === 'weapon') {
      const d = WEAPONS[o.id];
      const ev = PASSIVES[d.evo.passive];
      const hint = `Evoluciona con ${ev.icon} ${ev.name}`;
      if (o.isNew) return { icon: d.icon, name: d.name, tag: 'NUEVA ARMA', text: d.desc, hint };
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
      const evoFor = Object.values(WEAPONS).find(w => w.evo.passive === o.id);
      return { icon: d.icon, name: d.name, tag: o.isNew ? 'NUEVA' : `Nv ${lv + n}`, text: n > 1 ? `${d.desc} (x2)` : d.desc, hint: evoFor ? `Evoluciona ${evoFor.icon} ${evoFor.name}` : '' };
    }
    if (o.kind === 'gold') return { icon: '🪙', name: 'Bolsa de oro', tag: 'EXTRA', text: '+15 de oro', hint: '' };
    return { icon: '🍗', name: 'Comida', tag: 'EXTRA', text: 'Recupera el 50% de la vida', hint: '' };
  }

  function buildOptions(n) {
    const opts = [];
    for (const w of S.weapons) {
      if (!w.evolved && w.level >= 5 && S.passives[WEAPONS[w.id].evo.passive]) opts.push({ kind: 'evo', id: w.id });
    }
    const pool = [];
    for (const w of S.weapons) if (!w.evolved && w.level < 5) pool.push({ kind: 'weapon', id: w.id, w: 3 });
    if (S.weapons.length < MAX_WEAPONS) {
      for (const id in WEAPONS) if (!S.weapons.find(w => w.id === id)) pool.push({ kind: 'weapon', id, isNew: true, w: 2 });
    }
    const npass = Object.keys(S.passives).length;
    for (const id in PASSIVES) {
      const lv = S.passives[id] || 0;
      if (lv > 0 && lv < PASSIVES[id].max) pool.push({ kind: 'passive', id, w: 2 });
      else if (lv === 0 && npass < MAX_PASSIVES) pool.push({ kind: 'passive', id, isNew: true, w: 1.5 });
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
      else if (o.isNew) o.rarity = 'rare';
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

  function openChest() {
    state = 'chest';
    S.chests++;
    const r = Math.random();
    const n = r < 0.07 * st.luck ? 5 : r < 0.32 * st.luck ? 3 : 1;
    const items = [];
    for (let i = 0; i < n; i++) {
      const o = buildOptions(1)[0];
      if (o.rarity === 'epic') { o.rarity = 'common'; o.levels = 1; o.view = describe(o); }
      applyOption(o);
      items.push(o);
    }
    const gold = Math.round(rand(10, 30) * n);
    S.coins += gold;
    Sound.play('chest');
    UI.showChest(items, gold);
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
        openChest();
        break;
    }
  }

  // ---------- Actualización ----------
  function updatePlayer(dt) {
    const p = S.player;
    if (p.dead) return;
    const [dx, dy] = S.won ? [0, 0] : inputDir();
    p.x += dx * st.speed * dt;
    p.y += dy * st.speed * dt;
    if (dx || dy) {
      p.face = Math.atan2(dy, dx);
      if (Math.random() < 0.5) S.parts.push({ x: p.x - Math.cos(p.face) * 12, y: p.y - Math.sin(p.face) * 12, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.35, max: 0.35, color: p.color, size: 2.5 });
    }
    p.inv = Math.max(0, p.inv - dt);
    if (st.regen) p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
  }

  function updateBoss(e, dt) {
    const p = S.player;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    e.rot += dt * (e.mode === 'dash' ? 8 : 1);
    if (e.mode === 'walk') {
      const sp = e.speed * (e.slowT > 0 ? 0.75 : 1) * (d > 700 ? 3 : 1);
      e.x += dx / d * sp * dt;
      e.y += dy / d * sp * dt;
      e.atkT -= dt;
      if (e.atkT <= 0) {
        e.alt++;
        if (e.alt % 2 === 1) {
          const rings = e.final ? 2 : 1;
          for (let k = 0; k < rings; k++) {
            const n = e.final ? 26 : 14 + e.idx * 3, off = Math.random() * TAU, spd = 160 + k * 60;
            for (let i = 0; i < n; i++) {
              const a = off + (i / n) * TAU;
              S.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, dmg: e.dmg * 0.5, life: 6 });
            }
          }
          if (e.final) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; makeEnemy('rapido', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80); }
          e.atkT = e.final ? 2 : 2.6;
          Sound.play('zap');
        } else {
          e.mode = 'tele';
          e.teleT = 0.8;
          e.dvx = dx / d;
          e.dvy = dy / d;
          e.atkT = 2.4;
        }
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
    }
  }

  function updateEnemies(dt) {
    const p = S.player;
    const farR = Math.hypot(halfW, halfH) * 1.6;
    for (const e of S.enemies) {
      if (e.dead) continue;
      e.flash -= dt;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.boss) {
        updateBoss(e, dt);
      } else {
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        const sp = e.speed * (e.slowT > 0 ? 1 - e.slowAmt : 1);
        let mx = dx / d, my = dy / d;
        if (e.type === 'tirador') {
          if (d < 170) { mx = -mx; my = -my; } else if (d < 230) { mx = 0; my = 0; }
          e.shootT -= dt;
          if (e.shootT <= 0 && d < 440 && !p.dead) {
            e.shootT = 2.6;
            S.ebullets.push({ x: e.x, y: e.y, vx: dx / d * 190, vy: dy / d * 190, r: 6, dmg: e.dmg, life: 5 });
          }
        }
        e.x += (mx * sp + e.kx) * dt;
        e.y += (my * sp + e.ky) * dt;
        const k = Math.min(1, dt * 8);
        e.kx -= e.kx * k;
        e.ky -= e.ky * k;
        if (d > farR) {
          // Enemigo muy lejos: reaparece al otro lado de la pantalla
          const [nx, ny] = spawnPos();
          e.x = nx; e.y = ny;
        }
        // Separación para que no se amontonen
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

  function updateWeapons(dt) {
    const p = S.player;
    if (p.dead) return;
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
          for (let i = 0; i < q.count; i++) {
            const a = base + (i - (q.count - 1) / 2) * 0.14;
            S.bullets.push({ kind: 'shot', x: p.x, y: p.y, vx: Math.cos(a) * q.speed, vy: Math.sin(a) * q.speed, r: q.size * st.area, dmg: q.dmg, pierce: q.pierce, life: 1.3, hit: new Set(), color: w.evolved ? '#ffffff' : '#5cf2ff' });
          }
          Sound.play('shoot');
          break;
        }
        case 'orbes': {
          w.angle += q.spin * dt;
          const R = q.radius * st.area, sz = q.size * st.area;
          w.orbs.length = 0;
          for (let i = 0; i < q.count; i++) {
            const a = w.angle + (i * TAU) / q.count;
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
          for (let s = 0; s < q.strikes; s++) {
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
          const out = 0.45;
          for (let i = 0; i < q.count; i++) {
            const a = base + (i * TAU) / q.count;
            S.bullets.push({ kind: 'blade', x: p.x, y: p.y, dx: Math.cos(a), dy: Math.sin(a), v0: (2 * q.range) / out, out, t: 0, life: 4, r: q.size * st.area, dmg: q.dmg, hitCd: q.hitCd, hm: new Map(), spin: 0, color: w.evolved ? '#d4ffcc' : '#7cff6b' });
          }
          break;
        }
        case 'misiles': {
          w.timer -= dt;
          if (w.timer > 0) break;
          if (!nearestEnemy(p.x, p.y, 600)) { w.timer = 0.2; break; }
          w.timer = q.cd * st.cd;
          for (let i = 0; i < q.count; i++) {
            S.bullets.push({ kind: 'missile', x: p.x, y: p.y, a: Math.random() * TAU, speed: q.speed, target: randomEnemyNear(p.x, p.y, 420), life: 3, r: 6, dmg: q.dmg, blast: q.blast * st.area, color: w.evolved ? '#ffb3c6' : '#ff5c8a' });
          }
          break;
        }
      }
    }
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
        if (!b.target || b.target.dead) b.target = nearestEnemy(b.x, b.y, 500);
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
    for (const r of S.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 10); if (r.life <= 0) r.dead = true; }
    compact(S.rings);
    S.shake = Math.max(0, S.shake - dt);
    S.hurtFlash = Math.max(0, S.hurtFlash - dt);
    S.whiteFlash = Math.max(0, S.whiteFlash - dt);
  }

  function update(dt) {
    if (S.deathT > 0) {
      S.deathT -= dt;
      dt *= 0.3;
      if (S.deathT <= 0) { endRun(false); return; }
    } else if (S.winT > 0) {
      S.winT -= dt;
      if (S.winT <= 0) { endRun(true); return; }
    } else {
      S.t += dt;
      updateSpawns(dt);
    }
    gridBuild();
    updatePlayer(dt);
    updateEnemies(dt);
    updateWeapons(dt);
    updateBullets(dt);
    compact(S.enemies);
    updatePickups(dt);
    updateFx(dt);

    if (S.comboT > 0) {
      S.comboT -= dt;
      if (S.comboT <= 0) { S.combo = 0; S.nextCombo = 50; }
    }
    if (!S.recordShown && S.t > Save.data.stats.bestTime) {
      S.recordShown = true;
      UI.banner('🏆 ¡NUEVO RÉCORD DE TIEMPO!', '#5cf2ff');
      Sound.play('combo');
    }
    if (state === 'playing' && S.pendingLevels > 0 && !S.player.dead) openLevelUp();
  }

  // ---------- Fin de partida ----------
  function endRun(won) {
    if (state === 'over') return;
    state = 'over';
    const sd = Save.data, s = sd.stats;
    const time = Math.floor(S.t);
    const timeBonus = Math.floor(S.t / 60) * 15;
    const bossBonus = S.bossKills * 60;
    const winBonus = won ? 500 : 0;
    const total = Math.round((S.coins + timeBonus + bossBonus + winBonus) * st.goldMul);
    const records = [];
    if (time > s.bestTime) { if (s.bestTime > 0) records.push('Tiempo'); s.bestTime = time; }
    if (S.level > s.bestLevel) { if (s.bestLevel > 0) records.push('Nivel'); s.bestLevel = S.level; }
    if (S.maxCombo > s.maxCombo) { if (s.maxCombo > 0) records.push('Combo'); s.maxCombo = S.maxCombo; }
    s.kills += S.kills;
    s.runs++;
    s.bossKills += S.bossKills;
    s.evolutions += S.evolutions;
    s.chests += S.chests;
    s.goldEarned += total;
    if (won) s.wins++;
    sd.gold += total;
    sd.tutorialDone = true;
    Save.write();
    UI.showGameOver({
      won, time: S.t, level: S.level, kills: S.kills, maxCombo: S.maxCombo, bossKills: S.bossKills,
      coins: S.coins, timeBonus, bossBonus, winBonus, mult: st.goldMul, total, records,
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
    if (state === 'paused') endRun(false);
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
  function drawGrid(cx, cy) {
    const step = 64;
    const x0 = Math.floor((cx - halfW) / step) * step, x1 = cx + halfW;
    const y0 = Math.floor((cy - halfH) / step) * step, y1 = cy + halfH;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(92,242,255,0.07)';
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) { ctx.moveTo(x, cy - halfH); ctx.lineTo(x, y1); }
    for (let y = y0; y <= y1; y += step) { ctx.moveTo(cx - halfW, y); ctx.lineTo(x1, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(199,125,255,0.12)';
    ctx.beginPath();
    const big = step * 4;
    for (let x = Math.floor((cx - halfW) / big) * big; x <= x1; x += big) { ctx.moveTo(x, cy - halfH); ctx.lineTo(x, y1); }
    for (let y = Math.floor((cy - halfH) / big) * big; y <= y1; y += big) { ctx.moveTo(cx - halfW, y); ctx.lineTo(x1, y); }
    ctx.stroke();
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

  function drawWorld() {
    const p = S.player;
    const t = performance.now() / 1000;

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

    for (const k of S.pickups) {
      if (!inView(k.x, k.y, 30)) continue;
      let spr;
      if (k.type === 'gem') spr = k.value >= 25 ? sprites.gem3 : k.value >= 5 ? sprites.gem2 : sprites.gem1;
      else spr = sprites[k.type];
      drawSprite(spr, k.x, k.y + Math.sin(k.bob) * 2, k.type === 'chest' ? 1 + Math.sin(k.bob) * 0.08 : 1);
    }

    for (const e of S.enemies) {
      if (!inView(e.x, e.y, e.r + 30)) continue;
      if (e.boss) {
        if (e.mode === 'tele') {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(Math.atan2(e.dvy, e.dvx));
          ctx.fillStyle = `rgba(255,60,90,${0.15 + Math.sin(t * 30) * 0.08})`;
          ctx.fillRect(0, -e.r, 300, e.r * 2);
          ctx.restore();
        }
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        drawSprite(sprites[e.spr + (e.flash > 0 ? '_f' : '')], 0, 0);
        ctx.restore();
      } else {
        const wob = 1 + Math.sin(t * 10 + e.id) * 0.05;
        drawSprite(sprites[e.spr + (e.flash > 0 ? '_f' : '')], e.x, e.y, wob);
        if (e.elite) {
          const w = e.r * 2;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
          ctx.fillStyle = '#ffd166';
          ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, e.hp / e.maxHp), 4);
        }
      }
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

    drawPlayer();

    // Balas enemigas
    for (const b of S.ebullets) {
      if (!inView(b.x, b.y, 20)) continue;
      ctx.fillStyle = 'rgba(255,90,60,0.35)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
    }

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
  }

  // Flechas en el borde para objetivos fuera de la pantalla
  function drawIndicators() {
    const p = S.player;
    const targets = [];
    for (const e of S.enemies) if (e.boss && !e.dead) targets.push([e.x, e.y, e.color, '☠️']);
    for (const k of S.pickups) if (k.type === 'chest' && !k.dead) targets.push([k.x, k.y, '#ffd166', '🎁']);
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#070816';
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
    drawGrid(cx, cy);
    if (S) drawWorld();

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
    start, choose, reroll, closeChest, pause, resume, quit, toMenu,
    // Avanza la simulación sin dibujar (para pruebas automáticas)
    _step(dt) { if (state === 'playing') update(dt); },
    get state() { return state; },
    get run() { return S; },
    get stats() { return st; },
  };
})();
