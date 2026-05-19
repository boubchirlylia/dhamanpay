const API_BASE = "https://dhamanpay.onrender.com/api";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
};

let ALL_ORDERS = [];

function money(v) {
  return `${Number(v || 0).toFixed(2)} DZD`;
}

function getAmount(order) {
  return Number(
    order.amount ||
    order.total_amount ||
    order.gross_amount ||
    order.price ||
    0
  );
}

function getStatus(order) {
  return String(order.status || "").toUpperCase();
}

function dhamanpayFee(amount) {
  return Number(amount || 0) * 0.018;
}

function merchantReceives(amount) {
  return Number(amount || 0) - dhamanpayFee(amount);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function calculateDhamanpayWallet() {
  let total = 0;

  ALL_ORDERS.forEach(order => {
    const status = getStatus(order);

    if (status === "COMPLETED" || status === "RELEASED") {
      total += dhamanpayFee(getAmount(order));
    }
  });

  setText("dhamanpayWallet", money(total));
  setText("dhamanpayWallet2", money(total));
  setText("adminWalletAmount", money(total));
}

async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/me`, { headers });
    const data = await res.json();

    const user = data.user || data.data || data;
    const name = user.name || "Admin";
    const role = user.role || "ADMIN";

    setText("adminName", name);
    setText("heroAdminName", name);
    setText("adminCardName", name);
    setText("heroAdminRole", role);
    setText("adminCardRole", role);

  } catch (err) {
    console.error("Profile error:", err);
  }
}

async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`, { headers });
    const data = await res.json();

    ALL_ORDERS = Array.isArray(data)
      ? data
      : data.data || data.orders || [];

    updateDashboard();
    renderOrders();

  } catch (err) {
    console.error("Orders error:", err);
    alert("Failed to load orders");
  }
}

function updateDashboard() {
  const totalOrders = ALL_ORDERS.length;

  const disputes = ALL_ORDERS.filter(
    o => getStatus(o) === "DISPUTE_OPEN"
  ).length;

  const pending = ALL_ORDERS.filter(o => {
    const s = getStatus(o);
    return s === "DELIVERED_PENDING" || s === "DELIVERED" || s === "CONFIRMED";
  }).length;

  const completed = ALL_ORDERS.filter(o => {
    const s = getStatus(o);
    return s === "COMPLETED" || s === "RELEASED";
  }).length;

  const created = ALL_ORDERS.filter(o => getStatus(o) === "CREATED").length;
  const frozen = ALL_ORDERS.filter(o => getStatus(o) === "ESCROW_FROZEN").length;

  setText("heroOrders", totalOrders);
  setText("heroOpenDisputes", disputes);
  setText("heroPendingReleases", pending);
  setText("heroCompleted", completed);

  setText("statTotalOrders", totalOrders);
  setText("statPendingRelease", pending);
  setText("statOpenDisputes", disputes);
  setText("statTransactions", completed);

  setText("overviewCreated", created);
  setText("overviewFrozen", frozen);
  setText("overviewDeliveredPending", pending);
  setText("overviewCompleted", completed);

  setText("disputeOpenCount", disputes);
  setText("disputeTotalCount", disputes);

  calculateDhamanpayWallet();
}

function renderOrders() {
  const container =
    document.getElementById("ordersList") ||
    document.getElementById("ordersContainer");

  if (!container) return;

  if (!ALL_ORDERS.length) {
    container.innerHTML = `
      <div class="empty-state">
        No orders found
      </div>
    `;
    return;
  }

  container.innerHTML = ALL_ORDERS.map(order => {
    const amount = getAmount(order);
    const fee = dhamanpayFee(amount);
    const merchantNet = merchantReceives(amount);
    const status = getStatus(order);

    const canRelease =
      status === "DELIVERED_PENDING" ||
      status === "DELIVERED" ||
      status === "CONFIRMED";

    return `
      <div class="list-card">

        <div class="list-head">
          <div>
            <div class="list-title">
              Order #${order.id}
            </div>

            <div class="meta">
              <span>Status: ${status || "UNKNOWN"}</span>
              <span>Customer: ${order.customer?.name || order.customer_id || "—"}</span>
              <span>Merchant: ${order.merchant?.name || order.merchant_id || "—"}</span>
            </div>
          </div>

          <span class="badge-status ${status.toLowerCase()}">
            ${status || "UNKNOWN"}
          </span>
        </div>

        <div class="meta" style="margin-top:12px;">
          <span>Total: ${money(amount)}</span>
          <span>DhamanPay Fee 1.8%: ${money(fee)}</span>
          <span>Merchant Receives: ${money(merchantNet)}</span>
        </div>

        <div class="actions-row" style="margin-top:16px;">
          ${
            canRelease
              ? `
                <button class="dp-gold-btn" onclick="releaseOrder(${order.id})">
                  Release Money
                </button>
              `
              : `
                <button class="dp-ghost-btn" disabled>
                  Not Releasable
                </button>
              `
          }
        </div>

      </div>
    `;
  }).join("");
}

async function releaseOrder(orderId) {
  try {
    const order = ALL_ORDERS.find(o => String(o.id) === String(orderId));

    if (!order) {
      alert("Order not found");
      return;
    }

    const amount = getAmount(order);
    const fee = dhamanpayFee(amount);
    const merchantNet = merchantReceives(amount);

    const ok = confirm(
      `Release Order #${orderId}?\n\n` +
      `Total: ${money(amount)}\n` +
      `DhamanPay Fee 1.8%: ${money(fee)}\n` +
      `Merchant Receives: ${money(merchantNet)}`
    );

    if (!ok) return;

    const res = await fetch(`${API_BASE}/orders/${orderId}/release`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        admin_fee: fee,
        fee_amount: fee,
        merchant_receives: merchantNet,
        merchant_net_amount: merchantNet,
        admin_note: "Released by admin"
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || "Release failed");
    }

    order.status = "COMPLETED";

    updateDashboard();
    renderOrders();

    alert(`Order released successfully.\nDhamanPay earned ${money(fee)}.`);

  } catch (err) {
    console.error("Release error:", err);
    alert(err.message || "Release failed");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadProfile();
  await loadOrders();

  const loader = document.getElementById("loader");
  if (loader) {
    setTimeout(() => loader.classList.add("hide"), 600);
  }
});

window.releaseOrder = releaseOrder;