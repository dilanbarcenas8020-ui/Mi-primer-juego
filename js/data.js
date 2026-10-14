// Datos del juego: mapas, armas, pasivas, enemigos, jefes, personajes, tienda y misiones.

const MAX_WEAPONS = 4;   // se amplía con la mejora "Ranura de arma"
const MAX_PASSIVES = 4;  // se amplía con la mejora "Ranura pasiva"
const SPECIAL_EVERY = 5; // monstruo especial cada 5 niveles
const SUBBOSS_EVERY = 15; // subjefe cada 15 niveles
const BOSS_EVERY = 30;   // jefe cada 30 niveles (el primero completa la etapa)

// Cada arma tiene 5 niveles. Los valores de cada nivel se suman sobre los anteriores.
// Al llegar al nivel 5 y tener la pasiva indicada en "evo", aparece su evolución.
// "map" indica desde qué mapa aparece el arma (0 = desde el principio).
const WEAPONS = {
  blaster: {
    name: 'Bláster', icon: '🔹', color: '#5cf2ff', map: 0,
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
    name: 'Orbes', icon: '🔮', color: '#c77dff', map: 0,
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
    name: 'Aura', icon: '🔥', color: '#ff7a45', map: 0,
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
    name: 'Rayo', icon: '⚡', color: '#ffe066', map: 0,
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
    name: 'Cuchillas', icon: '🌀', color: '#7cff6b', map: 0,
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
    name: 'Misiles', icon: '🚀', color: '#ff5c8a', map: 0,
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
  // ---- Armas poderosas de los mapas difíciles ----
  laser: {
    name: 'Láser', icon: '🔆', color: '#ff3df2', map: 1,
    desc: 'Un rayo que atraviesa a todos los enemigos en línea.',
    evo: { passive: 'poder', name: 'Rayo Aniquilador', icon: '🌟', desc: 'Rayos colosales que lo atraviesan todo.' },
    levels: [
      { dmg: 34, cd: 1.3, count: 1, len: 430, width: 14 },
      { dmg: 46, text: 'Más daño' },
      { count: 2, text: '+1 rayo' },
      { cd: 1.0, width: 20, text: 'Más grueso y más frecuente' },
      { count: 3, dmg: 62, text: '+1 rayo y más daño' },
    ],
    evolved: { dmg: 115, count: 4, cd: 0.75, width: 30, len: 620 },
  },
  guadana: {
    name: 'Guadaña', icon: '🌙', color: '#a0e9ff', map: 2,
    desc: 'Una guadaña gigante barre todo a tu alrededor.',
    evo: { passive: 'velocidad', name: 'Segadora de Almas', icon: '💀', desc: 'Dos guadañas enormes que no perdonan.' },
    levels: [
      { dmg: 50, cd: 2.2, radius: 115, blades: 1, sweep: 0.45 },
      { dmg: 66, text: 'Más daño' },
      { radius: 140, text: 'Mayor alcance' },
      { cd: 1.7, text: 'Más frecuente' },
      { dmg: 88, radius: 155, text: 'Más daño y más alcance' },
    ],
    evolved: { dmg: 150, radius: 195, cd: 1.1, blades: 2 },
  },
  agujero: {
    name: 'Agujero Negro', icon: '🕳️', color: '#9d4edd', map: 3,
    desc: 'Crea un agujero negro que atrae y tritura enemigos.',
    evo: { passive: 'iman', name: 'Singularidad', icon: '⚫', desc: 'Agujeros enormes que colapsan en una explosión.' },
    levels: [
      { dmg: 20, cd: 4, dur: 2.5, radius: 95, pull: 150, count: 1 },
      { dmg: 28, text: 'Más daño' },
      { radius: 120, text: 'Más grande' },
      { count: 2, text: '+1 agujero' },
      { dur: 3.5, dmg: 38, cd: 3.2, text: 'Dura más y hace más daño' },
    ],
    evolved: { dmg: 62, radius: 165, pull: 270, count: 3, dur: 4, cd: 3 },
  },
  supernova: {
    name: 'Supernova', icon: '☀️', color: '#ffbe0b', map: 4,
    desc: 'Libera ondas de energía devastadoras a tu alrededor.',
    evo: { passive: 'area', name: 'Big Bang', icon: '💥', desc: 'Ondas que arrasan media pantalla.' },
    levels: [
      { dmg: 80, cd: 3, radius: 230, waves: 1 },
      { dmg: 105, text: 'Más daño' },
      { radius: 290, cd: 2.6, text: 'Más alcance y más frecuente' },
      { waves: 2, text: '+1 onda' },
      { dmg: 140, radius: 330, text: 'Más daño y más alcance' },
    ],
    evolved: { dmg: 280, radius: 430, cd: 2, waves: 3 },
  },
};

const PASSIVES = {
  poder:      { name: 'Poder',      icon: '💪', desc: '+12% de daño', max: 5, map: 0 },
  cadencia:   { name: 'Cadencia',   icon: '⏱️', desc: '-8% de tiempo de recarga', max: 5, map: 0 },
  velocidad:  { name: 'Velocidad',  icon: '👟', desc: '+10% de velocidad', max: 5, map: 0 },
  iman:       { name: 'Imán',       icon: '🧲', desc: '+35% de radio para recoger', max: 5, map: 0 },
  vitalidad:  { name: 'Vitalidad',  icon: '❤️', desc: '+20 de vida máxima y regeneración', max: 5, map: 0 },
  area:       { name: 'Área',       icon: '⭕', desc: '+12% de tamaño de ataques', max: 5, map: 0 },
  suerte:     { name: 'Suerte',     icon: '🍀', desc: '+5% de crítico y más botín', max: 5, map: 0 },
  blindaje:   { name: 'Blindaje',   icon: '🛡️', desc: '+1 de armadura y +5% de vida', max: 5, map: 1 },
  duplicador: { name: 'Duplicador', icon: '➕', desc: '+1 proyectil para todas las armas', max: 2, map: 2 },
};

// ai: forma de comportarse. weight: [peso inicial, peso extra por minuto]. from: minuto en que empiezan a salir.
// coin: multiplicador de probabilidad de soltar monedas.
const ENEMIES = {
  bicho:   { name: 'Bicho',   hp: 9,  speed: 72,  dmg: 8,  r: 12, xp: 1, color: '#ff5c8a', shape: 'blob',    ai: 'chase',  weight: [10, 0],  from: 0 },
  rapido:  { name: 'Rápido',  hp: 6,  speed: 128, dmg: 6,  r: 9,  xp: 1, color: '#ffd166', shape: 'tri',     ai: 'chase',  weight: [4, 1],   from: 1 },
  tanque:  { name: 'Tanque',  hp: 55, speed: 42,  dmg: 16, r: 21, xp: 5, color: '#9b5cff', shape: 'square',  ai: 'chase',  weight: [1.5, 0.3], from: 2 },
  tirador: { name: 'Tirador', hp: 18, speed: 66,  dmg: 8,  r: 13, xp: 3, color: '#ff9f43', shape: 'diamond', ai: 'ranged', weight: [2, 0.2], from: 3 },
  // Pantano Tóxico
  escupidor: { name: 'Escupidor', hp: 26, speed: 55, dmg: 8, r: 14, xp: 3, color: '#9cff3d', shape: 'drop', ai: 'spitter', weight: [3, 0.3], from: 0.5, coin: 1.5 },
  divisor:   { name: 'Divisor',   hp: 40, speed: 62, dmg: 9, r: 17, xp: 3, color: '#4dffb8', shape: 'oval', ai: 'chase', split: 'mini', weight: [3, 0.3], from: 1, coin: 1.5 },
  mini:      { name: 'Mini',      hp: 7,  speed: 118, dmg: 5, r: 8,  xp: 1, color: '#4dffb8', shape: 'blob', ai: 'chase', spawnOnly: true },
  // Glaciar Eterno
  cargador:  { name: 'Cargador',  hp: 50, speed: 70, dmg: 13, r: 16, xp: 4, color: '#7ad7ff', shape: 'tri',  ai: 'charger', weight: [3, 0.3], from: 0.5, coin: 2 },
  escarcha:  { name: 'Escarcha',  hp: 30, speed: 60, dmg: 8,  r: 13, xp: 3, color: '#d6f6ff', shape: 'star', ai: 'frost', weight: [2.5, 0.25], from: 1, coin: 2 },
  // Volcán Infernal
  kamikaze:  { name: 'Kamikaze',  hp: 22, speed: 125, dmg: 20, r: 12, xp: 3, color: '#ff6a00', shape: 'spiky', ai: 'bomber', weight: [3, 0.4], from: 0.5, coin: 2.5 },
  invocador: { name: 'Invocador', hp: 70, speed: 45, dmg: 10, r: 18, xp: 6, color: '#ff3d6e', shape: 'hex', ai: 'summoner', weight: [1.2, 0.15], from: 1.5, coin: 2.5 },
  diablillo: { name: 'Diablillo', hp: 10, speed: 120, dmg: 6, r: 8, xp: 1, color: '#ff3d6e', shape: 'tri', ai: 'chase', spawnOnly: true },
  // Vacío Estelar
  espectro:      { name: 'Espectro',      hp: 45, speed: 85, dmg: 11, r: 14, xp: 5, color: '#b0a6ff', shape: 'ghost', ai: 'phaser', weight: [3, 0.3], from: 0.5, coin: 3 },
  francotirador: { name: 'Francotirador', hp: 40, speed: 50, dmg: 18, r: 14, xp: 5, color: '#ff2bd6', shape: 'diamond', ai: 'sniper', weight: [2, 0.2], from: 1, coin: 3 },
};

// Monstruos especiales: aparecen cada 5 niveles y sueltan un cofre
const SPECIALS = [
  { name: 'Bombardero', color: '#ffb703', shape: 'square', r: 30, hp: 450, speed: 48, dmg: 18, attacks: ['mortar'], cd: 2.8 },
  { name: 'Acechador',  color: '#00f5d4', shape: 'tri',    r: 24, hp: 380, speed: 95, dmg: 20, attacks: ['dash', 'blink'], cd: 2.4 },
  { name: 'Brujo',      color: '#c77dff', shape: 'star',   r: 26, hp: 420, speed: 55, dmg: 16, attacks: ['spiral', 'summon'], cd: 3.5, summon: 'bicho' },
  { name: 'Gólem',      color: '#adb5bd', shape: 'hex',    r: 34, hp: 650, speed: 40, dmg: 24, attacks: ['slam'], cd: 3 },
];

// Vida base de los monstruos grandes (se multiplica por el mapa y el tiempo)
const SUBBOSS_HP = 2800;
const BOSS_HP = 8000;

// Recompensas por tipo de monstruo grande (el oro se multiplica por el mapa)
const REWARDS = {
  elite:   { coins: 6,  bonus: 0,   chest: 0, xp: 0 },
  special: { coins: 12, bonus: 25,  chest: 1, xp: 30 },
  subboss: { coins: 25, bonus: 100, chest: 2, xp: 80 },
  boss:    { coins: 50, bonus: 300, chest: 3, xp: 200 },
};

// Mapas / etapas. Se desbloquean derrotando al jefe del nivel 30 del mapa anterior.
const MAPS = [
  {
    id: 'ciudad', name: 'Ciudad Neón', diff: 'Fácil', icon: '🌃',
    hp: 1, dmg: 1, speed: 1, spawn: 1, gold: 1, xp: 1,
    bg: '#070816', grid: '92,242,255', grid2: '199,125,255', decor: ['#5cf2ff', '#c77dff'],
    enemies: ['bicho', 'rapido', 'tanque', 'tirador'],
    subboss: { name: 'Coloso Violeta', color: '#9b5cff', attacks: ['ring', 'dash'] },
    boss: { name: 'El Devorador', color: '#ff00d4', attacks: ['ring', 'dash', 'spiral', 'summon'], summon: 'rapido' },
  },
  {
    id: 'pantano', name: 'Pantano Tóxico', diff: 'Normal', icon: '☣️',
    hp: 1.8, dmg: 1.3, speed: 1.04, spawn: 1.1, gold: 1.7, xp: 1.05,
    bg: '#05110a', grid: '124,255,107', grid2: '156,255,61', decor: ['#7cff6b', '#4dffb8'],
    enemies: ['escupidor', 'divisor'],
    subboss: { name: 'Hidra del Pantano', color: '#7cff6b', attacks: ['ring', 'mortar'] },
    boss: { name: 'Reina Tóxica', color: '#b5ff3b', attacks: ['spiral', 'mortar', 'dash', 'summon'], summon: 'divisor' },
  },
  {
    id: 'glaciar', name: 'Glaciar Eterno', diff: 'Difícil', icon: '❄️',
    hp: 2.7, dmg: 1.55, speed: 1.08, spawn: 1.18, gold: 2.5, xp: 1.1,
    bg: '#050d18', grid: '160,233,255', grid2: '214,246,255', decor: ['#a0e9ff', '#ffffff'],
    enemies: ['cargador', 'escarcha'],
    subboss: { name: 'Yeti de Cristal', color: '#a0e9ff', attacks: ['fan', 'dash', 'slam'] },
    boss: { name: 'Señor del Invierno', color: '#d6f6ff', attacks: ['ring', 'fan', 'slam', 'spiral', 'dash'] },
  },
  {
    id: 'volcan', name: 'Volcán Infernal', diff: 'Muy difícil', icon: '🌋',
    hp: 4.6, dmg: 1.95, speed: 1.12, spawn: 1.26, gold: 3.5, xp: 1.15,
    bg: '#120504', grid: '255,106,0', grid2: '255,61,110', decor: ['#ff6a00', '#ff3d6e'],
    enemies: ['kamikaze', 'invocador'],
    subboss: { name: 'Salamandra Ígnea', color: '#ff6a00', attacks: ['mortar', 'dash', 'summon'], summon: 'kamikaze' },
    boss: { name: 'Titán de Magma', color: '#ff3d00', attacks: ['slam', 'mortar', 'ring', 'summon', 'spiral'], summon: 'kamikaze' },
  },
  {
    id: 'vacio', name: 'Vacío Estelar', diff: 'Pesadilla', icon: '🌌',
    hp: 6.8, dmg: 2.3, speed: 1.16, spawn: 1.34, gold: 5, xp: 1.2,
    bg: '#05030d', grid: '255,0,212', grid2: '157,78,221', decor: ['#ff00d4', '#9d4edd', '#ffffff'],
    enemies: ['espectro', 'francotirador'],
    subboss: { name: 'Heraldo del Vacío', color: '#9d4edd', attacks: ['laser', 'blink', 'ring'] },
    boss: { name: 'Devorador de Estrellas', color: '#ff00d4', attacks: ['laser', 'spiral', 'blink', 'slam', 'summon'], summon: 'espectro' },
  },
];

// Enemigos que pueden aparecer en un mapa: los suyos y los de los mapas anteriores
function mapEnemies(idx) {
  const out = [];
  for (let i = 0; i <= idx; i++) out.push(...MAPS[i].enemies);
  return out;
}

// Niveles especiales: además de los monstruos tienen trampas propias que cambian la forma de jugar.
// unlockAfter: mapa que hay que completar · tier: hasta qué mapa se toman monstruos, armas y pasivas.
const SPECIAL_MAPS = [
  {
    id: 'marinela', name: 'Marinela', diff: 'Especial', icon: '🧁', special: 'marinela',
    unlockAfter: 1, tier: 1, atkTier: 2,
    hp: 3.0, dmg: 1.7, speed: 1.08, spawn: 1.3, gold: 2.0, xp: 1.08, clearBonus: 600,
    bg: '#12050d', grid: '255,143,199', grid2: '255,209,102', decor: ['#ff8fc7', '#ffd166', '#c97b4a'],
    enemies: [],
    desc: 'Una fábrica de dulces cubierta de glaseado. Quédate dentro de la zona segura: afuera el glaseado te quema y te frena, y la zona se mueve y se encoge.',
    traps: ['🍥 Zona de glaseado que se mueve y se encoge', '🍫 Lluvia de chispas de chocolate', '🍯 Charcos de caramelo que frenan'],
    helps: ['🧁 Pastelitos que curan y dan velocidad', '🍯 El caramelo también frena a los monstruos'],
    subboss: { name: 'Gólem de Merengue', color: '#ffd1e8', attacks: ['ring', 'mortar', 'dash'] },
    boss: { name: 'Reina Glaseada', color: '#ff8fc7', attacks: ['spiral', 'mortar', 'ring', 'summon', 'dash'], summon: 'divisor' },
  },
  {
    id: 'piru', name: 'Piru', diff: 'Infernal', icon: '😈', special: 'piru',
    unlockAfter: 4, tier: 4, atkTier: 6,
    hp: 10, dmg: 3.0, speed: 1.2, spawn: 1.4, gold: 4.5, xp: 1.25, clearBonus: 2000,
    bg: '#030104', grid: '255,40,40', grid2: '140,0,50', decor: ['#ff2828', '#8c0032'],
    enemies: [],
    desc: 'El reino de Piru. Todo está a oscuras, solo ves cerca de ti, y cada cierto tiempo cae una maldición. Todos los monstruos de todos los mundos te esperan.',
    traps: ['🌑 Oscuridad: solo ves cerca de ti', '😈 Maldiciones: frenesí, sangría, eclipse o lluvia de fuego'],
    helps: ['🏮 Faroles que iluminan la zona', '⛩️ Altares: bendición de daño y luz… a cambio de una emboscada'],
    subboss: { name: 'Sombra de Piru', color: '#ff2828', attacks: ['blink', 'laser', 'ring', 'mortar'] },
    boss: { name: 'Piru', color: '#ff0040', attacks: ['laser', 'spiral', 'blink', 'slam', 'summon', 'mortar'], summon: 'espectro' },
  },
];

const ALL_MAPS = MAPS.concat(SPECIAL_MAPS);

// Maldiciones del nivel Piru
const CURSES = [
  { id: 'frenesi',  name: 'Frenesí',         icon: '😡', desc: 'Los monstruos son más rápidos' },
  { id: 'sangria',  name: 'Sangría',         icon: '🩸', desc: 'Pierdes vida poco a poco' },
  { id: 'eclipse',  name: 'Eclipse',         icon: '🌑', desc: 'La oscuridad se cierra' },
  { id: 'infierno', name: 'Lluvia de fuego', icon: '☄️', desc: 'Cae fuego a tu alrededor' },
];

// Renacer: reinicia todo a cambio de bonos permanentes. Cada vez cuesta más.
const REBIRTH = { base: 50000, growth: 2.5, dmg: 0.08, xp: 0.08, gold: 0.15, hp: 0.05 };

function rebirthCost(n) {
  return Math.round(REBIRTH.base * Math.pow(REBIRTH.growth, n) / 1000) * 1000;
}

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
  { id: 'poder',        name: 'Poder',          icon: '💪', desc: '+6% de daño',                     max: 10, base: 120, growth: 1.45 },
  { id: 'vida',         name: 'Vida',           icon: '❤️', desc: '+15 de vida máxima',              max: 10, base: 100, growth: 1.45 },
  { id: 'armadura',     name: 'Armadura',       icon: '🛡️', desc: '-1 al daño recibido',             max: 5,  base: 200 },
  { id: 'regen',        name: 'Regeneración',   icon: '💚', desc: '+0.3 de vida por segundo',        max: 5,  base: 180 },
  { id: 'velocidad',    name: 'Velocidad',      icon: '👟', desc: '+5% de velocidad',                max: 5,  base: 150 },
  { id: 'iman',         name: 'Imán',           icon: '🧲', desc: '+15% de radio para recoger',      max: 5,  base: 100 },
  { id: 'cadencia',     name: 'Cadencia',       icon: '⏱️', desc: '-4% de recarga',                  max: 5,  base: 220 },
  { id: 'crecimiento',  name: 'Crecimiento',    icon: '📈', desc: '+8% de experiencia',              max: 5,  base: 150 },
  { id: 'codicia',      name: 'Codicia',        icon: '💰', desc: '+10% de oro',                     max: 10, base: 130, growth: 1.45 },
  { id: 'suerte',       name: 'Suerte',         icon: '🍀', desc: '+3% de crítico y botín',          max: 5,  base: 200 },
  { id: 'cambios',      name: 'Cambios',        icon: '🎲', desc: '+1 cambio de cartas por partida', max: 3,  base: 250 },
  { id: 'revivir',      name: 'Revivir',        icon: '✨', desc: 'Revive una vez más por partida',  max: 2,  base: 1500, growth: 2 },
  { id: 'ranuraArma',   name: 'Ranura de arma', icon: '🗡️', desc: '+1 arma por partida',             max: 2,  base: 2500, growth: 2 },
  { id: 'ranuraPasiva', name: 'Ranura pasiva',  icon: '💍', desc: '+1 pasiva por partida',           max: 2,  base: 2000, growth: 2 },
];

function shopCost(item, level) {
  return Math.round(item.base * Math.pow(item.growth || 1.7, level) / 10) * 10;
}

// Misiones: se completan con estadísticas acumuladas y dan oro al reclamarlas
const MISSIONS = [
  { id: 'kill100',   text: 'Elimina 100 enemigos',          stat: 'kills',      goal: 100,    reward: 50 },
  { id: 'kill1k',    text: 'Elimina 1.000 enemigos',        stat: 'kills',      goal: 1000,   reward: 200 },
  { id: 'kill5k',    text: 'Elimina 5.000 enemigos',        stat: 'kills',      goal: 5000,   reward: 500 },
  { id: 'kill20k',   text: 'Elimina 20.000 enemigos',       stat: 'kills',      goal: 20000,  reward: 1500 },
  { id: 'kill100k',  text: 'Elimina 100.000 enemigos',      stat: 'kills',      goal: 100000, reward: 5000 },
  { id: 'time3',     text: 'Sobrevive 3 minutos',           stat: 'bestTime',   goal: 180,    reward: 80 },
  { id: 'time8',     text: 'Sobrevive 8 minutos',           stat: 'bestTime',   goal: 480,    reward: 250 },
  { id: 'time15',    text: 'Sobrevive 15 minutos',          stat: 'bestTime',   goal: 900,    reward: 1000 },
  { id: 'special1',  text: 'Derrota un monstruo especial',  stat: 'specials',   goal: 1,      reward: 60 },
  { id: 'special25', text: 'Derrota 25 monstruos especiales', stat: 'specials', goal: 25,     reward: 800 },
  { id: 'sub1',      text: 'Derrota un subjefe',            stat: 'subbosses',  goal: 1,      reward: 150 },
  { id: 'sub10',     text: 'Derrota 10 subjefes',           stat: 'subbosses',  goal: 10,     reward: 1200 },
  { id: 'boss1',     text: 'Derrota a un jefe',             stat: 'bossKills',  goal: 1,      reward: 300 },
  { id: 'boss10',    text: 'Derrota 10 jefes',              stat: 'bossKills',  goal: 10,     reward: 2500 },
  { id: 'map1',      text: 'Completa la Ciudad Neón',       stat: 'mapsCleared', goal: 1,     reward: 500 },
  { id: 'map2',      text: 'Completa el Pantano Tóxico',    stat: 'mapsCleared', goal: 2,     reward: 1500 },
  { id: 'map3',      text: 'Completa el Glaciar Eterno',    stat: 'mapsCleared', goal: 3,     reward: 3000 },
  { id: 'map4',      text: 'Completa el Volcán Infernal',   stat: 'mapsCleared', goal: 4,     reward: 6000 },
  { id: 'map5',      text: 'Conquista el Vacío Estelar',    stat: 'mapsCleared', goal: 5,     reward: 15000 },
  { id: 'evo1',      text: 'Evoluciona un arma',            stat: 'evolutions', goal: 1,      reward: 300 },
  { id: 'evo10',     text: 'Evoluciona 10 armas',           stat: 'evolutions', goal: 10,     reward: 800 },
  { id: 'lvl15',     text: 'Llega al nivel 15',             stat: 'bestLevel',  goal: 15,     reward: 100 },
  { id: 'lvl30',     text: 'Llega al nivel 30',             stat: 'bestLevel',  goal: 30,     reward: 300 },
  { id: 'lvl60',     text: 'Llega al nivel 60',             stat: 'bestLevel',  goal: 60,     reward: 1000 },
  { id: 'lvl90',     text: 'Llega al nivel 90',             stat: 'bestLevel',  goal: 90,     reward: 3000 },
  { id: 'combo100',  text: 'Consigue un combo de 100',      stat: 'maxCombo',   goal: 100,    reward: 150 },
  { id: 'combo500',  text: 'Consigue un combo de 500',      stat: 'maxCombo',   goal: 500,    reward: 500 },
  { id: 'chest10',   text: 'Abre 10 cofres',                stat: 'chests',     goal: 10,     reward: 200 },
  { id: 'chest100',  text: 'Abre 100 cofres',               stat: 'chests',     goal: 100,    reward: 1500 },
  { id: 'runs10',    text: 'Juega 10 partidas',             stat: 'runs',       goal: 10,     reward: 150 },
  { id: 'char1',     text: 'Desbloquea un personaje',       stat: 'charsUnlocked', goal: 1,   reward: 100 },
  { id: 'char5',     text: 'Desbloquea 5 personajes',       stat: 'charsUnlocked', goal: 5,   reward: 1000 },
  { id: 'shop10',    text: 'Compra 10 mejoras',             stat: 'bought',     goal: 10,     reward: 200 },
  { id: 'shop40',    text: 'Compra 40 mejoras',             stat: 'bought',     goal: 40,     reward: 1500 },
  { id: 'marinela1', text: 'Completa el nivel especial Marinela', stat: 'clearedMarinela', goal: 1, reward: 3000 },
  { id: 'piru1',     text: 'Derrota a Piru en su reino',    stat: 'clearedPiru', goal: 1,     reward: 25000 },
  { id: 'rebirth1',  text: 'Renace por primera vez',        stat: 'rebirths',   goal: 1,      reward: 2000 },
  { id: 'rebirth3',  text: 'Renace 3 veces',                stat: 'rebirths',   goal: 3,      reward: 10000 },
];

const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];
