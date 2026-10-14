// Interfaz: menús, tienda, misiones, recompensas, HUD y pantallas de la partida.

const UI = (() => {
  const $ = id => document.getElementById(id);
  const SCREENS = ['menu', 'maps', 'chars', 'shop', 'missions', 'rebirth', 'settings', 'daily', 'levelup', 'chest', 'stage', 'pause', 'over'];
  let current = 'menu';

  function show(id) {
    current = id;
    for (const s of SCREENS) $(s).classList.toggle('active', s === id);
  }

  function fmt(n) { return Math.floor(n).toLocaleString('es'); }
  function fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function refreshGold() {
    document.querySelectorAll('.goldVal').forEach(el => { el.textContent = fmt(Save.data.gold); });
  }

  function affordableUpgrades() {
    let n = 0;
    for (const it of SHOP) {
      const lv = Save.upgrade(it.id);
      if (lv < it.max && Save.data.gold >= shopCost(it, lv)) n++;
    }
    return n;
  }

  function setBadge(el, n) {
    el.classList.toggle('hidden', !n);
    if (n) el.textContent = n;
  }

  // ---------- Menú principal ----------
  function renderMenu() {
    refreshGold();
    const ch = CHARACTERS[Save.data.char];
    const w = WEAPONS[ch.weapon];
    $('menuChar').innerHTML = `
      <div class="avatar" style="--c:${ch.color}">${w.icon}</div>
      <div class="info"><b>${esc(ch.name)}</b><small>${w.icon} ${esc(w.name)} · Toca para cambiar</small></div>`;
    const map = ALL_MAPS[Save.data.mapSel] || MAPS[0];
    const ms = Save.mapStat(map.id);
    $('menuMap').innerHTML = `
      <div class="avatar" style="--c:rgb(${map.grid})">${map.icon}</div>
      <div class="info"><b>${esc(map.name)}</b><small>${esc(map.diff)} · ${ms.cleared ? '✔ Completado' : `Mejor nivel ${ms.bestLevel}/${BOSS_EVERY}`}</small></div>`;
    $('playBtn').textContent = `▶ JUGAR`;
    setBadge($('missionBadge'), Save.claimableCount());
    setBadge($('shopBadge'), affordableUpgrades());
    const R = Save.data.rebirths, cost = rebirthCost(R);
    $('menuStars').classList.toggle('hidden', !R);
    $('menuStars').textContent = `♻️ ${R}`;
    $('menuStars').title = `Renacimientos: ${R}`;
    $('rebirthProg').textContent = `${Math.min(100, Math.floor(Save.data.gold / cost * 100))}%`;
    $('rebirthBadge').classList.toggle('hidden', Save.data.gold < cost);
    $('dailyBadge').classList.toggle('hidden', !Save.dailyAvailable());
    const s = Save.data.stats;
    const cleared = Save.stat('mapsCleared');
    $('records').innerHTML = s.runs
      ? `🗺️ Mapas completados <b>${cleared}/${MAPS.length}</b> · Nivel máx. <b>${s.bestLevel}</b><br>💀 ${fmt(s.kills)} enemigos · ☠️ ${s.bossKills} jefes · 👹 ${s.subbosses} subjefes · 🎮 ${s.runs} partidas`
      : `Llega al nivel ${BOSS_EVERY} y derrota al jefe para desbloquear nuevos mapas.`;
  }

  // ---------- Mapas ----------
  function mult(x) { return 'x' + (Math.round(x * 100) / 100).toString().replace('.', ','); }

  function renderMaps() {
    refreshGold();
    const list = $('mapList');
    list.innerHTML = '';
    ALL_MAPS.forEach((map, i) => {
      if (i === MAPS.length) {
        const h = document.createElement('h3');
        h.className = 'list-title';
        h.textContent = '⭐ Niveles especiales';
        list.appendChild(h);
      }
      if (map.special) { list.appendChild(specialMapRow(map, i)); return; }
      const unlocked = Save.mapUnlocked(i);
      const selected = Save.data.mapSel === i;
      const ms = Save.mapStat(map.id);
      const row = document.createElement('div');
      row.className = 'row map-row' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      row.style.animationDelay = i * 50 + 'ms';
      row.style.setProperty('--mc', `rgb(${map.grid})`);
      const newFoes = map.enemies.filter(id => !ENEMIES[id].spawnOnly).map(id => esc(ENEMIES[id].name));
      const newWeapons = Object.values(WEAPONS).filter(w => w.map === i).map(w => `${w.icon} ${esc(w.name)}`);
      const newPassives = Object.values(PASSIVES).filter(p => p.map === i && i > 0).map(p => `${p.icon} ${esc(p.name)}`);
      let status;
      if (!unlocked) status = `<small class="lock-req">🔒 Derrota a <b>${esc(MAPS[i - 1].boss.name)}</b> (nivel ${BOSS_EVERY}) en ${esc(MAPS[i - 1].name)}</small>`;
      else status = `<small>${ms.cleared ? '✔ Completado' : '⚔️ Sin completar'} · Mejor nivel: <b>${ms.bestLevel}</b></small>`;
      let btn;
      if (!unlocked) btn = '<button class="btn" disabled>🔒</button>';
      else if (selected) btn = '<button class="btn" disabled>Elegido</button>';
      else btn = '<button class="btn" data-act="pick">Elegir</button>';
      row.innerHTML = `
        <div class="avatar" style="--c:rgb(${map.grid})">${unlocked ? map.icon : '🔒'}</div>
        <div class="grow">
          <b>${esc(map.name)} <span class="diff">${esc(map.diff)}</span></b>
          <div class="chips">
            <span>❤️ Vida ${mult(map.hp)}</span><span>⚔️ Daño ${mult(map.dmg)}</span><span class="good">🪙 Oro ${mult(map.gold)}</span>
          </div>
          ${i > 0 ? `<small>👾 Nuevos: ${newFoes.join(', ')}${newWeapons.length ? ` · Arma: ${newWeapons.join(', ')}` : ''}${newPassives.length ? ` · Pasiva: ${newPassives.join(', ')}` : ''}</small>` : '<small>👾 Monstruos clásicos. ¡El punto de partida!</small>'}
          <small>👹 Subjefe: ${esc(map.subboss.name)} · ☠️ Jefe: ${esc(map.boss.name)}</small>
          ${status}
        </div>
        ${btn}`;
      const b = row.querySelector('[data-act]');
      if (b) b.onclick = () => {
        Save.data.mapSel = i;
        Save.write();
        Sound.play('click');
        renderMaps();
      };
      list.appendChild(row);
    });
  }

  // Fila de un nivel especial (trampas y ayudas)
  function specialMapRow(map, i) {
    const unlocked = Save.mapUnlocked(i);
    const selected = Save.data.mapSel === i;
    const ms = Save.mapStat(map.id);
    const row = document.createElement('div');
    row.className = 'row map-row special-row' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
    row.style.animationDelay = i * 50 + 'ms';
    row.style.setProperty('--mc', `rgb(${map.grid})`);
    const req = MAPS[map.unlockAfter];
    const status = unlocked
      ? `<small>${ms.cleared ? '🏆 Completado' : '⚔️ Sin completar'} · Mejor nivel: <b>${ms.bestLevel}</b></small>`
      : `<small class="lock-req">🔒 Completa <b>${esc(req.icon + ' ' + req.name)}</b> para desbloquearlo</small>`;
    const btn = !unlocked ? '<button class="btn" disabled>🔒</button>'
      : selected ? '<button class="btn" disabled>Elegido</button>' : '<button class="btn" data-act="pick">Elegir</button>';
    row.innerHTML = `
      <div class="avatar" style="--c:rgb(${map.grid})">${unlocked ? map.icon : '🔒'}</div>
      <div class="grow">
        <b>${esc(map.name)} <span class="diff">${esc(map.diff)}</span></b>
        <div class="chips">
          <span>❤️ Vida ${mult(map.hp)}</span><span>⚔️ Daño ${mult(map.dmg)}</span><span class="good">🪙 Oro ${mult(map.gold)}</span>
        </div>
        <small>${esc(map.desc)}</small>
        <small class="trap">⚠️ ${map.traps.map(esc).join(' · ')}</small>
        <small class="help">💡 ${map.helps.map(esc).join(' · ')}</small>
        <small>👾 Monstruos de: ${MAPS.slice(0, map.tier + 1).map(m => m.icon).join(' ')} · 👹 ${esc(map.subboss.name)} · ☠️ ${esc(map.boss.name)}</small>
        ${status}
      </div>
      ${btn}`;
    const b = row.querySelector('[data-act]');
    if (b) b.onclick = () => {
      Save.data.mapSel = i;
      Save.write();
      Sound.play('click');
      renderMaps();
    };
    return row;
  }

  // ---------- Renacer ----------
  function pct(x) { return '+' + Math.round(x * 100) + '%'; }

  function renderRebirth() {
    refreshGold();
    const R = Save.data.rebirths, cost = rebirthCost(R), gold = Save.data.gold;
    $('rbLevel').innerHTML = `<span class="rb-icon">♻️</span><b>${R}</b><small>${R === 1 ? 'renacimiento' : 'renacimientos'}</small>`;
    const row = (icon, name, per) => `<div><span>${icon} ${name}</span><b>${pct(R * per)}</b><i>→</i><b class="next">${pct((R + 1) * per)}</b></div>`;
    $('rbCompare').innerHTML = `
      <div class="rb-head"><span>Bono permanente</span><b>Ahora</b><i></i><b>Al renacer</b></div>
      ${row('⚔️', 'Daño', REBIRTH.dmg)}
      ${row('📈', 'Experiencia', REBIRTH.xp)}
      ${row('🪙', 'Oro', REBIRTH.gold)}
      ${row('❤️', 'Vida', REBIRTH.hp)}`;
    const p = Math.min(100, gold / cost * 100);
    $('rbCost').innerHTML = `<div class="line"><span>Precio</span><b>🪙 ${fmt(cost)}</b></div>
      <div class="progress"><div style="width:${p}%"></div></div>
      <small>${gold >= cost ? '¡Ya puedes renacer!' : `Te faltan 🪙 ${fmt(cost - gold)}`} · El siguiente costará 🪙 ${fmt(rebirthCost(R + 1))}</small>`;
    $('rebirthBtn').disabled = gold < cost;
  }

  // ---------- Personajes ----------
  function renderChars() {
    refreshGold();
    const list = $('charList');
    list.innerHTML = '';
    Object.entries(CHARACTERS).forEach(([id, ch], i) => {
      const owned = !!Save.data.chars[id];
      const selected = Save.data.char === id;
      const w = WEAPONS[ch.weapon];
      const row = document.createElement('div');
      row.className = 'row' + (selected ? ' selected' : '') + (owned ? '' : ' locked');
      row.style.animationDelay = i * 40 + 'ms';
      let btn;
      if (selected) btn = '<button class="btn" disabled>Elegido</button>';
      else if (owned) btn = '<button class="btn" data-act="pick">Elegir</button>';
      else btn = `<button class="btn" data-act="buy" ${Save.data.gold < ch.price ? 'disabled' : ''}>🪙 ${fmt(ch.price)}</button>`;
      row.innerHTML = `
        <div class="avatar" style="--c:${ch.color}">${owned ? w.icon : '🔒'}</div>
        <div class="grow"><b>${esc(ch.name)}</b><small>${w.icon} ${esc(w.name)} · ${esc(ch.desc)}</small></div>
        ${btn}`;
      const b = row.querySelector('[data-act]');
      if (b) b.onclick = () => {
        if (b.dataset.act === 'buy') {
          if (Save.data.gold < ch.price) return;
          Save.data.gold -= ch.price;
          Save.data.chars[id] = true;
          Sound.play('buy');
          banner(`¡${ch.name} desbloqueado!`, ch.color);
        } else {
          Sound.play('click');
        }
        Save.data.char = id;
        Save.write();
        renderChars();
      };
      list.appendChild(row);
    });
  }

  // ---------- Tienda ----------
  function renderShop() {
    refreshGold();
    const grid = $('shopList');
    grid.innerHTML = '';
    SHOP.forEach((it, i) => {
      const lv = Save.upgrade(it.id);
      const maxed = lv >= it.max;
      const cost = shopCost(it, lv);
      const can = !maxed && Save.data.gold >= cost;
      const el = document.createElement('div');
      el.className = 'shop-item' + (can ? ' affordable' : '');
      el.style.animationDelay = i * 30 + 'ms';
      let pips = '';
      for (let k = 0; k < it.max; k++) pips += `<i class="${k < lv ? 'on' : ''}"></i>`;
      el.innerHTML = `
        <div class="ico">${it.icon}</div>
        <b>${esc(it.name)}</b>
        <small>${esc(it.desc)}</small>
        <div class="pips">${pips}</div>
        <button class="btn" ${can ? '' : 'disabled'}>${maxed ? 'MÁXIMO' : '🪙 ' + fmt(cost)}</button>`;
      el.querySelector('button').onclick = () => {
        const l = Save.upgrade(it.id), c = shopCost(it, l);
        if (l >= it.max || Save.data.gold < c) return;
        Save.data.gold -= c;
        Save.data.upgrades[it.id] = l + 1;
        Save.data.stats.bought++;
        Save.write();
        Sound.play('buy');
        renderShop();
      };
      grid.appendChild(el);
    });
  }

  // ---------- Misiones ----------
  function renderMissions() {
    refreshGold();
    const list = $('missionList');
    list.innerHTML = '';
    const items = MISSIONS.map(m => ({ m, s: Save.missionState(m) }));
    const rank = x => x.s.claimed ? 2 : x.s.done ? 0 : 1;
    items.sort((a, b) => rank(a) - rank(b) || (b.s.cur / b.m.goal) - (a.s.cur / a.m.goal));
    items.forEach(({ m, s }, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (s.claimed ? ' claimed' : s.done ? ' claimable' : '');
      row.style.animationDelay = i * 25 + 'ms';
      const pct = Math.min(100, s.cur / m.goal * 100);
      let right;
      if (s.claimed) right = '<span class="reward">✔</span>';
      else if (s.done) right = `<button class="btn primary">Reclamar ${fmt(m.reward)} 🪙</button>`;
      else right = `<span class="reward">${fmt(m.reward)} 🪙</span>`;
      const curTxt = m.stat === 'bestTime' ? `${fmtTime(s.cur)} / ${fmtTime(m.goal)}` : `${fmt(s.cur)} / ${fmt(m.goal)}`;
      row.innerHTML = `
        <div class="grow"><b>${esc(m.text)}</b><small>${curTxt}</small>
          <div class="progress"><div style="width:${pct}%"></div></div></div>
        ${right}`;
      const b = row.querySelector('button');
      if (b) b.onclick = () => {
        if (Save.data.claimed[m.id]) return;
        Save.data.claimed[m.id] = true;
        Save.data.gold += m.reward;
        Save.data.stats.goldEarned += m.reward;
        Save.write();
        Sound.play('chest');
        banner(`+${fmt(m.reward)} 🪙`, '#ffd166', true);
        renderMissions();
      };
      list.appendChild(row);
    });
  }

  // ---------- Recompensa diaria ----------
  function renderDaily() {
    const avail = Save.dailyAvailable();
    const streak = avail ? Save.dailyNextStreak() : Save.data.daily.streak;
    const pos = (streak - 1) % 7;
    let html = '';
    DAILY_REWARDS.forEach((r, i) => {
      let cls = 'day';
      if (i < pos || (!avail && i === pos)) cls += ' done';
      else if (avail && i === pos) cls += ' today';
      html += `<div class="${cls}">Día ${i + 1}<b>${r}</b>${i < pos || (!avail && i === pos) ? '✔' : '🪙'}</div>`;
    });
    $('days').innerHTML = html;
    $('dailySub').textContent = avail
      ? `¡Racha de ${streak} día${streak > 1 ? 's' : ''}! Entra cada día para ganar más.`
      : 'Ya reclamaste hoy. ¡Vuelve mañana para seguir tu racha!';
    const btn = $('dailyClaim');
    btn.disabled = !avail;
    btn.textContent = avail ? `Reclamar ${DAILY_REWARDS[pos]} 🪙` : 'Vuelve mañana';
  }

  function openDaily() {
    renderDaily();
    show('daily');
  }

  // ---------- Navegación ----------
  function go(id) {
    Sound.play('click');
    if (id === 'menu') renderMenu();
    if (id === 'chars') renderChars();
    if (id === 'maps') renderMaps();
    if (id === 'rebirth') renderRebirth();
    if (id === 'shop') renderShop();
    if (id === 'missions') renderMissions();
    if (id === 'settings') {
      $('optSfx').checked = Save.data.sfx;
      $('optMusic').checked = Save.data.music;
    }
    show(id);
  }

  function goMenu() {
    Game.toMenu();
    $('hud').classList.add('hidden');
    renderMenu();
    show('menu');
  }

  // ---------- HUD ----------
  let hudKey = '', lastCombo = 0, bumpT = 0;
  const hudCache = {};
  function setText(id, v) {
    if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; }
  }

  function onRunStart() {
    hudKey = '';
    for (const k in hudCache) delete hudCache[k];
    $('banners').innerHTML = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $('hud').classList.remove('hidden');
    show(null);
  }

  function updateHud(S, st) {
    const xpPct = Math.min(100, S.xp / S.xpNext * 100).toFixed(1) + '%';
    if (hudCache.xp !== xpPct) { hudCache.xp = xpPct; $('xpFill').style.width = xpPct; }
    setText('lvl', 'Nv ' + S.level);
    setText('timer', fmtTime(S.t));
    setText('kills', fmt(S.kills));
    setText('coins', fmt(S.coins));

    const key = S.weapons.map(w => w.id + w.level + (w.evolved ? 'e' : '')).join() + JSON.stringify(S.passives);
    if (key !== hudKey) {
      hudKey = key;
      $('slots').innerHTML = slotsHtml(buildList(S));
    }

    setText('nextEvent', nextEventText(S.level));
    const fx = statusText(S);
    if (hudCache.fx !== fx) { hudCache.fx = fx; $('status').innerHTML = fx; }

    const boss = S.boss;
    $('boss').classList.toggle('hidden', !boss);
    if (boss) {
      const label = (boss.kind === 'boss' ? '☠️ ' : boss.kind === 'subboss' ? '👹 ' : '⚠️ ') + boss.name + (boss.tier > 1 ? ` · Nv ${boss.level}` : '');
      setText('bossName', label);
      if (hudCache.bk !== boss.kind) { hudCache.bk = boss.kind; $('boss').dataset.kind = boss.kind; }
      const w = Math.max(0, boss.hp / boss.maxHp * 100).toFixed(1) + '%';
      if (hudCache.bw !== w) { hudCache.bw = w; $('bossFill').style.width = w; }
    }

    const showCombo = S.combo >= 5;
    $('combo').classList.toggle('hidden', !showCombo);
    if (showCombo) {
      setText('comboNum', 'x' + S.combo);
      $('comboFill').style.width = Math.max(0, S.comboT / 2.2 * 100) + '%';
      if (S.combo !== lastCombo) { $('comboNum').classList.add('bump'); bumpT = performance.now(); }
    }
    if (bumpT && performance.now() - bumpT > 90) { $('comboNum').classList.remove('bump'); bumpT = 0; }
    lastCombo = S.combo;
  }

  function buildList(S) {
    const out = S.weapons.map(w => {
      const d = WEAPONS[w.id];
      return { icon: w.evolved ? d.evo.icon : d.icon, name: w.evolved ? d.evo.name : d.name, level: w.evolved ? '★' : w.level, evolved: w.evolved, kind: 'weapon' };
    });
    for (const id in S.passives) out.push({ icon: PASSIVES[id].icon, name: PASSIVES[id].name, level: S.passives[id], kind: 'passive' });
    return out;
  }

  function slotsHtml(items) {
    return items.map(it => `<div class="slot${it.kind === 'passive' ? ' passive' : ''}${it.evolved ? ' evo' : ''}" title="${esc(it.name)}">${it.icon}<i>${it.level}</i></div>`).join('');
  }

  // ---------- Avisos ----------
  function banner(text, color = '#5cf2ff', small = false) {
    const box = $('banners');
    while (box.children.length > 3) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'banner' + (small ? ' small' : '');
    el.style.color = color;
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  let hintTimer = null;
  function hint(text, ms = 4000) {
    const el = $('hint');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  // ---------- Subida de nivel ----------
  function cardHtml(o, i) {
    const v = o.view;
    return `
      <span class="tag">${esc(v.tag)}</span>
      ${i !== undefined ? `<span class="key">${i + 1}</span>` : ''}
      <div class="ico">${v.icon}</div>
      <div class="body">
        <div class="name">${esc(v.name)}</div>
        <div class="text">${esc(v.text)}</div>
        ${v.hint ? `<div class="hint-t">${esc(v.hint)}</div>` : ''}
      </div>`;
  }

  function showLevelUp(opts, rerolls, level) {
    $('luLevel').textContent = level;
    const box = $('cards');
    box.innerHTML = '';
    opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'card ' + o.rarity;
      b.style.animationDelay = i * 70 + 'ms';
      b.innerHTML = cardHtml(o, i);
      b.onclick = () => Game.choose(i);
      box.appendChild(b);
    });
    // Evita elegir sin querer si el dedo seguía en la pantalla
    box.classList.add('locked');
    setTimeout(() => box.classList.remove('locked'), 380);
    $('rerollN').textContent = rerolls;
    $('rerollBtn').disabled = rerolls <= 0;
    $('hint').classList.add('hidden');
    show('levelup');
  }

  // ---------- Cofre ----------
  function showChest(items, gold, tier = 1) {
    $('chestTitle').textContent = tier >= 3 ? '👑 ¡COFRE DE JEFE!' : tier === 2 ? '💜 ¡COFRE DE SUBJEFE!' : '🎁 ¡COFRE!';
    const box = $('chestItems');
    box.innerHTML = '';
    const btn = $('chestBtn');
    btn.disabled = true;
    show('chest');
    const all = items.map(o => `<div class="ico">${o.view.icon}</div><div class="grow"><b>${esc(o.view.name)} <small style="display:inline">${esc(o.view.tag)}</small></b><small>${esc(o.view.text)}</small></div>`);
    all.push(`<div class="ico">🪙</div><div class="grow"><b>+${gold} de oro</b></div>`);
    all.forEach((html, i) => {
      setTimeout(() => {
        const row = document.createElement('div');
        row.className = 'row' + (items[i] && items[i].rarity === 'legend' ? ' claimable' : '');
        row.innerHTML = html;
        box.appendChild(row);
        Sound.play(i < items.length ? 'reveal' : 'coin');
        if (i === all.length - 1) btn.disabled = false;
      }, 350 + i * 420);
    });
  }

  // ---------- Pausa ----------
  function showPause(items, st) {
    $('pauseBuild').innerHTML = slotsHtml(items);
    const S = Game.run;
    $('pauseStats').innerHTML = `
      <span>Vida <b>${Math.ceil(S.player.hp)}/${st.maxHp}</b></span>
      <span>Daño <b>x${st.might.toFixed(2)}</b></span>
      <span>Recarga <b>x${st.cd.toFixed(2)}</b></span>
      <span>Área <b>x${st.area.toFixed(2)}</b></span>
      <span>Velocidad <b>${Math.round(st.speed)}</b></span>
      <span>Crítico <b>${Math.round(st.crit * 100)}%</b></span>
      <span>Armadura <b>${st.armor}</b></span>
      <span>Revivir <b>${S.revives}</b></span>
      <span>Mapa <b>${S.map.icon} ${esc(S.map.name)}</b></span>
      <span>Oro del mapa <b>${mult(S.map.gold)}</b></span>`;
    show('pause');
  }

  // ---------- Fin de partida ----------
  function showGameOver(r) {
    $('hud').classList.add('hidden');
    const title = $('overTitle');
    title.textContent = r.won ? '🏆 ¡VICTORIA!' : r.stageClearedNow ? '🏆 ETAPA SUPERADA' : 'HAS CAÍDO';
    title.classList.toggle('win', r.won || r.stageClearedNow);
    $('overMap').textContent = `${r.map.icon} ${r.map.name} · ${r.map.diff}`;
    $('overRecords').innerHTML = r.records.map((x, i) => `<span style="animation-delay:${i * 120}ms">🏆 ¡Nuevo récord: ${x}!</span>`).join('');
    $('overStats').innerHTML = `
      <div><b>${fmtTime(r.time)}</b>Tiempo</div>
      <div><b>${r.level}</b>Nivel</div>
      <div><b>${fmt(r.kills)}</b>Enemigos</div>
      <div><b>${fmt(r.maxCombo)}</b>Combo</div>`;
    $('overBuild').innerHTML = slotsHtml(r.build);
    let lines = `<div class="line"><span>Monedas recogidas</span><b>${fmt(r.coins)}</b></div>
      <div class="line"><span>Bonus por tiempo</span><b>${fmt(r.timeBonus)}</b></div>`;
    if (r.bossBonus) lines += `<div class="line"><span>Bonus de monstruos (⚠️${r.specials} 👹${r.subbosses} ☠️${r.bossKills})</span><b>${fmt(r.bossBonus)}</b></div>`;
    if (r.mult > 1.001) lines += `<div class="line"><span>Multiplicador de oro</span><b>${mult(r.mult)}</b></div>`;
    if (r.mapMult > 1.001) lines += `<div class="line"><span>Bonus del mapa ${r.map.icon}</span><b>${mult(r.mapMult)}</b></div>`;
    $('overBreakdown').innerHTML = lines;
    const again = $('againBtn');
    const nextSel = ALL_MAPS[Save.data.mapSel];
    again.textContent = r.won && !r.special ? `⬆️ JUGAR EN ${nextSel.name.toUpperCase()}` : '↻ JUGAR OTRA VEZ';

    // El oro sube contando
    const totalEl = $('overTotal');
    const t0 = performance.now(), dur = 1100;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      totalEl.textContent = fmt(r.total * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    if (r.total > 0) setTimeout(() => Sound.play('chest'), 300);

    const extra = [];
    if (r.stageClearedNow && r.special) extra.push(`<div class="nudge unlock-nudge">🏆 ¡Completaste el nivel especial <b>${r.map.icon} ${esc(r.map.name)}</b>! Reclama su misión.</div>`);
    else if (r.stageClearedNow && r.next) extra.push(`<div class="nudge unlock-nudge">🔓 ¡Desbloqueaste <b>${r.next.icon} ${esc(r.next.name)}</b>! Monstruos más duros, nuevas armas y oro ${mult(r.next.gold)}.</div>`);
    else if (!Save.mapStat(r.map.id).cleared) {
      const left = BOSS_EVERY - r.level;
      extra.push(left > 0
        ? `<div class="nudge">☠️ Llegaste al nivel <b>${r.level}</b>: el jefe <b>${esc(r.map.boss.name)}</b> aparece en el nivel ${BOSS_EVERY}. ¡Te faltan ${left}!<div class="progress"><div style="width:${Math.min(100, r.level / BOSS_EVERY * 100)}%"></div></div></div>`
        : `<div class="nudge">☠️ Llegaste al jefe <b>${esc(r.map.boss.name)}</b>. ¡Mejora tu equipo y derrótalo!</div>`);
    }
    $('overNudges').innerHTML = extra.concat(nudges()).slice(0, 4).join('');
    show('over');
  }

  // ---------- Etapa completada ----------
  function showStageClear(info) {
    const { map, next } = info;
    $('stageSub').textContent = `Derrotaste a ${map.boss.name} en ${map.name}.`;
    document.querySelector('#stage .stage-title').textContent = info.special ? '🏆 ¡NIVEL ESPECIAL COMPLETADO!' : '🏆 ¡ETAPA COMPLETADA!';
    $('stageUnlock').innerHTML = info.special
      ? `<div class="unlock-card" style="--mc:rgb(${map.grid})"><div class="avatar" style="--c:rgb(${map.grid})">${map.icon}</div><div><small>🏆 NIVEL ESPECIAL</small><b>¡Superaste ${esc(map.name)}!</b><small>Bonus de 🪙 ${fmt(map.clearBonus)} × oro del mapa y una misión especial para reclamar.</small></div></div>`
      : next
      ? `<div class="unlock-card" style="--mc:rgb(${next.grid})"><div class="avatar" style="--c:rgb(${next.grid})">${next.icon}</div>
          <div><small>🔓 NUEVO MAPA DESBLOQUEADO</small><b>${esc(next.name)} · ${esc(next.diff)}</b>
          <small>❤️ ${mult(next.hp)} · ⚔️ ${mult(next.dmg)} · 🪙 ${mult(next.gold)} · ${next.enemies.map(id => esc(ENEMIES[id].name)).join(', ')}</small></div></div>`
      : `<div class="unlock-card"><div class="avatar" style="--c:#ffd166">👑</div><div><b>¡Conquistaste todos los mapas!</b><small>Sigue luchando para conseguir más oro y récords.</small></div></div>`;
    $('ascendBtn').textContent = next ? `⬆️ Ascender a ${next.name}` : '🏆 Terminar con victoria';
    $('stayBtn').textContent = info.special ? '⚔️ Seguir aquí (más jefes y más premios)' : '⚔️ Seguir aquí (jefes cada 30 niveles con más premios)';
    show('stage');
  }

  // Efectos activos en la partida (trampas, ayudas, maldiciones)
  function statusText(S) {
    const out = [];
    const chip = (cls, txt) => out.push(`<span class="${cls}">${txt}</span>`);
    if (S.player.slowT > 0) chip('bad', '❄️ Congelado');
    if (S.special === 'marinela') {
      if (S.outZone) chip('bad', '🍥 ¡Fuera de la zona!');
      if (S.inCaramel) chip('bad', '🍯 Caramelo');
      if (S.sugarT > 0) chip('good', `🧁 Azúcar ${Math.ceil(S.sugarT)}s`);
      if (S.zone.warn) chip('warn', `🍥 Se mueve en ${Math.max(0, Math.ceil(S.zone.moveIn))}s`);
    } else if (S.special === 'piru') {
      if (S.curse) chip('bad', `${S.curse.icon} ${S.curse.name} ${Math.ceil(S.curseLeft)}s`);
      else if (S.curseT < 10) chip('warn', `😈 Maldición en ${Math.ceil(S.curseT)}s`);
      if (S.blessT > 0) chip('good', `✨ Bendición ${Math.ceil(S.blessT)}s`);
      if (S.altar) chip('warn', `⛩️ Altar ${Math.round(Math.min(1, S.altar.charge / 3) * 100)}%`);
    }
    return out.join('');
  }

  // Texto del próximo monstruo importante según el nivel
  function nextEventText(level) {
    const n = (Math.floor(level / SPECIAL_EVERY) + 1) * SPECIAL_EVERY;
    if (n % BOSS_EVERY === 0) return `☠️ Jefe en Nv ${n}`;
    if (n % SUBBOSS_EVERY === 0) return `👹 Subjefe en Nv ${n}`;
    return `⚠️ Especial en Nv ${n}`;
  }

  // Motivos para volver a jugar
  function nudges() {
    const out = [];
    const claim = Save.claimableCount();
    if (claim) out.push(`<div class="nudge">🎯 ¡Tienes <b>${claim}</b> ${claim > 1 ? 'misiones listas' : 'misión lista'} para reclamar!</div>`);
    const buy = affordableUpgrades();
    if (buy) out.push(`<div class="nudge">⬆️ Puedes comprar <b>${buy}</b> mejora${buy > 1 ? 's' : ''} permanente${buy > 1 ? 's' : ''}.</div>`);
    const pending = MISSIONS.map(m => ({ m, s: Save.missionState(m) }))
      .filter(x => !x.s.done)
      .sort((a, b) => b.s.cur / b.m.goal - a.s.cur / a.m.goal)[0];
    if (pending) {
      const pct = Math.round(pending.s.cur / pending.m.goal * 100);
      out.push(`<div class="nudge">🔥 Casi lo logras: <b>${esc(pending.m.text)}</b> (${pct}%) → ${fmt(pending.m.reward)} 🪙<div class="progress"><div style="width:${pct}%"></div></div></div>`);
    }
    const locked = Object.entries(CHARACTERS).filter(([id]) => !Save.data.chars[id]).sort((a, b) => a[1].price - b[1].price)[0];
    if (locked) {
      const [, ch] = locked;
      const missing = ch.price - Save.data.gold;
      out.push(missing > 0
        ? `<div class="nudge">🔒 Te faltan <b>${fmt(missing)} 🪙</b> para desbloquear a <b>${esc(ch.name)}</b>.</div>`
        : `<div class="nudge">🔓 ¡Ya puedes desbloquear a <b>${esc(ch.name)}</b>!</div>`);
    }
    return out.slice(0, 3);
  }

  function closeOverlays() { show(null); }

  // ---------- Inicio ----------
  function init() {
    document.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => go(b.dataset.go); });
    $('menuChar').onclick = () => go('chars');
    $('menuMap').onclick = () => go('maps');
    $('playBtn').onclick = () => Game.start(Save.data.char, Save.data.mapSel);
    $('ascendBtn').onclick = () => Game.stageAscend();
    $('stayBtn').onclick = () => Game.stageContinue();
    $('dailyBtn').onclick = () => { Sound.play('click'); openDaily(); };
    $('dailyClaim').onclick = () => {
      const g = Save.claimDaily();
      if (!g) return;
      Sound.init();
      Sound.play('chest');
      banner(`+${g} 🪙`, '#ffd166');
      renderDaily();
      refreshGold();
      setTimeout(() => { if (current === 'daily') goMenu(); }, 900);
    };
    $('dailyClose').onclick = () => go('menu');
    $('rerollBtn').onclick = () => Game.reroll();
    $('chestBtn').onclick = () => Game.closeChest();
    $('pauseBtn').onclick = () => Game.pause();
    $('resumeBtn').onclick = () => Game.resume();
    $('quitBtn').onclick = () => Game.quit();
    $('againBtn').onclick = () => Game.start(Save.data.char, Save.data.mapSel);
    $('overMenuBtn').onclick = goMenu;
    $('optSfx').onchange = e => { Save.data.sfx = e.target.checked; Save.write(); Sound.applySettings(); };
    $('optMusic').onchange = e => { Save.data.music = e.target.checked; Save.write(); Sound.applySettings(); };
    $('rebirthBtn').onclick = () => {
      const cost = rebirthCost(Save.data.rebirths);
      if (Save.data.gold < cost) return;
      if (!confirm('¿Renacer? Se reinicia TODO tu progreso (oro, mejoras, personajes, mapas, misiones y estadísticas) a cambio de bonos permanentes.')) return;
      if (!Save.rebirth()) return;
      Sound.applySettings();
      Sound.play('stage');
      goMenu();
      banner(`♻️ ¡RENACISTE! Ahora tienes ${Save.data.rebirths}`, '#7cff6b');
    };
    $('resetBtn').onclick = () => {
      if (!confirm('¿Seguro que quieres borrar TODO tu progreso? No se puede deshacer.')) return;
      Save.reset();
      Sound.applySettings();
      goMenu();
    };
    document.addEventListener('pointerdown', () => Sound.init(), { once: true });

    renderMenu();
    show('menu');
    if (Save.dailyAvailable()) openDaily();
  }

  return {
    init, show, banner, hint, updateHud, onRunStart, showLevelUp, showChest, showPause,
    showGameOver, showStageClear, closeOverlays,
  };
})();
