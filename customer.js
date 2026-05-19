// ======================
// STATE
// ======================
let orders = [];
let user = null;
let selectedOrder = null;

// ======================
// HELPERS
// ======================
function getToken() {
  return localStorage.getItem("token");
}

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value ?? "—";
}

function setValue(id, value) {
  const node = el(id);
  if (node) node.value = value ?? "";
}

function showMessage(text, type = "") {
  const box = el("confirmMessage");
  if (!box) {
    alert(text);
    return;
  }

  box.classList.remove("hidden");
  box.className = `message ${type}`;
  box.textContent = text;
}

function showWalletMessage(text, type = "") {
  const box = el("walletMessage");
  if (!box) return;

  box.classList.remove("hidden");
  box.className = `message ${type}`;
  box.textContent = text;
}

function normalizeStatus(status) {
  return String(status || "").toUpperCase();
}

function orderCode(order) {
  return order.code || order.order_code || `ORD-${order.id}`;
}

function formatMoney(amount) {
  return `${amount ?? 0} DZD`;
}

function findOrder(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return null;

  return orders.find(order => {
    const id = String(order.id || "").toLowerCase();
    const code = String(order.code || order.order_code || "").toLowerCase();
    return id === clean || code === clean;
  });
}

// ======================
// PROFILE
// ======================
async function loadProfile() {
  try {
    const res = await getMe();
    user = res.data || res;

    setText("heroCustomerName", user.full_name || "Customer");

    setText("customerName", user.full_name);
    setText("customerEmail", user.email);
    setText("customerPhone", user.phone);
    setText("customerId", user.id);
    setText("customerRole", user.role ? String(user.role).toUpperCase() : "CUSTOMER");
    setText("customerWilaya", user.wilaya);
    setText("customerDeliveryType", user.delivery_type);
  } catch (e) {
    console.error("PROFILE ERROR:", e);
    showMessage(e.message || "Failed to load profile.", "error");
  }
}

// ======================
// WALLET
// ======================
async function loadWallet() {
  if (!user?.id) return;

  try {
    const res = await getWallet(user.id);
    const wallet = res.data || res;

    setText("availableAmountText", formatMoney(wallet.available_balance));
    setText("payableAmountText", formatMoney(wallet.frozen_balance));
    setText("refundedAmountText", formatMoney(wallet.refunded_amount));

    setText("heroWallet", formatMoney(wallet.available_balance));
    setText("heroReserved", formatMoney(wallet.frozen_balance));
    setText("heroRefunded", formatMoney(wallet.refunded_amount));
  } catch (e) {
    console.error("WALLET ERROR:", e);
  }
}

// ======================
// ORDERS
// ======================
async function loadOrders() {
  try {
    const res = await getOrders();
    orders = Array.isArray(res.data) ? res.data : [];

    renderOrders();
    renderStats();

    if (selectedOrder?.id) {
      const refreshed = orders.find(o => String(o.id) === String(selectedOrder.id));
      if (refreshed) selectOrder(refreshed.id);
    }
  } catch (e) {
    console.error("ORDERS ERROR:", e);

    const container = el("ordersList");
    if (container) {
      container.innerHTML = `<div class="empty-state">Failed to load orders</div>`;
    }

    showMessage(e.message || "Failed to load orders.", "error");
  }
}

function renderOrders() {
  const container = el("ordersList");
  const emptyState = el("ordersEmptyState") || el("emptyState");
  if (!container) return;

  const searchValue = (el("searchOrdersInput")?.value || "").trim().toLowerCase();
  const statusValue = el("statusOrdersFilter")?.value || "all";

  const filtered = orders.filter(order => {
    const status = normalizeStatus(order.status);

    const haystack = [
      order.id,
      order.code,
      order.order_code,
      order.product_name,
      order.merchant_name,
      order.courier_name,
      order.amount,
      status
    ].join(" ").toLowerCase();

    const matchSearch = !searchValue || haystack.includes(searchValue);
    const matchStatus = statusValue === "all" || status === statusValue;

    return matchSearch && matchStatus;
  });

  container.innerHTML = "";

  if (!filtered.length) {
    if (emptyState) emptyState.classList.remove("hidden");
    container.innerHTML = `<div class="empty-state">No orders found.</div>`;
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  filtered.forEach(order => {
    const status = normalizeStatus(order.status);
    const canConfirm = status === "SHIPPED" || status === "DELIVERED_PENDING";
    const canDispute = status === "DELIVERED_PENDING";

    const card = document.createElement("div");
    card.className = "list-card";

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div>
          <h3 style="margin:0;">${orderCode(order)}</h3>
          <p style="margin-top:8px;">${order.product_name || "Product"}</p>
          <p>${formatMoney(order.amount)}</p>
          <p>Status: <b>${status || "UNKNOWN"}</b></p>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;min-width:150px;">
          <button class="dp-gold-btn" onclick="selectOrder(${order.id})">
            Open
          </button>

          ${
            canConfirm
              ? `<button class="dp-gold-btn" onclick="confirmOrderUI(${order.id})">
                  Confirm
                </button>`
              : ""
          }

          ${
            canDispute
              ? `<button class="danger-btn" onclick="openDisputeUI(${order.id})">
                  Open Dispute
                </button>`
              : ""
          }
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// ======================
// SELECT / LOAD ORDER
// ======================
function selectOrder(id) {
  const order = orders.find(o => String(o.id) === String(id));
  if (!order) return;

  selectedOrder = order;
  const status = normalizeStatus(order.status);

  setText("detailCode", orderCode(order));
  setText("detailStatusBadge", status);
  setText("detailAmount", formatMoney(order.amount));
  setText("detailMerchant", order.merchant_name || order.merchant?.full_name || "—");
  setText("detailCourier", order.courier_name || order.courier?.full_name || "—");
  setText("detailTracking", order.tracking_number || "—");
  setText("detailPayment", order.payment_method || "Escrow");
  setText("detailDate", order.created_at || "—");

  setText("previewOrderCode", orderCode(order));
  setText("previewMerchant", order.merchant_name || order.merchant?.full_name || "—");
  setText("previewCourier", order.courier_name || order.courier?.full_name || "—");
  setText("previewAmount", formatMoney(order.amount));
  setText("previewStatus", status);
  setText("confirmStatusBadge", status);

  setValue("confirmOrderCode", order.code || order.order_code || order.id);
  setValue("disputeOrderCode", order.code || order.order_code || order.id);

  showMessage(`Order ${orderCode(order)} loaded.`, "success");
}

function loadOrderAction() {
  const value = el("confirmOrderCode")?.value;
  const order = findOrder(value);

  if (!value) {
    showMessage("Enter an order ID or code.", "error");
    return;
  }

  if (!order) {
    showMessage("Order not found.", "error");
    return;
  }

  selectOrder(order.id);
}

// ======================
// ACTIONS
// ======================
async function confirmOrderUI(id = null) {
  const orderId = id || selectedOrder?.id;

  if (!orderId) {
    showMessage("Load an order first.", "error");
    return;
  }

  try {
    await confirmOrder(orderId);
    showMessage("Order confirmed successfully.", "success");
    await loadOrders();
    await loadWallet();
  } catch (e) {
    console.error("CONFIRM ERROR:", e);
    showMessage(e.message || "Failed to confirm order.", "error");
  }
}

async function cancelOrderUI(id = null) {
  const orderId = id || selectedOrder?.id;

  if (!orderId) {
    showMessage("Load an order first.", "error");
    return;
  }

  try {
    await cancelOrder(orderId);
    showMessage("Order cancelled.", "success");
    await loadOrders();
    await loadWallet();
  } catch (e) {
    console.error("CANCEL ERROR:", e);
    showMessage(e.message || "Failed to cancel order.", "error");
  }
}

async function openDisputeUI(id = null) {
  let order = null;

  if (id) {
    order = orders.find(o => String(o.id) === String(id));
  } else if (selectedOrder?.id) {
    order = selectedOrder;
  } else {
    const inputValue = el("disputeOrderCode")?.value || el("confirmOrderCode")?.value;
    order = findOrder(inputValue);
  }

  if (!order?.id) {
    showMessage("Load/select an order first.", "error");
    return;
  }

  const status = normalizeStatus(order.status);

  if (status !== "DELIVERED_PENDING") {
    showMessage("Dispute is allowed only when order status is DELIVERED_PENDING.", "error");
    return;
  }

  let reason = el("disputeReason")?.value || el("disputeMessage")?.value || "";

  if (!reason.trim()) {
    reason = prompt("Enter dispute reason:") || "";
  }

  reason = reason.trim();

  if (!reason) {
    showMessage("Dispute reason is required.", "error");
    return;
  }

  try {
    await openDispute(order.id, { reason });

    showMessage("Dispute opened successfully.", "success");

    setValue("disputeReason", "");
    setValue("disputeMessage", "");

    await loadOrders();
    await loadWallet();
  } catch (e) {
    console.error("DISPUTE ERROR:", e);
    showMessage(e.message || "Failed to open dispute.", "error");
  }
}

// ======================
// STATS
// ======================
function renderStats() {
  let active = 0;
  let completed = 0;
  let disputed = 0;

  orders.forEach(order => {
    const status = normalizeStatus(order.status);

    if (status === "COMPLETED") completed++;
    else if (status === "DISPUTE_OPEN") disputed++;
    else active++;
  });

  setText("heroActive", active);
  setText("heroCompleted", completed);
  setText("heroDisputed", disputed);

  setText("activeOrders", active);
  setText("completedOrders", completed);
  setText("disputedOrders", disputed);
}

// ======================
// TOP UP
// ======================
async function topUpMoney() {
  const amountInput = el("topUpAmount");
  if (!amountInput) return;

  const amount = Number(amountInput.value);

  if (!amount || amount <= 0) {
    showWalletMessage("Please enter a valid amount.", "error");
    return;
  }

  if (!user?.id) {
    showWalletMessage("Profile not loaded yet.", "error");
    return;
  }

  try {
    showWalletMessage("Adding money...");

    await window.addMoney(user.id, amount);

    showWalletMessage(`Successfully added ${amount} DZD`, "success");

    amountInput.value = "";

    await loadWallet();
  } catch (e) {
    console.error("TOP UP ERROR:", e);
    showWalletMessage(e.message || "Failed to add money.", "error");
  }
}

// ======================
// NAVIGATION
// ======================
function goToView(viewId) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  document.querySelectorAll("[data-view-link]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.viewLink === viewId);
  });
}

// ======================
// LOGOUT
// ======================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ======================
// INIT
// ======================
document.addEventListener("DOMContentLoaded", async () => {
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  document.addEventListener("click", event => {
    const viewBtn = event.target.closest("[data-view-link]");
    if (viewBtn) {
      event.preventDefault();
      goToView(viewBtn.dataset.viewLink);
    }
  });

  el("logoutBtn")?.addEventListener("click", logout);

  el("topUpBtn")?.addEventListener("click", topUpMoney);

  el("searchOrdersInput")?.addEventListener("input", renderOrders);
  el("statusOrdersFilter")?.addEventListener("change", renderOrders);

  el("resetOrdersBtn")?.addEventListener("click", () => {
    if (el("searchOrdersInput")) el("searchOrdersInput").value = "";
    if (el("statusOrdersFilter")) el("statusOrdersFilter").value = "all";
    renderOrders();
  });

  el("refreshOrdersBtn")?.addEventListener("click", loadOrders);

  el("findOrderBtn")?.addEventListener("click", loadOrderAction);

  el("confirmPaymentBtn")?.addEventListener("click", () => confirmOrderUI());

  el("cancelOrderBtn")?.addEventListener("click", () => cancelOrderUI());

  el("openDisputeBtn")?.addEventListener("click", () => openDisputeUI());
  el("submitDisputeBtn")?.addEventListener("click", () => openDisputeUI());

  await loadProfile();
  await loadWallet();
  await loadOrders();
});

// Make functions available for onclick=""
window.selectOrder = selectOrder;
window.confirmOrderUI = confirmOrderUI;
window.cancelOrderUI = cancelOrderUI;
window.openDisputeUI = openDisputeUI;