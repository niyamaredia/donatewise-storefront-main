/* ================= ENTRA LOGIN ================= */

const msalConfig = {
  auth: {
    clientId: "41e77794-2cef-4424-b53e-27ef6ac330a4",
    authority: "https://login.microsoftonline.com/b3de72ce-b6b0-4a0c-b0f8-bf01821c6298",
    redirectUri: "https://niyamaredia.github.io/donatewise-storefront-main/"
  },
  cache: {
    cacheLocation: "sessionStorage"
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

async function handleRedirect() {
  try {
    const response = await msalInstance.handleRedirectPromise();

    if (response && response.account) {
      msalInstance.setActiveAccount(response.account);
      window.location.href = "home.html";
      return;
    }

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }
  } catch (error) {
    console.error("Redirect handling error:", error);
  }
}

function signIn() {
  msalInstance.loginRedirect({
    scopes: ["openid", "profile", "User.Read"]
  });
}

function isLoggedIn() {
  return msalInstance.getAllAccounts().length > 0;
}

const apiUrl =
  "https://defaultb3de72ceb6b04a0cb0f8bf01821c62.98.environment.api.powerplatform.com/powerautomate/automations/direct/workflows/49142a2f12af4da183ce32a74216ca9d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=su2OCBJkJ2Rw_nIbk6SZomBnz0cep0BqtSo9KX-XlW4";

/* -------------------------------------------------
   DONATEWISE FINAL SCRIPT
   - home.html: live inventory grid
   - dashboard.html: stats + recent activity
   - item.html: item details
   - chat widget
   - search + category filters
------------------------------------------------- */

let storefrontItems = [];

/* -------------------------------------------------
   FALLBACK ITEM DATA
------------------------------------------------- */

const itemDescriptions = {
  'dell monitor 24"':
    "24-inch Dell monitor in good working condition. Suitable for workstation and office use.",
  "office chair":
    "Used office chair in good condition. Suitable for a desk, reception space, or workstation.",
  "winter jacket":
    "Warm winter jacket available in good condition and ready for use.",
  "laptop - hp":
    "Used HP laptop listing from the internal storefront inventory.",
  "coffee table":
    "Simple coffee table suitable for office lounge or home use.",
  "men’s dress shirts":
    "A set of dress shirts in wearable condition for everyday use.",
  "men's dress shirts":
    "A set of dress shirts in wearable condition for everyday use.",
  "microwave oven":
    "Microwave oven in working condition, suitable for household use.",
  "desk lamp":
    "Compact desk lamp suitable for workspace or study table use.",
  watch:
    "Wearable accessory item listed through the storefront inventory.",
  calculator:
    "Basic calculator suitable for school, office, or home use.",
  camera:
    "Camera item listed in the storefront inventory.",
  "digital clock":
    "Digital clock suitable for desk or household use.",
  books:
    "A selection of books available through the inventory listing.",
  guitar:
    "Guitar item listed in the internal storefront inventory.",
  blankets:
    "Blankets available through the internal storefront inventory.",
  bicycle:
    "Bicycle listing available in the staff storefront.",
  hats:
    "Hat listing available in the staff storefront.",
  shelf:
    "Shelf listing available in the internal storefront inventory."
};

/* -------------------------------------------------
   HELPERS
------------------------------------------------- */

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getFieldValue(field, fallback = "") {
  if (field === null || field === undefined) return fallback;

  if (
    typeof field === "string" ||
    typeof field === "number" ||
    typeof field === "boolean"
  ) {
    return field;
  }

  if (Array.isArray(field)) {
    if (!field.length) return fallback;

    if (typeof field[0] === "string" || typeof field[0] === "number") {
      return field.join(", ");
    }

    if (field[0]?.Value) {
      return field.map((item) => item.Value).join(", ");
    }

    return fallback;
  }

  if (field?.Value) return field.Value;
  if (field?.Label) return field.Label;
  if (field?.Url) return field.Url;

  return fallback;
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCurrency(value) {
  const num = safeNumber(value, null);
  if (num === null) return "$0.00";
  return `$${num.toFixed(2)}`;
}

function formatStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) return "Available";

  const lower = raw.toLowerCase();

  if (lower === "pending") return "Pending";
  if (lower === "pending pickup") return "Pending Pickup";
  if (lower === "sold") return "Sold";
  if (lower === "available") return "Available";

  return raw;
}

function getStatusClass(status) {
  const normalized = normalizeText(status);

  if (normalized.includes("sold")) return "sold";
  if (normalized.includes("pending")) return "pending";
  return "available";
}

function formatSyncTime() {
  const now = new Date();
  return `Last synced ${now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function setSyncText(message) {
  const syncText = $("syncText");
  const dashboardSyncText = $("dashboardSyncText");

  if (syncText) syncText.textContent = message;
  if (dashboardSyncText) dashboardSyncText.textContent = message;
}

/* -------------------------------------------------
   IMAGE HELPERS
------------------------------------------------- */

function getCategoryEmoji(category) {
  const value = normalizeText(category);

  if (value.includes("electronic")) return "💻";
  if (value.includes("furniture")) return "🪑";
  if (value.includes("clothing")) return "🧥";
  if (value.includes("household")) return "🏠";
  if (value.includes("office")) return "🗂️";
  if (value.includes("accessor")) return "⌚";

  return "📦";
}

function buildSvgPlaceholder(title, category) {
  const safeTitle = escapeHtml(title || "Inventory Item");
  const safeCategory = escapeHtml(category || "Storefront Listing");
  const emoji = getCategoryEmoji(category);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#dbeafe" />
          <stop offset="100%" stop-color="#ede9fe" />
        </linearGradient>
      </defs>

      <rect width="800" height="520" fill="url(#grad)"/>
      <circle cx="400" cy="170" r="72" fill="#ffffff" opacity="0.92"/>
      <text x="400" y="192" text-anchor="middle" font-size="56">${emoji}</text>

      <text x="400" y="305"
            text-anchor="middle"
            font-size="34"
            font-family="Arial, sans-serif"
            font-weight="700"
            fill="#111827">${safeTitle}</text>

      <text x="400" y="350"
            text-anchor="middle"
            font-size="22"
            font-family="Arial, sans-serif"
            fill="#667085">${safeCategory}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getImageUrlFromItem(item, title, category) {
  const possibleImage =
    getFieldValue(item.ImageURL, "") ||
    getFieldValue(item.ImageUrl, "") ||
    getFieldValue(item.Image, "") ||
    getFieldValue(item.Photo, "") ||
    getFieldValue(item.Thumbnail, "") ||
    "";

  if (possibleImage && String(possibleImage).startsWith("http")) {
    return possibleImage;
  }

  return buildSvgPlaceholder(title, category);
}

/* -------------------------------------------------
   DESCRIPTION HELPERS
------------------------------------------------- */

function getDescriptionForItem(title, category, condition, status) {
  const normalizedTitle = normalizeText(title);

  if (itemDescriptions[normalizedTitle]) {
    return itemDescriptions[normalizedTitle];
  }

  return `${title} is listed in the ${category || "inventory"} category with a current condition of ${condition} and a status of ${formatStatus(status)}.`;
}

/* -------------------------------------------------
   FLOW FETCH
------------------------------------------------- */

async function fetchLiveInventory() {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Flow request failed with status ${response.status}`);
  }

  const data = await response.json();

  console.log("FULL FLOW RESPONSE:", data);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.body)) return data.body;
  if (Array.isArray(data.data)) return data.data;

  console.log("Unknown response format:", data);
  return [];
}

/* -------------------------------------------------
   DATA MAPPING
   NEW FLOW FIELD MAPPING:
   Title = item name
   field_1.Value = category
   field_2 = price
   field_3.Value = status
   field_4.Value = condition
------------------------------------------------- */

function mapSharePointItems(rawItems) {
  return rawItems.map((item, index) => {
    const title = String(
      getFieldValue(item.Title, `Untitled Item ${index + 1}`)
    ).trim();

    const category = String(
      getFieldValue(item.field_1?.Value || item.field_1, "Uncategorized")
    ).trim();

    const price = safeNumber(getFieldValue(item.field_2, 0), 0);

    const status = formatStatus(
      getFieldValue(item.field_3?.Value || item.field_3, "Available")
    );

    const condition = String(
      getFieldValue(item.field_4?.Value || item.field_4, "Good")
    ).trim();

    const key = slugify(title) || `item-${index + 1}`;

    return {
      id: key,
      key,
      title,
      category,
      price,
      status,
      condition,
      description: getDescriptionForItem(title, category, condition, status),
      image: getImageUrlFromItem(item, title, category),
      raw: item
    };
  });
}

/* -------------------------------------------------
   INVENTORY RENDER
------------------------------------------------- */

function renderInventory(items) {
  const inventoryGrid = $("inventoryGrid");
  if (!inventoryGrid) return;

  inventoryGrid.innerHTML = "";

  if (!items.length) {
    inventoryGrid.innerHTML = `
      <div class="empty-state">
        <p>No storefront listings are available right now.</p>
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.dataset.name = normalizeText(item.title);
    card.dataset.category = normalizeText(item.category);
    card.dataset.status = normalizeText(item.status);

    card.innerHTML = `
      <img
        src="${item.image}"
        class="item-image"
        alt="${escapeHtml(item.title)}"
        loading="lazy"
      >

      <div class="item-content">
        <div class="item-top-row">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="status-badge ${getStatusClass(item.status)}">
            ${escapeHtml(item.status)}
          </span>
        </div>

        <p class="item-category">${escapeHtml(item.category)}</p>
        <p class="item-price">${formatCurrency(item.price)}</p>
        <p class="item-category">Condition: ${escapeHtml(item.condition)}</p>

        <div class="item-actions">
          <a class="card-link" href="item.html?item=${encodeURIComponent(item.key)}">
            View Details
          </a>
        </div>
      </div>
    `;

    inventoryGrid.appendChild(card);
  });
}

/* -------------------------------------------------
   FILTERING
------------------------------------------------- */

function filterItems(items, searchTerm, category) {
  const normalizedSearch = normalizeText(searchTerm);
  const normalizedCategory = normalizeText(category);

  return items.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(item.title).includes(normalizedSearch) ||
      normalizeText(item.category).includes(normalizedSearch);

    const matchesCategory =
      normalizedCategory === "all" ||
      normalizeText(item.category) === normalizedCategory;

    return matchesSearch && matchesCategory;
  });
}

function setupFiltering() {
  const searchInput = $("searchInput");
  const filterButtons = document.querySelectorAll(".filter-btn");

  if (!searchInput && !filterButtons.length) return;

  let activeCategory = "all";

  function applyFilters() {
    const searchTerm = searchInput ? searchInput.value : "";
    const filtered = filterItems(storefrontItems, searchTerm, activeCategory);
    renderInventory(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      activeCategory = button.dataset.category || "all";
      applyFilters();
    });
  });
}

/* -------------------------------------------------
   HOME PAGE LOAD
------------------------------------------------- */

async function loadItemsFromSharePoint() {
  const inventoryGrid = $("inventoryGrid");
  if (!inventoryGrid) return;

  try {
    inventoryGrid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading live inventory...</p>
      </div>
    `;

    setSyncText("Syncing with SharePoint...");

    const rawItems = await fetchLiveInventory();
    console.log("RAW ITEMS:", rawItems);

    storefrontItems = mapSharePointItems(rawItems);
    console.log("MAPPED ITEMS:", storefrontItems);

    renderInventory(storefrontItems);
    setupFiltering();
    setSyncText(formatSyncTime());
  } catch (error) {
    console.error("Error loading SharePoint items:", error);

    inventoryGrid.innerHTML = `
      <div class="empty-state">
        <p>Could not load SharePoint data right now.</p>
      </div>
    `;

    setSyncText("Sync failed");
  }
}

/* -------------------------------------------------
   DASHBOARD
------------------------------------------------- */

function countItemsByStatus(items) {
  let available = 0;
  let pending = 0;
  let sold = 0;

  items.forEach((item) => {
    const status = normalizeText(item.status);

    if (status.includes("sold")) {
      sold += 1;
    } else if (status.includes("pending")) {
      pending += 1;
    } else {
      available += 1;
    }
  });

  return {
    total: items.length,
    available,
    pending,
    sold
  };
}

function renderDashboardStats(items) {
  const statTotal = $("statTotal");
  const statAvailable = $("statAvailable");
  const statPending = $("statPending");
  const statSold = $("statSold");

  if (!statTotal || !statAvailable || !statPending || !statSold) return;

  const counts = countItemsByStatus(items);

  statTotal.textContent = counts.total;
  statAvailable.textContent = counts.available;
  statPending.textContent = counts.pending;
  statSold.textContent = counts.sold;
}

function renderDashboardTable(items) {
  const dashboardTableBody = $("dashboardTableBody");
  if (!dashboardTableBody) return;

  dashboardTableBody.innerHTML = "";

  if (!items.length) {
    dashboardTableBody.innerHTML = `
      <tr>
        <td colspan="4">No recent inventory updates available.</td>
      </tr>
    `;
    return;
  }

  items.slice(0, 10).forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>
        <span class="status-badge ${getStatusClass(item.status)}">
          ${escapeHtml(item.status)}
        </span>
      </td>
      <td>${escapeHtml(item.condition)}</td>
    `;

    dashboardTableBody.appendChild(row);
  });
}

async function loadDashboardFromSharePoint() {
  const dashboardTableBody = $("dashboardTableBody");
  if (!dashboardTableBody) return;

  try {
    setSyncText("Syncing dashboard...");

    const rawItems = await fetchLiveInventory();
    const items = mapSharePointItems(rawItems);

    renderDashboardStats(items);
    renderDashboardTable(items);
    setSyncText(formatSyncTime());
  } catch (error) {
    console.error("Dashboard load error:", error);

    dashboardTableBody.innerHTML = `
      <tr>
        <td colspan="4">Could not load live dashboard data.</td>
      </tr>
    `;

    setSyncText("Sync failed");
  }
}

/* -------------------------------------------------
   ITEM DETAILS
------------------------------------------------- */

function findItemByKey(itemKey) {
  if (!itemKey) return null;

  const normalizedKey = String(itemKey).trim();

  const fromLoadedItems = storefrontItems.find((item) => item.key === normalizedKey);
  if (fromLoadedItems) return fromLoadedItems;

  return null;
}

function fillItemDetails(item) {
  const detailName = $("detailName");
  const detailCategory = $("detailCategory");
  const detailCondition = $("detailCondition");
  const detailPrice = $("detailPrice");
  const detailStatusText = $("detailStatusText");
  const detailStatusBadge = $("detailStatusBadge");
  const detailDescription = $("detailDescription");
  const detailImage = $("detailImage");

  if (detailName) detailName.textContent = item.title;
  if (detailCategory) detailCategory.textContent = item.category;
  if (detailCondition) detailCondition.textContent = item.condition;
  if (detailPrice) detailPrice.textContent = formatCurrency(item.price);
  if (detailStatusText) detailStatusText.textContent = item.status;
  if (detailDescription) detailDescription.textContent = item.description;

  if (detailImage) {
    detailImage.src = item.image;
    detailImage.alt = item.title;
  }

  if (detailStatusBadge) {
    detailStatusBadge.textContent = item.status;
    detailStatusBadge.className = `status-badge ${getStatusClass(item.status)}`;
  }
}

async function loadItemDetails() {
  const detailName = $("detailName");
  if (!detailName) return;

  const params = new URLSearchParams(window.location.search);
  const itemKey = params.get("item");

  if (!itemKey) {
    detailName.textContent = "Item not found";
    return;
  }

  try {
    setSyncText("Loading item details...");

    if (!storefrontItems.length) {
      const rawItems = await fetchLiveInventory();
      storefrontItems = mapSharePointItems(rawItems);
    }

    const item = findItemByKey(itemKey);

    if (!item) {
      detailName.textContent = "Item not found";
      const detailDescription = $("detailDescription");
      if (detailDescription) {
        detailDescription.textContent = "We could not find the selected item.";
      }
      return;
    }

    fillItemDetails(item);
    setSyncText(formatSyncTime());
  } catch (error) {
    console.error("Item details load error:", error);
    detailName.textContent = "Could not load item";
  }
}

/* -------------------------------------------------
   STATUS BUTTONS (UI ONLY)
------------------------------------------------- */

function setupStatusButtons() {
  const statusButtons = document.querySelectorAll(".status-action");
  const detailStatusText = $("detailStatusText");
  const detailStatusBadge = $("detailStatusBadge");

  if (!statusButtons.length || !detailStatusText || !detailStatusBadge) return;

  statusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const newStatus = formatStatus(button.dataset.status || "Available");

      detailStatusText.textContent = newStatus;
      detailStatusBadge.textContent = newStatus;
      detailStatusBadge.className = `status-badge ${getStatusClass(newStatus)}`;
    });
  });
}

/* -------------------------------------------------
   CHAT WIDGET
------------------------------------------------- */

function appendChatBubble(container, className, text) {
  const bubble = document.createElement("div");
  bubble.className = className;
  bubble.textContent = text;
  container.appendChild(bubble);
}

function setupChatWidget() {
  const chatToggle = $("chatToggle");
  const chatBox = $("chatBox");
  const chatClose = $("chatClose");
  const chatResponses = $("chatResponses");
  const quickQuestions = document.querySelectorAll(".quick-question");

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

  if (!chatResponses) return;

  quickQuestions.forEach((button) => {
    button.addEventListener("click", () => {
      const question = button.textContent.trim();
      const answer = button.dataset.answer || "No answer available.";

      appendChatBubble(chatResponses, "user-response", question);
      appendChatBubble(chatResponses, "assistant-response", answer);

      chatResponses.scrollTop = chatResponses.scrollHeight;
    });
  });
}

/* -------------------------------------------------
   PAGE INITIALIZER
------------------------------------------------- */

function initPage() {
  const hasInventoryGrid = !!$("inventoryGrid");
  const hasDashboard = !!$("dashboardTableBody");
  const hasItemDetails = !!$("detailName");

  if (hasInventoryGrid) {
    loadItemsFromSharePoint();
  }

  if (hasDashboard) {
    loadDashboardFromSharePoint();
  }

  if (hasItemDetails) {
    loadItemDetails();
  }

  setupStatusButtons();
  setupChatWidget();
}

document.addEventListener("DOMContentLoaded", async () => {
  await handleRedirect();

  const btn = document.getElementById("microsoftLoginBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      if (!isLoggedIn()) {
        signIn();
      } else {
        window.location.href = "home.html";
      }
    });
  }

  const isLoginPage =
    window.location.pathname.endsWith("/") ||
    window.location.pathname.endsWith("index.html");

  if (!isLoginPage && !isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }

  initPage();
});
