// ===============================
// DHAMANPAY ADMIN DASHBOARD JS
// FINAL VERSION: ORIGINAL LOGIC + ADMIN 1.8% FEE ONLY
// ===============================

let orders = [];
let disputes = [];
let users = [];
let transactions = [];
let adminProfile = null;

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "—";
}

function showMessage(text, type = "success") {
  const msg = $("globalMessage");
  if (!msg) return;

  msg.textContent = text;
  msg.className = `message ${type}`;
  msg.classList.remove("hidden");

  setTimeout(() => {
    msg.classList.add("hidden");
  }, 4000);
}

function formatMoney(amount) {
  return `${Number(amount || 0).toFixed(2)} DZD`;
}

// ===============================
// NAVIGATION
// ===============================
function buildNav() {
  const nav = $("topViewNav");

  const views = [
    ["home-view", "Home"],
    ["overview-view", "Overview"],
    ["releases-view", "Release"],
    ["disputes-view", "Disputes"],
    ["orders-view", "Orders"],
    ["users-view", "Wallet"],
    ["transactions-view", "Transactions"],
    ["rules-view", "Rules"],
    ["proofs-view", "Proofs"],
    ["profile-view", "Profile"]
  ];

  if (nav) {
    nav.innerHTML = views.map(([id, label]) => `
      <button class="nav-btn" type="button" data-view-link="${id}">
        ${label}
      </button>
    `).join("");
  }

  document.querySelectorAll("[data-view-link]").forEach(btn => {
    btn.addEventListener("click", () => {
      goToView(btn.dataset.viewLink);
    });
  });
}

function goToView(id) {
  const view = document.getElementById(id);
  if (!view) return;

  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });

  view.classList.add("active");

  document.querySelectorAll("[data-view-link]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.viewLink === id);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===============================
// PROFILE
// ===============================
async function loadAdminProfile() {
  try {
    const res = await getMe();
    adminProfile = res.data;

    setText("adminName", adminProfile.full_name);
    setText("adminEmail", adminProfile.email);
    setText("adminPhone", adminProfile.phone);
    setText("adminRole", adminProfile.role);

    setText("adminNameProfile", adminProfile.full_name);
    setText("adminEmailProfile", adminProfile.email);
  } catch (e) {
    console.error("PROFILE ERROR:", e);
  }
}

// ===============================
// ORDERS
// ===============================
async function loadOrders() {
  try {
    const res = await getOrders();
    orders = res.data || [];

    renderOrders();
    renderStats();
  } catch (e) {
    console.error("ORDERS ERROR:", e);
    showMessage(e.message || "Failed to load orders", "error");
  }
}

function renderOrders() {
  const container = $("ordersList");
  if (!container) return;

  container.innerHTML = "";

  if (!orders.length) {
    container.innerHTML = `<div class="empty-state">No orders found</div>`;
    return;
  }

  orders.forEach(order => {
    const amount = Number(order.amount || 0);
    const adminFee = amount * 0.018;
    const merchantNet = amount - adminFee;

    const div = document.createElement("div");
    div.className = "list-card";

    div.innerHTML = `
      <div class="list-head">
        <div>
          <div class="list-title">Order #${order.id}</div>
          <div class="meta">
            <span>${order.product_name || order.product || "No product"}</span>
            <span>${order.status}</span>
          </div>
        </div>
      </div>

      <div class="meta">
        <span>Total: ${formatMoney(amount)}</span>
        <span>DhamanPay Fee (1.8%): ${formatMoney(adminFee)}</span>
        <span>Merchant Receives: ${formatMoney(merchantNet)}</span>
      </div>

      <div class="actions-row">
        ${
          order.status === "DELIVERED" || order.status === "DELIVERED_PENDING"
            ? `
              <button class="dp-gold-btn" onclick="releaseOrderPayment(${order.id})">
                Release
              </button>
            `
            : ""
        }
      </div>
    `;

    container.appendChild(div);
  });
}

// ===============================
// RELEASE PAYMENT
// ===============================
async function releaseOrderPayment(orderId) {
  try {
    const order = orders.find(o => String(o.id) === String(orderId));

    if (!order) {
      showMessage("Order not found", "error");
      return;
    }

    const amount = Number(order.amount || 0);
    const adminFee = amount * 0.018;
    const merchantNet = amount - adminFee;

    const confirmed = confirm(
      `Release Payment?\n\n` +
      `Order Amount: ${formatMoney(amount)}\n` +
      `DhamanPay Fee (1.8%): ${formatMoney(adminFee)}\n` +
      `Merchant Receives: ${formatMoney(merchantNet)}`
    );

    if (!confirmed) return;

    showMessage("Releasing payment...", "info");

    const backendRelease = window.__apiReleaseOrder || window.releaseOrder;

    if (!backendRelease) {
      throw new Error("releaseOrder function not found. Make sure api.js is loaded before admin.js");
    }

    await backendRelease(
      orderId,
      "Release with DhamanPay 1.8% fee"
    );

    showMessage(
      `Payment released successfully\nFee preview: ${formatMoney(adminFee)}`,
      "success"
    );

    await loadOrders();

  } catch (e) {
    console.error("RELEASE ERROR:", e);
    showMessage(e.message || "Release failed", "error");
  }
}

// ===============================
// STATS
// ===============================
function renderStats() {
  let total = orders.length;
  let completed = 0;
  let disputesCount = 0;
  let releasedMoney = 0;
  let adminWallet = 0;

  orders.forEach(order => {
    const amount = Number(order.amount || 0);

    if (order.status === "COMPLETED") {
      completed++;
      releasedMoney += amount;
      adminWallet += amount * 0.018;
    }

    if (order.status === "DISPUTED" || order.status === "DISPUTE_OPEN") {
      disputesCount++;
    }
  });

  setText("totalOrders", total);
  setText("totalOrders2", total);

  setText("completedOrders", completed);
  setText("completedOrders2", completed);

  setText("disputesCount", disputesCount);
  setText("releasedMoney", formatMoney(releasedMoney));

  setText("adminWallet", formatMoney(adminWallet));
  setText("adminWallet2", formatMoney(adminWallet));
  setText("adminWalletBig", formatMoney(adminWallet));
}

// ===============================
// USERS
// ===============================
async function loadUsers() {
  try {
    if (!window.getUsers) return;

    const res = await getUsers();
    users = res.data || [];
  } catch (e) {
    console.error("USERS ERROR:", e);
  }
}

// ===============================
// TRANSACTIONS
// ===============================
async function loadTransactions() {
  try {
    if (!window.getTransactions) return;

    const res = await getTransactions();
    transactions = res.data || [];
  } catch (e) {
    console.error("TRANSACTIONS ERROR:", e);
  }
}

// ===============================
// LOGOUT
// ===============================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  buildNav();
  goToView("home-view");

  const logoutBtn = $("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = logout;

  await loadAdminProfile();
  await loadOrders();
  await loadUsers();
  await loadTransactions();
});