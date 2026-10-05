import { esc, naira, fill, toast, STATUS_LABEL, CATEGORY_ICON, clock, timeAgo, initials } from "./util.js";
import { S, rider, stats, quote, snapshotForAI, emit, AREAS } from "./store.js";
import { fleetMap } from "./layers.js";
import { adminAssistant } from "./agent.js";

export function adminView(root) {
  const v = {
    page: "overview", _key: null, map: null,
    ai: { msgs: [], history: [], busy: false },
    draft: { ...S.pricing }
  };
  const PAGES = [["overview", "▦", "Overview"], ["riders", "🏍", "Riders"], ["pricing", "₦", "Pricing"], ["payments", "✓", "Payments"]];

  function shell() {
    const s = stats();
    return `<div class="desk admin">
      <aside class="desk-side dark">
        <div class="desk-brand"><img src="../assets/img/ttc-mark.svg" alt="" width="30" height="30"><div><b>TTC Admin</b><small>Operations</small></div></div>
        <nav>${PAGES.map(([k, i, l]) => `<button data-page="${k}" class="${v.page === k ? "on" : ""}"><span>${i}</span>${l}${k === "riders" && S.applicants.length ? `<em>${S.applicants.length}</em>` : ""}${k === "payments" && s.awaitingPayment ? `<em>${s.awaitingPayment}</em>` : ""}</button>`).join("")}</nav>
      </aside>
      <section class="desk-main">${pageShell()}</section>
    </div>`;
  }

  function pageShell() {
    if (v.page === "overview") return `
      <header class="desk-head"><div><h2>Operations</h2><p class="muted">Live across Lagos · ${new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</p></div></header>
      <div data-region="kpis"></div>
      <div class="admin-grid">
        <div class="panel map-panel tall"><div class="panel-h"><b>Live map</b><small><span class="lg lg-busy"></span>On a job <span class="lg lg-idle"></span>Free</small></div><div class="map-slot" data-map></div></div>
        <div class="panel ai-panel">
          <div class="panel-h"><b><span class="spark">✦</span> Ask the ops assistant</b><small>Answers from live data</small></div>
          <div class="chat-log compact" data-region="ai"></div>
          <div class="chat-chips" data-region="aichips"></div>
          <form class="chat-form" data-ai-form><input type="text" placeholder="e.g. which riders are free in Ikeja?" maxlength="300" aria-label="Ask the ops assistant"><button type="submit" class="chat-send" aria-label="Send">↑</button></form>
        </div>
      </div>
      <div class="panel"><div class="panel-h"><b>Deliveries</b><small>Most recent first</small></div><div data-region="table"></div></div>`;
    if (v.page === "riders") return `
      <header class="desk-head"><div><h2>Riders</h2><p class="muted">Applications are pre-checked by AI. Your team makes the final call.</p></div></header>
      <div class="panel"><div class="panel-h"><b>Waiting for approval</b></div><div data-region="apps"></div></div>
      <div class="panel"><div class="panel-h"><b>All riders</b></div><div data-region="riders"></div></div>`;
    if (v.page === "pricing") return `
      <header class="desk-head"><div><h2>Pricing</h2><p class="muted">Change a rate and every new quote in the apps updates instantly.</p></div></header>
      <div class="pricing-grid">
        <div class="panel"><div data-region="pform"></div></div>
        <div class="panel"><div class="panel-h"><b>Preview</b><small>Sample trips</small></div><div data-region="preview"></div></div>
      </div>`;
    return `<header class="desk-head"><div><h2>Payments</h2><p class="muted">Card payments confirm automatically. Confirm transfers and cash here.</p></div></header>
      <div class="panel" data-region="payments"></div>`;
  }

  function kpis() {
    const s = stats();
    return `<div class="kpis">
      <div class="kpi"><small>Active deliveries</small><b>${s.active}</b><span>${s.searching} finding a rider</span></div>
      <div class="kpi"><small>Riders online</small><b>${s.online}</b><span>of ${S.riders.length} approved</span></div>
      <div class="kpi"><small>Delivered today</small><b>${s.deliveredToday}</b><span class="up">▲ 12% vs last week</span></div>
      <div class="kpi"><small>Revenue today</small><b>${naira(s.revenueToday)}</b><span>${s.awaitingPayment} payments to confirm</span></div>
    </div>`;
  }

  function table() {
    const list = S.orders.filter((o) => o.status !== "cancelled").slice(0, 10);
    return `<div class="table-scroll"><table class="tbl"><thead><tr><th>Order</th><th>Sender</th><th>Route</th><th>Rider</th><th>Status</th><th class="r">Price</th></tr></thead><tbody>
      ${list.map((o) => {
        const r = rider(o.riderId);
        return `<tr><td><b>${o.id}</b><small>${clock(o.createdAt)}</small></td><td>${esc(o.senderName)}<small>${o.sender === "customer" ? "Customer" : "Business"}</small></td>
          <td>${esc(o.pickup)} → ${esc(o.dropoff)}<small>${CATEGORY_ICON[o.category] || ""} ${esc(o.item)}</small></td><td>${r ? esc(r.name) : "-"}</td>
          <td><span class="st st-${o.status}">${esc(STATUS_LABEL[o.status])}</span></td><td class="r">${naira(o.price)}<small>${esc(o.payment)}</small></td></tr>`;
      }).join("")}</tbody></table></div>`;
  }

  function aiLog() {
    const intro = `<div class="cm cm-bot"><p>Ask me anything about today's operations: free riders, revenue, late deliveries, payments.</p></div>`;
    return intro + v.ai.msgs.map((m) => `<div class="cm ${m.role === "user" ? "cm-user" : "cm-bot"}">${m.role === "user" ? esc(m.text) : `<p>${esc(m.text)}</p>`}</div>`).join("") +
      (v.ai.busy ? `<div class="cm cm-bot cm-typing"><span></span><span></span><span></span></div>` : "");
  }
  const aiChips = () => v.ai.msgs.length ? "" : ["Which riders are free near Ikeja?", "How much have we made today?", "Who are the top riders today?"].map((q) => `<button data-ask>${q}</button>`).join("");

  async function ask(q) {
    q = q.trim();
    if (!q || v.ai.busy) return;
    v.ai.msgs.push({ role: "user", text: q });
    v.ai.busy = true;
    render();
    const a = await adminAssistant(q, v.ai.history, snapshotForAI());
    v.ai.busy = false;
    v.ai.msgs.push({ role: "bot", text: a });
    v.ai.history.push({ role: "user", text: q }, { role: "model", text: a });
    v.ai.history = v.ai.history.slice(-8);
    render();
    const log = root.querySelector('[data-region="ai"]');
    if (log) log.scrollTop = log.scrollHeight;
  }

  function apps() {
    if (!S.applicants.length) return `<p class="empty">All caught up. No applications waiting.</p>`;
    return S.applicants.map((a) => {
      const flagged = a.checks.some((c) => !c.ok);
      return `<div class="app-card ${flagged ? "flag" : ""}">
        <div class="app-head"><div class="avatar-sm">${initials(a.name)}</div><div><b>${esc(a.name)}</b><small>${esc(a.area)} · applied ${timeAgo(a.submitted)}</small></div>
          <span class="ai-tag">${flagged ? "⚠ AI flagged" : "✦ AI: all checks passed"}</span></div>
        <ul class="checks-list">${a.checks.map((c) => `<li class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "!"} ${esc(c.text)}</li>`).join("")}</ul>
        <div class="docs">${["ID", "Licence", "Photo", "Bike papers"].map((d) => `<span class="doc">${d}</span>`).join("")}</div>
        <div class="app-btns"><button class="btn-line" data-reject="${a.id}">${flagged ? "Request fix" : "Reject"}</button><button class="btn-primary-sm" data-approve="${a.id}">Approve</button></div>
      </div>`;
    }).join("");
  }

  function riders() {
    const busy = new Set(S.orders.filter((o) => ["assigned", "picked_up"].includes(o.status)).map((o) => o.riderId));
    return `<div class="table-scroll"><table class="tbl"><thead><tr><th>Rider</th><th>Status</th><th>Rating</th><th>Trips</th><th class="r">Earned today</th></tr></thead><tbody>
      ${S.riders.map((r) => `<tr><td><b>${esc(r.name)}</b><small>${esc(r.plate)}</small></td>
        <td><span class="st ${!r.online ? "st-cancelled" : busy.has(r.id) ? "st-picked_up" : "st-delivered"}">${!r.online ? "Offline" : busy.has(r.id) ? "On a job" : "Free"}</span></td>
        <td>${r.rating}★</td><td>${r.trips}</td><td class="r">${naira(r.earnedToday)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function pform() {
    const d = v.draft;
    const f = (k, label, suffix, step) => `<label class="pf"><span>${label}</span><div class="pf-in">${suffix === "₦" ? "<i>₦</i>" : ""}<input type="number" min="0" step="${step}" data-p="${k}" value="${d[k]}">${suffix === "%" ? "<i>%</i>" : ""}</div></label>`;
    return `${f("base", "Base fare", "₦", 50)}${f("perKm", "Price per km", "₦", 10)}${f("minimum", "Minimum fare", "₦", 50)}${f("medium", "Medium package", "%", 5)}${f("large", "Large package", "%", 5)}${f("express", "Express", "%", 5)}
      <button class="btn-primary-sm big" data-act="save-pricing">Save &amp; apply to apps</button>`;
  }

  function preview() {
    const trips = [["Lekki Phase 1", "Yaba"], ["Victoria Island", "Surulere"], ["Ikeja", "Maryland"], ["Ajah", "Ikoyi"]];
    return `<table class="tbl"><thead><tr><th>Trip</th><th>Distance</th><th class="r">Now</th><th class="r">New</th></tr></thead><tbody>
      ${trips.map(([a, b]) => {
        const now = quote({ pickup: a, dropoff: b });
        const nw = quote({ pickup: a, dropoff: b }, v.draft);
        return `<tr><td>${a} → ${b}</td><td>${now.km} km</td><td class="r">${naira(now.price)}</td><td class="r"><b>${naira(nw.price)}</b></td></tr>`;
      }).join("")}</tbody></table>`;
  }

  function payments() {
    const list = S.orders.filter((o) => (o.payment === "Transfer" || o.payment === "Cash") && o.status !== "cancelled").slice(0, 12);
    if (!list.length) return `<p class="empty">Nothing to confirm.</p>`;
    return `<div class="table-scroll"><table class="tbl"><thead><tr><th>Order</th><th>From</th><th>Method</th><th class="r">Amount</th><th class="r"></th></tr></thead><tbody>
      ${list.map((o) => `<tr><td><b>${o.id}</b><small>${esc(STATUS_LABEL[o.status])}</small></td><td>${esc(o.senderName)}</td><td>${o.payment === "Cash" ? "💵 Cash" : "🏦 Transfer"}</td><td class="r">${naira(o.price)}</td>
        <td class="r">${o.paid ? `<span class="st st-delivered">Confirmed</span>` : `<button class="btn-primary-sm" data-confirm="${o.id}">Confirm</button>`}</td></tr>`).join("")}
    </tbody></table></div>`;
  }

  function render() {
    if (v.page !== v._key) {
      v.map && v.map.destroy();
      v.map = null;
      root.innerHTML = shell();
      root.querySelectorAll("[data-region]").forEach((el) => (el.__html = null));
      v._key = v.page;
      if (v.page === "overview") v.map = fleetMap(root.querySelector("[data-map]"));
      if (v.page === "pricing") v.draft = { ...S.pricing };
    } else {
      // keep sidebar badges fresh
      const s = stats();
      root.querySelectorAll(".desk-side nav button").forEach((b) => {
        const k = b.dataset.page;
        const n = k === "riders" ? S.applicants.length : k === "payments" ? s.awaitingPayment : 0;
        let em = b.querySelector("em");
        if (n && !em) { em = document.createElement("em"); b.appendChild(em); }
        if (em) { if (n) em.textContent = n; else em.remove(); }
      });
    }
    const rg = {};
    if (v.page === "overview") { rg.kpis = kpis(); rg.table = table(); rg.ai = aiLog(); rg.aichips = aiChips(); }
    if (v.page === "riders") { rg.apps = apps(); rg.riders = riders(); }
    if (v.page === "pricing") { if (!root.querySelector("[data-p]")) rg.pform = pform(); rg.preview = preview(); }
    if (v.page === "payments") rg.payments = payments();
    fill(root, rg);
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-page],[data-act],[data-approve],[data-reject],[data-confirm],[data-ask]");
    if (!t) return;
    if (t.dataset.page) { v.page = t.dataset.page; return render(); }
    if (t.hasAttribute("data-ask")) return ask(t.textContent);
    if (t.dataset.approve) {
      const a = S.applicants.find((x) => x.id === t.dataset.approve);
      S.applicants = S.applicants.filter((x) => x !== a);
      const ar = AREAS.find((x) => x.name === a.area);
      S.riders.push({ id: "n" + a.id, name: a.name, rating: 5.0, plate: "NEW", area: a.area, online: true, trips: 0, earnedToday: 0, approved: true, pos: [ar.lat, ar.lng] });
      toast(`${a.name} approved. They can go online now`);
      return emit();
    }
    if (t.dataset.reject) {
      const a = S.applicants.find((x) => x.id === t.dataset.reject);
      S.applicants = S.applicants.filter((x) => x !== a);
      toast(`${a.name} notified to fix their documents`);
      return emit();
    }
    if (t.dataset.confirm) {
      const o = S.orders.find((x) => x.id === t.dataset.confirm);
      o.paid = true;
      toast(`${o.id} payment confirmed. Receipt sent`);
      return emit();
    }
    if (t.dataset.act === "save-pricing") {
      Object.assign(S.pricing, v.draft);
      toast("Pricing saved. All apps now quote the new prices");
      return emit();
    }
  });
  root.addEventListener("input", (e) => {
    const k = e.target.dataset.p;
    if (!k) return;
    v.draft[k] = Math.max(0, Number(e.target.value) || 0);
    fill(root, { preview: preview() });
  });
  root.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-ai-form]")) return;
    e.preventDefault();
    const i = e.target.querySelector("input");
    const q = i.value;
    i.value = "";
    ask(q);
  });

  render();
  return { render, tick() { if (v.map) v.map.sync(); } };
}
