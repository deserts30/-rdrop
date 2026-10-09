// ================== МЯГКАЯ БЛОКИРОВКА ЗУМА ==================
(function blockZoom() {
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  document.addEventListener("touchmove", function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  document.addEventListener("gesturestart", e => e.preventDefault());
  document.addEventListener("gesturechange", e => e.preventDefault());

  document.addEventListener("wheel", function (e) {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });
})();


// ================== TELEGRAM ==================
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API = "https://car-game-api.onrender.com/api";
const user = tg.initDataUnsafe?.user || { id: 12345, username: "test" };

let state = { balance: 0, energy: 0, cars: [], level: 1, xp: 0, xpNext: 100, country: "germany" };
let countriesMap = {};

const RARITY_COLORS = {
  common: "#9ca3af",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

const COLOR_HEX = {
  "Чёрный": "#1a1a1a",
  "Белый": "#f5f5f5",
  "Серебристый": "#c0c0c0",
  "Красный": "#dc2626",
  "Синий": "#2563eb",
  "Жёлтый": "#facc15",
  "Хамелеон": "url(#chameleon)",
  "Матовый чёрный": "#0a0a0a",
  "Розовый": "#ec4899",
  "Золотой": "url(#gold)",
  "Радужный": "url(#rainbow)",
  "Юбилейная": "url(#gold)",
};

const CONTAINERS = [
  { id: "common", name: "Обычный контейнер", price: 10000, chances: "Л: 0.3% / Э: 2.7%", color: "#9ca3af" },
  { id: "rare", name: "Редкий контейнер", price: 30000, chances: "Л: 2% / Э: 10%", color: "#3b82f6" },
  { id: "epic", name: "Эпический контейнер", price: 100000, chances: "Л: 5% / Э: 35%", color: "#a855f7" },
  { id: "legendary", name: "Легендарный контейнер", price: 300000, chances: "Л: 20% / Э: 55%", color: "#f59e0b" },
  { id: "elite", name: "Элитный контейнер", price: 1000000, chances: "Л: 65% + эксклюзив", color: "#ec4899" },
];

const FAKE_CARS = [
  { brand: "Lada", year: 2010, color: "Белый", rarity: "common", modifier: "Обычная" },
  { brand: "Ford", year: 2015, color: "Синий", rarity: "common", modifier: "Грязная" },
  { brand: "Toyota", year: 2018, color: "Серебристый", rarity: "common", modifier: "Царапанная" },
  { brand: "BMW", year: 2020, color: "Чёрный", rarity: "rare", modifier: "Ухоженная" },
  { brand: "Audi", year: 2021, color: "Красный", rarity: "rare", modifier: "Обычная" },
  { brand: "Mercedes", year: 2019, color: "Чёрный", rarity: "rare", modifier: "Обычная" },
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
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
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
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 200;
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  } catch (e) {}
  audioUnlocked = true;
}

["touchstart", "touchend", "click", "mousedown", "keydown"].forEach(evt => {
  document.addEventListener(evt, function once() {
    unlockAudio();
    document.removeEventListener(evt, once);
  }, { once: true });
});

function playTone(freq, duration, type = "sine", volume = 0.15, delay = 0) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch (e) {}
}

function playTick() {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1400;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.start(t);
    osc.stop(t + 0.045);
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
    playTone(523, 0.15, "triangle", 0.20);
    playTone(659, 0.15, "triangle", 0.20, 0.10);
    playTone(784, 0.15, "triangle", 0.20, 0.20);
    playTone(1047, 0.15, "triangle", 0.22, 0.30);
    playTone(1319, 0.15, "triangle", 0.22, 0.40);
    playTone(1568, 0.7, "triangle", 0.25, 0.50);
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
  if (soundEnabled) {
    unlockAudio();
    playTone(660, 0.1, "sine", 0.15);
  }
}


// ================== SVG ==================
function carSvg(car, size = 220) {
  const color = COLOR_HEX[car.color] || "#888";
  const rarity = car.rarity;
  const uid = "u" + Math.random().toString(36).substring(2, 8);

  let bodyColor = color;
  if (color === "url(#chameleon)") bodyColor = `url(#chameleon_${uid})`;
  else if (color === "url(#gold)") bodyColor = `url(#gold_${uid})`;
  else if (color === "url(#rainbow)") bodyColor = `url(#rainbow_${uid})`;

  const defs = `
    <defs>
      <linearGradient id="chameleon_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#22d3ee"/>
        <stop offset="50%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <linearGradient id="gold_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef3c7"/>
        <stop offset="50%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
      <linearGradient id="rainbow_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ef4444"/>
        <stop offset="25%" stop-color="#fbbf24"/>
        <stop offset="50%" stop-color="#22c55e"/>
        <stop offset="75%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
      <linearGradient id="glass_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#1e40af" stop-opacity="0.7"/>
      </linearGradient>
      <radialGradient id="glow_${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${RARITY_COLORS[rarity]}" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="${RARITY_COLORS[rarity]}" stop-opacity="0"/>
      </radialGradient>
    </defs>
  `;

  let glow = "";
  if (rarity === "legendary") {
    glow = `<ellipse cx="110" cy="100" rx="100" ry="45" fill="url(#glow_${uid})"/>`;
  } else if (rarity === "epic") {
    glow = `<ellipse cx="110" cy="100" rx="90" ry="40" fill="url(#glow_${uid})" opacity="0.5"/>`;
  }

  let body = "";
  if (rarity === "common") {
    body = `
      <path d="M 30 90 L 50 60 L 90 55 L 130 55 L 170 60 L 190 90 L 190 110 L 30 110 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 60 88 L 75 65 L 130 65 L 145 88 Z" fill="url(#glass_${uid})" opacity="0.85"/>
      <rect x="178" y="82" width="12" height="6" rx="2" fill="#fef3c7"/>
      <rect x="30" y="82" width="10" height="6" rx="2" fill="#dc2626"/>
    `;
  } else if (rarity === "rare") {
    body = `
      <path d="M 25 95 L 55 70 L 100 62 L 145 62 L 185 75 L 195 95 L 195 110 L 25 110 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 65 92 L 85 72 L 135 72 L 150 92 Z" fill="url(#glass_${uid})" opacity="0.85"/>
      <rect x="22" y="90" width="15" height="4" rx="1" fill="#111"/>
      <rect x="184" y="88" width="11" height="5" rx="2" fill="#fef3c7"/>
    `;
  } else if (rarity === "epic") {
    body = `
      <path d="M 20 100 L 55 75 L 105 65 L 150 65 L 195 80 L 200 100 L 200 112 L 20 112 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 70 97 L 95 75 L 140 75 L 155 97 Z" fill="url(#glass_${uid})" opacity="0.85"/>
      <rect x="18" y="85" width="20" height="5" rx="1" fill="#111"/>
      <rect x="25" y="90" width="3" height="10" fill="#111"/>
      <path d="M 188 85 L 200 88 L 200 93 L 188 90 Z" fill="#fef3c7"/>
    `;
  } else {
    body = `
      <path d="M 15 105 L 55 78 L 110 65 L 160 68 L 200 85 L 205 105 L 205 115 L 15 115 Z" fill="${bodyColor}" stroke="#000" stroke-width="1.5"/>
      <path d="M 75 100 L 105 78 L 145 78 L 160 100 Z" fill="url(#glass_${uid})" opacity="0.9"/>
      <rect x="10" y="82" width="30" height="6" rx="2" fill="#111"/>
      <rect x="20" y="88" width="4" height="15" fill="#111"/>
      <circle cx="20" cy="105" r="3" fill="#f59e0b"/>
      <path d="M 190 90 L 205 94 L 205 100 L 190 96 Z" fill="#fef3c7"/>
    `;
  }

  const wheels = `
    <circle cx="65" cy="112" r="14" fill="#0a0a0a" stroke="#222" stroke-width="2"/>
    <circle cx="65" cy="112" r="6" fill="#666"/>
    <circle cx="160" cy="112" r="14" fill="#0a0a0a" stroke="#222" stroke-width="2"/>
    <circle cx="160" cy="112" r="6" fill="#666"/>
  `;

  return `
    <svg viewBox="0 0 230 130" width="${size}" height="${size * 0.565}" xmlns="http://www.w3.org/2000/svg">
      ${defs}${glow}${body}${wheels}
    </svg>
  `;
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
  btn.textContent = "🎰 Крутим...";

  try {
    const r = await fetch(`${API}/roll/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    await showRoulette(data.car, false);

    state.energy = data.energy;
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
    btn.textContent = "🎰 КРУТИТЬ РУЛЕТКУ";
  }
}

async function roll5() {
  const btn = document.getElementById("roll5Btn");
  btn.disabled = true;
  btn.textContent = "🎰 Крутим ×5...";
  try {
    const r = await fetch(`${API}/roll5/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    state.energy = data.energy;
    state.balance = data.balance;
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;
    data.cars.forEach(c => state.cars.push(c));

    if (data.cars.length) renderCar(data.cars[data.cars.length - 1], true);
    render();
    showRollResults(data.cars, data.xp_gained);

    const rarityRank = { common: 1, rare: 2, epic: 3, legendary: 4 };
    let bestRarity = "common";
    for (const c of data.cars) {
      if (rarityRank[c.rarity] > rarityRank[bestRarity]) bestRarity = c.rarity;
    }
    playRewardSound(bestRarity, false);

    if (data.xp_gained) showXpToast(`+${data.xp_gained} XP`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "⚡ ×5 КРУТОК <small>(5 ⚡)</small>";
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
    return `
      <div style="padding:10px;margin-bottom:8px;border-radius:12px;background:#fff;border-left:4px solid ${rc};border:1.5px solid #f0e3c9;border-left-width:4px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="flex-shrink:0;">${carSvg(c, 90)}</div>
        <div style="flex:1;text-align:right;">
          <b>${c.brand}</b> ${c.model ? `<small style="color:#d97706;font-weight:800;">${c.model}</small>` : ""} <small style="color:#a1a1aa;">${c.year}</small><br>
          <small style="color:${rc};font-size:10px;font-weight:800;">${c.rarity.toUpperCase()}</small>
          <small style="color:#a1a1aa;"> • ${c.color}</small><br>
          ${modifierBadge(c)}<br>
          <span style="color:#16a34a;font-weight:800;font-size:13px;">${Math.round(c.price).toLocaleString()} ₽</span>
        </div>
      </div>
    `;
  }).join("");
  xpEl.textContent = `+${totalXp} XP всего`;
  document.getElementById("rollResultsModal").classList.remove("hidden");
}

function closeRollResults() {
  document.getElementById("rollResultsModal").classList.add("hidden");
}

function showContainerResult(car, isSpecial) {
  const box = document.getElementById("containerResultBox");
  const rc = RARITY_COLORS[car.rarity];
  const specialBanner = isSpecial ? `
    <div style="background:linear-gradient(90deg,#fbbf24,#f59e0b,#fbbf24);color:#78350f;font-weight:800;text-align:center;padding:8px;border-radius:10px;margin-bottom:10px;font-size:13px;">
      ⭐ ЭКСКЛЮЗИВНАЯ МАШИНА ⭐
    </div>
  ` : "";
  box.innerHTML = `
    <div style="text-align:center;padding:20px;border-radius:16px;background:#fff;border:2px solid ${rc};box-shadow:0 0 25px ${rc}30;">
      ${specialBanner}
      <div style="color:${rc};font-size:12px;font-weight:800;letter-spacing:2px;margin-bottom:8px;">${car.rarity.toUpperCase()}</div>
      <div style="display:flex;justify-content:center;margin:10px 0;">${carSvg(car, 240)}</div>
      <div style="font-size:24px;font-weight:800;margin-bottom:4px;color:#1f2937;">${car.brand}</div>
      ${car.model ? `<div style="color:#d97706;font-size:14px;font-weight:800;margin-bottom:8px;">${car.model}</div>` : ""}
      <div style="margin-bottom:8px;">${modifierBadge(car)}</div>
      <div style="color:#78716c;font-size:14px;margin-bottom:10px;">📅 ${car.year} • 🎨 ${car.color}</div>
      <div style="color:#16a34a;font-size:22px;font-weight:800;">💰 ${Math.round(car.price).toLocaleString()}</div>
    </div>
  `;
  document.getElementById("containerResultModal").classList.remove("hidden");
}

function closeContainerResult() {
  document.getElementById("containerResultModal").classList.add("hidden");
}


// ================== МЕНЮ ==================
function openShop() {
  const list = document.getElementById("containersList");
  list.innerHTML = CONTAINERS.map(c => `
    <div class="container-card" onclick="openContainer('${c.id}')">
      <div class="container-info">
        <b>📦 ${c.name}</b>
        <small>${c.chances}</small>
      </div>
      <div class="container-price">${c.price.toLocaleString()} ₽</div>
    </div>
  `).join("");
  document.getElementById("shopModal").classList.remove("hidden");
}

function closeShop() {
  document.getElementById("shopModal").classList.add("hidden");
}

function openCountryModal() {
  const list = document.getElementById("countriesList");
  list.innerHTML = Object.entries(countriesMap).map(([key, name]) => `
    <div class="country-card ${key === state.country ? 'active' : ''}" onclick="setCountry('${key}')">
      ${name}
    </div>
  `).join("");
  document.getElementById("countryModal").classList.remove("hidden");
}

function closeCountryModal() {
  document.getElementById("countryModal").classList.add("hidden");
}

async function setCountry(key) {
  try {
    const r = await fetch(`${API}/country/${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: key }),
    });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    state.country = data.country;
    updateCountryUI();
    closeCountryModal();
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}

function updateCountryUI() {
  const el = document.getElementById("currentCountry");
  if (el) el.textContent = countriesMap[state.country] || "Германия";
}

function showModifierInfo() {
  const body = document.getElementById("infoBody");
  document.getElementById("infoTitle").textContent = "✨ Модификаторы машин";
  body.innerHTML = MODIFIERS_INFO.map(m => `
    <div style="display:flex;justify-content:space-between;padding:10px 12px;background:#fff;border-radius:10px;margin-bottom:6px;border:1.5px solid #f0e3c9;">
      <span style="font-weight:700;">${m.emoji} ${m.name}</span>
      <span style="color:${m.mult >= 1 ? '#16a34a' : '#dc2626'};font-weight:800;">×${m.mult.toFixed(2)}</span>
    </div>
  `).join("");
  document.getElementById("infoModal").classList.remove("hidden");
}

function showTopPlayers() {
  const body = document.getElementById("infoBody");
  document.getElementById("infoTitle").textContent = "🏆 Рейтинг";
  body.innerHTML = `<p style="color:#78716c;font-size:14px;line-height:1.5;">Рейтинг игроков появится в следующем обновлении. Здесь будет топ-50 по стоимости гаража.</p>`;
  document.getElementById("infoModal").classList.remove("hidden");
}

function openProfile() {
  const body = document.getElementById("infoBody");
  document.getElementById("infoTitle").textContent = "👤 Профиль";
  const totalValue = state.cars.reduce((s, c) => s + c.price, 0);
  body.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:14px;border:1.5px solid #f0e3c9;">
      <div style="font-size:16px;font-weight:800;margin-bottom:10px;">${user.username || 'Игрок'}</div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>🏆 Уровень</span><b>${state.level}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>⚡ Энергия</span><b>${state.energy}/${state.max_energy || 10}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>💰 Баланс</span><b>${Math.round(state.balance).toLocaleString()} ₽</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>🚗 Машин в гараже</span><b>${state.cars.length}</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>💎 Стоимость гаража</span><b>${Math.round(totalValue).toLocaleString()} ₽</b></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span>🌍 Страна</span><b>${countriesMap[state.country] || '—'}</b></div>
    </div>
  `;
  document.getElementById("infoModal").classList.remove("hidden");
}

function showAbout() {
  const body = document.getElementById("infoBody");
  document.getElementById("infoTitle").textContent = "❓ О игре";
  body.innerHTML = `
    <p style="color:#78756c;font-size:13px;line-height:1.6;margin-bottom:10px;">
      <b>Выбивание машин</b> — коллекционная игра в Telegram.
    </p>
    <p style="color:#78756c;font-size:13px;line-height:1.6;">
      • Крути рулетку — выбивай машины разной редкости<br>
      • Меняй страну — меняются марки и цены<br>
      • Продавай дубликаты — копи на новые<br>
      • Открывай контейнеры — шанс на эксклюзив<br>
      • Получай XP — повышай уровень
    </p>
  `;
  document.getElementById("infoModal").classList.remove("hidden");
}

function closeInfo() {
  document.getElementById("infoModal").classList.add("hidden");
}


// ================== RENDER ==================
function renderCar(car, highlight = false) {
  const labelEl = document.getElementById("rarityLabel");
  const svgEl = document.getElementById("heroSvg");
  const nameEl = document.getElementById("heroName");
  const modEl = document.getElementById("heroModifier");
  const infoEl = document.getElementById("heroInfo");
  const priceEl = document.getElementById("heroPrice");

  const rc = RARITY_COLORS[car.rarity] || "#9ca3af";
  document.getElementById("heroCard").style.borderColor = rc;
  document.getElementById("heroCard").style.boxShadow = highlight
    ? `0 8px 40px ${rc}55`
    : "0 8px 30px rgba(180, 140, 60, 0.15)";

  labelEl.textContent = car.rarity ? car.rarity.toUpperCase() : "НАЖМИ ВЫБИТЬ";
  labelEl.style.color = rc;

  svgEl.innerHTML = carSvg(car, 200);
  svgEl.className = "hero-svg " + (highlight ? "pop" : "");

  nameEl.innerHTML = `${car.brand || ""} ${car.model ? `<small style="color:#d97706;font-size:14px;font-weight:800;">${car.model}</small>` : ""}`;
  modEl.innerHTML = car.modifier ? modifierBadge(car) : "";
  infoEl.textContent = car.year ? `📅 ${car.year} | 🎨 ${car.color}` : "";
  priceEl.textContent = car.price ? `💰 ${Math.round(car.price).toLocaleString()} ₽` : "";
}

function render() {
  document.getElementById("balance").textContent = Math.round(state.balance).toLocaleString();
  document.getElementById("energy").textContent = state.energy;
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
    </div>
  `).join("") || "<p style='color:#a1a1aa;text-align:center;padding:20px;'>Гараж пуст</p>";
  document.getElementById("garageModal").classList.remove("hidden");
}

async function sellCar(carId) {
  if (!confirm("Продать эту машину?")) return;
  try {
    const r = await fetch(`${API}/sell/${user.id}/${carId}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка продажи"); return; }

    state.cars = state.cars.filter(c => c.id !== carId);
    state.balance = data.new_balance;
    render();
    openGarage();
    playTone(880, 0.1, "sine", 0.12);
    playTone(1100, 0.15, "sine", 0.12, 0.08);
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}

function closeGarage() {
  document.getElementById("garageModal").classList.add("hidden");
}


// ================== БОНУС ==================
async function claimBonus() {
  try {
    const r = await fetch(`${API}/bonus/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }
    state.balance = data.new_balance;
    state.energy = data.new_energy;
    render();
    playTone(660, 0.1, "sine", 0.15);
    playTone(880, 0.1, "sine", 0.15, 0.08);
    playTone(1320, 0.25, "sine", 0.18, 0.16);
    alert(`🎁 Бонус получен!\n+${data.bonus_money} 💰\n+${data.bonus_energy} ⚡`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}


// ================== ИНИЦИАЛИЗАЦИЯ ==================
document.getElementById("rollBtn").onclick = roll;
document.getElementById("roll5Btn").onclick = roll5;

const soundBtn = document.getElementById("soundToggle");
if (soundBtn) soundBtn.onclick = toggleSound;

auth();
