// =========================
// CONFIG
// =========================
const BASE_URL = "https://dhamanpay.onrender.com/api";

// =========================
// TOKEN HELPERS
// =========================
function getToken() {
  return localStorage.getItem("token");
}

// =========================
// GENERIC REQUEST FUNCTION
// =========================
async function apiRequest(endpoint, method = "GET", body = null) {
  const token = getToken();

  if (!token) {
    throw new Error("No token found. Please login.");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : null
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "API error");
  }

  return data;
}

// =========================
// API FUNCTIONS
// =========================
async function getMe() {
  return apiRequest("/me");
}

async function getOrders() {
  return apiRequest("/orders");
}

async function getDisputes() {
  return apiRequest("/disputes");
}

async function getTransactions() {
  return apiRequest("/transactions");
}

async function getOrderById(id) {
  return apiRequest(`/orders/${id}`);
}

async function releaseOrder(id, note) {
  return apiRequest(`/orders/${id}/release`, "POST", { admin_note: note });
}

async function refundOrder(id, note) {
  return apiRequest(`/orders/${id}/refund`, "POST", { admin_note: note });
}

async function getWallet(userId) {
  return apiRequest(`/wallets/${userId}`);
}

async function logoutUser() {
  return apiRequest("/logout", "POST", {});
}

// =========================
// STATE
// =========================
let orders = [];
let disputes = [];
let transactions = [];
let selectedOrder = null;

// =========================
// UI HELPERS
// =========================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "—";
}

function showMessage(msg, success = true) {
  const box = document.getElementById("adminMessage");
  if (!box) return;

  box.classList.remove("hidden");
  box.style.background = success ? "#d1fae5" : "#fee2e2";
  box.style.color = success ? "#065f46" : "#7f1d1d";
  box.textContent = msg;

  setTimeout(() => box.classList.add("hidden"), 3000);
}

// =========================
// LOAD DASHBOARD DATA
// =========================
async function loadDashboard() {
  const me = await getMe();
  setText("adminName", me.data.full_name);

  const ordersRes = await getOrders();
  orders = ordersRes.data || [];

  const disputesRes = await getDisputes();
  disputes = disputesRes.data || [];

  const txRes = await getTransactions();
  transactions = txRes.data || [];

  renderStats();
}

// =========================
// STATS
// =========================
function renderStats() {
  const pending = orders.filter(o =>
    o.status === "DELIVERED_PENDING" || o.status === "DISPUTE_OPEN"
  ).length;

  const openDisputes = disputes.length;

  setText("heroPendingReleases", pending);
  setText("heroOpenDisputes", openDisputes);
  setText("heroAutoReleasesDue", pending);
  setText("heroFlags", 0);

  setText("overviewPendingReleases", pending);
  setText("overviewOpenDisputes", openDisputes);
  setText("overviewAutoReleasesDue", pending);
}

// =========================
// ORDER ACTIONS
// =========================
async function loadOrderDetails() {
  const id = document.getElementById("actionOrderId")?.value;

  if (!id) {
    showMessage("Enter order ID", false);
    return;
  }

  try {
    const res = await getOrderById(id);
    selectedOrder = res.data;

    setText("selectedOrderStatus", selectedOrder.status);
    setText("selectedOrderAmount", selectedOrder.amount + " DZD");
    setText("selectedOrderCustomer", selectedOrder.customer_id);
    setText("selectedOrderMerchant", selectedOrder.merchant_id);

    const releaseBtn = document.getElementById("releaseBtn");
    const refundBtn = document.getElementById("refundBtn");

    if (releaseBtn) releaseBtn.disabled = false;
    if (refundBtn) refundBtn.disabled = false;

  } catch (err) {
    console.error(err);
    showMessage(err.message, false);
  }
}

async function handleRelease() {
  if (!selectedOrder) {
    showMessage("Load an order first", false);
    return;
  }

  const note = document.getElementById("adminNote")?.value;

  if (!note) {
    showMessage("Add admin note", false);
    return;
  }

  try {
    await releaseOrder(selectedOrder.id, note);
    showMessage("Order released ✔");
    await loadDashboard();
  } catch (err) {
    console.error(err);
    showMessage(err.message, false);
  }
}

async function handleRefund() {
  if (!selectedOrder) {
    showMessage("Load an order first", false);
    return;
  }

  const note = document.getElementById("adminNote")?.value;

  if (!note) {
    showMessage("Add admin note", false);
    return;
  }

  try {
    await refundOrder(selectedOrder.id, note);
    showMessage("Order refunded ✔");
    await loadDashboard();
  } catch (err) {
    console.error(err);
    showMessage(err.message, false);
  }
}

// =========================
// WALLET LOOKUP ONLY
// =========================
async function loadWalletUI() {
  const id = document.getElementById("walletUserIdInput")?.value;

  if (!id) {
    showMessage("Enter user ID", false);
    return;
  }

  try {
    const res = await getWallet(id);

    setText("walletAvailable", res.data.available_balance + " DZD");
    setText("walletFrozen", res.data.frozen_balance + " DZD");

    showMessage("Wallet loaded ✔");
  } catch (err) {
    console.error(err);
    showMessage(err.message, false);
  }
}

// =========================
// LOGOUT
// =========================
async function logout() {
  try {
    await logoutUser();
  } catch (err) {
    console.warn("Logout API failed:", err.message);
  }

  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// =========================
// EVENTS
// =========================
function attachEvents() {
  document.getElementById("checkOrderBtn")?.addEventListener("click", loadOrderDetails);
  document.getElementById("releaseBtn")?.addEventListener("click", handleRelease);
  document.getElementById("refundBtn")?.addEventListener("click", handleRefund);

  document.getElementById("loadWalletBtn")?.addEventListener("click", loadWalletUI);

  document.getElementById("logoutBtn")?.addEventListener("click", logout);
}

// =========================
// INIT
// =========================
async function init() {
  const loader = document.getElementById("loader");
  const bar = document.getElementById("loader-bar");

  try {
    if (bar) bar.style.width = "100%";

    attachEvents();

    if (!getToken()) {
      window.location.href = "login.html";
      return;
    }

    await loadDashboard();

  } catch (err) {
    console.error(err);
    showMessage(err.message, false);
  } finally {
    setTimeout(() => {
      if (loader) loader.style.transform = "translateY(-100%)";
    }, 900);
  }
}

document.addEventListener("DOMContentLoaded", init);