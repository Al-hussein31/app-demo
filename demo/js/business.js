import { esc, naira, fill, toast, STATUS_LABEL, CATEGORY_ICON, clock } from "./util.js";
import { S, AREAS, quote, createOrder, rider, etaMinutes } from "./store.js";
import { fleetMap } from "./layers.js";
import { createChat, bindChat, chatInput } from "./chat.js";

export function businessView(root) {
  const B = S.business;
  const v = {
    page: "overview", _key: null, map: null,
    rows: [
      { dropoff: "Yaba", item: "Prescription refill", recipientPhone: "0809 112 4410" },
      { dropoff: "Ikoyi", item: "Blood pressure monitor", recipientPhone: "0813 290 1172" }
    ]
  };
  const mine = () => S.orders.filter((o) => o.sender === "business" && o.senderName === B.name);

  const chat = createChat({
    defaultPickup: B.pickup, sender: "business", payment: "Invoice",
    greeting: `Hi ${B.contact.split(" ").slice(0, 2).join(" ")}. Tell me what to send. Pickup is ${B.pickup} unless you say otherwise.`,
    suggestions: ["Send 3 orders: Yaba, Surulere and Ikeja GRA, all medicine", "Urgent insulin to Victoria Island", "Deliver a big carton to Ajah"],
    onBooked: () => render()
  });

  const PAGES = [["overview", "▦", "Overview"], ["new", "＋", "New delivery"], ["deliveries", "☰", "Deliveries"], ["statements", "₦", "Statements"], ["team", "◯", "Team"]];

  function shell() {
    return `<div class="desk">
      <aside class="desk-side">
        <div class="desk-brand"><img src="../assets/img/ttc-mark.svg" alt="" width="30" height="30"><div><b>TTC Business</b><small>${esc(B.name)}</small></div></div>
        <nav>${PAGES.map(([k, i, l]) => `<button data-page="${k}" class="${v.page === k ? "on" : ""}"><span>${i}</span>${l}</button>`).join("")}</nav>
        <div class="desk-side-foot"><small>Pickup address</small><b>${esc(B.pickup)}</b><small>Billing: monthly invoice</small></div>
      </aside>
      <section class="desk-main">${pageShell()}</section>
    </div>`;
  }

  function pageShell() {
    if (v.page === "overview") return `
      <header class="desk-head"><div><h2>Good day, ${esc(B.contact.split(" ").slice(0, 2).join(" "))}</h2><p class="muted">Here's what's moving for ${esc(B.name)} today.</p></div>
        <button class="btn-primary-sm" data-page="new">＋ New delivery</button></header>
      <div data-region="kpis"></div>
      <div class="biz-grid">
        <div class="panel ai-panel">
          <div class="panel-h"><b><span class="spark">✦</span> Tell TTC what to deliver</b><small>Type or talk, one sentence for many orders</small></div>
          <div class="chat-log compact" data-region="log"></div><div data-region="chips"></div>
          ${chatInput(chat, "e.g. send 2 orders to Yaba and Surulere")}
        </div>
        <div class="panel map-panel"><div class="panel-h"><b>Riders near you, live</b><small data-region="livecount"></small></div><div class="map-slot" data-map></div></div>
      </div>
      <div class="panel"><div class="panel-h"><b>Today's deliveries</b><button class="link" data-page="deliveries">View all</button></div><div data-region="table"></div></div>`;
    if (v.page === "new") return `
      <header class="desk-head"><div><h2>New delivery</h2><p class="muted">Pickup from <b>${esc(B.pickup)}</b>. Add as many drop-offs as you need.</p></div></header>
      <div class="panel"><div data-region="rows"></div>
        <div class="row-actions"><button class="btn-line" data-act="add-row">＋ Add another drop-off</button></div>
        <div class="bulk-foot" data-region="bulkfoot"></div></div>`;
    if (v.page === "deliveries") return `<header class="desk-head"><div><h2>Deliveries</h2><p class="muted">Every delivery, with rider, status and receipt.</p></div></header><div class="panel" data-region="table"></div>`;
    if (v.page === "statements") return `<header class="desk-head"><div><h2>Statements</h2><p class="muted">One invoice a month. No paying per delivery.</p></div></header><div class="panel" data-region="statements"></div>`;
    return `<header class="desk-head"><div><h2>Team</h2><p class="muted">Staff who can book deliveries for ${esc(B.name)}.</p></div><button class="btn-primary-sm" data-act="invite">Invite staff</button></header><div class="panel" data-region="team"></div>`;
  }

  function kpis() {
    const m = mine();
    const live = m.filter((o) => ["searching", "assigned", "picked_up"].includes(o.status)).length;
    const today = m.filter((o) => Date.now() - o.createdAt < 18 * 3600e3);
    return `<div class="kpis">
      <div class="kpi"><small>Deliveries this month</small><b>${S.baseline.businessMonthDeliveries + today.length}</b><span class="up">▲ 18% vs last month</span></div>
      <div class="kpi"><small>In progress</small><b>${live}</b><span>${live ? "Tracking live" : "All delivered"}</span></div>
      <div class="kpi"><small>Spend this month</small><b>${naira(S.baseline.businessMonthSpend + today.reduce((s, o) => s + o.price, 0))}</b><span>Invoiced 1st Nov</span></div>
      <div class="kpi"><small>Avg. pickup time</small><b>6 min</b><span class="up">97% on time</span></div>
    </div>`;
  }

  function table(limit) {
    const list = mine().slice(0, limit || 50);
    if (!list.length) return `<p class="empty">No deliveries yet.</p>`;
    return `<div class="table-scroll"><table class="tbl"><thead><tr><th>Order</th><th>Drop-off</th><th>Item</th><th>Rider</th><th>Status</th><th class="r">Price</th></tr></thead><tbody>
      ${list.map((o) => {
        const r = rider(o.riderId);
        const eta = etaMinutes(o);
        return `<tr><td><b>${o.id}</b><small>${clock(o.createdAt)}</small></td><td>${esc(o.dropoff)}</td><td>${CATEGORY_ICON[o.category] || "📦"} ${esc(o.item)}</td>
          <td>${r ? esc(r.name) : "-"}</td><td><span class="st st-${o.status}">${esc(STATUS_LABEL[o.status])}${eta && o.status !== "delivered" ? ` · ${eta}m` : ""}</span></td><td class="r">${naira(o.price)}</td></tr>`;
      }).join("")}</tbody></table></div>`;
  }

  function rowsHtml() {
    return v.rows.map((r, i) => {
      const q = quote({ pickup: B.pickup, dropoff: r.dropoff });
      return `<div class="bulk-row">
        <span class="num">${i + 1}</span>
        <label><small>Drop-off</small><select data-row="${i}" data-k="dropoff">${AREAS.filter((a) => a.name !== B.pickup).map((a) => `<option ${a.name === r.dropoff ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label>
        <label><small>Item</small><input data-row="${i}" data-k="item" value="${esc(r.item)}"></label>
        <label><small>Receiver phone</small><input data-row="${i}" data-k="recipientPhone" value="${esc(r.recipientPhone)}" inputmode="tel"></label>
        <div class="bulk-price"><small>${q ? q.km + " km" : ""}</small><b>${q ? naira(q.price) : "-"}</b></div>
        ${v.rows.length > 1 ? `<button class="x" data-del="${i}" aria-label="Remove">×</button>` : ""}
      </div>`;
    }).join("");
  }

  function bulkFoot() {
    const total = v.rows.reduce((s, r) => s + (quote({ pickup: B.pickup, dropoff: r.dropoff })?.price || 0), 0);
    return `<div><small>${v.rows.length} deliveries · added to your monthly invoice</small><b>${naira(total)}</b></div>
      <button class="btn-primary-sm big" data-act="book-all">Book ${v.rows.length} deliver${v.rows.length > 1 ? "ies" : "y"}</button>`;
  }

  function statements() {
    const months = [["October 2026", "In progress", S.baseline.businessMonthSpend + mine().filter((o) => Date.now() - o.createdAt < 18 * 3600e3).reduce((s, o) => s + o.price, 0), 214], ["September 2026", "Paid", 1186400, 301], ["August 2026", "Paid", 1043900, 276]];
    return `<table class="tbl"><thead><tr><th>Month</th><th>Deliveries</th><th>Status</th><th class="r">Amount</th><th></th></tr></thead><tbody>
      ${months.map(([m, s, a, n]) => `<tr><td><b>${m}</b></td><td>${n}</td><td><span class="st ${s === "Paid" ? "st-delivered" : "st-assigned"}">${s}</span></td><td class="r">${naira(a)}</td><td class="r"><button class="link" data-act="pdf">Download PDF</button></td></tr>`).join("")}
    </tbody></table>`;
  }

  function team() {
    return `<div class="list">${B.staff.map((s, i) => `<div class="li"><span>${["👩🏾‍💼", "🧑🏿‍💼", "👩🏾"][i]}</span>${esc(s)}<small>${i === 0 ? "Admin · sees billing" : "Can book deliveries"}</small></div>`).join("")}</div>`;
  }

  function render() {
    if (v.page !== v._key) {
      v.map && v.map.destroy();
      v.map = null;
      root.innerHTML = shell();
      root.querySelectorAll("[data-region]").forEach((el) => (el.__html = null));
      v._key = v.page;
      if (v.page === "overview") v.map = fleetMap(root.querySelector("[data-map]"), { filter: (o) => o.senderName === B.name });
    }
    const rg = {};
    if (v.page === "overview") {
      rg.kpis = kpis();
      rg.table = table(6);
      const live = mine().filter((o) => ["assigned", "picked_up"].includes(o.status)).length;
      rg.livecount = `${live} on the road`;
      const h = chat.html();
      const log = root.querySelector('[data-region="log"]');
      const atBottom = !log || log.scrollHeight - log.scrollTop - log.clientHeight < 60;
      rg.log = h.log; rg.chips = h.chips;
      fill(root, rg);
      if (atBottom && log) log.scrollTop = log.scrollHeight;
      return;
    }
    if (v.page === "new") {
      if (!root.querySelector(".bulk-row") || !root.contains(document.activeElement) || !document.activeElement.matches("input,select")) rg.rows = rowsHtml();
      rg.bulkfoot = bulkFoot();
    }
    if (v.page === "deliveries") rg.table = table();
    if (v.page === "statements") rg.statements = statements();
    if (v.page === "team") rg.team = team();
    fill(root, rg);
  }

  bindChat(root, chat, render);
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-page],[data-act],[data-del]");
    if (!t) return;
    if (t.dataset.page) { v.page = t.dataset.page; return render(); }
    if (t.dataset.del) { v.rows.splice(+t.dataset.del, 1); fill(root, { rows: rowsHtml() }); return render(); }
    const act = t.dataset.act;
    if (act === "add-row") {
      const used = new Set(v.rows.map((r) => r.dropoff));
      v.rows.push({ dropoff: AREAS.find((a) => !used.has(a.name) && a.name !== B.pickup).name, item: "", recipientPhone: "" });
      fill(root, { rows: rowsHtml() });
      return render();
    }
    if (act === "book-all") {
      const made = v.rows.map((r) => createOrder({ pickup: B.pickup, dropoff: r.dropoff, item: r.item || "Package", category: "Medicine", recipientPhone: r.recipientPhone }, { sender: "business", payment: "Invoice" })).filter(Boolean);
      toast(`${made.length} deliveries booked, riders on the way`);
      v.page = "overview";
      return render();
    }
    if (act === "pdf") return toast("Statement PDF downloads in the real portal");
    if (act === "invite") return toast("Invite sent by SMS in the real portal");
  });
  root.addEventListener("change", (e) => {
    const i = e.target.dataset.row;
    if (i === undefined) return;
    v.rows[+i][e.target.dataset.k] = e.target.value;
    fill(root, { rows: rowsHtml() });
    render();
  });
  root.addEventListener("input", (e) => {
    const i = e.target.dataset.row;
    if (i === undefined) return;
    v.rows[+i][e.target.dataset.k] = e.target.value;
  });

  render();
  return { render, tick() { if (v.map) v.map.sync(); } };
}
