// Progreso guardado en el navegador (oro, mejoras, personajes, misiones, racha diaria).

const Save = (() => {
  const KEY = 'hordaNeon.save.v1';

  function fresh() {
    return {
      gold: 0,
      upgrades: {},
      chars: { nova: true },
      char: 'nova',
      mapsUnlocked: 1,  // cuántos mapas están desbloqueados
      mapSel: 0,        // mapa elegido
      mapStats: {},     // id del mapa -> { bestLevel, bestTime, cleared }
      stats: {
        kills: 0, runs: 0, bestTime: 0, bestLevel: 0, bossKills: 0, evolutions: 0,
        maxCombo: 0, chests: 0, goldEarned: 0, bought: 0, wins: 0, specials: 0, subbosses: 0,
      },
      claimed: {},
      daily: { last: '', streak: 0 },
      sfx: true,
      music: true,
      tutorialDone: false,
    };
  }

  let data = fresh();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const base = fresh();
        data = Object.assign(base, saved);
        data.stats = Object.assign(fresh().stats, saved.stats || {});
        data.daily = Object.assign(fresh().daily, saved.daily || {});
        data.mapStats = Object.assign({}, saved.mapStats || {});
        data.mapsUnlocked = Math.max(1, Math.min(MAPS.length, data.mapsUnlocked | 0));
        data.mapSel = Math.max(0, Math.min(data.mapsUnlocked - 1, data.mapSel | 0));
      }
    } catch (e) {
      data = fresh();
    }
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function reset() {
    data = fresh();
    write();
  }

  function upgrade(id) { return data.upgrades[id] || 0; }

  function stat(name) {
    if (name === 'charsUnlocked') return Object.keys(data.chars).length - 1;
    if (name === 'mapsCleared') return MAPS.filter(m => mapStat(m.id).cleared).length;
    return data.stats[name] || 0;
  }

  function mapStat(id) {
    if (!data.mapStats[id]) data.mapStats[id] = { bestLevel: 0, bestTime: 0, cleared: false };
    return data.mapStats[id];
  }

  // Marca un mapa como completado y desbloquea el siguiente
  function clearMap(idx) {
    mapStat(MAPS[idx].id).cleared = true;
    data.mapsUnlocked = Math.max(data.mapsUnlocked, Math.min(MAPS.length, idx + 2));
    write();
  }

  function missionState(m) {
    const cur = Math.min(stat(m.stat), m.goal);
    if (data.claimed[m.id]) return { cur, done: true, claimed: true };
    return { cur, done: cur >= m.goal, claimed: false };
  }

  function claimableCount() {
    return MISSIONS.filter(m => missionState(m).done && !data.claimed[m.id]).length;
  }

  function dayString(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dailyAvailable() { return data.daily.last !== dayString(); }

  // Día de la racha que se va a cobrar hoy (1..7)
  function dailyNextStreak() {
    return data.daily.last === dayString(-1) ? data.daily.streak + 1 : 1;
  }

  function claimDaily() {
    if (!dailyAvailable()) return 0;
    const streak = dailyNextStreak();
    const reward = DAILY_REWARDS[(streak - 1) % DAILY_REWARDS.length];
    data.daily = { last: dayString(), streak };
    data.gold += reward;
    data.stats.goldEarned += reward;
    write();
    return reward;
  }

  load();

  return {
    get data() { return data; },
    write, reset, upgrade, stat, mapStat, clearMap, missionState, claimableCount,
    dailyAvailable, dailyNextStreak, claimDaily,
  };
})();
