const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API = "https://car-game-api.onrender.com/api";
const user = tg.initDataUnsafe?.user || { id: 12345, username: "test" };

let state = { balance: 0, energy: 0, cars: [], level: 1, xp: 0, xpNext: 100, country: "germany" };
let countriesMap = {};

const RARITY_COLORS = {
  common: "#888",
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
};

const CONTAINERS = [
  { id: "common", name: "Обычный контейнер", price: 10000, chances: "Л: 0.3% / Э: 2.7%", color: "#888" },
  { id: "rare", name: "Редкий контейнер", price: 30000, chances: "Л: 2% / Э: 10%", color: "#3b82f6" },
  { id: "epic", name: "Эпический контейнер", price: 100000, chances: "Л: 5% / Э: 35%", color: "#a855f7" },
  { id: "legendary", name: "Легендарный контейнер", price: 300000, chances: "Л: 20% / Э: 55%", color: "#f59e0b" },
  { id: "elite", name: "Элитный контейнер", price: 1000000, chances: "Л: 65% / Э: 35%", color: "#ec4899" },
];

// Фейковые машины для анимации рулетки
const FAKE_CARS = [
  { brand: "Lada", year: 2010, color: "Белый", rarity: "common" },
  { brand: "Ford", year: 2015, color: "Синий", rarity: "common" },
  { brand: "Toyota", year: 2018, color: "Серебристый", rarity: "common" },
  { brand: "BMW", year: 2020, color: "Чёрный", rarity: "rare" },
  { brand: "Audi", year: 2021, color: "Красный", rarity: "rare" },
  { brand: "Mercedes", year: 2019, color: "Чёрный", rarity: "rare" },
  { brand: "Porsche", year: 2022, color: "Жёлтый", rarity: "epic" },
  { brand: "Ferrari", year: 2023, color: "Красный", rarity: "epic" },
  { brand: "Lamborghini", year: 2023, color: "Хамелеон", rarity: "legendary" },
  { brand: "Bugatti", year: 2024, color: "Матовый чёрный", rarity: "legendary" },
];

// ==== SVG-РИСОВАЛКА ====
function carSvg(car, size = 220) {
  const color = COLOR_HEX[car.color] || "#888";
  const rarity = car.rarity;

  let defs = `
    <defs>
      <linearGradient id="chameleon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#22d3ee"/>
        <stop offset="50%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <linearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#1e40af" stop-opacity="0.7"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${RARITY_COLORS[rarity]}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${RARITY_COLORS[rarity]}" stop-opacity="0"/>
      </radialGradient>
    </defs>
  `;

  let glow = "";
  if (rarity === "legendary") {
    glow = `<ellipse cx="110" cy="100" rx="100" ry="45" fill="url(#glow)"/>`;
  } else if (rarity === "epic") {
    glow = `<ellipse cx="110" cy="100" rx="90" ry="40" fill="url(#glow)" opacity="0.5"/>`;
  }

  let body = "";
  if (rarity === "common") {
    body = `
      <path d="M 30 90 L 50 60 L 90 55 L 130 55 L 170 60 L 190 90 L 190 110 L 30 110 Z" fill="${color}" stroke="#000" stroke-width="1.5"/>
      <path d="M 60 88 L 75 65 L 130 65 L 145 88 Z" fill="url(#glass)" opacity="0.85"/>
      <rect x="178" y="82" width="12" height="6" rx="2" fill="#fef3c7"/>
      <rect x="30" y="82" width="10" height="6" rx="2" fill="#dc2626"/>
    `;
  } else if (rarity === "rare") {
    body = `
      <path d="M 25 95 L 55 70 L 100 62 L 145 62 L 185 75 L 195 95 L 195 110 L 25 110 Z" fill="${color}" stroke="#000" stroke-width="1.5"/>
      <path d="M 65 92 L 85 72 L 135 72 L 150 92 Z" fill="url(#glass)" opacity="0.85"/>
      <rect x="22" y="90" width="15" height="4" rx="1" fill="#111"/>
      <rect x="184" y="88" width="11" height="5" rx="2" fill="#fef3c7"/>
    `;
  } else if (rarity === "epic") {
    body = `
      <path d="M 20 100 L 55 75 L 105 65 L 150 65 L 195 80 L 200 100 L 200 112 L 20 112 Z" fill="${color}" stroke="#000" stroke-width="1.5"/>
      <path d="M 70 97 L 95 75 L 140 75 L 155 97 Z" fill="url(#glass)" opacity="0.85"/>
      <rect x="18" y="85" width="20" height="5" rx="1" fill="#111"/>
      <rect x="25" y="90" width="3" height="10" fill="#111"/>
      <path d="M 188 85 L 200 88 L 200 93 L 188 90 Z" fill="#fef3c7"/>
    `;
  } else {
    body = `
      <path d="M 15 105 L 55 78 L 110 65 L 160 68 L 200 85 L 205 105 L 205 115 L 15 115 Z" fill="${color}" stroke="#000" stroke-width="1.5"/>
      <path d="M 75 100 L 105 78 L 145 78 L 160 100 Z" fill="url(#glass)" opacity="0.9"/>
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
      ${defs}
      ${glow}
      ${body}
      ${wheels}
    </svg>
  `;
}


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
  } catch (e) {
    console.log("Backend not connected", e);
  }
}


// ==== РУЛЕТКА ====
function showRoulette(winner) {
  return new Promise(resolve => {
    const overlay = document.getElementById("rouletteOverlay");
    const track = document.getElementById("rouletteTrack");

    const ITEM_W = 140; // width(130) + margin(5+5)
    const TOTAL = 42;
    const WINNER_POS = 36;

    // Генерим ленту
    const items = [];
    for (let i = 0; i < TOTAL; i++) {
      if (i === WINNER_POS) {
        items.push(winner);
      } else {
        items.push(FAKE_CARS[Math.floor(Math.random() * FAKE_CARS.length)]);
      }
    }

    track.innerHTML = items.map(c => `
      <div class="roulette-item" style="border-color:${RARITY_COLORS[c.rarity] || '#334155'};">
        ${carSvg(c, 110)}
        <div class="roulette-name">${c.brand}</div>
      </div>
    `).join("");

    overlay.classList.remove("hidden");

    // Стартовая позиция
    track.style.transition = "none";
    track.style.transform = "translateX(0)";

    // Форсируем reflow
    void track.offsetWidth;

    // Считаем смещение
    const windowEl = overlay.querySelector(".roulette-window");
    const windowW = windowEl.offsetWidth;
    const centerW = windowW / 2;

    const targetCenter = ITEM_W * WINNER_POS + ITEM_W / 2;
    const randomJitter = (Math.random() - 0.5) * (ITEM_W * 0.5);
    const finalX = -(targetCenter - centerW + randomJitter);

    // Запускаем анимацию
    track.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)";
    track.style.transform = `translateX(${finalX}px)`;

    setTimeout(() => {
      overlay.classList.add("hidden");
      track.style.transition = "none";
      resolve();
    }, 4200);
  });
}


async function roll() {
  const btn = document.getElementById("rollBtn");
  btn.disabled = true;
  btn.textContent = "🎰 Крутим...";

  try {
    const r = await fetch(`${API}/roll/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    // Рулетка
    await showRoulette(data.car);

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
    btn.textContent = "🔥 ВЫБИТЬ МАШИНУ";
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
    if (data.xp_gained) showXpToast(`+${data.xp_gained} XP`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "⚡ ВЫБИТЬ ×5 <small>(5 энергии)</small>";
  }
}


async function openContainer(containerId) {
  const cont = CONTAINERS.find(c => c.id === containerId);
  if (!confirm(`Открыть «${cont.name}» за ${cont.price.toLocaleString()} ₽?`)) return;

  try {
    const r = await fetch(`${API}/container/${user.id}/${containerId}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

    // Для контейнера тоже показываем рулетку — но с шансами под кейс
    // (визуально то же самое, но выигрыш уже известен)
    await showRoulette(data.car);

    state.balance = data.balance;
    state.cars.push(data.car);
    if (data.level !== undefined) state.level = data.level;
    if (data.xp !== undefined) state.xp = data.xp;
    if (data.xp_next !== undefined) state.xpNext = data.xp_next;
    render();

    showContainerResult(data.car);
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
    alert(`💸 Продано ${data.sold_count} машин за ${Math.round(data.sold_total).toLocaleString()} ₽`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}


function showRollResults(cars, totalXp) {
  const list = document.getElementById("rollResultsList");
  const xpEl = document.getElementById("rollResultsXp");
  list.innerHTML = cars.map(c => {
    const rc = RARITY_COLORS[c.rarity];
    return `
      <div style="padding:10px;margin-bottom:8px;border-radius:10px;background:#0f172a;border-left:4px solid ${rc};display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="flex-shrink:0;">${carSvg(c, 90)}</div>
        <div style="flex:1;text-align:right;">
          <b>${c.brand}</b> <small style="color:#94a3b8;">${c.year}</small><br>
          <small style="color:${rc};font-size:10px;font-weight:bold;">${c.rarity.toUpperCase()}</small>
          <small style="color:#94a3b8;"> • ${c.color}</small><br>
          <span style="color:#22c55e;font-weight:bold;font-size:13px;">${Math.round(c.price).toLocaleString()} ₽</span>
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


function showContainerResult(car) {
  const box = document.getElementById("containerResultBox");
  const rc = RARITY_COLORS[car.rarity];
  box.innerHTML = `
    <div style="text-align:center;padding:20px;border-radius:12px;background:#0f172a;border:2px solid ${rc};box-shadow:0 0 25px ${rc}40;">
      <div style="color:${rc};font-size:12px;font-weight:bold;letter-spacing:2px;margin-bottom:8px;">${car.rarity.toUpperCase()}</div>
      <div style="display:flex;justify-content:center;margin:10px 0;">${carSvg(car, 240)}</div>
      <div style="font-size:26px;font-weight:bold;margin-bottom:10px;">${car.brand}</div>
      <div style="color:#94a3b8;font-size:14px;margin-bottom:10px;">📅 ${car.year} • 🎨 ${car.color}</div>
      <div style="color:#22c55e;font-size:22px;font-weight:bold;">💰 ${Math.round(car.price).toLocaleString()}</div>
    </div>
  `;
  document.getElementById("containerResultModal").classList.remove("hidden");
}

function closeContainerResult() {
  document.getElementById("containerResultModal").classList.add("hidden");
}


function openShop() {
  const list = document.getElementById("containersList");
  list.innerHTML = CONTAINERS.map(c => `
    <div class="container-card" onclick="openContainer('${c.id}')">
      <div class="container-info">
        <b style="color:${c.color};">📦 ${c.name}</b>
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


function renderCar(car, highlight = false) {
  const el = document.getElementById("carDisplay");
  const rc = RARITY_COLORS[car.rarity] || "#888";
  el.style.borderColor = rc;
  el.style.boxShadow = highlight ? `0 0 30px ${rc}` : "none";
  el.innerHTML = `
    <div class="rarity" style="color:${rc}">${car.rarity.toUpperCase()}</div>
    <div class="car-svg-wrap ${highlight ? 'pop' : ''}">${carSvg(car, 220)}</div>
    <div class="car-name">${car.brand}</div>
    <div class="car-info">📅 ${car.year} | 🎨 ${car.color}</div>
    ${car.price ? `<div class="car-price">💰 ${Math.round(car.price).toLocaleString()}</div>` : ""}
  `;
}


function render() {
  document.getElementById("balance").textContent = state.balance.toLocaleString();
  document.getElementById("energy").textContent = state.energy;

  const lvlEl = document.getElementById("level");
  const xpEl = document.getElementById("xp");
  const xpNextEl = document.getElementById("xpNext");
  const xpFill = document.getElementById("xpFill");

  if (lvlEl) lvlEl.textContent = state.level || 1;
  if (xpEl) xpEl.textContent = state.xp || 0;
  if (xpNextEl) xpNextEl.textContent = state.xpNext || 100;
  if (xpFill) {
    const pct = state.xpNext ? Math.min(100, (state.xp / state.xpNext) * 100) : 0;
    xpFill.style.width = pct + "%";
  }
}


function showXpToast(text) {
  const toast = document.createElement("div");
  toast.className = "xp-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1500);
}


function openGarage() {
  const list = document.getElementById("garageList");
  list.innerHTML = state.cars.map(c => `
    <div class="garage-item" style="border-left:4px solid ${RARITY_COLORS[c.rarity]}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="flex-shrink:0;">${carSvg(c, 100)}</div>
        <div style="flex:1;">
          <b>${c.brand}</b> ${c.year}<br>
          <small style="color:${RARITY_COLORS[c.rarity]};font-weight:bold;">${c.rarity.toUpperCase()}</small>
          <small style="color:#94a3b8;"> • ${c.color}</small><br>
          <small>💰 ${Math.round(c.price).toLocaleString()}</small>
        </div>
        <button class="sell-btn" onclick="sellCar(${c.id})">
          Продать<br>за ${Math.round(c.price * 0.7).toLocaleString()}
        </button>
      </div>
    </div>
  `).join("") || "<p>Пусто</p>";
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
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}

function closeGarage() {
  document.getElementById("garageModal").classList.add("hidden");
}


async function claimBonus() {
  try {
    const r = await fetch(`${API}/bonus/${user.id}`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }
    state.balance = data.new_balance;
    state.energy = data.new_energy;
    render();
    alert(`🎁 Бонус получен!\n+${data.bonus_money} 💰\n+${data.bonus_energy} ⚡`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}


document.getElementById("rollBtn").onclick = roll;
document.getElementById("roll5Btn").onclick = roll5;
document.getElementById("garageBtn").onclick = openGarage;
document.getElementById("shopBtn").onclick = openShop;
document.getElementById("bonusBtn").onclick = claimBonus;

auth();
