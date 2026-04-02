const apiUrl = "https://7d40a9c57127e2e0af34e868fdebb9.f5.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/3cd62793afa3492dba9367bcc479774d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=c7jvqBTY6xPFAUEobOsD7C2yU_tlOD0XGTWZbgZl0JU";

const itemData = {
  monitor: {
    name: 'Dell Monitor 24"',
    category: 'Electronics',
    price: '$45',
    status: 'Available',
    image: 'images/monitor.jpg',
    description: '24-inch Dell monitor in good working condition. Suitable for office or workstation use.'
  },
  chair: {
    name: 'Office Chair',
    category: 'Furniture',
    price: '$20',
    status: 'Pending Pickup',
    image: 'images/chair.jpg',
    description: 'Gently used office chair in good condition. Suitable for desk or reception use.'
  },
  jacket: {
    name: 'Winter Jacket',
    category: 'Clothing',
    price: '$15',
    status: 'Available',
    image: 'images/jacket.jpg',
    description: 'Warm winter jacket available in good condition.'
  },
  laptop: {
    name: 'Laptop - HP',
    category: 'Electronics',
    price: '$120',
    status: 'Sold',
    image: 'images/laptop.jpg',
    description: 'Used HP laptop previously available in the store.'
  },
  table: {
    name: 'Coffee Table',
    category: 'Furniture',
    price: '$30',
    status: 'Available',
    image: 'images/table.jpg',
    description: 'Simple wooden coffee table suitable for home or office use.'
  },
  shirts: {
    name: 'Men’s Dress Shirts',
    category: 'Clothing',
    price: '$10',
    status: 'Available',
    image: 'images/shirts.jpg',
    description: 'Collection of men’s dress shirts in wearable condition.'
  },
  microwave: {
    name: 'Microwave Oven',
    category: 'Household',
    price: '$35',
    status: 'Pending Pickup',
    image: 'images/microwave.jpg',
    description: 'Microwave oven in working condition, available for pickup.'
  },
  lamp: {
    name: 'Desk Lamp',
    category: 'Office Supplies',
    price: '$8',
    status: 'Sold',
    image: 'images/lamp.jpg',
    description: 'Desk lamp previously listed and sold from inventory.'
  }
};

let storefrontItems = [];

function getFieldValue(field, fallback = "") {
  if (field === null || field === undefined) return fallback;
  if (typeof field === "string" || typeof field === "number") return field;

  if (Array.isArray(field)) {
    if (!field.length) return fallback;
    if (typeof field[0] === "string") return field.join(", ");
    if (field[0]?.Value) return field.map(item => item.Value).join(", ");
    return fallback;
  }

  if (field?.Value) return field.Value;
  return fallback;
}

function getStatusClass(status) {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("sold")) return "sold";
  if (normalized.includes("pending")) return "pending";
  return "available";
}

function getImageFromTitle(title, category) {
  const safeTitle = String(title || "Item").trim();
  const safeCategory = String(category || "").trim();

  const label = encodeURIComponent(safeTitle);
  const sub = encodeURIComponent(safeCategory);

  return `data:image/svg+xml;utf8,
    <svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='%23dbeafe'/>
          <stop offset='100%' stop-color='%23ede9fe'/>
        </linearGradient>
      </defs>
      <rect width='600' height='400' fill='url(%23g)'/>
      <circle cx='300' cy='150' r='54' fill='%23ffffff' opacity='0.9'/>
      <text x='300' y='165' text-anchor='middle' font-size='42' font-family='Arial, sans-serif' fill='%23334155'>📦</text>
      <text x='300' y='255' text-anchor='middle' font-size='30' font-weight='700' font-family='Arial, sans-serif' fill='%23111827'>${label}</text>
      <text x='300' y='292' text-anchor='middle' font-size='18' font-family='Arial, sans-serif' fill='%23667085'>${sub}</text>
    </svg>`;
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "$0";
  const number = Number(value);
  if (Number.isNaN(number)) return `$${value}`;
  return `$${number}`;
}

function formatSyncTime() {
  const now = new Date();
  return `Last synced ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function mapSharePointItems(rawItems) {
  return rawItems.map((item, index) => {
    const title = getFieldValue(item.Title, "Untitled Item");
    const category = getFieldValue(item.Category, "Uncategorized");
    const price = getFieldValue(item.Price, "0");
    const status = getFieldValue(item.Status, "Available");
    const condition = getFieldValue(item.Condition, "Good");

    const sharePointImage =
      getFieldValue(item.ImageURL, "") ||
      getFieldValue(item.ImageUrl, "") ||
      getFieldValue(item.Image, "") ||
      "";

    const fallbackKeys = Object.keys(itemData);
    const itemKey = fallbackKeys[index] || title.toLowerCase().replace(/\s+/g, "-");

    return {
      key: itemKey,
      title,
      category,
      price,
      status,
      condition,
      image: sharePointImage || getImageFromTitle(title, category)
    };
  });
}

async function fetchLiveInventory() {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const data = await response.json();
  console.log("FLOW RESPONSE:", data);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function updateSyncStatus(text) {
  const syncText = document.getElementById("syncText");
  if (syncText) syncText.textContent = text;

  const dashboardSyncText = document.getElementById("dashboardSyncText");
  if (dashboardSyncText) dashboardSyncText.textContent = text;
}

function renderInventory(items) {
  const container = document.getElementById("inventoryGrid");
  if (!container) return;

  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No storefront listings are available right now.</p>
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.dataset.name = String(item.title).toLowerCase();
    card.dataset.category = String(item.category).toLowerCase();

    card.innerHTML = `
      <img src="${item.image}" class="item-image" alt="${item.title}">
      <div class="item-content">
        <div class="item-top-row">
          <h3>${item.title}</h3>
          <span class="status-badge ${getStatusClass(item.status)}">${item.status}</span>
        </div>
        <p class="item-category">${item.category}</p>
        <p class="item-price">${formatCurrency(item.price)}</p>
        <p class="item-category">Condition: ${item.condition}</p>
        <div class="item-actions">
          <a class="card-link" href="item.html?item=${encodeURIComponent(item.key)}">View Details</a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function setupFiltering() {
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll(".filter-btn");
  let activeCategory = "all";

  function applyFilters() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filteredItems = storefrontItems.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm);
      const matchesCategory =
        activeCategory === "all" || item.category.toLowerCase() === activeCategory;

      return matchesSearch && matchesCategory;
    });

    renderInventory(filteredItems);
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      activeCategory = button.dataset.category.toLowerCase();
      applyFilters();
    });
  });
}

async function loadItemsFromSharePoint() {
  const container = document.getElementById("inventoryGrid");
  if (!container) return;

  try {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading live inventory...</p>
      </div>
    `;

    updateSyncStatus("Syncing with SharePoint...");

    const rawItems = await fetchLiveInventory();
    storefrontItems = mapSharePointItems(rawItems);

    renderInventory(storefrontItems);
    setupFiltering();
    updateSyncStatus(formatSyncTime());
  } catch (error) {
    console.error("Error loading SharePoint items:", error);
    container.innerHTML = `
      <div class="empty-state">
        <p>Could not load SharePoint data right now.</p>
      </div>
    `;
    updateSyncStatus("Sync failed");
  }
}

async function loadDashboardFromSharePoint() {
  const totalEl = document.getElementById("statTotal");
  const availableEl = document.getElementById("statAvailable");
  const pendingEl = document.getElementById("statPending");
  const soldEl = document.getElementById("statSold");
  const tableBody = document.getElementById("dashboardTableBody");

  if (!totalEl || !availableEl || !pendingEl || !soldEl || !tableBody) return;

  try {
    updateSyncStatus("Syncing dashboard...");
    const rawItems = await fetchLiveInventory();
    const items = mapSharePointItems(rawItems);

    const total = items.length;
    const available = items.filter(item => item.status.toLowerCase().includes("available")).length;
    const pending = items.filter(item => item.status.toLowerCase().includes("pending")).length;
    const sold = items.filter(item => item.status.toLowerCase().includes("sold")).length;

    totalEl.textContent = total;
    availableEl.textContent = available;
    pendingEl.textContent = pending;
    soldEl.textContent = sold;

    tableBody.innerHTML = "";

    items.slice(0, 10).forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.title}</td>
        <td>${item.category}</td>
        <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
        <td>${item.condition}</td>
      `;
      tableBody.appendChild(row);
    });

    updateSyncStatus(formatSyncTime());
  } catch (error) {
    console.error("Dashboard load error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="4">Could not load live dashboard data.</td>
      </tr>
    `;
    updateSyncStatus("Sync failed");
  }
}

function loadItemDetails() {
  const params = new URLSearchParams(window.location.search);
  const itemKey = params.get("item");
  if (!itemKey || !itemData[itemKey]) return;

  const item = itemData[itemKey];

  const detailName = document.getElementById("detailName");
  const detailCategory = document.getElementById("detailCategory");
  const detailPrice = document.getElementById("detailPrice");
  const detailStatusText = document.getElementById("detailStatusText");
  const detailStatusBadge = document.getElementById("detailStatusBadge");
  const detailImage = document.getElementById("detailImage");
  const detailDescription = document.getElementById("detailDescription");
  const detailCondition = document.getElementById("detailCondition");

  if (detailName) detailName.textContent = item.name;
  if (detailCategory) detailCategory.textContent = item.category;
  if (detailPrice) detailPrice.textContent = item.price;
  if (detailStatusText) detailStatusText.textContent = item.status;
  if (detailDescription) detailDescription.textContent = item.description;
  if (detailCondition) detailCondition.textContent = "Good";

  if (detailImage) {
    detailImage.src = item.image;
    detailImage.alt = item.name;
  }

  if (detailStatusBadge) {
    detailStatusBadge.textContent = item.status;
    detailStatusBadge.className = `status-badge ${getStatusClass(item.status)}`;
  }
}

function setupStatusButtons() {
  const statusText = document.getElementById("detailStatusText");
  const statusBadge = document.getElementById("detailStatusBadge");
  const statusButtons = document.querySelectorAll(".status-action");

  statusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const newStatus = button.dataset.status;
      if (!statusText || !statusBadge) return;

      statusText.textContent = newStatus;
      statusBadge.className = `status-badge ${getStatusClass(newStatus)}`;
      statusBadge.textContent = newStatus;
    });
  });
}

function setupChatWidget() {
  const chatToggle = document.getElementById("chatToggle");
  const chatBox = document.getElementById("chatBox");
  const chatClose = document.getElementById("chatClose");
  const quickQuestions = document.querySelectorAll(".quick-question");
  const chatResponses = document.getElementById("chatResponses");

  if (chatToggle && chatBox) {
    chatToggle.addEventListener("click", () => {
      chatBox.classList.toggle("hidden");
    });
  }

  if (chatClose && chatBox) {
    chatClose.addEventListener("click", () => {
      chatBox.classList.add("hidden");
    });
  }

  quickQuestions.forEach((button) => {
    button.addEventListener("click", () => {
      if (!chatResponses) return;

      const questionText = button.textContent.trim();
      const answerText = button.dataset.answer;

      const userBubble = document.createElement("div");
      userBubble.className = "user-response";
      userBubble.textContent = questionText;

      const assistantBubble = document.createElement("div");
      assistantBubble.className = "assistant-response";
      assistantBubble.textContent = answerText;

      chatResponses.appendChild(userBubble);
      chatResponses.appendChild(assistantBubble);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadItemsFromSharePoint();
  loadDashboardFromSharePoint();
  loadItemDetails();
  setupStatusButtons();
  setupChatWidget();
});
