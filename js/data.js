// Datos del juego: armas, pasivas, enemigos, personajes, tienda y misiones.

const MAX_WEAPONS = 4;
const MAX_PASSIVES = 4;
const RUN_GOAL = 900; // 15 minutos: aparece el jefe final

// Cada arma tiene 5 niveles. Los valores de cada nivel se suman sobre los anteriores.
// Al llegar al nivel 5 y tener la pasiva indicada en "evo", aparece su evolución.
const WEAPONS = {
  blaster: {
    name: 'Bláster', icon: '🔹', color: '#5cf2ff',
    desc: 'Dispara al enemigo más cercano.',
    evo: { passive: 'cadencia', name: 'Cañón de Plasma', icon: '💠', desc: 'Ráfagas perforantes a una velocidad brutal.' },
    levels: [
      { dmg: 12, cd: 0.6, count: 1, pierce: 0, speed: 520, size: 5 },
      { count: 2, text: '+1 proyectil' },
      { dmg: 18, text: '+50% de daño' },
      { cd: 0.45, count: 3, text: '+1 proyectil y dispara más rápido' },
      { pierce: 2, dmg: 24, text: 'Atraviesa 2 enemigos y más daño' },
    ],
    evolved: { dmg: 30, cd: 0.22, count: 4, pierce: 4, speed: 680, size: 7 },
  },
  orbes: {
    name: 'Orbes', icon: '🔮', color: '#c77dff',
    desc: 'Esferas que giran a tu alrededor y golpean al contacto.',
    evo: { passive: 'area', name: 'Galaxia', icon: '🌌', desc: 'Ocho planetas gigantes orbitan contigo.' },
    levels: [
      { dmg: 10, count: 2, radius: 70, spin: 3, size: 8, hitCd: 0.45 },
      { count: 3, text: '+1 orbe' },
      { dmg: 16, radius: 85, text: 'Más daño y mayor radio' },
      { count: 4, text: '+1 orbe' },
      { count: 5, dmg: 22, spin: 3.8, text: '+1 orbe, más daño y velocidad' },
    ],
    evolved: { count: 8, dmg: 32, radius: 110, spin: 4.5, size: 12 },
  },
  aura: {
    name: 'Aura', icon: '🔥', color: '#ff7a45',
    desc: 'Un campo de fuego quema a los enemigos cercanos.',
    evo: { passive: 'vitalidad', name: 'Sol Negro', icon: '🌑', desc: 'Un sol enorme que quema y frena a todos.' },
    levels: [
      { dmg: 7, radius: 62, tick: 0.5 },
      { radius: 74, text: '+20% de radio' },
      { dmg: 11, text: 'Más daño' },
      { radius: 90, tick: 0.42, text: 'Más radio y más frecuente' },
      { dmg: 16, radius: 102, text: 'Más daño y más radio' },
    ],
    evolved: { dmg: 26, radius: 135, tick: 0.35, slow: 0.45 },
  },
  rayo: {
    name: 'Rayo', icon: '⚡', color: '#ffe066',
    desc: 'Rayos caen del cielo y saltan entre enemigos.',
    evo: { passive: 'poder', name: 'Juicio Divino', icon: '🌩️', desc: 'Tormenta eléctrica que arrasa la pantalla.' },
    levels: [
      { dmg: 28, cd: 1.6, strikes: 1, chains: 2, range: 130 },
      { chains: 3, text: '+1 salto' },
      { dmg: 40, text: 'Más daño' },
      { strikes: 2, text: '+1 rayo' },
      { chains: 5, cd: 1.2, text: '+2 saltos y más frecuente' },
    ],
    evolved: { dmg: 65, strikes: 4, chains: 7, cd: 0.9, range: 170 },
  },
  cuchillas: {
    name: 'Cuchillas', icon: '🌀', color: '#7cff6b',
    desc: 'Cuchillas boomerang que atraviesan todo y regresan.',
    evo: { passive: 'velocidad', name: 'Torbellino', icon: '🌪️', desc: 'Un huracán de cuchillas en todas direcciones.' },
    levels: [
      { dmg: 16, cd: 1.4, count: 1, range: 230, size: 12, hitCd: 0.3 },
      { dmg: 22, text: 'Más daño' },
      { count: 2, text: '+1 cuchilla' },
      { cd: 1.1, range: 270, text: 'Más frecuentes y más lejos' },
      { count: 3, dmg: 30, text: '+1 cuchilla y más daño' },
    ],
    evolved: { count: 6, dmg: 45, size: 18, cd: 0.9, range: 300 },
  },
  misiles: {
    name: 'Misiles', icon: '🚀', color: '#ff5c8a',
    desc: 'Misiles teledirigidos que explotan en área.',
    evo: { passive: 'suerte', name: 'Lluvia de Meteoros', icon: '☄️', desc: 'Una lluvia de meteoros explosivos.' },
    levels: [
      { dmg: 32, cd: 2.0, count: 1, blast: 55, speed: 320 },
      { dmg: 44, text: 'Más daño' },
      { count: 2, text: '+1 misil' },
      { blast: 72, text: 'Explosión más grande' },
      { count: 3, cd: 1.6, text: '+1 misil y más frecuente' },
    ],
    evolved: { count: 6, dmg: 75, blast: 90, cd: 1.3, speed: 380 },
  },
};

const PASSIVES = {
  poder:     { name: 'Poder',     icon: '💪', desc: '+12% de daño', max: 5 },
  cadencia:  { name: 'Cadencia',  icon: '⏱️', desc: '-8% de tiempo de recarga', max: 5 },
  velocidad: { name: 'Velocidad', icon: '👟', desc: '+10% de velocidad', max: 5 },
  iman:      { name: 'Imán',      icon: '🧲', desc: '+35% de radio para recoger', max: 5 },
  vitalidad: { name: 'Vitalidad', icon: '❤️', desc: '+20 de vida máxima y regeneración', max: 5 },
  area:      { name: 'Área',      icon: '⭕', desc: '+12% de tamaño de ataques', max: 5 },
  suerte:    { name: 'Suerte',    icon: '🍀', desc: '+5% de crítico y más botín', max: 5 },
};

const ENEMIES = {
  bicho:   { hp: 9,  speed: 72,  dmg: 8,  r: 12, xp: 1, color: '#ff5c8a', shape: 'blob' },
  rapido:  { hp: 6,  speed: 128, dmg: 6,  r: 9,  xp: 1, color: '#ffd166', shape: 'tri' },
  tanque:  { hp: 55, speed: 42,  dmg: 16, r: 21, xp: 5, color: '#9b5cff', shape: 'square' },
  tirador: { hp: 18, speed: 66,  dmg: 8,  r: 13, xp: 3, color: '#ff9f43', shape: 'diamond' },
};

const BOSSES = [
  { at: 180, name: 'Guardián Carmesí', hp: 1000,  color: '#ff3b5c' },
  { at: 360, name: 'Coloso Violeta',   hp: 3000,  color: '#9b5cff' },
  { at: 540, name: 'Reina del Enjambre', hp: 6500, color: '#ffd166' },
  { at: 720, name: 'Titán de Neón',    hp: 12000, color: '#5cf2ff' },
  { at: RUN_GOAL, name: 'El Devorador', hp: 26000, color: '#ff00d4', final: true },
];

const SWARMS = [90, 270, 450, 630, 810];

const CHARACTERS = {
  nova:   { name: 'Nova',   color: '#5cf2ff', weapon: 'blaster',   price: 0,    desc: 'Equilibrada. Ideal para empezar.', mods: {} },
  brasa:  { name: 'Brasa',  color: '#ff7a45', weapon: 'aura',      price: 400,  desc: '+30% vida, -5% velocidad.', mods: { hp: 1.3, speed: 0.95 } },
  volt:   { name: 'Volt',   color: '#ffe066', weapon: 'rayo',      price: 900,  desc: '-15% tiempo de recarga.', mods: { cd: 0.85 } },
  sombra: { name: 'Sombra', color: '#b48cff', weapon: 'cuchillas', price: 1600, desc: '+20% velocidad, +10% crítico, -20% vida.', mods: { speed: 1.2, crit: 0.1, hp: 0.8 } },
  titan:  { name: 'Titán',  color: '#7cff6b', weapon: 'orbes',     price: 2500, desc: '+60% vida, +2 armadura, -10% velocidad.', mods: { hp: 1.6, armor: 2, speed: 0.9 } },
  chispa: { name: 'Chispa', color: '#ff5c8a', weapon: 'misiles',   price: 3500, desc: '+25% área y +20% de oro.', mods: { area: 1.25, gold: 1.2 } },
};

// Mejoras permanentes que se compran con oro entre partidas
const SHOP = [
  { id: 'poder',       name: 'Poder',        icon: '💪', desc: '+6% de daño',               max: 5, base: 120 },
  { id: 'vida',        name: 'Vida',         icon: '❤️', desc: '+15 de vida máxima',        max: 5, base: 100 },
  { id: 'armadura',    name: 'Armadura',     icon: '🛡️', desc: '-1 al daño recibido',       max: 3, base: 200 },
  { id: 'regen',       name: 'Regeneración', icon: '💚', desc: '+0.3 de vida por segundo',  max: 3, base: 180 },
  { id: 'velocidad',   name: 'Velocidad',    icon: '👟', desc: '+5% de velocidad',          max: 3, base: 150 },
  { id: 'iman',        name: 'Imán',         icon: '🧲', desc: '+15% de radio para recoger', max: 3, base: 100 },
  { id: 'cadencia',    name: 'Cadencia',     icon: '⏱️', desc: '-4% de recarga',            max: 3, base: 220 },
  { id: 'crecimiento', name: 'Crecimiento',  icon: '📈', desc: '+8% de experiencia',        max: 5, base: 150 },
  { id: 'codicia',     name: 'Codicia',      icon: '💰', desc: '+10% de oro',               max: 5, base: 130 },
  { id: 'suerte',      name: 'Suerte',       icon: '🍀', desc: '+3% de crítico y botín',    max: 3, base: 200 },
  { id: 'cambios',     name: 'Cambios',      icon: '🎲', desc: '+1 cambio de cartas por partida', max: 3, base: 250 },
  { id: 'revivir',     name: 'Revivir',      icon: '✨', desc: 'Revive una vez por partida', max: 1, base: 1500 },
];

function shopCost(item, level) {
  return Math.round(item.base * Math.pow(1.7, level) / 10) * 10;
}

// Misiones: se completan con estadísticas acumuladas y dan oro al reclamarlas
const MISSIONS = [
  { id: 'kill100',   text: 'Elimina 100 enemigos',       stat: 'kills',      goal: 100,   reward: 50 },
  { id: 'kill1k',    text: 'Elimina 1.000 enemigos',     stat: 'kills',      goal: 1000,  reward: 200 },
  { id: 'kill5k',    text: 'Elimina 5.000 enemigos',     stat: 'kills',      goal: 5000,  reward: 500 },
  { id: 'kill20k',   text: 'Elimina 20.000 enemigos',    stat: 'kills',      goal: 20000, reward: 1500 },
  { id: 'time3',     text: 'Sobrevive 3 minutos',        stat: 'bestTime',   goal: 180,   reward: 80 },
  { id: 'time8',     text: 'Sobrevive 8 minutos',        stat: 'bestTime',   goal: 480,   reward: 250 },
  { id: 'time15',    text: 'Sobrevive 15 minutos',       stat: 'bestTime',   goal: 900,   reward: 1000 },
  { id: 'boss1',     text: 'Derrota a un jefe',          stat: 'bossKills',  goal: 1,     reward: 150 },
  { id: 'boss10',    text: 'Derrota 10 jefes',           stat: 'bossKills',  goal: 10,    reward: 600 },
  { id: 'win1',      text: 'Derrota a El Devorador',     stat: 'wins',       goal: 1,     reward: 2000 },
  { id: 'evo1',      text: 'Evoluciona un arma',         stat: 'evolutions', goal: 1,     reward: 300 },
  { id: 'evo10',     text: 'Evoluciona 10 armas',        stat: 'evolutions', goal: 10,    reward: 800 },
  { id: 'lvl25',     text: 'Llega al nivel 25',          stat: 'bestLevel',  goal: 25,    reward: 200 },
  { id: 'lvl50',     text: 'Llega al nivel 50',          stat: 'bestLevel',  goal: 50,    reward: 600 },
  { id: 'combo100',  text: 'Consigue un combo de 100',   stat: 'maxCombo',   goal: 100,   reward: 150 },
  { id: 'combo500',  text: 'Consigue un combo de 500',   stat: 'maxCombo',   goal: 500,   reward: 500 },
  { id: 'chest10',   text: 'Abre 10 cofres',             stat: 'chests',     goal: 10,    reward: 200 },
  { id: 'runs10',    text: 'Juega 10 partidas',          stat: 'runs',       goal: 10,    reward: 150 },
  { id: 'char1',     text: 'Desbloquea un personaje',    stat: 'charsUnlocked', goal: 1,  reward: 100 },
  { id: 'char5',     text: 'Desbloquea 5 personajes',    stat: 'charsUnlocked', goal: 5,  reward: 1000 },
  { id: 'shop10',    text: 'Compra 10 mejoras',          stat: 'bought',     goal: 10,    reward: 200 },
];

const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];
