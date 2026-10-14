// Efectos de sonido y música generados con Web Audio (no necesita archivos de audio).

const Sound = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  const last = {};
  let gemChain = 0, gemChainT = 0;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.6;
      master.connect(ac.destination);
      sfxBus = ac.createGain();
      sfxBus.connect(master);
      musicBus = ac.createGain();
      musicBus.gain.value = 0.22;
      musicBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applySettings();
      startMusic();
    } catch (e) { ac = null; }
  }

  function applySettings() {
    if (!ac) return;
    sfxBus.gain.value = Save.data.sfx ? 1 : 0;
    musicBus.gain.value = Save.data.music ? 0.22 : 0;
  }

  function tone(freq, dur, type = 'square', vol = 0.1, slideTo = 0, when = 0, bus = sfxBus) {
    if (!ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.1, freq = 1200, when = 0, bus = sfxBus) {
    if (!ac) return;
    const t = ac.currentTime + when;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function throttle(name, ms) {
    const now = performance.now();
    if (last[name] && now - last[name] < ms) return false;
    last[name] = now;
    return true;
  }

  function play(name) {
    if (!ac || !Save.data.sfx) return;
    switch (name) {
      case 'shoot': if (throttle(name, 70)) tone(900, 0.05, 'square', 0.025, 500); break;
      case 'hit': if (throttle(name, 45)) noise(0.04, 0.05, 2500); break;
      case 'kill': if (throttle(name, 40)) tone(420 + Math.random() * 120, 0.09, 'triangle', 0.08, 120); break;
      case 'gem': {
        if (!throttle(name, 22)) break;
        const now = performance.now();
        gemChain = now - gemChainT < 400 ? Math.min(gemChain + 1, 24) : 0;
        gemChainT = now;
        tone(660 * Math.pow(2, gemChain / 12), 0.07, 'sine', 0.06);
        break;
      }
      case 'coin': if (throttle(name, 50)) { tone(1320, 0.06, 'square', 0.04); tone(1760, 0.1, 'square', 0.04, 0, 0.05); } break;
      case 'heal': tone(523, 0.12, 'sine', 0.1); tone(784, 0.2, 'sine', 0.1, 0, 0.08); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.06, 0, i * 0.07)); break;
      case 'hurt': if (throttle(name, 120)) { tone(180, 0.18, 'sawtooth', 0.12, 70); noise(0.1, 0.08, 800); } break;
      case 'boom': if (throttle(name, 70)) { noise(0.35, 0.18, 600); tone(110, 0.25, 'sine', 0.15, 40); } break;
      case 'zap': if (throttle(name, 60)) { tone(1800, 0.12, 'sawtooth', 0.04, 200); noise(0.08, 0.06, 4000); } break;
      case 'chest': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, 0, i * 0.08)); break;
      case 'reveal': tone(880, 0.1, 'square', 0.05); tone(1320, 0.15, 'square', 0.05, 0, 0.06); break;
      case 'evo': [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.05, 0, i * 0.06)); break;
      case 'boss': tone(110, 0.6, 'sawtooth', 0.12, 55); tone(116, 0.6, 'sawtooth', 0.1, 58, 0.6); break;
      case 'swarm': tone(220, 0.4, 'square', 0.07, 440); break;
      case 'click': tone(700, 0.04, 'square', 0.05); break;
      case 'buy': tone(988, 0.08, 'square', 0.06); tone(1319, 0.2, 'square', 0.06, 0, 0.07); break;
      case 'combo': tone(784, 0.1, 'triangle', 0.08); tone(1175, 0.18, 'triangle', 0.08, 0, 0.08); break;
      case 'death': tone(300, 0.9, 'sawtooth', 0.12, 40); noise(0.8, 0.15, 500); break;
      case 'laser': if (throttle(name, 90)) { tone(1400, 0.18, 'sawtooth', 0.05, 300); tone(700, 0.18, 'square', 0.03, 150); } break;
      case 'warn': if (throttle(name, 150)) { tone(880, 0.12, 'square', 0.05); tone(660, 0.12, 'square', 0.05, 0, 0.13); } break;
      case 'blink': if (throttle(name, 120)) tone(300, 0.2, 'sine', 0.07, 1200); break;
      case 'spit': if (throttle(name, 120)) noise(0.15, 0.08, 900); break;
      case 'splash': if (throttle(name, 90)) { noise(0.25, 0.12, 700); tone(160, 0.2, 'sine', 0.08, 80); } break;
      case 'scythe': if (throttle(name, 100)) noise(0.3, 0.1, 3000); break;
      case 'nova': if (throttle(name, 100)) { tone(90, 0.5, 'sawtooth', 0.12, 45); noise(0.4, 0.12, 1200); } break;
      case 'special': tone(523, 0.12, 'square', 0.07); tone(392, 0.12, 'square', 0.07, 0, 0.12); tone(523, 0.2, 'square', 0.07, 0, 0.24); break;
      case 'stage': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, 0, i * 0.1)); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'square', 0.06, 0, i * 0.12)); break;
    }
  }

  // Música: bucle sencillo de bajo, arpegio y percusión
  const BPM = 112;
  const STEP = 60 / BPM / 4;
  const CHORDS = [
    [57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62],
  ];
  let step = 0, nextTime = 0, timer = null, intensity = 0;

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function schedule() {
    if (!ac) return;
    while (nextTime < ac.currentTime + 0.15) {
      const chord = CHORDS[Math.floor(step / 16) % CHORDS.length];
      const s = step % 16;
      if (s % 4 === 0) tone(midi(chord[0] - 24), STEP * 3, 'triangle', 0.5, 0, nextTime - ac.currentTime, musicBus);
      if (s % 2 === 0) tone(midi(chord[(s / 2) % 3] + 12), STEP * 1.5, 'square', 0.08, 0, nextTime - ac.currentTime, musicBus);
      if (intensity > 0 && s % 4 === 2) noise(0.05, 0.12, 6000, nextTime - ac.currentTime, musicBus);
      if (intensity > 1 && s % 8 === 0) noise(0.12, 0.25, 300, nextTime - ac.currentTime, musicBus);
      nextTime += STEP;
      step++;
    }
  }

  function startMusic() {
    if (timer || !ac) return;
    nextTime = ac.currentTime + 0.1;
    timer = setInterval(schedule, 50);
  }

  function setIntensity(v) { intensity = v; }

  return { init, play, applySettings, setIntensity };
})();
