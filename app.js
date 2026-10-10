const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API = "https://car-game-api.onrender.com/api";
const user = tg.initDataUnsafe?.user || { id: 12345, username: "test" };

let state = { balance: 0, tickets: 0, cars: [], level: 1, xp: 0, xpNext: 100 };
let currentUpgradeCarId = null;

const RARITY_COLORS = { common: "#9ca3af", rare: "#3b82f6", epic: "#a855f7", legendary: "#f59e0b" };

const COLOR_HEX = {
  "Чёрный": "#1a1a1a", "Белый": "#f5f5f5", "Серебристый": "#c0c0c0",
  "Красный": "#dc2626", "Синий": "#2563eb", "Жёлтый": "#facc15",
  "Хамелеон": "url(#chameleon)", "Матовый чёрный": "#0a0a0a",
  "Розовый": "#ec4899", "Золотой": "url(#gold)", "Радужный": "url(#rainbow)",
  "Юбилейная": "url(#gold)",
};

const CASES = [
  { id: "case50",  name: "Обычный кейс",     price: 50000,     color: "#a67c52", desc: "Дешёвые машины" },
  { id: "case250", name: "Редкий кейс",      price: 250000,    color: "#2563eb", desc: "Средние машины" },
  { id: "case500", name: "Эпический кейс",   price: 500000,    color: "#7c3aed", desc: "Хорошие машины" },
  { id: "case1m",  name: "Легендарный кейс", price: 1000000,   color: "#d97706", desc: "Премиум и спорт" },
];

const UPGRADE_PARTS_META = [
  { id: "kuzov",    name: "Кузов",     emoji: "🚙" },
  { id: "podveska", name: "Подвеска",  emoji: "⚙️" },
  { id: "dvigatel", name: "Двигатель", emoji: "🔩" },
  { id: "turbina",  name: "Турбина",   emoji: "💨" },
];

const PART_MULTS = [1, 2, 3, 5, 10];
const UPGRADE_CHANCES = [40, 27, 16, 8];
const UPGRADE_COST_PCT = [0.15, 0.30, 0.55, 0.90];

const FAKE_CARS = [
  { brand: "Lada", model: "2101", year: 1980, color: "Белый", rarity: "common", modifier: "Обычная" },
  { brand: "Renault", model: "Megane", year: 2009, color: "Синий", rarity: "common", modifier: "Царапанная" },
  { brand: "Toyota", model: "Corolla", year: 2019, color: "Серебристый", rarity: "rare", modifier: "Обычная" },
  { brand: "BMW", model: "X1", year: 2016, color: "Чёрный", rarity: "rare", modifier: "Ухоженная" },
  { brand: "Ford", model: "Mustang GT", year: 2018, color: "Красный", rarity: "epic", modifier: "Обычная" },
  { brand: "Audi", model: "RS3", year: 2024, color: "Жёлтый", rarity: "epic", modifier: "Эксклюзивная" },
  { brand: "Ferrari", model: "458 Italia", year: 2015, color: "Красный", rarity: "legendary", modifier: "Обычная" },
  { brand: "BMW", model: "M4 Competition", year: 2024, color: "Хамелеон", rarity: "legendary", modifier: "Юбилейная №1" },
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
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch (e) {}
  audioUnlocked = true;
}
["touchstart","touchend","click","mousedown"].forEach(e => document.addEventListener(e, unlockAudio, { once: true, passive: true }));

function playTone(freq, dur, type = "sine", vol = 0.15, delay = 0) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) {}
}

function playTick() {
  if (!soundEnabled) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.value = 1400;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    o.start(t); o.stop(t + 0.045);
  } catch (e) {}
}

function playSpinSound(duration = 4000) {
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed >= duration) return;
    playTick();
    const p = elapsed / duration;
    setTimeout(tick, 45 + Math.pow(p, 2.8) * 380);
  };
  tick();
}

function playRewardSound(rarity, special = false) {
  if (special) {
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
  const b = document.getElementById("soundToggle");
  if (!b) return;
  b.textContent = soundEnabled ? "🔊" : "🔇";
  b.classList.toggle("off", !soundEnabled);
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
  if (rarity === "legendary") glow = `<ellipse cx="115" cy="100" rx="105" ry="48" fill="url(#glow_${uid})"/>`;
  else if (rarity === "epic") glow = `<ellipse cx="115" cy="100" rx="95" ry="42" fill="url(#glow_${uid})" opacity="0.5"/>`;

  let body = "";
  if (rarity === "common") {
    body = `
      <path d="M 28 92 L 48 62 L 90 55 L 130 55 L 172 62 L 192 92 L 192 110 L 28 110 Z" fill="${bodyColor}" stroke="#1a1a1a" stroke-width="1.8"/>
      <path d="M 58 90 L 76 66 L 130 66 L 146 90 Z" fill="url(#glass_${uid})" opacity="0.9"/>
      <line x1="90" y1="66" x2="90" y2="90" stroke="#1a1a1a" stroke-width="1" opacity="0.5"/>
      <rect x="34" y="94" width="10" height="6" rx="1.5" fill="#fbbf24" stroke="#78350f" stroke-width="0.8"/>
      <rect x="176" y="94" width="10" height="6" rx="1.5" fill="#fff" stroke="#666" stroke-width="0.8"/>
      <rect x="36" y="100" width="152" height="2" fill="#000" opacity="0.15"/>
      <rect x="180" y="88" width="10" height="4" rx="1" fill="#dc2626"/>`;
  } else if (rarity === "rare") {
    body = `
      <path d="M 22 98 L 52 72 L 100 62 L 148 62 L 188 76 L 198 98 L 198 112 L 22 112 Z" fill="${bodyColor}" stroke="#1a1a1a" stroke-width="1.8"/>
      <path d="M 62 94 L 84 72 L 138 72 L 154 94 Z" fill="url(#glass_${uid})" opacity="0.9"/>
      <line x1="100" y1="72" x2="100" y2="94" stroke="#1a1a1a" stroke-width="1" opacity="0.5"/>
      <rect x="18" y="90" width="18" height="4" rx="1" fill="#111"/>
      <rect x="24" y="94" width="3" height="12" fill="#111"/>
      <rect x="186" y="92" width="12" height="5" rx="2" fill="#fff" stroke="#666" stroke-width="0.8"/>
      <rect x="30" y="100" width="150" height="2" fill="#000" opacity="0.2"/>`;
  } else if (rarity === "epic") {
    body = `
      <path d="M 18 102 L 54 76 L 106 64 L 152 64 L 196 80 L 202 102 L 202 115 L 18 115 Z" fill="${bodyColor}" stroke="#1a1a1a" stroke-width="1.8"/>
      <path d="M 68 98 L 94 74 L 142 74 L 158 98 Z" fill="url(#glass_${uid})" opacity="0.9"/>
      <line x1="108" y1="74" x2="108" y2="98" stroke="#1a1a1a" stroke-width="1" opacity="0.5"/>
      <rect x="16" y="86" width="22" height="5" rx="1" fill="#111"/>
      <rect x="22" y="91" width="3" height="14" fill="#111"/>
      <path d="M 190 86 L 202 90 L 202 96 L 190 92 Z" fill="#fff" stroke="#666" stroke-width="0.8"/>
      <circle cx="30" cy="105" r="3" fill="#dc2626"/>
      <rect x="25" y="102" width="145" height="2" fill="#000" opacity="0.2"/>`;
  } else {
    body = `
      <path d="M 14 106 L 54 78 L 112 64 L 162 66 L 200 84 L 206 106 L 206 118 L 14 118 Z" fill="${bodyColor}" stroke="#1a1a1a" stroke-width="1.8"/>
      <path d="M 74 102 L 106 76 L 146 76 L 162 102 Z" fill="url(#glass_${uid})" opacity="0.95"/>
      <line x1="118" y1="76" x2="118" y2="102" stroke="#1a1a1a" stroke-width="1" opacity="0.5"/>
      <rect x="10" y="82" width="32" height="6" rx="2" fill="#111"/>
      <rect x="20" y="88" width="4" height="16" fill="#111"/>
      <circle cx="20" cy="106" r="3.5" fill="#f59e0b"/>
      <path d="M 192 90 L 206 94 L 206 100 L 192 96 Z" fill="#fff" stroke="#666" stroke-width="0.8"/>
      <rect x="20" y="106" width="160" height="2" fill="#000" opacity="0.25"/>`;
  }

  // Двери и ручки для детализации
  const details = `
    <line x1="88" y1="70" x2="88" y2="108" stroke="#000" stroke-width="0.6" opacity="0.4"/>
    <line x1="140" y1="70" x2="140" y2="108" stroke="#000" stroke-width="0.6" opacity="0.4"/>
    <circle cx="92" cy="88" r="1.5" fill="#666"/>
    <circle cx="136" cy="88" r="1.5" fill="#666"/>`;

  const wheels = `
    <circle cx="68" cy="112" r="15" fill="#1a1a1a"/>
    <circle cx="68" cy="112" r="10" fill="#333"/>
    <circle cx="68" cy="112" r="5" fill="#888"/>
    <line x1="68" y1="102" x2="68" y2="122" stroke="#666" stroke-width="0.8"/>
    <line x1="58" y1="112" x2="78" y2="112" stroke="#666" stroke-width="0.8"/>
    <circle cx="162" cy="112" r="15" fill="#1a1a1a"/>
    <circle cx="162" cy="112" r="10" fill="#333"/>
    <circle cx="162" cy="112" r="5" fill="#888"/>
    <line x1="162" y1="102" x2="162" y2="122" stroke="#666" stroke-width="0.8"/>
    <line x1="152" y1="112" x2="172" y2="112" stroke="#666" stroke-width="0.8"/>`;

  // Дефекты
  let defects = "";
  if (modifier === "Ржавая") {
    defects = `
      <circle cx="55" cy="80" r="6" fill="#6b3410" opacity="0.8"/>
      <circle cx="118" cy="75" r="5" fill="#6b3410" opacity="0.7"/>
      <circle cx="160" cy="98" r="7" fill="#6b3410" opacity="0.8"/>
      <circle cx="85" cy="102" r="4" fill="#6b3410" opacity="0.6"/>
      <circle cx="140" cy="88" r="5" fill="#6b3410" opacity="0.7"/>
      <circle cx="100" cy="85" r="3" fill="#8B4513" opacity="0.5"/>`;
  } else if (modifier === "Мятая") {
    defects = `
      <path d="M 42 62 L 54 70 L 48 78 L 60 84" stroke="#000" stroke-width="2.5" fill="none" opacity="0.6"/>
      <path d="M 138 65 L 150 73 L 143 82" stroke="#000" stroke-width="2.5" fill="none" opacity="0.6"/>
      <path d="M 90 55 L 100 62 L 94 70" stroke="#000" stroke-width="2" fill="none" opacity="0.5"/>`;
  } else if (modifier === "Царапанная") {
    defects = `
      <line x1="52" y1="70" x2="76" y2="98" stroke="#fff" stroke-width="1.2" opacity="0.7"/>
      <line x1="58" y1="70" x2="82" y2="98" stroke="#fff" stroke-width="1" opacity="0.5"/>
      <line x1="120" y1="75" x2="148" y2="100" stroke="#fff" stroke-width="1.2" opacity="0.7"/>
      <line x1="126" y1="78" x2="154" y2="103" stroke="#fff" stroke-width="1" opacity="0.5"/>`;
  } else if (modifier === "Грязная") {
    defects = `
      <ellipse cx="72" cy="106" rx="22" ry="6" fill="#4a3520" opacity="0.5"/>
      <ellipse cx="162" cy="108" rx="16" ry="5" fill="#4a3520" opacity="0.5"/>
      <circle cx="100" cy="76" r="9" fill="#4a3520" opacity="0.3"/>
      <circle cx="55" cy="88" r="7" fill="#4a3520" opacity="0.35"/>`;
  } else if (modifier === "Граффити") {
    defects = `
      <text x="65" y="88" font-size="16" font-weight="bold" fill="#ec4899" opacity="0.85" font-family="Arial" transform="rotate(-5 65 88)">A$AP</text>
      <text x="140" y="106" font-size="11" font-weight="bold" fill="#22d3ee" opacity="0.85" font-family="Arial">420</text>`;
  } else if (modifier === "Ухоженная") {
    defects = `
      <circle cx="48" cy="66" r="3.5" fill="#fff" opacity="0.95"/>
      <circle cx="95" cy="60" r="2.5" fill="#fff" opacity="0.95"/>
      <circle cx="148" cy="63" r="3" fill="#fff" opacity="0.95"/>
      <circle cx="170" cy="95" r="2" fill="#fff" opacity="0.8"/>`;
  } else if (modifier === "Эксклюзивная") {
    defects = `
      <path d="M 48 54 L 54 62 L 46 70" stroke="#fbbf24" stroke-width="2" fill="none"/>
      <circle cx="100" cy="56" r="2.5" fill="#fbbf24"/>
      <circle cx="150" cy="56" r="2" fill="#fbbf24"/>`;
  } else if (modifier === "Юбилейная №1" || modifier === "Коллекционная") {
    defects = `
      <text x="115" y="82" font-size="24" font-weight="bold" fill="#fbbf24" font-family="Arial" text-anchor="middle">№1</text>
      <circle cx="105" cy="58" r="3.5" fill="#fbbf24"/>
      <circle cx="128" cy="58" r="2.5" fill="#fbbf24"/>`;
  }

  return `
    <svg viewBox="0 0 230 130" width="${size}" height="${size * 0.565}" xmlns="http://www.w3.org/2000/svg">
      ${defs}${glow}${body}${details}${defects}${wheels}
    </svg>`;
}


// ================== SVG КЕЙСОВ ==================
function caseSvg(caseId, size = 72) {
  const MAP = {
    case50: { c1: "#d4a373", c2: "#a67c52", border: "#6b4423", glow: "#fbbf24" },
    case250: { c1: "#60a5fa", c2: "#1d4ed8", border: "#0f172a", glow: "#93c5fd" },
    case500: { c1: "#a855f7", c2: "#6d28d9", border: "#3b0764", glow: "#c084fc" },
    case1m: { c1: "#fbbf24", c2: "#b45309", border: "#78350f", glow: "#fde68a" },
  };
  const cfg = MAP[caseId] || MAP.case50;
  const uid = "c" + Math.random().toString(36).substring(2, 8);

  return `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cg_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${cfg.c1}"/><stop offset="100%" stop-color="${cfg.c2}"/>
        </linearGradient>
        <radialGradient id="cglow_${uid}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${cfg.glow}" stop-opacity="0.6"/><stop offset="100%" stop-color="${cfg.glow}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="65" rx="45" ry="35" fill="url(#cglow_${uid})"/>
      <rect x="15" y="40" width="70" height="50" fill="url(#cg_${uid})" stroke="${cfg.border}" stroke-width="2.5" rx="4"/>
      <path d="M 15 40 L 50 20 L 85 40 L 50 60 Z" fill="${cfg.c1}" stroke="${cfg.border}" stroke-width="2.5"/>
      <line x1="50" y1="20" x2="50" y2="60" stroke="${cfg.border}" stroke-width="1.5"/>
      <rect x="42" y="70" width="16" height="8" rx="2" fill="${cfg.glow}" stroke="${cfg.border}" stroke-width="1"/>
      <circle cx="50" cy="74" r="2" fill="${cfg.border}"/>
    </svg>`;
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
    state = await r.json();
    if (!state.cars) state.cars = [];
    render();
    updateSoundUI();
  } catch (e) { console.log("Backend error", e); }
}


// ================== РУЛЕТКА ==================
let _rouletteSkipFn = null;

function skipRouletteAnim() {
  if (_rouletteSkipFn) _rouletteSkipFn();
}

function showRoulette(winner) {
  return new Promise(resolve => {
    const overlay = document.getElementById("rouletteOverlay");
    const track = document.getElementById("rouletteTrack");
    const skipBtn = document.getElementById("rouletteSkip");
    const ITEM_W = 140, TOTAL = 42, WINNER_POS = 36;
    const items = [];
    for (let i = 0; i < TOTAL; i++) {
      if (i === WINNER_POS) items.push(winner);
      else items.push(FAKE_CARS[Math.floor(Math.random() * FAKE_CARS.length)]);
    }
    track.innerHTML = items.map(c => `
      <div class="roulette-item" style="border-color:${RARITY_COLORS[c.rarity]};">
        ${carSvg(c, 105)}
        <div class="roulette-name">${c.brand}</div>
      </div>`).join("");

    overlay.classList.remove("hidden");
    if (skipBtn) skipBtn.style.display = "block";
    track.style.transition = "none";
    track.style.transform = "translateX(0)";
    void track.offsetWidth;

    const windowEl = overlay.querySelector(".roulette-window");
    const centerW = windowEl.offsetWidth / 2;
    const targetCenter = ITEM_W * WINNER_POS + ITEM_W / 2;
    const jitter = (Math.random() - 0.5) * (ITEM_W * 0.5);
    const finalX = -(targetCenter - centerW + jitter);

    let finished = false;
    let timeoutId = null;
    let tickTimeoutId = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (tickTimeoutId) clearTimeout(tickTimeoutId);
      overlay.classList.add("hidden");
      track.style.transition = "none";
      if (skipBtn) skipBtn.style.display = "none";
      _rouletteSkipFn = null;
      playRewardSound(winner.rarity, false);
      resolve();
    };

    _rouletteSkipFn = finish;
    if (skipBtn) skipBtn.onclick = finish;

    // Звук крутки с возможностью прервать
    const startTime = performance.now();
    const tickLoop = () => {
      if (finished) return;
      const elapsed = performance.now() - startTime;
      if (elapsed >= 4000) return;
      playTick();
      const p = elapsed / 4000;
      const nextInterval = 45 + Math.pow(p, 2.8) * 380;
      tickTimeoutId = setTimeout(tickLoop, nextInterval);
    };
    tickLoop();

    track.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)";
    track.style.transform = `translateX(${finalX}px)`;

    timeoutId = setTimeout(finish, 4200);
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
    await showRoulette(data.car);
    state.balance = data.balance;
    state.cars.push(data.car);
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;
    renderCar(data.car, true);
    render();
    if (data.xp_gained) showXpToast(`+${data.xp_gained} XP`);
  } catch (e) { alert("Ошибка связи"); }
  finally { btn.disabled = false; }
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
  } catch (e) { alert("Ошибка связи"); }
  finally { btn.disabled = false; }
}

async function openCase(caseId, count = 1) {
  const c = CASES.find(x => x.id === caseId);
  const total = c.price * count;
  if (!confirm(`Открыть «${c.name}» ×${count} за ${total.toLocaleString()} ₽?`)) return;
  try {
    const r = await fetch(`${API}/case/${user.id}/${caseId}?count=${count}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    // Рулетка только для 1 кейса. Для ×5 — сразу результат.
    if (count === 1) {
      await showRoulette(data.car);
    }

    state.balance = data.balance;
    data.cars.forEach(cc => state.cars.push(cc));
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;
    render();

    if (count === 1) {
      renderCar(data.car, true);
      showContainerResult(data.car);
    } else {
      renderCar(data.cars[data.cars.length - 1], true);
      showRollResults(data.cars, data.xp_gained);
    }
    if (data.xp_gained) showXpToast(`+${data.xp_gained} XP`);
  } catch (e) { alert("Ошибка связи"); }
}


// ================== АПГРЕЙД ==================
function openUpgrade(carId) {
  const car = state.cars.find(c => c.id === carId);
  if (!car) return;
  currentUpgradeCarId = carId;
  document.getElementById("upgradeModal").classList.remove("hidden");
  renderUpgradeModal();
}

function renderUpgradeModal() {
  const car = state.cars.find(c => c.id === currentUpgradeCarId);
  if (!car) return;

  document.getElementById("upgradeCarInfo").innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:12px;border:1.5px solid #f0e3c9;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="flex-shrink:0;">${carSvg(car, 90)}</div>
        <div style="flex:1;text-align:right;">
          <b>${car.brand} ${car.model}</b><br>
          <small style="color:#a1a1aa;">📅 ${car.year} • ${car.color}</small><br>
          <div style="margin-top:4px;">${modifierBadge(car)}</div>
          <div style="margin-top:6px;">
            <span style="color:#16a34a;font-weight:800;font-size:16px;">💰 ${Math.round(car.price).toLocaleString()} ₽</span><br>
            <small style="color:#d97706;font-weight:800;">×${car.multiplier} от базы</small>
          </div>
        </div>
      </div>
    </div>`;

  let html = "";
  UPGRADE_PARTS_META.forEach(p => {
    const lvl = car[p.id + "_lvl"] || 0;
    const maxed = lvl >= 4;
    const cost = Math.round(car.base_price * UPGRADE_COST_PCT[lvl]);
    const chance = UPGRADE_CHANCES[lvl];
    const nextMult = maxed ? null : PART_MULTS[lvl + 1];

    let segs = "";
    for (let i = 0; i < 4; i++) {
      segs += `<div class="upg-bar-seg ${i < lvl ? 'filled' : ''}"></div>`;
    }

    html += `
      <div class="upgrade-part-row">
        <div class="upg-head">
          <div class="upg-name">${p.emoji} ${p.name}</div>
          <div class="upg-lvl">×${PART_MULTS[lvl]}</div>
        </div>
        <div class="upg-bar">${segs}</div>
        ${maxed
          ? `<button class="upg-btn-full" disabled>МАКСИМУМ</button>`
          : `<button class="upg-btn-full" onclick="doUpgrade('${p.id}')">
              Прокачать до ×${nextMult} • ${chance}% • ${cost.toLocaleString()} ₽
            </button>`
        }
      </div>`;
  });
  document.getElementById("upgradeParts").innerHTML = html;
}

async function doUpgrade(part) {
  try {
    const r = await fetch(`${API}/upgrade/${user.id}/${currentUpgradeCarId}/${part}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    state.balance = data.balance;
    const idx = state.cars.findIndex(c => c.id === currentUpgradeCarId);
    if (idx >= 0) state.cars[idx] = data.car;

    render();
    renderUpgradeModal();

    if (data.success) {
      playRewardSound("epic", false);
      alert(`✅ Успех! ${part} → ×${PART_MULTS[data.new_level]}`);
    } else {
      playTone(200, 0.3, "sawtooth", 0.15);
      alert("❌ Провал. Уровень не поднялся");
    }
  } catch (e) { alert("Ошибка связи"); }
}

function closeUpgrade() {
  document.getElementById("upgradeModal").classList.add("hidden");
  currentUpgradeCarId = null;
  openGarage();
}


// ================== ГАРАЖ ==================
function openGarage() {
  const list = document.getElementById("garageList");
  if (!state.cars.length) {
    list.innerHTML = "<p style='color:#a1a1aa;text-align:center;padding:20px;'>Гараж пуст</p>";
  } else {
    list.innerHTML = state.cars.map(c => `
      <div class="garage-item" style="border-left:4px solid ${RARITY_COLORS[c.rarity]}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="flex-shrink:0;">${carSvg(c, 90)}</div>
          <div style="flex:1;">
            <b>${c.brand}</b> ${c.model} ${c.year}<br>
            <small style="color:${RARITY_COLORS[c.rarity]};font-weight:800;">${c.rarity.toUpperCase()}</small>
            <small style="color:#a1a1aa;"> • ${c.color}</small><br>
            ${modifierBadge(c)}<br>
            <small style="color:#16a34a;font-weight:800;">💰 ${Math.round(c.price).toLocaleString()} ₽ • ×${c.multiplier}</small>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="sell-btn" onclick="sellCar(${c.id})">Продать<br>${Math.round(c.price * 0.7).toLocaleString()}</button>
            <button class="upg-btn" onclick="openUpgrade(${c.id})">🔧 Апгрейд</button>
          </div>
        </div>
      </div>`).join("");
  }
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

async function sellAll() {
  if (!state.cars.length) { alert("Гараж пуст"); return; }
  if (!confirm(`Продать ВСЕ ${state.cars.length} машин за 70%?`)) return;
  try {
    const r = await fetch(`${API}/sell-all/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }
    state.cars = [];
    state.balance = data.new_balance;
    render();
    openGarage();
    alert(`💸 Продано ${data.sold_count} машин за ${Math.round(data.sold_total).toLocaleString()} ₽`);
  } catch (e) { alert("Ошибка связи"); }
}

function closeGarage() { document.getElementById("garageModal").classList.add("hidden"); }


// ================== РЕЗУЛЬТАТЫ ==================
function showRollResults(cars, totalXp) {
  const list = document.getElementById("rollResultsList");
  const xpEl = document.getElementById("rollResultsXp");
  list.innerHTML = cars.map(c => {
    const rc = RARITY_COLORS[c.rarity];
    return `<div style="padding:10px;margin-bottom:8px;border-radius:12px;background:#fff;border-left:4px solid ${rc};border:1.5px solid #f0e3c9;display:flex;justify-content:space-between;align-items:center;gap:10px;">
      <div style="flex-shrink:0;">${carSvg(c, 85)}</div>
      <div style="flex:1;text-align:right;">
        <b>${c.brand} ${c.model}</b><br>
        <small style="color:#a1a1aa;">${c.year} • ${c.color}</small><br>
        <small style="color:${rc};font-size:10px;font-weight:800;">${c.rarity.toUpperCase()}</small><br>
        ${modifierBadge(c)}<br>
        <span style="color:#16a34a;font-weight:800;font-size:13px;">${Math.round(c.price).toLocaleString()} ₽</span>
      </div></div>`;
  }).join("");
  xpEl.textContent = `+${totalXp} XP`;
  document.getElementById("rollResultsModal").classList.remove("hidden");
}
function closeRollResults() { document.getElementById("rollResultsModal").classList.add("hidden"); }

function showContainerResult(car, special) {
  const box = document.getElementById("containerResultBox");
  const rc = RARITY_COLORS[car.rarity];
  box.innerHTML = `
    <div style="text-align:center;padding:16px;border-radius:16px;background:#fff;border:2px solid ${rc};box-shadow:0 0 25px ${rc}30;">
      <div style="color:${rc};font-size:12px;font-weight:800;letter-spacing:2px;margin-bottom:8px;">${car.rarity.toUpperCase()}</div>
      <div style="display:flex;justify-content:center;margin:10px 0;">${carSvg(car, 220)}</div>
      <div style="font-size:22px;font-weight:800;color:#1f2937;">${car.brand} ${car.model}</div>
      <div style="margin:8px 0;">${modifierBadge(car)}</div>
      <div style="color:#78716c;font-size:13px;">📅 ${car.year} • 🎨 ${car.color}</div>
      <div style="color:#16a34a;font-size:20px;font-weight:800;margin-top:8px;">💰 ${Math.round(car.price).toLocaleString()}</div>
    </div>`;
  document.getElementById("containerResultModal").classList.remove("hidden");
}
function closeContainerResult() { document.getElementById("containerResultModal").classList.add("hidden"); }


// ================== МЕНЮ ==================
function openShop() {
  const list = document.getElementById("containersList");
  list.innerHTML = CASES.map(c => `
    <div class="case-block">
      <div class="case-head">
        <div class="case-visual">${caseSvg(c.id, 70)}</div>
        <div class="case-info">
          <b style="color:${c.color};">${c.name}</b>
          <small>${c.desc}</small>
        </div>
        <div class="case-price">${c.price.toLocaleString()} ₽</div>
      </div>
      <div class="case-actions">
        <button class="case-buy case-buy-x1" onclick="openCase('${c.id}', 1)">
          Открыть ×1
          <small>${c.price.toLocaleString()} ₽</small>
        </button>
        <button class="case-buy case-buy-x5" onclick="openCase('${c.id}', 5)">
          Открыть ×5
          <small>${(c.price * 5).toLocaleString()} ₽</small>
        </button>
      </div>
    </div>`).join("");
  document.getElementById("shopModal").classList.remove("hidden");
}
function closeShop() { document.getElementById("shopModal").classList.add("hidden"); }


// ================== КОЛЕСО ==================
const WHEEL_SECTORS = [
  { emoji: "💰", label: "30K",  color: "#fbbf24" },
  { emoji: "🎫", label: "1",    color: "#dc2626" },
  { emoji: "💰", label: "60K",  color: "#f59e0b" },
  { emoji: "📦", label: "Кейс", color: "#3b82f6" },
  { emoji: "💰", label: "120K", color: "#d97706" },
  { emoji: "🎫", label: "3",    color: "#b91c1c" },
  { emoji: "💰", label: "30K",  color: "#fbbf24" },
  { emoji: "💰", label: "400K", color: "#b45309" },
];
let wheelRotation = 0;

function wheelSvg(size = 260) {
  const n = WHEEL_SECTORS.length;
  const angle = 360 / n;
  const cx = size / 2, cy = size / 2, r = size / 2 - 6;

  let paths = "";
  WHEEL_SECTORS.forEach((s, i) => {
    const a1 = (i * angle - 90) * Math.PI / 180;
    const a2 = ((i + 1) * angle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
    const midA = ((i + 0.5) * angle - 90) * Math.PI / 180;
    const tx = cx + (r * 0.65) * Math.cos(midA), ty = cy + (r * 0.65) * Math.sin(midA);
    paths += `<text x="${tx}" y="${ty + 6}" text-anchor="middle" font-size="18" fill="#fff" font-family="Arial">${s.emoji}</text>`;
    const tx2 = cx + (r * 0.65) * Math.cos(midA), ty2 = cy + (r * 0.65) * Math.sin(midA) + 18;
    paths += `<text x="${tx2}" y="${ty2}" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff" font-family="Arial">${s.label}</text>`;
  });

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#78350f" stroke-width="4"/>
    ${paths}
    <circle cx="${cx}" cy="${cy}" r="26" fill="#fff" stroke="#78350f" stroke-width="3"/>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="22" fill="#78350f" font-family="Arial">🎡</text>
  </svg>`;
}

function openWheel() {
  document.getElementById("wheelModal").classList.remove("hidden");
  document.getElementById("wheelContainer").innerHTML = `
    <div class="wheel-pointer"></div>
    <div class="wheel-svg-wrap" id="wheelSvgWrap" style="transform: rotate(${wheelRotation}deg);">${wheelSvg(260)}</div>`;
  refreshWheelState();
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
    if (!r.ok) { alert(data.detail || "Ошибка"); btn.disabled = false; return; }

    const randomSector = Math.floor(Math.random() * WHEEL_SECTORS.length);
    const sectorAngle = 360 / WHEEL_SECTORS.length;
    const targetAngle = 360 * 6 + (360 - randomSector * sectorAngle);
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
      alert(`🎁 ${data.result_text}`);
      refreshWheelState();
    }, 4200);
  } catch (e) { alert("Ошибка связи"); btn.disabled = false; }
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
    alert(`🎫 ${data.reward.label}`);
    closeTicketCase();
  } catch (e) { alert("Ошибка связи"); }
}


// ================== РЕЙТИНГ ==================
async function openLeaderboard() {
  document.getElementById("leaderboardModal").classList.remove("hidden");
  const list = document.getElementById("leaderboardList");
  list.innerHTML = `<p style="color:#a1a1aa;text-align:center;padding:10px;">Загрузка...</p>`;
  try {
    const r = await fetch(`${API}/leaderboard`);
    const data = await r.json();
    list.innerHTML = data.leaders.map((u, i) => {
      const p = i + 1;
      const cls = p === 1 ? "gold" : p === 2 ? "silver" : p === 3 ? "bronze" : "";
      const isMe = u.tg_id === user.id;
      return `<div class="lb-row ${isMe ? 'lb-me' : ''}">
        <div class="lb-place ${cls}">${p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : "#" + p}</div>
        <div class="lb-info"><b>${u.username} ${isMe ? "(ты)" : ""}</b><small>Ур. ${u.level} • ${u.cars_count} машин</small></div>
        <div class="lb-value">${Math.round(u.garage_value).toLocaleString()} ₽</div>
      </div>`;
    }).join("") || `<p style="color:#a1a1aa;text-align:center;">Пока пусто</p>`;
  } catch (e) { list.innerHTML = `<p style="color:#dc2626;text-align:center;">Ошибка</p>`; }
}
function closeLeaderboard() { document.getElementById("leaderboardModal").classList.add("hidden"); }


// ================== ИНФО ==================
function showModifierInfo() {
  document.getElementById("infoTitle").textContent = "✨ Модификаторы";
  document.getElementById("infoBody").innerHTML = MODIFIERS_INFO.map(m =>
    `<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#fff;border-radius:10px;margin-bottom:6px;border:1.5px solid #f0e3c9;">
      <span style="font-weight:700;">${m.emoji} ${m.name}</span>
      <span style="color:${m.mult >= 1 ? '#16a34a' : '#dc2626'};font-weight:800;">×${m.mult.toFixed(2)}</span>
    </div>`).join("");
  document.getElementById("infoModal").classList.remove("hidden");
}

function showAbout() {
  document.getElementById("infoTitle").textContent = "❓ О игре";
  document.getElementById("infoBody").innerHTML = `<p style="color:#78756c;font-size:13px;line-height:1.6;">
    <b>Выбивание машин</b><br><br>
    • Крути рулетку за 30 000 ₽<br>
    • Открывай кейсы (50К–1М)<br>
    • Колесо удачи раз в 30 мин<br>
    • Копи 🎫 билеты<br>
    • Прокачивай машины (🔧 Апгрейд)<br>
    • Продавай дубликаты<br>
    • Поднимайся в топ
  </p>`;
  document.getElementById("infoModal").classList.remove("hidden");
}
function closeInfo() { document.getElementById("infoModal").classList.add("hidden"); }


// ================== RENDER ==================
function renderCar(car, highlight = false) {
  const rc = RARITY_COLORS[car.rarity] || "#9ca3af";
  document.getElementById("heroCard").style.borderColor = rc;
  document.getElementById("heroCard").style.boxShadow = highlight ? `0 8px 40px ${rc}55` : "0 8px 30px rgba(180, 140, 60, 0.15)";

  const label = document.getElementById("rarityLabel");
  label.textContent = car.rarity ? car.rarity.toUpperCase() : "НАЖМИ КРУТИТЬ";
  label.style.color = rc;

  const svg = document.getElementById("heroSvg");
  svg.innerHTML = carSvg(car, 200);
  svg.className = "hero-svg " + (highlight ? "pop" : "");

  document.getElementById("heroName").textContent = `${car.brand} ${car.model}`;
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
  const t = document.createElement("div");
  t.className = "xp-toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}


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
    alert(`🎁 +${data.bonus_money.toLocaleString()} ₽`);
  } catch (e) { alert("Ошибка связи"); }
}


// ================== INIT ==================
document.getElementById("rollBtn").onclick = roll;
document.getElementById("roll5Btn").onclick = roll5;
const sb = document.getElementById("soundToggle");
if (sb) sb.onclick = toggleSound;

auth();
