/* ============================================================
   CrowdCloud client logic
   - Live polling of /api/services and /api/tickets/<n>
   - Ticket creation dialog
   - Staff panel actions (call next / serve / complete / cancel)
   All rendering updates existing DOM nodes in place, so the live
   transition NORMAL -> BUSY -> HIGH LOAD is visible without reload.
   ============================================================ */

"use strict";

const POLL_INTERVAL = {
  services: 3000,   // index + queue board + admin headers
  ticket: 3000,     // ticket tracking page
  admin: 4000
};

/* ------------------------------------------------- helpers */

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  let body = null;
  try { body = await res.json(); } catch (e) { /* non-JSON error body */ }
  if (!res.ok) {
    const message = body && body.error ? body.error : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body;
}

function badgeClass(load) {
  if (load === "BUSY") return "busy";
  if (load === "HIGH LOAD") return "high-load";
  return "";
}

function meterClass(load) {
  if (load === "BUSY") return "warn";
  if (load === "HIGH LOAD") return "high";
  return "";
}

function setBadge(el, load) {
  if (!el) return;
  el.textContent = load;
  el.dataset.load = load;
  el.className = "load-badge " + badgeClass(load);
}

function fmtTime(value) {
  if (!value) return "—";
  return String(value).replace("T", " ").slice(5, 16);
}

function toast(message, isError) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ------------------------------------------------- index page */

async function refreshServices() {
  const data = await fetchJSON("/api/services");
  const services = data.services || [];

  services.forEach((svc) => {
    const card = document.querySelector(
      `.service-card[data-service="${svc.code}"]`
    );
    if (!card) return;
    card.querySelector('[data-role="load"]').textContent = svc.load;
    setBadge(card.querySelector('[data-role="load"]'), svc.load);
    card.querySelector('[data-role="waiting"]').textContent = svc.waiting;
    card.querySelector('[data-role="serving"]').textContent = svc.serving;
    card.querySelector('[data-role="done"]').textContent = svc.done_today;
    const meter = card.querySelector('[data-role="meter"]');
    meter.style.width = svc.load_percent + "%";
    meter.className = "load-meter-fill " + meterClass(svc.load);
  });

  const stats = data.stats || {};
  const overall = document.getElementById("overallBadge");
  if (overall) setBadge(overall, stats.overall_load);
  const totalWaiting = document.getElementById("totalWaiting");
  if (totalWaiting) totalWaiting.textContent = stats.waiting;
  const servedToday = document.getElementById("servedToday");
  if (servedToday) servedToday.textContent = stats.done_today;
  const ticketsToday = document.getElementById("ticketsToday");
  if (ticketsToday) ticketsToday.textContent = stats.created_today;
}

/* ------------------------------------------------- ticket modal */

function initTicketModal() {
  const modal = document.getElementById("ticketModal");
  if (!modal) return;
  const form = document.getElementById("ticketForm");
  const nameInput = document.getElementById("customerName");
  const errorEl = document.getElementById("modalError");
  let targetCode = null;
  let targetName = "";

  document.querySelectorAll(".get-ticket").forEach((btn) => {
    btn.addEventListener("click", () => {
      targetCode = btn.dataset.code;
      targetName = btn.dataset.name;
      document.getElementById("modalService").textContent = targetName;
      errorEl.hidden = true;
      modal.hidden = false;
      nameInput.focus();
    });
  });

  document.getElementById("modalCancel").addEventListener("click", () => {
    modal.hidden = true;
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.hidden = true;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") modal.hidden = true;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.getElementById("modalSubmit");
    submit.disabled = true;
    errorEl.hidden = true;
    try {
      const data = await fetchJSON("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_code: targetCode,
          customer_name: nameInput.value
        })
      });
      window.location.href = `/ticket/${data.ticket.ticket_number}`;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      submit.disabled = false;
    }
  });
}

/* ------------------------------------------------- ticket page */

async function refreshTicket(number) {
  const data = await fetchJSON(`/api/tickets/${encodeURIComponent(number)}`);
  const t = data.ticket;
  document.querySelector('[data-role="status"]').textContent = t.status;
  const statusEl = document.querySelector('[data-role="status"]');
  statusEl.className = "status-pill status-" + t.status.toLowerCase();
  setBadge(document.querySelector('[data-role="load"]'), t.load);
  document.querySelector('[data-role="ahead"]').textContent = t.people_ahead;
  document.querySelector('[data-role="eta"]').textContent =
    t.status === "WAITING" ? `~${t.estimated_wait_minutes} min` : "—";
  document.querySelector('[data-role="created"]').textContent =
    fmtTime(t.created_at);

  const steps = {
    stepRequested: ["WAITING", "SERVING", "DONE", "CANCELLED"],
    stepServing: ["SERVING", "DONE"],
    stepDone: ["DONE"]
  };
  const cancelled = t.status === "CANCELLED";
  document.getElementById("stepRequested").className =
    cancelled ? "" : "done";
  document.getElementById("stepServing").className =
    steps.stepServing.includes(t.status) ? "done" : "";
  document.getElementById("stepDone").className =
    t.status === "DONE" ? "done" : "";
  if (cancelled) {
    document.getElementById("stepRequested").classList.add("cancelled");
  }

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.disabled = t.status !== "WAITING";
    cancelBtn.hidden = t.status !== "WAITING";
  }
}

function initTicketPage() {
  const page = document.getElementById("ticketPage");
  if (!page) return;
  const number = page.dataset.ticket;
  const poll = () => refreshTicket(number).catch(() => {});
  poll();
  setInterval(poll, POLL_INTERVAL.ticket);

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      try {
        await fetchJSON(cancelBtn.dataset.url, { method: "POST" });
        toast(`Ticket ${number} cancelled`);
        poll();
      } catch (err) {
        toast(err.message, true);
      }
    });
  }
}

/* ------------------------------------------------- queue board */

async function refreshQueueBoard() {
  const grid = document.getElementById("queueGrid");
  if (!grid) return;
  const data = await fetchJSON("/api/services");
  const stats = data.stats || {};
  setBadge(document.getElementById("overallBadge"), stats.overall_load);
  const totalWaiting = document.getElementById("totalWaiting");
  if (totalWaiting) totalWaiting.textContent = stats.waiting;

  (data.services || []).forEach((svc) => {
    const card = grid.querySelector(`.queue-card[data-service="${svc.code}"]`);
    if (!card) return;
    setBadge(card.querySelector('[data-role="load"]'), svc.load);
    card.querySelector('[data-role="serving-count"]').textContent = svc.serving;
    card.querySelector('[data-role="waiting"]').textContent = svc.waiting;
  });

  // Refresh waiting rows with enough detail to stay honest.
  const detail = await fetchJSON(
    "/api/tickets?status=WAITING&limit=200&waiting_first=1"
  );
  const byService = {};
  (detail.tickets || []).forEach((t) => {
    (byService[t.service_code] = byService[t.service_code] || []).push(t);
  });
  document.querySelectorAll(".queue-card").forEach((card) => {
    const code = card.dataset.service;
    const rows = (byService[code] || []).slice(0, 12);
    const body = card.querySelector('[data-role="waiting-body"]');
    if (!body) return;
    body.innerHTML = rows.length
      ? rows
          .map(
            (t, i) => `<tr>
              <td>${i + 1}</td>
              <td class="mono">${t.ticket_number}</td>
              <td>${escapeHtml(t.customer_name || "—")}</td>
              <td class="muted">${fmtTime(t.created_at)}</td>
            </tr>`
          )
          .join("")
      : `<tr class="empty-row"><td colspan="4">No one is waiting — queue is clear.</td></tr>`;
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );
}

/* ------------------------------------------------- admin panel */

async function refreshAdminCard(code) {
  const data = await fetchJSON(`/api/tickets?service_code=${code}&limit=15&waiting_first=1`);
  const svcData = await fetchJSON("/api/services");
  const svc = (svcData.services || []).find((s) => s.code === code);
  const card = document.querySelector(`.admin-card[data-service="${code}"]`);
  if (!card || !svc) return;

  setBadge(card.querySelector('[data-role="load"]'), svc.load);
  card.querySelector('[data-role="waiting"]').textContent = svc.waiting;
  card.querySelector('[data-role="serving"]').textContent = svc.serving;
  card.querySelector('[data-role="done"]').textContent = svc.done_today;
  setBadge(document.getElementById("overallBadge"), svcData.stats.overall_load);

  const body = card.querySelector('[data-role="tickets-body"]');
  const tickets = data.tickets || [];
  body.innerHTML = tickets.length
    ? tickets
        .map((t) => {
          let actions = '<span class="muted">—</span>';
          if (t.status === "WAITING") {
            actions = `
              <button class="mini-btn act-serve" data-number="${t.ticket_number}">Serve</button>
              <button class="mini-btn act-cancel" data-number="${t.ticket_number}">Cancel</button>`;
          } else if (t.status === "SERVING") {
            actions = `<button class="mini-btn act-complete" data-number="${t.ticket_number}">Complete</button>`;
          }
          return `<tr data-number="${t.ticket_number}">
            <td class="mono">${t.ticket_number}</td>
            <td>${escapeHtml(t.customer_name || "—")}</td>
            <td><span class="status-pill status-${t.status.toLowerCase()}">${t.status}</span></td>
            <td class="row-actions">${actions}</td>
          </tr>`;
        })
        .join("")
    : `<tr class="empty-row"><td colspan="4">No tickets yet.</td></tr>`;
}

function initAdmin() {
  const grid = document.getElementById("adminGrid");
  if (!grid) return;

  const codes = [...grid.querySelectorAll(".admin-card")].map(
    (c) => c.dataset.service
  );
  const refreshAll = () =>
    codes.forEach((code) => refreshAdminCard(code).catch(() => {}));
  refreshAll();
  setInterval(refreshAll, POLL_INTERVAL.admin);

  grid.addEventListener("click", async (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const number = btn.dataset.number;
    try {
      if (btn.classList.contains("call-next")) {
        const data = await fetchJSON(
          `/api/services/${btn.dataset.code}/next`, { method: "POST" }
        );
        toast(data.ticket ? `Now serving ${data.ticket.ticket_number}` : "Queue is empty");
      } else if (btn.classList.contains("refresh-card")) {
        await refreshAdminCard(btn.dataset.code);
      } else if (btn.classList.contains("act-serve")) {
        await fetchJSON(`/api/tickets/${number}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SERVING" })
        });
        toast(`Ticket ${number} is now being served`);
      } else if (btn.classList.contains("act-complete")) {
        await fetchJSON(`/api/tickets/${number}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DONE" })
        });
        toast(`Ticket ${number} completed`);
      } else if (btn.classList.contains("act-cancel")) {
        await fetchJSON(`/api/tickets/${number}/cancel`, { method: "POST" });
        toast(`Ticket ${number} cancelled`);
      }
      if (btn.dataset.code) await refreshAdminCard(btn.dataset.code);
      else refreshAll();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

/* ------------------------------------------------- boot */

document.addEventListener("DOMContentLoaded", () => {
  initTicketModal();

  if (document.getElementById("servicesGrid")) {
    refreshServices().catch(() => {});
    setInterval(() => refreshServices().catch(() => {}), POLL_INTERVAL.services);
  }

  if (document.getElementById("ticketPage")) initTicketPage();

  if (document.getElementById("queueGrid")) {
    refreshQueueBoard().catch(() => {});
    setInterval(() => refreshQueueBoard().catch(() => {}), 5000);
  }

  if (document.getElementById("adminGrid")) initAdmin();
});
