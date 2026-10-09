const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ВАЖНО: Позже, когда сделаем бэкенд на Render, заменим этот URL на реальный
const API = "https://car-game-api.onrender.com/api";

const user = tg.initDataUnsafe?.user || { id: 12345, username: "test" };

let state = { balance: 0, energy: 0, cars: [] };

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
    state = await r.json();
    render();
  } catch (e) {
    console.log("Бэкенд еще не подключен", e);
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
    state.cars.push(data.car);
    renderCar(data.car, true);
    render();
  } catch (e) {
    clearInterval(anim);
    alert("Бэкенд еще не подключен. Мы сделаем это на следующем шаге!");
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
    ${car.price ? `<div class="car-price">💰 ${car.price.toLocaleString()}</div>` : ""}
  `;
}

function render() {
  document.getElementById("balance").textContent = state.balance.toLocaleString();
  document.getElementById("energy").textContent = state.energy;
}

function openGarage() {
  const list = document.getElementById("garageList");
  list.innerHTML = state.cars.map(c => `
    <div class="garage-item" style="border-left:4px solid ${RARITY_COLORS[c.rarity]}">
      <b>${c.brand}</b> ${c.year} • ${c.color}<br>
      <small>${c.rarity} • 💰 ${c.price.toLocaleString()}</small>
    </div>
  `).join("") || "<p>Пусто</p>";
  document.getElementById("garageModal").classList.remove("hidden");
}

function closeGarage() {
  document.getElementById("garageModal").classList.add("hidden");
}

document.getElementById("rollBtn").onclick = roll;
document.getElementById("garageBtn").onclick = openGarage;
auth();
