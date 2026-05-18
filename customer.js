// ======================
// STATE
// ======================
let orders = [];
let user = null;
let selectedOrder = null;

// ======================
// HELPERS
// ======================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value ?? "—";
  }
}

function showMessage(text, type = "") {
  const box = document.getElementById("confirmMessage");

  if (!box) return;

  box.classList.remove("hidden");
  box.className = `message ${type}`;

  box.textContent = text;
}

function showWalletMessage(text, type = "") {
  const box = document.getElementById("walletMessage");

  if (!box) return;

  box.className = `message ${type}`;
  box.textContent = text;
}

// ======================
// PROFILE
// ======================
async function loadProfile() {
  try {
    const res = await getMe();

    user = res.data || res;

    console.log("CUSTOMER:", user);

    setText("heroCustomerName", user.full_name);

    setText("customerName", user.full_name);
    setText("customerEmail", user.email);
    setText("customerPhone", user.phone);
    setText("customerId", user.id);
    setText("customerRole", user.role?.toUpperCase());

    setText("customerWilaya", user.wilaya);
    setText("customerDeliveryType", user.delivery_type);

  } catch (e) {
    console.error("PROFILE ERROR:", e);
  }
}

// ======================
// WALLET
// ======================
async function loadWallet() {
  if (!user || !user.id) return;

  try {
    const res = await getWallet(user.id);

    const wallet = res.data || res;

    setText(
      "availableAmountText",
      `${wallet.available_balance ?? 0} DZD`
    );

    setText(
      "payableAmountText",
      `${wallet.frozen_balance ?? 0} DZD`
    );

    setText(
      "refundedAmountText",
      `${wallet.refunded_amount ?? 0} DZD`
    );

    setText(
      "heroWallet",
      `${wallet.available_balance ?? 0} DZD`
    );

    setText(
      "heroReserved",
      `${wallet.frozen_balance ?? 0} DZD`
    );

    setText(
      "heroRefunded",
      `${wallet.refunded_amount ?? 0} DZD`
    );

  } catch (e) {
    console.error("WALLET ERROR:", e);
  }
}

// ======================
// LOAD ORDERS
// ======================
async function loadOrders() {
  try {
    const res = await getOrders();

    orders = Array.isArray(res.data)
      ? res.data
      : [];

    console.log("ORDERS:", orders);

    renderOrders();
    renderStats();

  } catch (e) {

    console.error("ORDERS ERROR:", e);

    const container =
      document.getElementById("ordersList");

    if (container) {
      container.innerHTML =
        `<div class="empty-state">
          Failed to load orders
        </div>`;
    }
  }
}

// ======================
// RENDER ORDERS
// ======================
function renderOrders() {

  const container =
    document.getElementById("ordersList");

  const emptyState =
    document.getElementById("ordersEmptyState");

  if (!container) return;

  const searchValue =
    (
      document.getElementById("searchOrdersInput")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const statusValue =
    document.getElementById("statusOrdersFilter")
      ?.value || "all";

  const filtered = orders.filter(order => {

    const key =
      String(
        order.code ||
        order.order_code ||
        order.id ||
        ""
      ).toLowerCase();

    const matchSearch =
      !searchValue ||
      key.includes(searchValue);

    const matchStatus =
      statusValue === "all" ||
      order.status === statusValue;

    return matchSearch && matchStatus;
  });

  container.innerHTML = "";

  if (!filtered.length) {

    if (emptyState) {
      emptyState.classList.remove("hidden");
    }

    container.innerHTML =
      `<div class="empty-state">
        No orders found.
      </div>`;

    return;
  }

  if (emptyState) {
    emptyState.classList.add("hidden");
  }

  filtered.forEach(order => {

    const card = document.createElement("div");

    card.className = "list-card";

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div>
          <h3 style="margin:0;">
            ${order.code || "ORD-" + order.id}
          </h3>

          <p style="margin-top:8px;">
            ${order.product_name || "Product"}
          </p>

          <p>
            ${order.amount || 0} DZD
          </p>

          <p>
            Status:
            <b>${order.status || "UNKNOWN"}</b>
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <button
            class="dp-gold-btn"
            onclick="selectOrder(${order.id})"
          >
            Open
          </button>

          ${
            order.status === "SHIPPED" ||
            order.status === "DELIVERED_PENDING"
              ? `
                <button
                  class="dp-gold-btn"
                  onclick="confirmOrderUI(${order.id})"
                >
                  Confirm
                </button>
              `
              : ""
          }
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// ======================
// SELECT ORDER
// ======================
function selectOrder(id) {

  const order = orders.find(
    o => String(o.id) === String(id)
  );

  if (!order) return;

  selectedOrder = order;

  setText(
    "detailCode",
    order.code || `ORD-${order.id}`
  );

  setText(
    "detailStatusBadge",
    order.status
  );

  setText(
    "detailAmount",
    `${order.amount || 0} DZD`
  );

  setText(
    "detailMerchant",
    order.merchant_name || "—"
  );

  setText(
    "detailCourier",
    order.courier_name || "—"
  );

  setText(
    "detailTracking",
    order.tracking_number || "—"
  );

  setText(
    "detailPayment",
    order.payment_method || "Escrow"
  );

  setText(
    "detailDate",
    order.created_at || "—"
  );

  // PREVIEW
  setText(
    "previewOrderCode",
    order.code || `ORD-${order.id}`
  );

  setText(
    "previewMerchant",
    order.merchant_name || "—"
  );

  setText(
    "previewCourier",
    order.courier_name || "—"
  );

  setText(
    "previewAmount",
    `${order.amount || 0} DZD`
  );

  setText(
    "previewStatus",
    order.status
  );

  setText(
    "confirmStatusBadge",
    order.status
  );

  const input =
    document.getElementById(
      "confirmOrderCode"
    );

  if (input) {
    input.value =
      order.code || order.id;
  }
}

// ======================
// FIND ORDER
// ======================
function loadOrderAction() {

  const input =
    document.getElementById(
      "confirmOrderCode"
    );

  if (!input) return;

  const value =
    input.value.trim().toLowerCase();

  if (!value) {
    showMessage(
      "Enter an order ID or code.",
      "error"
    );
    return;
  }

  const order = orders.find(o => {

    const id =
      String(o.id).toLowerCase();

    const code =
      String(
        o.code || o.order_code || ""
      ).toLowerCase();

    return id === value || code === value;
  });

  if (!order) {

    showMessage(
      "Order not found.",
      "error"
    );

    return;
  }

  selectOrder(order.id);

  showMessage(
    "Order loaded successfully.",
    "success"
  );
}

// ======================
// CONFIRM ORDER
// ======================
async function confirmOrderUI(id = null) {

  try {

    const orderId =
      id ||
      selectedOrder?.id;

    if (!orderId) {

      showMessage(
        "Load an order first.",
        "error"
      );

      return;
    }

    await confirmOrder(orderId);

    showMessage(
      "Order confirmed successfully.",
      "success"
    );

    await loadOrders();

  } catch (e) {

    console.error(
      "CONFIRM ERROR:",
      e
    );

    showMessage(
      e.message ||
      "Failed to confirm order.",
      "error"
    );
  }
}

// ======================
// CANCEL ORDER
// ======================
async function cancelOrderUI(id = null) {

  try {

    const orderId =
      id ||
      selectedOrder?.id;

    if (!orderId) {

      showMessage(
        "Load an order first.",
        "error"
      );

      return;
    }

    await cancelOrder(orderId);

    showMessage(
      "Order cancelled.",
      "success"
    );

    await loadOrders();

  } catch (e) {

    console.error(
      "CANCEL ERROR:",
      e
    );

    showMessage(
      e.message ||
      "Failed to cancel order.",
      "error"
    );
  }
}

// ======================
// DISPUTE
// ======================
async function openDisputeUI(id) {

  const reason =
    prompt("Enter dispute reason:");

  if (!reason) return;

  try {

    await openDispute(
      id,
      { reason }
    );

    showMessage(
      "Dispute opened.",
      "success"
    );

    await loadOrders();

  } catch (e) {

    console.error(
      "DISPUTE ERROR:",
      e
    );

    showMessage(
      e.message ||
      "Failed to open dispute.",
      "error"
    );
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

    if (
      order.status === "COMPLETED"
    ) {
      completed++;
    }

    else if (
      order.status === "DISPUTE_OPEN"
    ) {
      disputed++;
    }

    else {
      active++;
    }
  });

  setText(
    "heroActive",
    active
  );

  setText(
    "heroCompleted",
    completed
  );

  setText(
    "heroDisputed",
    disputed
  );

  setText(
    "activeOrders",
    active
  );

  setText(
    "completedOrders",
    completed
  );

  setText(
    "disputedOrders",
    disputed
  );
}

// ======================
// TOP UP
// ======================
async function topUpMoney() {

  const amountInput =
    document.getElementById(
      "topUpAmount"
    );

  if (!amountInput) return;

  const amount =
    Number(amountInput.value);

  if (!amount || amount <= 0) {

    showWalletMessage(
      "Please enter a valid amount.",
      "error"
    );

    return;
  }

  if (
    !user ||
    !user.id
  ) {

    showWalletMessage(
      "Profile not loaded yet.",
      "error"
    );

    return;
  }

  try {

    showWalletMessage(
      "Adding money..."
    );

    await window.addMoney(
      user.id,
      amount
    );

    showWalletMessage(
      `Successfully added ${amount} DZD`,
      "success"
    );

    amountInput.value = "";

    await loadWallet();

  } catch (e) {

    console.error(
      "TOP UP ERROR:",
      e
    );

    showWalletMessage(
      e.message ||
      "Failed to add money.",
      "error"
    );
  }
}

// ======================
// LOGOUT
// ======================
function logout() {

  localStorage.removeItem("token");

  window.location.href =
    "login.html";
}

// ======================
// INIT
// ======================
document.addEventListener(
  "DOMContentLoaded",
  async () => {

    if (!getToken()) {

      window.location.href =
        "login.html";

      return;
    }

    // LOGOUT
    document
      .getElementById("logoutBtn")
      ?.addEventListener(
        "click",
        logout
      );

    // TOP UP
    document
      .getElementById("topUpBtn")
      ?.addEventListener(
        "click",
        topUpMoney
      );

    // SEARCH
    document
      .getElementById("searchOrdersInput")
      ?.addEventListener(
        "input",
        renderOrders
      );

    // FILTER
    document
      .getElementById("statusOrdersFilter")
      ?.addEventListener(
        "change",
        renderOrders
      );

    // RESET FILTERS
    document
      .getElementById("resetOrdersBtn")
      ?.addEventListener(
        "click",
        () => {

          const search =
            document.getElementById(
              "searchOrdersInput"
            );

          const status =
            document.getElementById(
              "statusOrdersFilter"
            );

          if (search) {
            search.value = "";
          }

          if (status) {
            status.value = "all";
          }

          renderOrders();
        }
      );

    // REFRESH
    document
      .getElementById("refreshOrdersBtn")
      ?.addEventListener(
        "click",
        loadOrders
      );

    // LOAD ORDER BUTTON
    document
      .getElementById("findOrderBtn")
      ?.addEventListener(
        "click",
        loadOrderAction
      );

    // CONFIRM BUTTON
    document
      .getElementById("confirmPaymentBtn")
      ?.addEventListener(
        "click",
        () => confirmOrderUI()
      );

    // CANCEL BUTTON
    document
      .getElementById("cancelOrderBtn")
      ?.addEventListener(
        "click",
        () => cancelOrderUI()
      );

    // INITIAL LOAD
    await loadProfile();

    await loadWallet();

    await loadOrders();
  }
);