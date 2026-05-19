// ===============================
// DHAMANPAY ADMIN DASHBOARD JS
// FINAL FIXED VERSION
// ===============================


// ===============================
// STATE
// ===============================
let orders = [];
let disputes = [];
let users = [];
let transactions = [];
let adminProfile = null;


// ===============================
// HELPERS
// ===============================
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
// VIEW NAVIGATION
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

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      goToView(btn.dataset.viewLink);
    });

  });
}

function goToView(id) {

  const view = document.getElementById(id);

  if (!view) {
    console.error("View not found:", id);
    return;
  }

  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("active");
  });

  view.classList.add("active");

  document.querySelectorAll("[data-view-link]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.viewLink === id);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ===============================
// LOAD ADMIN PROFILE
// ===============================
async function loadAdminProfile() {

  try {

    const res = await getMe();

    adminProfile = res.data;

    console.log("ADMIN:", adminProfile);

    setText("adminName", adminProfile.full_name);
    setText("adminEmail", adminProfile.email);
    setText("adminPhone", adminProfile.phone);
    setText("adminRole", adminProfile.role);

  } catch (e) {

    console.error("PROFILE ERROR:", e);

  }
}


// ===============================
// LOAD ORDERS
// ===============================
async function loadOrders() {

  try {

    const res = await getOrders();

    orders = res.data || [];

    console.log("ORDERS:", orders);

    renderOrders();
    renderStats();

  } catch (e) {

    console.error("ORDERS ERROR:", e);

  }
}


// ===============================
// RENDER ORDERS
// ===============================
function renderOrders() {

  const container = $("ordersList");

  if (!container) return;

  container.innerHTML = "";

  if (!orders.length) {

    container.innerHTML = `
      <div class="empty-state">
        No orders found
      </div>
    `;

    return;
  }

  orders.forEach(order => {

    const fee = Number(order.amount || 0) * 0.018;
    const merchantNet = Number(order.amount || 0) - fee;

    const div = document.createElement("div");

    div.className = "list-card";

    div.innerHTML = `
      <div class="list-head">

        <div>
          <div class="list-title">
            Order #${order.id}
          </div>

          <div class="meta">
            <span>${order.product_name}</span>
            <span>${order.status}</span>
          </div>
        </div>

      </div>

      <div class="meta">
        <span>Total: ${formatMoney(order.amount)}</span>
        <span>Fee: ${formatMoney(fee)}</span>
        <span>Merchant Receives: ${formatMoney(merchantNet)}</span>
      </div>

      <div class="actions-row">

        ${
          order.status === "DELIVERED"
            ? `
              <button
                class="dp-gold-btn"
                onclick="releaseOrder(${order.id})"
              >
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
// RELEASE ORDER
// ===============================
async function releaseOrder(orderId) {

  try {

    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return showMessage("Order not found", "error");
    }

    const amount = Number(order.amount || 0);

    const fee = amount * 0.018;

    const merchantNet = amount - fee;

    const confirmed = confirm(
      `Release Payment?\n\n` +
      `Order Amount: ${formatMoney(amount)}\n` +
      `DhamanPay Fee (1.8%): ${formatMoney(fee)}\n` +
      `Merchant Receives: ${formatMoney(merchantNet)}`
    );

    if (!confirmed) return;

    showMessage("Releasing payment...", "info");

    // BACKEND RELEASE
    await releaseFunds(orderId);

    showMessage(
      `Released Successfully\n` +
      `Fee Collected: ${formatMoney(fee)}`,
      "success"
    );

    await loadOrders();

  } catch (e) {

    console.error("RELEASE ERROR:", e);

    showMessage(
      e.message || "Failed to release payment",
      "error"
    );

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
  let adminFees = 0;

  orders.forEach(order => {

    if (order.status === "COMPLETED") {
      completed++;
    }

    if (order.status === "DISPUTED") {
      disputesCount++;
    }

    releasedMoney += Number(order.amount || 0);

    adminFees += Number(order.amount || 0) * 0.018;

  });

  setText("totalOrders", total);
  setText("completedOrders", completed);
  setText("disputesCount", disputesCount);

  setText(
    "releasedMoney",
    formatMoney(releasedMoney)
  );

  setText(
    "adminWallet",
    formatMoney(adminFees)
  );
}


// ===============================
// LOAD USERS
// ===============================
async function loadUsers() {

  try {

    const res = await getUsers();

    users = res.data || [];

    console.log("USERS:", users);

  } catch (e) {

    console.error("USERS ERROR:", e);

  }
}


// ===============================
// LOAD TRANSACTIONS
// ===============================
async function loadTransactions() {

  try {

    const res = await getTransactions();

    transactions = res.data || [];

    console.log("TRANSACTIONS:", transactions);

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

  if (logoutBtn) {
    logoutBtn.onclick = logout;
  }

  await loadAdminProfile();

  await loadOrders();

  await loadUsers();

  await loadTransactions();

});