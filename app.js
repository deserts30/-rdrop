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

const RARITY_NAMES = {
  common: "Обычная",
  rare: "Редкая",
  epic: "Эпическая",
  legendary: "Легендарная",
};

const CONTAINERS = [
  { id: "common", name: "Обычный контейнер", price: 10000, chances: "Л: 0.5% / Э: 4.5%", color: "#888" },
  { id: "rare", name: "Редкий контейнер", price: 30000, chances: "Л: 5% / Э: 20%", color: "#3b82f6" },
  { id: "epic", name: "Эпический контейнер", price: 100000, chances: "Л: 20% / Э: 50%", color: "#a855f7" },
  { id: "legendary", name: "Легендарный контейнер", price: 300000, chances: "Л: 70% / Э: 30%", color: "#f59e0b" },
  { id: "elite", name: "Элитный контейнер", price: 1000000, chances: "Л: 90% + x1.5 к цене", color: "#ec4899" },
];

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

async function roll() {
  const btn = document.getElementById("rollBtn");
  btn.disabled = true;
  btn.textContent = "🎰 Крутим...";

  let spins = 0;
  const anim = setInterval(() => {
    renderCar({
      brand: ["BMW", "Lada", "Ferrari"][spins % 3],
      year: 2000 + (spins % 25),
      color: "Чёрный",
      rarity: "common",
      price: 0,
    });
    spins++;
  }, 80);

  try {
    const r = await fetch(`${API}/roll/${user.id}`, { method: "POST" });
    const data = await r.json();
    clearInterval(anim);
    if (!r.ok) { alert(data.detail || "Ошибка"); return; }

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
    clearInterval(anim);
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
  list.innerHTML = cars.map(c => `
    <div style="padding:10px;margin-bottom:6px;border-radius:8px;background:#0f172a;border-left:4px solid ${RARITY_COLORS[c.rarity]};display:flex;justify-content:space-between;align-items:center;">
      <div>
        <b>${c.brand}</b> <small style="color:#94a3b8;">${c.year}</small><br>
        <small style="color:${RARITY_COLORS[c.rarity]};font-size:10px;font-weight:bold;">${c.rarity.toUpperCase()}</small>
        <small style="color:#94a3b8;"> • ${c.color}</small>
      </div>
      <div style="color:#22c55e;font-weight:bold;font-size:13px;">${Math.round(c.price).toLocaleString()} ₽</div>
    </div>
  `).join("");
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
        <div style="flex:1;">
          <b>${c.brand}</b> ${c.year} • ${c.color}<br>
          <small>${c.rarity} • 💰 ${Math.round(c.price).toLocaleString()}</small>
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
