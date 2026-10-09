const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const API = "https://car-game-api.onrender.com/api";
const user = tg.initDataUnsafe?.user || { id: 12345, username: "test" };

let state = { balance: 0, energy: 0, cars: [], level: 1, xp: 0, xpNext: 100 };

const RARITY_COLORS = {
  common: "#888",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

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
    render();
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

    if (!r.ok) {
      alert(data.detail || "Ошибка");
      return;
    }

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
    if (!r.ok) {
      let msg = "Ошибка продажи";
      if (typeof data.detail === "string") msg = data.detail;
      else if (Array.isArray(data.detail)) msg = data.detail.map(e => e.msg || JSON.stringify(e)).join("\n");
      else if (data.detail) msg = JSON.stringify(data.detail);
      alert(msg);
      return;
    }
    state.cars = state.cars.filter(c => c.id !== carId);
    state.balance = data.new_balance;
    render();
    openGarage();
    alert(`✅ Продано за ${Math.round(data.sold_price).toLocaleString()}!`);
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
    if (!r.ok) {
      let msg = "Ошибка";
      if (typeof data.detail === "string") msg = data.detail;
      else if (Array.isArray(data.detail)) msg = data.detail.map(e => e.msg || JSON.stringify(e)).join("\n");
      alert(msg);
      return;
    }
    state.balance = data.new_balance;
    state.energy = data.new_energy;
    render();
    alert(`🎁 Бонус получен!\n+${data.bonus_money} 💰\n+${data.bonus_energy} ⚡`);
  } catch (e) {
    alert("Ошибка связи с сервером");
  }
}

document.getElementById("rollBtn").onclick = roll;
document.getElementById("garageBtn").onclick = openGarage;
document.getElementById("bonusBtn").onclick = claimBonus;

auth();
