// Progreso guardado en el navegador (oro, mejoras, personajes, misiones, racha diaria).

const Save = (() => {
  const KEY = 'hordaNeon.save.v1';

  function fresh() {
    return {
      gold: 0,
      upgrades: {},
      chars: { nova: true },
      char: 'nova',
      stats: {
        kills: 0, runs: 0, bestTime: 0, bestLevel: 0, bossKills: 0, evolutions: 0,
        maxCombo: 0, chests: 0, goldEarned: 0, bought: 0, wins: 0,
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
    return data.stats[name] || 0;
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
    write, reset, upgrade, stat, missionState, claimableCount,
    dailyAvailable, dailyNextStreak, claimDaily,
  };
})();
