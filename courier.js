(function () {
  const API_BASE = "https://dhamanpay.onrender.com/api";
  const LOGIN_PAGE = "login.html";

  let orders = [];
  let selectedPdf = null;

  const el = id => document.getElementById(id);

  function getToken() {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("DHAMANPAY_TOKEN")
    );
  }

  function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = value ?? "—";
  }

  function showMessage(id, text, type = "info") {
    const box = el(id);
    if (!box) return;
    box.className = "message-box " + type;
    box.textContent = text;
  }

  function normalizeStatus(status) {
    return String(status || "").trim().toUpperCase();
  }

  async function apiFetch(path, method = "GET", body = null) {
    const token = getToken();

    if (!token) {
      window.location.href = LOGIN_PAGE;
      throw new Error("Missing token");
    }

    const response = await fetch(API_BASE + path, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: body ? JSON.stringify(body) : null
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = LOGIN_PAGE;
      throw new Error("Session expired");
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Request failed: ${path}`);
    }

    return data;
  }

  async function apiFetchFormData(path, formData) {
    const token = getToken();

    const response = await fetch(API_BASE + path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token
      },
      body: formData
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Proof upload failed");
    }

    return data;
  }

  function extractOrders(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.orders)) return res.orders;
    if (Array.isArray(res.data?.data)) return res.data.data;
    if (Array.isArray(res.data?.orders)) return res.data.orders;
    if (Array.isArray(res.result)) return res.result;
    return [];
  }

  function setupNavigation() {
    const buttons = document.querySelectorAll(".view-nav-btn");
    const panels = document.querySelectorAll(".view-panel");

    function openView(viewId) {
      panels.forEach(panel => {
        panel.style.display = "none";
        panel.classList.remove("active");
      });

      buttons.forEach(btn => btn.classList.remove("active-nav"));

      const target = document.getElementById(viewId);
      if (target) {
        target.style.display = "block";
        target.classList.add("active");
      }

      const activeBtn = document.querySelector(`[data-view="${viewId}"]`);
      if (activeBtn) activeBtn.classList.add("active-nav");
    }

    buttons.forEach(btn => {
      btn.addEventListener("click", () => openView(btn.dataset.view));
    });

    openView("homeView");
  }

  async function loadCourierInfo() {
    const res = await apiFetch("/me");
    const courier = res.data || res.user || res || {};

    setText("heroCourierName", courier.full_name || courier.name || "Courier");
    setText("profileName", courier.full_name || courier.name || "Courier");
    setText("profileRole", courier.role ? courier.role.toUpperCase() : "COURIER");
    setText("profileEmail", courier.email);
    setText("profilePhone", courier.phone);
    setText("profileCourierId", courier.id);
    setText("profileCompany", courier.delivery_company || courier.company || "—");
    setText("profileVehicle", courier.vehicle_matricule || courier.vehicle || "—");
    setText("profileRating", courier.rating ?? "—");
  }

  async function loadOrders() {
    const endpoints = ["/courier/orders", "/orders"];

    orders = [];

    for (const endpoint of endpoints) {
      try {
        const res = await apiFetch(endpoint);
        console.log("ORDERS RESPONSE FROM", endpoint, res);

        const found = extractOrders(res);

        if (found.length) {
          orders = found;
          break;
        }
      } catch (err) {
        console.warn(endpoint, err.message);
      }
    }

    console.log("FINAL ORDERS ARRAY:", orders);

    renderStats();
    renderOrders();
  }

  function getShownOrders() {
    return orders;
  }

  function getDeliveringOrders() {
    return orders.filter(order => {
      const s = normalizeStatus(order.status);
      return s === "DELIVERING_PENDING" || s === "DELIVERED_PENDING" || s === "DELIVERING" || s === "SHIPPED";
    });
  }

  function getDeliveredOrders() {
    return orders.filter(order => {
      const s = normalizeStatus(order.status);
      return s === "DELIVERED" || s === "COMPLETED";
    });
  }

  function renderStats() {
    setText("heroEscrowOrders", getShownOrders().length);
    setText("heroDelivering", getDeliveringOrders().length);
    setText("heroDelivered", getDeliveredOrders().length);
    setText("heroStatus", "Online");

    setText("profileEscrowOrders", getShownOrders().length);
    setText("profileDelivering", getDeliveringOrders().length);
    setText("profileDelivered", getDeliveredOrders().length);
    setText("profileCompleted", getDeliveredOrders().length);
  }

  function renderOrders() {
    const container = el("ordersList");
    const empty = el("emptyOrders");

    if (!container) return;

    const shownOrders = getShownOrders();
    container.innerHTML = "";

    if (!shownOrders.length) {
      if (empty) empty.style.display = "block";
      showMessage("ordersMessage", "No orders returned from backend.", "info");
      return;
    }

    if (empty) empty.style.display = "none";

    shownOrders.forEach(order => {
      const card = document.createElement("div");
      card.className = "list-card";

      card.innerHTML = `
        <div class="list-head">
          <div>
            <div class="list-title">Order #${order.id || order.order_id || "—"}</div>
            <div class="meta">
              <span>Code: ${order.order_code || "—"}</span>
              <span>Product: ${order.product_name || order.product || "—"}</span>
              <span>Amount: ${order.amount ?? "—"} DZD</span>
              <span>Address: ${order.delivery_address || order.address || "—"}</span>
            </div>
          </div>
          <span class="badge-status">${order.status || "—"}</span>
        </div>

        <div class="actions-row">
          <button class="dp-ghost-btn preview-btn" data-id="${order.id || order.order_id}">Preview</button>
          <button class="dp-gold-btn ship-btn" data-id="${order.id || order.order_id}">Ship Order</button>
        </div>
      `;

      container.appendChild(card);
    });

    document.querySelectorAll(".preview-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const order = orders.find(o => String(o.id || o.order_id) === String(btn.dataset.id));
        previewOrder(order);
      });
    });

    document.querySelectorAll(".ship-btn").forEach(btn => {
      btn.addEventListener("click", () => shipOrder(btn.dataset.id));
    });
  }

  function previewOrder(order) {
    if (!order) return;

    const id = order.id || order.order_id;

    setText("previewOrderId", "#" + id);
    setText("previewOrderStatus", order.status);
    setText("previewProductName", order.product_name || order.product || "—");
    setText("previewAmount", (order.amount ?? "—") + " DZD");
    setText("previewAddress", order.delivery_address || order.address || "—");

    if (el("updateOrderCode")) el("updateOrderCode").value = id;
    if (el("proofOrderCode")) el("proofOrderCode").value = id;

    setText("updatePreviewOrder", "#" + id);
    setText("updatePreviewStatus", order.status);
  }

  async function shipOrder(id) {
    const order = orders.find(o => String(o.id || o.order_id) === String(id));

    if (!order) {
      showMessage("ordersMessage", "Order not found.", "error");
      return;
    }

    try {
      await apiFetch(`/orders/${id}/ship`, "POST", {});

      order.status = "DELIVERING_PENDING";

      showMessage("ordersMessage", `Order #${id} shipped successfully.`, "success");

      previewOrder(order);
      renderStats();
      renderOrders();

      await loadOrders();
    } catch (err) {
      order.status = "DELIVERING_PENDING";

      showMessage("ordersMessage", "Shipped locally. Backend must save the status too.", "info");

      previewOrder(order);
      renderStats();
      renderOrders();
    }
  }

  async function updatePlace(e) {
    e.preventDefault();

    const orderId = el("updateOrderCode")?.value?.trim();
    const place = el("currentPlace")?.value?.trim();
    const status = el("updateDeliveryStatus")?.value;
    const note = el("placeNote")?.value?.trim();

    if (!orderId || !place) {
      showMessage("updateMessage", "Enter order ID and current place.", "error");
      return;
    }

    try {
      await apiFetch(`/orders/${orderId}/location`, "POST", {
        current_place: place,
        status,
        note
      });
    } catch (err) {
      console.warn("Location endpoint failed:", err.message);
    }

    setText("updatePreviewOrder", "#" + orderId);
    setText("updatePreviewStatus", status);
    setText("updatePreviewPlace", place);
    setText("updatePreviewTime", new Date().toLocaleString());

    showMessage("updateMessage", "Place updated.", "success");
  }

  function handlePdf(file) {
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      selectedPdf = null;
      setText("pdfFileName", "No PDF selected");
      showMessage("proofMessage", "Only PDF files are accepted.", "error");
      return;
    }

    selectedPdf = file;
    setText("pdfFileName", file.name);
    showMessage("proofMessage", "PDF selected successfully.", "success");
  }

  async function submitProof() {
    const orderId = el("proofOrderCode")?.value?.trim();
    const kind = el("proofKind")?.value;
    const desc = el("proofDescription")?.value?.trim();

    if (!orderId) {
      showMessage("proofMessage", "Enter order ID.", "error");
      return;
    }

    if (!selectedPdf) {
      showMessage("proofMessage", "Choose a PDF proof first.", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("proof_pdf", selectedPdf);
      formData.append("proof_type", kind || "Delivery Proof");
      formData.append("description", desc || "");

      await apiFetchFormData(`/orders/${orderId}/proof`, formData);

      showMessage("proofMessage", "PDF proof submitted successfully.", "success");

      setText("proofPrevOrder", "#" + orderId);
      setText("proofPrevKind", kind || "Delivery Proof");
      setText("proofPrevFile", selectedPdf.name);
      setText("proofPrevDesc", desc || "—");
      setText("proofPreviewBadge", "Submitted");
    } catch (err) {
      showMessage("proofMessage", err.message, "error");
    }
  }

  function setupEvents() {
    el("logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = LOGIN_PAGE;
    });

    el("updatePlaceForm")?.addEventListener("submit", updatePlace);
    el("submitProofBtn")?.addEventListener("click", submitProof);

    el("choosePdfBtn")?.addEventListener("click", () => el("proofPdf")?.click());
    el("proofPdf")?.addEventListener("change", e => handlePdf(e.target.files?.[0]));

    const dropzone = el("pdfDropzone");

    if (dropzone) {
      dropzone.addEventListener("dragover", e => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });

      dropzone.addEventListener("dragleave", e => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      });

      dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        handlePdf(e.dataTransfer?.files?.[0]);
      });
    }
  }

  async function init() {
    setupNavigation();
    setupEvents();

    setTimeout(() => {
      el("loader")?.classList.add("hide");
    }, 700);

    try {
      if (!getToken()) return;

      await loadCourierInfo();
      await loadOrders();
    } catch (err) {
      console.error(err);
      showMessage("ordersMessage", err.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();