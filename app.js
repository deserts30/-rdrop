// ================== TELEGRAM ==================
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API = "https://car-game-api.onrender.com/api";
const user = tg.initDataUnsafe?.user || { id: 12345, username: "test" };

let state = { balance: 0, tickets: 0, cars: [], level: 1, xp: 0, xpNext: 100, country: "germany" };
let countriesMap = {};
let config = { spin_cost: 500000, spin5_cost: 2500000 };

const RARITY_COLORS = { common: "#9ca3af", rare: "#3b82f6", epic: "#a855f7", legendary: "#f59e0b" };

const COLOR_HEX = {
  "Чёрный": "#1a1a1a", "Белый": "#f5f5f5", "Серебристый": "#c0c0c0",
  "Красный": "#dc2626", "Синий": "#2563eb", "Жёлтый": "#facc15",
  "Хамелеон": "url(#chameleon)", "Матовый чёрный": "#0a0a0a",
  "Розовый": "#ec4899", "Золотой": "url(#gold)", "Радужный": "url(#rainbow)",
  "Юбилейная": "url(#gold)",
};

const CONTAINERS = [
  { id: "common",    name: "Обычный контейнер",     price: 500_000,     color: "#a67c52", glow: "#d4a373" },
  { id: "rare",      name: "Редкий контейнер",      price: 2_500_000,   color: "#2563eb", glow: "#60a5fa" },
  { id: "epic",      name: "Эпический контейнер",   price: 10_000_000,  color: "#7c3aed", glow: "#c084fc" },
  { id: "legendary", name: "Легендарный контейнер", price: 50_000_000,  color: "#d97706", glow: "#fbbf24" },
  { id: "elite",     name: "Элитный контейнер",     price: 250_000_000, color: "#be185d", glow: "#ec4899" },
];

const FAKE_CARS = [
  { brand: "Lada", year: 2010, color: "Белый", rarity: "common", modifier: "Обычная" },
  { brand: "Toyota", year: 2018, color: "Серебристый", rarity: "common", modifier: "Царапанная" },
  { brand: "BMW", year: 2020, color: "Чёрный", rarity: "rare", modifier: "Ухоженная" },
  { brand: "Audi", year: 2021, color: "Красный", rarity: "rare", modifier: "Обычная" },
  { brand: "Porsche", year: 2022, color: "Жёлтый", rarity: "epic", modifier: "Эксклюзивная" },
  { brand: "Ferrari", year: 2023, color: "Красный", rarity: "epic", modifier: "Обычная" },
  { brand: "Lamborghini", year: 2023, color: "Хамелеон", rarity: "legendary", modifier: "Обычная" },
  { brand: "Bugatti", year: 2024, color: "Матовый чёрный", rarity: "legendary", modifier: "Юбилейная №1" },
];

const MODIFIERS_INFO = [
  { name: "Ржавая", mult: 0.35, emoji: "🦠" },
  { name: "Мятая", mult: 0.50, emoji: "💥" },
  { name: "Царапанная", mult: 0.65, emoji: "⚡" },
  { name: "Грязная", mult: 0.75, emoji: "💩" },
  { name: "Граффити", mult: 0.70, emoji: "🎨" },
  { name: "Обычная", mult: 1.00, emoji: "🚗" },
  { name: "Ухоженная", mult: 1.15, emoji: "✨" },
  { name: "Эксклюзивная", mult: 1.40, emoji: "🌟" },
  { name: "Юбилейная №1", mult: 2.00, emoji: "🏆" },
  { name: "Коллекционная", mult: 3.00, emoji: "💎" },
];


// ================== ЗВУК ==================
let audioCtx = null;
let soundEnabled = localStorage.getItem("soundEnabled") !== "false";
let audioUnlocked = false;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {}
  audioUnlocked = true;
}

["touchstart", "touchend", "click", "mousedown"].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { once: true, passive: true });
});

function playTone(freq, duration, type = "sine", volume = 0.15, delay = 0) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t); osc.stop(t + duration + 0.05);
  } catch (e) {}
}

function playTick() {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square"; osc.frequency.value = 1400;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.start(t); osc.stop(t + 0.045);
  } catch (e) {}
}

function playSpinSound(duration = 4000) {
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed >= duration) return;
    playTick();
    const p = elapsed / duration;
    const nextInterval = 45 + Math.pow(p, 2.8) * 380;
    setTimeout(tick, nextInterval);
  };
  tick();
}

function playRewardSound(rarity, isSpecial = false) {
  if (isSpecial) {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => playTone(f, 0.15, "triangle", 0.2, i * 0.1));
    playTone(2093, 0.9, "sine", 0.18, 0.65);
    return;
  }
  if (rarity === "legendary") {
    playTone(523, 0.15, "triangle", 0.18);
    playTone(659, 0.15, "triangle", 0.18, 0.10);
    playTone(784, 0.15, "triangle", 0.18, 0.20);
    playTone(1047, 0.45, "triangle", 0.22, 0.30);
  } else if (rarity === "epic") {
    playTone(523, 0.12, "sine", 0.16);
    playTone(659, 0.12, "sine", 0.16, 0.08);
    playTone(784, 0.28, "sine", 0.18, 0.16);
  } else if (rarity === "rare") {
    playTone(523, 0.12, "sine", 0.14);
    playTone(659, 0.22, "sine", 0.14, 0.10);
  } else {
    playTone(440, 0.16, "sine", 0.12);
  }
}

function updateSoundUI() {
  const btn = document.getElementById("soundToggle");
  if (!btn) return;
  btn.textContent = soundEnabled ? "🔊" : "🔇";
  btn.classList.toggle("off", !soundEnabled);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem("soundEnabled", soundEnabled);
  updateSoundUI();
  if (soundEnabled) { unlockAudio(); playTone(660, 0.1, "sine", 0.15); }
}


// ================== SVG МАШИНЫ ==================
function carSvg(car, size = 220) {
  const color = COLOR_HEX[car.color] || "#888";
  const rarity = car.rarity;
  const modifier = car.modifier || "Обычная";
  const uid = "u" + Math.random().toString(36).substring(2, 8);

  let bodyColor = color;
  if (color === "url(#chameleon)") bodyColor = `url(#chameleon_${uid})`;
  else if (color === "url(#gold)") bodyColor = `url(#gold_${uid})`;
  else if (color === "url(#rainbow)") bodyColor = `url(#rainbow_${uid})`;

  const defs = `
    <defs>
      <linearGradient id="chameleon_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#22d3ee"/><stop offset="50%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <linearGradient id="gold_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef3c7"/><stop offset="50%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
      <linearGradient id="rainbow_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ef4444"/><stop offset="25%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#22c55e"/><stop offset="75%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
      <linearGradient id="glass_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.9"/><stop offset="100%" stop-color="#1e40af" stop-opacity="0.7"/>
      </linearGradient>
      <radialGradient id="glow_${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${RARITY_COLORS[rarity]}" stop-opacity="0.65"/><stop offset="100%" stop-color="${RARITY_COLORS[rarity]}" stop-opacity="0"/>
      </radialGradient>
    </defs>`;

  let glow = "";
  if (rarity === "legendary") glow = `<ellipse cx="110" cy="100" rx="100" ry="45" fill="url(#glow_${uid})"/>`;
  else if (rarity === "epic") glow = `<ellipse cx="110" cy="100" rx="90" ry="40" fill="url(#glow_${uid})" opacity="0.5"/>`;

  let body = "";
  if (rarity === "common") {
    body = `
      <path d="M 30 90 L 50 60 L 90 55 L 130 55 L 170 60 L 190 90 L 190 110 L 30 110 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 60 88 L 75 65 L 130 65 L 145 88 Z" fill="url(#glass_${uid})" opacity="0.85"/>
      <rect x="178" y="82" width="12" height="6" rx="2" fill="#fef3c7"/>
      <rect x="30" y="82" width="10" height="6" rx="2" fill="#dc2626"/>`;
  } else if (rarity === "rare") {
    body = `
      <path d="M 25 95 L 55 70 L 100 62 L 145 62 L 185 75 L 195 95 L 195 110 L 25 110 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 65 92 L 85 72 L 135 72 L 150 92 Z" fill="url(#glass_${uid})" opacity="0.85"/>
      <rect x="22" y="90" width="15" height="4" rx="1" fill="#111"/>
      <rect x="184" y="88" width="11" height="5" rx="2" fill="#fef3c7"/>`;
  } else if (rarity === "epic") {
    body = `
      <path d="M 20 100 L 55 75 L 105 65 L 150 65 L 195 80 L 200 100 L 200 112 L 20 112 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 70 97 L 95 75 L 140 75 L 155 97 Z" fill="url(#glass_${uid})" opacity="0.85"/>
      <rect x="18" y="85" width="20" height="5" rx="1" fill="#111"/>
      <rect x="25" y="90" width="3" height="10" fill="#111"/>
      <path d="M 188 85 L 200 88 L 200 93 L 188 90 Z" fill="#fef3c7"/>`;
  } else {
    body = `
      <path d="M 15 105 L 55 78 L 110 65 L 160 68 L 200 85 L 205 105 L 205 115 L 15 115 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 75 100 L 105 78 L 145 78 L 160 100 Z" fill="url(#glass_${uid})" opacity="0.9"/>
      <rect x="10" y="82" width="30" height="6" rx="2" fill="#111"/>
      <rect x="20" y="88" width="4" height="15" fill="#111"/>
      <circle cx="20" cy="105" r="3" fill="#f59e0b"/>
      <path d="M 190 90 L 205 94 L 205 100 L 190 96 Z" fill="#fef3c7"/>`;
  }

  const wheels = `
    <circle cx="65" cy="112" r="14" fill="#0a0a0a" stroke="#222" stroke-width="2"/>
    <circle cx="65" cy="112" r="6" fill="#666"/>
    <circle cx="160" cy="112" r="14" fill="#0a0a0a" stroke="#222" stroke-width="2"/>
    <circle cx="160" cy="112" r="6" fill="#666"/>`;

  // ВИЗУАЛЬНЫЕ ДЕФЕКТЫ
  let defects = "";
  if (modifier === "Ржавая") {
    defects = `
      <circle cx="55" cy="80" r="5" fill="#6b3410" opacity="0.7"/>
      <circle cx="120" cy="75" r="4" fill="#6b3410" opacity="0.6"/>
      <circle cx="160" cy="95" r="6" fill="#6b3410" opacity="0.7"/>
      <circle cx="85" cy="100" r="3" fill="#6b3410" opacity="0.5"/>
      <circle cx="140" cy="88" r="4" fill="#6b3410" opacity="0.6"/>`;
  } else if (modifier === "Мятая") {
    defects = `
      <path d="M 45 62 L 55 68 L 50 75 L 60 80" stroke="#000" stroke-width="2" fill="none" opacity="0.5"/>
      <path d="M 140 65 L 150 72 L 145 80" stroke="#000" stroke-width="2" fill="none" opacity="0.5"/>
      <path d="M 90 55 L 100 60 L 95 68" stroke="#000" stroke-width="1.5" fill="none" opacity="0.4"/>`;
  } else if (modifier === "Царапанная") {
    defects = `
      <line x1="55" y1="70" x2="75" y2="95" stroke="#fff" stroke-width="1" opacity="0.6"/>
      <line x1="60" y1="70" x2="80" y2="95" stroke="#fff" stroke-width="1" opacity="0.4"/>
      <line x1="120" y1="75" x2="145" y2="98" stroke="#fff" stroke-width="1" opacity="0.6"/>
      <line x1="125" y1="78" x2="150" y2="100" stroke="#fff" stroke-width="1" opacity="0.4"/>`;
  } else if (modifier === "Грязная") {
    defects = `
      <ellipse cx="70" cy="105" rx="20" ry="5" fill="#4a3520" opacity="0.4"/>
      <ellipse cx="160" cy="107" rx="15" ry="4" fill="#4a3520" opacity="0.4"/>
      <circle cx="100" cy="75" r="8" fill="#4a3520" opacity="0.25"/>
      <circle cx="55" cy="85" r="6" fill="#4a3520" opacity="0.3"/>`;
  } else if (modifier === "Граффити") {
    defects = `
      <text x="70" y="85" font-size="18" font-weight="bold" fill="#ec4899" opacity="0.8" font-family="Arial">A$AP</text>
      <text x="140" y="105" font-size="12" font-weight="bold" fill="#22d3ee" opacity="0.7" font-family="Arial">420</text>`;
  } else if (modifier === "Ухоженная") {
    defects = `
      <circle cx="50" cy="65" r="3" fill="#fff" opacity="0.9"/>
      <circle cx="95" cy="60" r="2" fill="#fff" opacity="0.9"/>
      <circle cx="145" cy="62" r="2.5" fill="#fff" opacity="0.9"/>`;
  } else if (modifier === "Эксклюзивная") {
    defects = `
      <path d="M 50 55 L 55 62 L 48 68" stroke="#fbbf24" stroke-width="1.5" fill="none"/>
      <circle cx="100" cy="58" r="2" fill="#fbbf24"/>`;
  } else if (modifier === "Юбилейная №1" || modifier === "Коллекционная") {
    defects = `
      <text x="115" y="80" font-size="22" font-weight="bold" fill="#fbbf24" font-family="Arial" text-anchor="middle">№1</text>
      <circle cx="105" cy="60" r="3" fill="#fbbf24"/>
      <circle cx="130" cy="60" r="2" fill="#fbbf24"/>`;
  }

  return `
    <svg viewBox="0 0 230 130" width="${size}" height="${size * 0.565}" xmlns="http://www.w3.org/2000/svg">
      ${defs}${glow}${body}${defects}${wheels}
    </svg>`;
}


// ================== SVG КЕЙСОВ ==================
function caseSvg(caseId, size = 70) {
  const common = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="c1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#d4a373"/><stop offset="100%" stop-color="#a67c52"/>
      </linearGradient></defs>
      <rect x="15" y="40" width="70" height="50" fill="url(#c1)" stroke="#6b4423" stroke-width="2.5" rx="4"/>
      <path d="M 15 40 L 50 20 L 85 40 L 50 60 Z" fill="#c19a6b" stroke="#6b4423" stroke-width="2.5"/>
      <line x1="50" y1="20" x2="50" y2="60" stroke="#6b4423" stroke-width="1.5"/>
      <rect x="42" y="45" width="16" height="35" fill="#f5ead9" opacity="0.7" rx="2"/>
      <line x1="15" y1="55" x2="85" y2="55" stroke="#6b4423" stroke-width="1" opacity="0.5"/>
    </svg>`;

  const rare = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="r1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#1d4ed8"/>
        </linearGradient>
        <radialGradient id="rglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.6"/><stop offset="100%" stop-color="#93c5fd" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="65" rx="40" ry="30" fill="url(#rglow)"/>
      <rect x="15" y="40" width="70" height="50" fill="url(#r1)" stroke="#0f172a" stroke-width="2.5" rx="4"/>
      <path d="M 15 40 L 50 20 L 85 40 L 50 60 Z" fill="#3b82f6" stroke="#0f172a" stroke-width="2.5"/>
      <line x1="50" y1="20" x2="50" y2="60" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="50" cy="72" r="9" fill="#fbbf24" stroke="#78350f" stroke-width="2"/>
      <rect x="47" y="60" width="6" height="6" fill="#fbbf24"/>
      <circle cx="50" cy="72" r="3" fill="#78350f"/>
    </svg>`;

  const epic = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="e1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#6d28d9"/>
        </linearGradient>
        <radialGradient id="eglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#c084fc" stop-opacity="0.7"/><stop offset="100%" stop-color="#c084fc" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="65" rx="42" ry="32" fill="url(#eglow)"/>
      <rect x="15" y="40" width="70" height="50" fill="url(#e1)" stroke="#3b0764" stroke-width="2.5" rx="4"/>
      <path d="M 15 40 L 50 20 L 85 40 L 50 60 Z" fill="#a855f7" stroke="#3b0764" stroke-width="2.5"/>
      <line x1="50" y1="20" x2="50" y2="60" stroke="#3b0764" stroke-width="1.5"/>
      <path d="M 50 65 L 58 73 L 50 85 L 42 73 Z" fill="#22d3ee" stroke="#0891b2" stroke-width="1.5"/>
      <path d="M 50 68 L 55 73 L 50 80 L 45 73 Z" fill="#67e8f9"/>
      <circle cx="30" cy="50" r="2" fill="#fff" opacity="0.8"/>
      <circle cx="70" cy="55" r="1.5" fill="#fff" opacity="0.8"/>
    </svg>`;

  const legendary = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <radialGradient id="lglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fde68a" stop-opacity="0.85"/><stop offset="100%" stop-color="#fde68a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="65" rx="45" ry="35" fill="url(#lglow)"/>
      <rect x="15" y="40" width="70" height="50" fill="url(#l1)" stroke="#78350f" stroke-width="2.5" rx="4"/>
      <path d="M 15 40 L 50 20 L 85 40 L 50 60 Z" fill="#fbbf24" stroke="#78350f" stroke-width="2.5"/>
      <line x1="50" y1="20" x2="50" y2="60" stroke="#78350f" stroke-width="1.5"/>
      <path d="M 35 25 L 40 15 L 45 25 L 50 10 L 55 25 L 60 15 L 65 25 Z" fill="#fef3c7" stroke="#78350f" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="4" fill="#dc2626"/>
      <circle cx="30" cy="60" r="2" fill="#fff" opacity="0.9"/>
      <circle cx="70" cy="65" r="2.5" fill="#fff" opacity="0.9"/>
      <circle cx="50" cy="80" r="2" fill="#fff" opacity="0.9"/>
    </svg>`;

  const elite = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="el1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ec4899"/><stop offset="50%" stop-color="#831843"/><stop offset="100%" stop-color="#1f2937"/>
        </linearGradient>
        <radialGradient id="elglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.9"/><stop offset="100%" stop-color="#f472b6" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="65" rx="48" ry="38" fill="url(#elglow)"/>
      <rect x="15" y="40" width="70" height="50" fill="url(#el1)" stroke="#0f172a" stroke-width="2.5" rx="4"/>
      <path d="M 15 40 L 50 20 L 85 40 L 50 60 Z" fill="#ec4899" stroke="#0f172a" stroke-width="2.5"/>
      <line x1="50" y1="20" x2="50" y2="60" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M 50 62 L 62 72 L 50 88 L 38 72 Z" fill="#67e8f9" stroke="#0891b2" stroke-width="1.5"/>
      <path d="M 50 66 L 57 72 L 50 82 L 43 72 Z" fill="#fff"/>
      <circle cx="30" cy="50" r="2.5" fill="#fbbf24"/>
      <circle cx="70" cy="55" r="2" fill="#fbbf24"/>
      <circle cx="35" cy="80" r="1.5" fill="#fbbf24"/>
      <circle cx="65" cy="80" r="2" fill="#fbbf24"/>
    </svg>`;

  const map = { common, rare, epic, legendary, elite };
  return map[caseId] || common;
}


function modifierBadge(car) {
  const m = car.modifier_meta || { name: car.modifier || "Обычная", color: "#78716c", emoji: "🚗" };
  return `<span style="display:inline-block;font-size:10px;font-weight:800;padding:3px 8px;border-radius:8px;background:${m.color}20;color:${m.color};border:1px solid ${m.color}60;">${m.emoji || ""} ${m.name}</span>`;
}


// ================== AUTH ==================
async function auth() {
  try {
    const r = await fetch(`${API}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tg_id: user.id, username: user.username || "" }),
    });
    const data = await r.json();
    state = data;
    if (!state.cars) state.cars = [];

    const rc = await fetch(`${API}/countries`);
    countriesMap = await rc.json();

    try {
      const rc2 = await fetch(`${API}/config`);
      config = await rc2.json();
      document.getElementById("rollCost").textContent = config.spin_cost.toLocaleString() + " ₽";
      document.getElementById("roll5Cost").textContent = config.spin5_cost.toLocaleString() + " ₽";
    } catch (e) {}

    render();
    updateCountryUI();
    updateSoundUI();
  } catch (e) {
    console.log("Backend not connected", e);
  }
}


// ================== РУЛЕТКА ==================
function showRoulette(winner, isSpecial = false) {
  return new Promise(resolve => {
    const overlay = document.getElementById("rouletteOverlay");
    const track = document.getElementById("rouletteTrack");

    const ITEM_W = 140;
    const TOTAL = 42;
    const WINNER_POS = 36;

    const items = [];
    for (let i = 0; i < TOTAL; i++) {
      if (i === WINNER_POS) items.push(winner);
      else items.push(FAKE_CARS[Math.floor(Math.random() * FAKE_CARS.length)]);
    }

    track.innerHTML = items.map(c => `
      <div class="roulette-item" style="border-color:${RARITY_COLORS[c.rarity]};">
        ${carSvg(c, 110)}
        <div class="roulette-name">${c.brand}</div>
      </div>
    `).join("");

    overlay.classList.remove("hidden");
    track.style.transition = "none";
    track.style.transform = "translateX(0)";
    void track.offsetWidth;

    const windowEl = overlay.querySelector(".roulette-window");
    const windowW = windowEl.offsetWidth;
    const centerW = windowW / 2;
    const targetCenter = ITEM_W * WINNER_POS + ITEM_W / 2;
    const randomJitter = (Math.random() - 0.5) * (ITEM_W * 0.5);
    const finalX = -(targetCenter - centerW + randomJitter);

    playSpinSound(4000);

    track.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)";
    track.style.transform = `translateX(${finalX}px)`;

    setTimeout(() => {
      overlay.classList.add("hidden");
      track.style.transition = "none";
      playRewardSound(winner.rarity, isSpecial);
      resolve();
    }, 4200);
  });
}


// ================== КРУТКИ ==================
async function roll() {
  const btn = document.getElementById("rollBtn");
  btn.disabled = true;
  try {
    const r = await fetch(`${API}/roll/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    await showRoulette(data.car, false);

    state.balance = data.balance;
    state.cars.push(data.car);
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;

    renderCar(data.car, true);
    render();
    if (data.xp_gained) showXpToast(`+${data.xp_gained} XP`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  } finally {
    btn.disabled = false;
  }
}

async function roll5() {
  const btn = document.getElementById("roll5Btn");
  btn.disabled = true;
  try {
    const r = await fetch(`${API}/roll5/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    state.balance = data.balance;
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;
    data.cars.forEach(c => state.cars.push(c));

    if (data.cars.length) renderCar(data.cars[data.cars.length - 1], true);
    render();
    showRollResults(data.cars, data.xp_gained);

    const rank = { common: 1, rare: 2, epic: 3, legendary: 4 };
    let best = "common";
    for (const c of data.cars) if (rank[c.rarity] > rank[best]) best = c.rarity;
    playRewardSound(best, false);

    if (data.xp_gained) showXpToast(`+${data.xp_gained} XP`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  } finally {
    btn.disabled = false;
  }
}

async function openContainer(containerId) {
  const cont = CONTAINERS.find(c => c.id === containerId);
  if (!confirm(`Открыть «${cont.name}» за ${cont.price.toLocaleString()} ₽?`)) return;

  try {
    const r = await fetch(`${API}/container/${user.id}/${containerId}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    await showRoulette(data.car, data.is_special === true);

    state.balance = data.balance;
    state.cars.push(data.car);
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;
    render();

    showContainerResult(data.car, data.is_special);
    if (data.xp_gained) showXpToast(`+${data.xp_gained} XP`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}

async function sellAll() {
  if (!state.cars.length) { alert("Гараж пуст"); return; }
  if (!confirm(`Продать ВСЕ ${state.cars.length} машин за 70% стоимости?`)) return;

  try {
    const r = await fetch(`${API}/sell-all/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    state.cars = [];
    state.balance = data.new_balance;
    render();
    openGarage();
    playTone(880, 0.1, "sine", 0.15);
    playTone(1100, 0.15, "sine", 0.15, 0.08);
    playTone(1320, 0.2, "sine", 0.15, 0.16);
    alert(`💸 Продано ${data.sold_count} машин за ${Math.round(data.sold_total).toLocaleString()} ₽`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}


// ================== РЕЗУЛЬТАТЫ ==================
function showRollResults(cars, totalXp) {
  const list = document.getElementById("rollResultsList");
  const xpEl = document.getElementById("rollResultsXp");
  list.innerHTML = cars.map(c => {
    const rc = RARITY_COLORS[c.rarity];
    return `<div style="padding:10px;margin-bottom:8px;border-radius:12px;background:#fff;border-left:4px solid ${rc};border:1.5px solid #f0e3c9;border-left-width:4px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <div style="flex-shrink:0;">${carSvg(c, 90)}</div>
      <div style="flex:1;text-align:right;">
        <b>${c.brand}</b> <small style="color:#a1a1aa;">${c.year}</small><br>
        <small style="color:${rc};font-size:10px;font-weight:800;">${c.rarity.toUpperCase()}</small><br>
        ${modifierBadge(c)}<br>
        <span style="color:#16a34a;font-weight:800;font-size:13px;">${Math.round(c.price).toLocaleString()} ₽</span>
      </div></div>`;
  }).join("");
  xpEl.textContent = `+${totalXp} XP всего`;
  document.getElementById("rollResultsModal").classList.remove("hidden");
}

function closeRollResults() { document.getElementById("rollResultsModal").classList.add("hidden"); }

function showContainerResult(car, isSpecial) {
  const box = document.getElementById("containerResultBox");
  const rc = RARITY_COLORS[car.rarity];
  const banner = isSpecial ? `<div style="background:linear-gradient(90deg,#fbbf24,#f59e0b,#fbbf24);color:#78350f;font-weight:800;text-align:center;padding:8px;border-radius:10px;margin-bottom:10px;font-size:13px;">⭐ ЭКСКЛЮЗИВ ⭐</div>` : "";
  box.innerHTML = `
    <div style="text-align:center;padding:20px;border-radius:16px;background:#fff;border:2px solid ${rc};box-shadow:0 0 25px ${rc}30;">
      ${banner}
      <div style="color:${rc};font-size:12px;font-weight:800;letter-spacing:2px;margin-bottom:8px;">${car.rarity.toUpperCase()}</div>
      <div style="display:flex;justify-content:center;margin:10px 0;">${carSvg(car, 240)}</div>
      <div style="font-size:24px;font-weight:800;color:#1f2937;">${car.brand}</div>
      ${car.model ? `<div style="color:#d97706;font-size:14px;font-weight:800;margin:4px 0;">${car.model}</div>` : ""}
      <div style="margin:8px 0;">${modifierBadge(car)}</div>
      <div style="color:#78716c;font-size:14px;">📅 ${car.year} • 🎨 ${car.color}</div>
      <div style="color:#16a34a;font-size:22px;font-weight:800;margin-top:8px;">💰 ${Math.round(car.price).toLocaleString()}</div>
    </div>`;
  document.getElementById("containerResultModal").classList.remove("hidden");
}

function closeContainerResult() { document.getElementById("containerResultModal").classList.add("hidden"); }


// ================== МЕНЮ ==================
function openShop() {
  const list = document.getElementById("containersList");
  list.innerHTML = CONTAINERS.map(c => `
    <div class="case-card" onclick="openContainer('${c.id}')" style="--case-glow:${c.glow};">
      <div class="case-visual">${caseSvg(c.id, 78)}</div>
      <div class="case-info">
        <b style="color:${c.color};">${c.name}</b>
        <small>Внутри гарантированно машина</small>
      </div>
      <div class="case-price">${c.price.toLocaleString()} ₽</div>
    </div>`).join("");
  document.getElementById("shopModal").classList.remove("hidden");
}
function closeShop() { document.getElementById("shopModal").classList.add("hidden"); }

function openCountryModal() {
  const list = document.getElementById("countriesList");
  list.innerHTML = Object.entries(countriesMap).map(([k, n]) =>
    `<div class="country-card ${k === state.country ? 'active' : ''}" onclick="setCountry('${k}')">${n}</div>`
  ).join("");
  document.getElementById("countryModal").classList.remove("hidden");
}
function closeCountryModal() { document.getElementById("countryModal").classList.add("hidden"); }

async function setCountry(key) {
  try {
    const r = await fetch(`${API}/country/${user.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: key }),
    });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }
    state.country = data.country;
    updateCountryUI();
    closeCountryModal();
  } catch (e) { alert("Ошибка связи с сервером"); }
}

function updateCountryUI() {
  const el = document.getElementById("currentCountry");
  if (el) el.textContent = countriesMap[state.country] || "Германия";
}


// ================== КОЛЕСО УДАЧИ ==================
const WHEEL_SECTORS = [
  { emoji: "💰", label: "500K",  color: "#fbbf24" },
  { emoji: "🎫", label: "1",     color: "#dc2626" },
  { emoji: "💰", label: "1M",    color: "#f59e0b" },
  { emoji: "📦", label: "Кейс",  color: "#3b82f6" },
  { emoji: "💰", label: "3M",    color: "#d97706" },
  { emoji: "🎫", label: "3",     color: "#b91c1c" },
  { emoji: "💰", label: "500K",  color: "#fbbf24" },
  { emoji: "💰", label: "10M",   color: "#b45309" },
];

let wheelRotation = 0;

function wheelSvg(size = 280) {
  const n = WHEEL_SECTORS.length;
  const angle = 360 / n;
  const cx = size / 2, cy = size / 2, r = size / 2 - 6;

  let paths = "";
  WHEEL_SECTORS.forEach((s, i) => {
    const startA = (i * angle - 90) * Math.PI / 180;
    const endA = ((i + 1) * angle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;

    const midA = ((i + 0.5) * angle - 90) * Math.PI / 180;
    const tx = cx + (r * 0.7) * Math.cos(midA);
    const ty = cy + (r * 0.7) * Math.sin(midA);
    paths += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff" font-family="Arial">${s.emoji}</text>`;
    const tx2 = cx + (r * 0.7) * Math.cos(midA);
    const ty2 = cy + (r * 0.7) * Math.sin(midA) + 16;
    paths += `<text x="${tx2}" y="${ty2}" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff" font-family="Arial">${s.label}</text>`;
  });

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#78350f" stroke-width="4"/>
    ${paths}
    <circle cx="${cx}" cy="${cy}" r="24" fill="#fff" stroke="#78350f" stroke-width="3"/>
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="16" fill="#78350f" font-family="Arial">🎡</text>
  </svg>`;
}

async function openWheel() {
  document.getElementById("wheelModal").classList.remove("hidden");
  document.getElementById("wheelResult") || (document.getElementById("wheelContainer").innerHTML = "");
  renderWheel();
  await refreshWheelState();
}

function renderWheel() {
  const c = document.getElementById("wheelContainer");
  c.innerHTML = `
    <div class="wheel-pointer"></div>
    <div class="wheel-svg-wrap" id="wheelSvgWrap" style="transform: rotate(${wheelRotation}deg);">${wheelSvg(260)}</div>
  `;
}

async function refreshWheelState() {
  try {
    const r = await fetch(`${API}/wheel/${user.id}`);
    const data = await r.json();
    const btn = document.getElementById("wheelSpinBtn");
    if (!data.available) {
      btn.disabled = true;
      const m = Math.floor(data.remaining_seconds / 60);
      const s = data.remaining_seconds % 60;
      btn.textContent = `Доступно через ${m}:${s.toString().padStart(2, "0")}`;
    } else {
      btn.disabled = false;
      btn.textContent = "КРУТИТЬ 🎡";
    }
  } catch (e) {}
}

function closeWheel() { document.getElementById("wheelModal").classList.add("hidden"); }

async function spinWheel() {
  const btn = document.getElementById("wheelSpinBtn");
  btn.disabled = true;

  try {
    const r = await fetch(`${API}/wheel/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    // Определяем случайную позицию (визуально) + итоговый приз
    const randomSector = Math.floor(Math.random() * WHEEL_SECTORS.length);
    const sectorAngle = 360 / WHEEL_SECTORS.length;
    const targetAngle = 360 * 6 + (360 - (randomSector * sectorAngle));

    wheelRotation += targetAngle;
    const wrap = document.getElementById("wheelSvgWrap");
    if (wrap) {
      wrap.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)";
      wrap.style.transform = `rotate(${wheelRotation}deg)`;
    }

    playSpinSound(4000);

    setTimeout(() => {
      state.balance = data.balance;
      state.tickets = data.tickets;
      render();
      playRewardSound("legendary", false);
      alert(`🎁 ${data.prize.emoji} ${data.result_text}`);
      refreshWheelState();
    }, 4200);

  } catch (e) {
    alert("Ошибка связи с сервером");
    btn.disabled = false;
  }
}


// ================== БИЛЕТНЫЙ КЕЙС ==================
function openTicketCase() { document.getElementById("ticketCaseModal").classList.remove("hidden"); }
function closeTicketCase() { document.getElementById("ticketCaseModal").classList.add("hidden"); }

async function openTicketCaseAction() {
  try {
    const r = await fetch(`${API}/ticket-case/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    state.balance = data.balance;
    state.tickets = data.tickets;
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;
    if (data.reward && data.reward.type === "car" && data.reward.car) {
      state.cars.push(data.reward.car);
    }
    render();

    playRewardSound("epic", false);
    alert(`🎫 Приз: ${data.reward.label}`);
    closeTicketCase();
  } catch (e) { alert("Ошибка связи с сервером"); }
}


// ================== РЕЙТИНГ ==================
async function openLeaderboard() {
  document.getElementById("leaderboardModal").classList.remove("hidden");
  const list = document.getElementById("leaderboardList");
  list.innerHTML = `<p style="color:#a1a1aa;text-align:center;padding:10px;">Загрузка...</p>`;
  try {
    const r = await fetch(`${API}/leaderboard`);
    const data = await r.json();
    const me = user.id;
    list.innerHTML = data.leaders.map((u, i) => {
      const place = i + 1;
      const cls = place === 1 ? "gold" : place === 2 ? "silver" : place === 3 ? "bronze" : "";
      const isMe = u.tg_id === me;
      return `<div class="lb-row ${isMe ? 'lb-me' : ''}">
        <div class="lb-place ${cls}">${place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : "#" + place}</div>
        <div class="lb-info">
          <b>${u.username} ${isMe ? "(ты)" : ""}</b>
          <small>Ур. ${u.level} • ${u.cars_count} машин</small>
        </div>
        <div class="lb-value">${Math.round(u.garage_value).toLocaleString()} ₽</div>
      </div>`;
    }).join("") || `<p style="color:#a1a1aa;text-align:center;">Пока пусто</p>`;
  } catch (e) {
    list.innerHTML = `<p style="color:#dc2626;text-align:center;">Ошибка загрузки</p>`;
  }
}
function closeLeaderboard() { document.getElementById("leaderboardModal").classList.add("hidden"); }


// ================== ИНФО ==================
function showModifierInfo() {
  const body = document.getElementById("infoBody");
  document.getElementById("infoTitle").textContent = "✨ Модификаторы";
  body.innerHTML = MODIFIERS_INFO.map(m =>
    `<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#fff;border-radius:10px;margin-bottom:6px;border:1.5px solid #f0e3c9;">
      <span style="font-weight:700;">${m.emoji} ${m.name}</span>
      <span style="color:${m.mult >= 1 ? '#16a34a' : '#dc2626'};font-weight:800;">×${m.mult.toFixed(2)}</span>
    </div>`).join("");
  document.getElementById("infoModal").classList.remove("hidden");
}

function showAbout() {
  const body = document.getElementById("infoBody");
  document.getElementById("infoTitle").textContent = "❓ О игре";
  body.innerHTML = `<p style="color:#78756c;font-size:13px;line-height:1.6;">
    <b>Выбивание машин</b> — коллекционная игра.<br><br>
    • Крути рулетку за деньги<br>
    • Открывай контейнеры с гарантией<br>
    • Крути колесо удачи (раз в 30 мин)<br>
    • Копи 🎫 билеты и открывай билетный кейс<br>
    • Меняй страну — разные марки<br>
    • Продавай дубликаты<br>
    • Повышай уровень и попадай в топ
  </p>`;
  document.getElementById("infoModal").classList.remove("hidden");
}

function closeInfo() { document.getElementById("infoModal").classList.add("hidden"); }


// ================== RENDER ==================
function renderCar(car, highlight = false) {
  const rc = RARITY_COLORS[car.rarity] || "#9ca3af";
  document.getElementById("heroCard").style.borderColor = rc;
  document.getElementById("heroCard").style.boxShadow = highlight ? `0 8px 40px ${rc}55` : "0 8px 30px rgba(180, 140, 60, 0.15)";

  const labelEl = document.getElementById("rarityLabel");
  labelEl.textContent = car.rarity ? car.rarity.toUpperCase() : "НАЖМИ ВЫБИТЬ";
  labelEl.style.color = rc;

  const svgEl = document.getElementById("heroSvg");
  svgEl.innerHTML = carSvg(car, 200);
  svgEl.className = "hero-svg " + (highlight ? "pop" : "");

  document.getElementById("heroName").innerHTML = `${car.brand || ""} ${car.model ? `<small style="color:#d97706;font-size:14px;font-weight:800;">${car.model}</small>` : ""}`;
  document.getElementById("heroModifier").innerHTML = car.modifier ? modifierBadge(car) : "";
  document.getElementById("heroInfo").textContent = car.year ? `📅 ${car.year} | 🎨 ${car.color}` : "";
  document.getElementById("heroPrice").textContent = car.price ? `💰 ${Math.round(car.price).toLocaleString()} ₽` : "";
}

function render() {
  document.getElementById("balance").textContent = Math.round(state.balance).toLocaleString();
  document.getElementById("tickets").textContent = state.tickets || 0;
  document.getElementById("level").textContent = state.level || 1;
  document.getElementById("xp").textContent = state.xp || 0;
  document.getElementById("xpNext").textContent = state.xpNext || 100;
  const pct = state.xpNext ? Math.min(100, (state.xp / state.xpNext) * 100) : 0;
  document.getElementById("xpFill").style.width = pct + "%";
}

function showXpToast(text) {
  const toast = document.createElement("div");
  toast.className = "xp-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}


// ================== ГАРАЖ ==================
function openGarage() {
  const list = document.getElementById("garageList");
  list.innerHTML = state.cars.map(c => `
    <div class="garage-item" style="border-left:4px solid ${RARITY_COLORS[c.rarity]}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="flex-shrink:0;">${carSvg(c, 100)}</div>
        <div style="flex:1;">
          <b>${c.brand}</b> ${c.model ? `<small style="color:#d97706;font-weight:800;">${c.model}</small>` : ""} ${c.year}<br>
          <small style="color:${RARITY_COLORS[c.rarity]};font-weight:800;">${c.rarity.toUpperCase()}</small>
          <small style="color:#a1a1aa;"> • ${c.color}</small><br>
          ${modifierBadge(c)}<br>
          <small style="color:#16a34a;font-weight:800;">💰 ${Math.round(c.price).toLocaleString()}</small>
        </div>
        <button class="sell-btn" onclick="sellCar(${c.id})">
          Продать<br>${Math.round(c.price * 0.7).toLocaleString()}
        </button>
      </div>
    </div>`).join("") || "<p style='color:#a1a1aa;text-align:center;padding:20px;'>Гараж пуст</p>";
  document.getElementById("garageModal").classList.remove("hidden");
}

async function sellCar(carId) {
  if (!confirm("Продать эту машину?")) return;
  try {
    const r = await fetch(`${API}/sell/${user.id}/${carId}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }
    state.cars = state.cars.filter(c => c.id !== carId);
    state.balance = data.new_balance;
    render();
    openGarage();
    playTone(880, 0.1, "sine", 0.12);
    playTone(1100, 0.15, "sine", 0.12, 0.08);
  } catch (e) { alert("Ошибка связи"); }
}

function closeGarage() { document.getElementById("garageModal").classList.add("hidden"); }


// ================== БОНУС ==================
async function claimBonus() {
  try {
    const r = await fetch(`${API}/bonus/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }
    state.balance = data.new_balance;
    render();
    playTone(660, 0.1, "sine", 0.15);
    playTone(880, 0.1, "sine", 0.15, 0.08);
    playTone(1320, 0.25, "sine", 0.18, 0.16);
    alert(`🎁 Бонус получен!\n+${data.bonus_money.toLocaleString()} ₽`);
  } catch (e) { alert("Ошибка связи"); }
}


// ================== ИНИЦИАЛИЗАЦИЯ ==================
document.getElementById("rollBtn").onclick = roll;
document.getElementById("roll5Btn").onclick = roll5;
const sBtn = document.getElementById("soundToggle");
if (sBtn) sBtn.onclick = toggleSound;

auth();
