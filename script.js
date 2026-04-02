const apiUrl = "https://defaultb3de72ceb6b04a0cb0f8bf01821c62.98.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/49142a2f12af4da183ce32a74216ca9d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=su2OCBJkJ2Rw_nIbk6SZomBnz0cep0BqtSo9KX-XlW4"; // keep your same URL

let storefrontItems = [];

/* ---------------- HELPERS ---------------- */

function getFieldValue(field, fallback = "") {
  if (!field) return fallback;
  if (typeof field === "string" || typeof field === "number") return field;

  if (Array.isArray(field)) {
    if (!field.length) return fallback;
    if (field[0]?.Value) return field.map(i => i.Value).join(", ");
    return field.join(", ");
  }

  if (field?.Value) return field.Value;
  return fallback;
}

function getStatusClass(status) {
  const s = String(status).toLowerCase();
  if (s.includes("sold")) return "sold";
  if (s.includes("pending")) return "pending";
  return "available";
}

function formatCurrency(val) {
  if (!val) return "$0";
  const num = Number(val);
  return isNaN(num) ? `$${val}` : `$${num}`;
}

function formatSyncTime() {
  return `Last synced ${new Date().toLocaleTimeString()}`;
}

/* ---------------- FETCH ---------------- */

async function fetchLiveInventory() {
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const data = await res.json();

    console.log("🔥 FULL FLOW RESPONSE:", data);

    // FIX: handle ALL possible formats
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.value)) return data.value;
    if (Array.isArray(data.body)) return data.body;

    console.log("⚠️ UNKNOWN FORMAT:", data);
    return [];

  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    return [];
  }
}

/* ---------------- MAP DATA ---------------- */

function mapSharePointItems(raw) {
  return raw.map((item) => ({
    title: getFieldValue(item.Title, "No Name"),
    category: getFieldValue(item.Category, "Uncategorized"),
    price: getFieldValue(item.Price, "0"),
    status: getFieldValue(item.Status, "Available"),
    condition: getFieldValue(item.Condition, "Good"),
    image:
      getFieldValue(item.ImageURL) ||
      getFieldValue(item.Image) ||
      `https://via.placeholder.com/300`
  }));
}

/* ---------------- RENDER ---------------- */

function renderInventory(items) {
  const container = document.getElementById("inventoryGrid");
  if (!container) return;

  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `<p>No items found</p>`;
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item-card";

    el.innerHTML = `
      <img src="${item.image}" class="item-image">
      <div class="item-content">
        <h3>${item.title}</h3>
        <span class="status-badge ${getStatusClass(item.status)}">${item.status}</span>
        <p>${item.category}</p>
        <p>${formatCurrency(item.price)}</p>
      </div>
    `;

    container.appendChild(el);
  });
}

/* ---------------- MAIN LOAD ---------------- */

async function loadItems() {
  const container = document.getElementById("inventoryGrid");
  if (!container) return;

  container.innerHTML = `<p>Loading...</p>`;

  const raw = await fetchLiveInventory();

  console.log("📦 RAW ITEMS:", raw);

  storefrontItems = mapSharePointItems(raw);

  console.log("✅ MAPPED ITEMS:", storefrontItems);

  renderInventory(storefrontItems);
}

/* ---------------- INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  loadItems();
});
