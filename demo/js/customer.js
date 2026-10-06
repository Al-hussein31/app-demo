import { esc, naira, fill, toast, STATUS_LABEL, CATEGORY_ICON, initials, clock, timeAgo } from "./util.js";
import { S, AREAS, quote, createOrder, cancelOrder, rider, etaMinutes, emit } from "./store.js";
import { orderMap } from "./layers.js";
import { createChat, bindChat, chatInput } from "./chat.js";

const CATS = ["Food", "Documents", "Medicine", "Parcel", "Fragile"];

export function customerView(root) {
  const v = {
    screen: "home", orderId: null, sheet: null, receiptId: null,
    form: { pickup: "Jabi", dropoff: "Maitama", item: "", category: "Parcel", size: "Small", speed: "Standard", recipientName: "Bola", recipientPhone: "0802 334 7781", notes: "" },
    pay: "Card", rating: 0, _key: null, map: null
  };
  const mine = () => S.orders.filter((o) => o.sender === "customer");
  const order = () => S.orders.find((o) => o.id === v.orderId);

  const chat = createChat({
    sender: "customer",
    greeting: "Hi Amaka 👋 Tell me what to send and where. You can type or talk, in English or Pidgin.",
    suggestions: ["Pick up from my pharmacy in Wuse 2, deliver to Gwarinpa", "abeg carry food from Garki go Lugbe sharp sharp", "Send my laptop from Jabi to Maitama"],
    onBooked: (orders) => { if (orders.length === 1) go("track", orders[0].id); else go("activity"); }
  });

  function go(screen, orderId = null) {
    v.screen = screen;
    v.orderId = orderId;
    v.sheet = null;
    render();
    root.querySelector(".scr-body")?.scrollTo(0, 0);
  }

  // ---------- Screens ----------
  const nav = () => `<nav class="tabbar">
    ${[["home", "⌂", "Home"], ["send", "＋", "Send"], ["activity", "◷", "Activity"], ["account", "◯", "Account"]]
      .map(([k, i, l]) => `<button data-go="${k}" class="${v.screen === k ? "on" : ""}"><span>${i}</span>${l}</button>`).join("")}
  </nav>`;

  const shells = {
    home: () => `<div class="scr"><div class="scr-body" data-region="body"></div>${nav()}</div>`,
    activity: () => `<div class="scr"><header class="scr-head"><h2>Activity</h2></header><div class="scr-body" data-region="body"></div>${nav()}</div>`,
    account: () => `<div class="scr"><header class="scr-head"><h2>Account</h2></header><div class="scr-body" data-region="body"></div>${nav()}</div>`,
    send: () => `<div class="scr"><header class="scr-head"><button class="back" data-go="home" aria-label="Back">‹</button><h2>Send a package</h2></header>
      <div class="scr-body">${sendForm()}<div data-region="quote"></div></div>
      <div class="scr-cta" data-region="cta"></div><div data-region="sheet"></div></div>`,
    track: () => `<div class="scr scr-track"><div class="map-slot" data-map></div>
      <button class="back floating" data-go="activity" aria-label="Back">‹</button>
      <div class="track-sheet" data-region="sheet"></div><div data-region="modal"></div></div>`,
    chat: () => `<div class="scr scr-chat"><header class="scr-head ai-head"><button class="back" data-go="home" aria-label="Back">‹</button>
      <div><h2><span class="spark">✦</span> TTC AI</h2><small>Books deliveries for you</small></div></header>
      <div class="scr-body chat-log" data-region="log"></div><div data-region="chips"></div>${chatInput(chat, "e.g. send food from Garki to Wuse 2")}</div>`
  };

  function sendForm() {
    const f = v.form;
    const opts = (sel) => AREAS.map((a) => `<option ${a.name === sel ? "selected" : ""}>${esc(a.name)}</option>`).join("");
    return `<div class="form">
      <div class="route-box">
        <label class="fld"><span class="dot-a"></span><small>Pickup</small><select data-f="pickup">${opts(f.pickup)}</select></label>
        <label class="fld"><span class="dot-b"></span><small>Drop-off</small><select data-f="dropoff">${opts(f.dropoff)}</select></label>
      </div>
      <p class="lbl">What are you sending?</p>
      <div class="chips" data-chips="category">${CATS.map((c) => `<button type="button" data-v="${c}" class="${f.category === c ? "on" : ""}">${CATEGORY_ICON[c]} ${c}</button>`).join("")}</div>
      <p class="lbl">Size</p>
      <div class="seg" data-chips="size">${["Small", "Medium", "Large"].map((c) => `<button type="button" data-v="${c}" class="${f.size === c ? "on" : ""}">${c}</button>`).join("")}</div>
      <p class="lbl">Speed</p>
      <div class="seg" data-chips="speed">${["Standard", "Express"].map((c) => `<button type="button" data-v="${c}" class="${f.speed === c ? "on" : ""}">${c === "Express" ? "⚡ Express" : c}</button>`).join("")}</div>
      <p class="lbl">Receiver</p>
      <div class="two"><input data-f="recipientName" value="${esc(f.recipientName)}" placeholder="Name"><input data-f="recipientPhone" value="${esc(f.recipientPhone)}" placeholder="Phone" inputmode="tel"></div>
      <input data-f="notes" value="${esc(f.notes)}" placeholder="Note for rider (optional)">
    </div>`;
  }

  function quoteBox() {
    const q = quote(v.form);
    if (!q) return `<div class="quote warn">Pickup and drop-off must be different.</div>`;
    return `<div class="quote">
      <div class="q-row"><span>Distance</span><b>${q.km} km</b></div>
      <div class="q-row"><span>Rider arrives in</span><b>~${q.pickupMin} min</b></div>
      <div class="q-row"><span>Delivery time</span><b>~${q.tripMin} min</b></div>
      <div class="q-row q-total"><span>Price</span><b>${naira(q.price)}</b></div>
      <p class="lbl">Pay with</p>
      <div class="pay-opts">${[["Card", "💳", "Card · Paystack"], ["Transfer", "🏦", "Bank transfer"], ["Cash", "💵", "Cash on delivery"]]
        .map(([k, i, l]) => `<button type="button" data-pay="${k}" class="${v.pay === k ? "on" : ""}"><span>${i}</span>${l}</button>`).join("")}</div>
    </div>`;
  }

  function payCta() {
    const q = quote(v.form);
    return `<button class="cta" data-act="book" ${q ? "" : "disabled"}>${v.pay === "Card" ? "Pay & book" : "Book"}${q ? " · " + naira(q.price) : ""}</button>`;
  }

  function paySheet() {
    if (v.sheet !== "pay") return "";
    const q = quote(v.form);
    return `<div class="overlay"><div class="sheet-card">
      <div class="sheet-grab"></div>
      <p class="pay-brand">Secure checkout <span class="test">Test mode</span></p>
      <h3>${naira(q.price)}</h3>
      <p class="muted">TTC Delivery · ${esc(v.form.pickup)} → ${esc(v.form.dropoff)}</p>
      <div class="card-line"><span>💳 Visa •••• 4081</span><span class="muted">Saved</span></div>
      <button class="cta" data-act="pay">Pay ${naira(q.price)}</button>
      <button class="link" data-act="close-sheet">Cancel</button>
      <p class="tiny">Card payments run through Paystack. This demo doesn't charge anything.</p>
    </div></div>`;
  }

  function orderRow(o) {
    const r = rider(o.riderId);
    return `<button class="order-row" data-open="${o.id}">
      <span class="o-ico">${CATEGORY_ICON[o.category] || "📦"}</span>
      <span class="o-main"><b>${esc(o.pickup)} → ${esc(o.dropoff)}</b><small>${esc(o.item)} · ${o.status === "delivered" ? timeAgo(o.createdAt) : esc(STATUS_LABEL[o.status])}${r && o.status !== "delivered" ? " · " + esc(r.name.split(" ")[0]) : ""}</small></span>
      <span class="o-side"><b>${naira(o.price)}</b><small class="st st-${o.status}">${o.status === "delivered" ? "Delivered" : o.status === "cancelled" ? "Cancelled" : "Live"}</small></span>
    </button>`;
  }

  function homeBody() {
    const active = mine().filter((o) => ["searching", "assigned", "picked_up"].includes(o.status));
    const recent = mine().filter((o) => o.status === "delivered").slice(0, 3);
    const hr = new Date().getHours();
    const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    return `<div class="home-top">
        <div class="hello"><small>${greet},</small><h2>${esc(S.customer.name.split(" ")[0])} 👋</h2></div>
        <div class="avatar-sm">${initials(S.customer.name)}</div>
      </div>
      <button class="ai-bar" data-go="chat"><span class="spark">✦</span><span>Ask TTC AI<small>“Send my laptop from Jabi to Maitama”</small></span><span class="mic">🎙</span></button>
      <button class="send-card" data-go="send">
        <div><b>Send a package</b><small>Instant price · rider in minutes</small></div><span class="arrow">→</span>
      </button>
      <div class="quick">${CATS.slice(0, 4).map((c) => `<button data-quick="${c}"><span>${CATEGORY_ICON[c]}</span>${c}</button>`).join("")}</div>
      ${active.map((o) => {
        const r = rider(o.riderId);
        const eta = etaMinutes(o);
        return `<button class="live-card" data-open="${o.id}">
          <div class="live-top"><span class="pulse"></span><b>${esc(STATUS_LABEL[o.status])}</b>${eta ? `<span class="eta">${eta} min</span>` : ""}</div>
          <p>${esc(o.pickup)} → ${esc(o.dropoff)}${r ? ` · ${esc(r.name)}` : ""}</p>
          <div class="bar"><i style="width:${o.status === "searching" ? 8 : o.status === "assigned" ? 15 + o.legT * 30 : 50 + o.legT * 50}%"></i></div>
        </button>`;
      }).join("")}
      <div class="sec-h"><b>Recent</b><button class="link" data-go="activity">See all</button></div>
      ${recent.map(orderRow).join("") || `<p class="empty">No deliveries yet.</p>`}
      <div class="promo"><b>Run a business?</b><p>Get a TTC Business account: saved pickup, bulk deliveries and monthly invoices.</p></div>`;
  }

  function activityBody() {
    const list = mine();
    return list.length ? list.map(orderRow).join("") : `<p class="empty">No deliveries yet. Send your first package.</p>`;
  }

  function accountBody() {
    return `<div class="acct-head"><div class="avatar-lg">${initials(S.customer.name)}</div><div><b>${esc(S.customer.name)}</b><small>${esc(S.customer.phone)}</small></div></div>
      <div class="list">
        <div class="li"><span>💳</span>Payment methods<small>Visa •••• 4081</small></div>
        <div class="li"><span>📍</span>Saved addresses<small>Home · Work</small></div>
        <div class="li"><span>🏢</span>Switch to business account<small>For shops, restaurants &amp; pharmacies</small></div>
        <a class="li" href="tel:+2340000000000"><span>📞</span>Call support</a>
        <a class="li" href="#" data-act="wa"><span>💬</span>WhatsApp support</a>
        <div class="li"><span>🔒</span>Privacy &amp; terms</div>
      </div>`;
  }

  function trackSheet() {
    const o = order();
    if (!o) return "";
    const r = rider(o.riderId);
    const eta = etaMinutes(o);
    const steps = [["searching", "Finding a rider"], ["assigned", "Rider on the way to pickup"], ["picked_up", "Picked up, on the way"], ["delivered", "Delivered"]];
    const idx = steps.findIndex(([s]) => s === o.status);
    const stepper = steps.map(([s, l], i) => {
      const ev = o.events.find((e) => e.s === s);
      return `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><span></span><div>${l}${ev && i <= idx ? `<small>${clock(ev.t)}</small>` : ""}</div></li>`;
    }).join("");
    let head;
    if (o.status === "searching") head = `<div class="t-head"><div><small>${o.id}</small><h3>Finding you a rider…</h3></div><div class="spinner"></div></div>`;
    else if (o.status === "delivered") head = `<div class="t-head"><div><small>${o.id}</small><h3>Delivered ✓</h3></div></div>`;
    else if (o.status === "cancelled") head = `<div class="t-head"><div><small>${o.id}</small><h3>Cancelled</h3></div></div>`;
    else head = `<div class="t-head"><div><small>${o.id} · ${esc(STATUS_LABEL[o.status])}</small><h3>${eta} min <span class="muted">to delivery</span></h3></div></div>`;
    const riderCard = r && o.status !== "searching" ? `<div class="rider-card">
        <div class="avatar-sm">${initials(r.name)}</div>
        <div class="rc-main"><b>${esc(r.name)}</b><small>${r.rating}★ · ${esc(r.plate)} · Verified</small></div>
        <a class="round" href="tel:+2340000000000" aria-label="Call rider">📞</a><button class="round" data-act="wa" aria-label="Message rider">💬</button>
      </div>` : "";
    const codeBox = ["assigned", "picked_up"].includes(o.status) ? `<div class="code-box"><span>Delivery code for ${esc(o.recipientName || "the receiver")}</span><b>${o.code.split("").join(" ")}</b></div>` : "";
    const done = o.status === "delivered" ? `<div class="rate">
        <p>How was ${r ? esc(r.name.split(" ")[0]) : "your rider"}?</p>
        <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-rate="${n}" class="${(o.rating || v.rating) >= n ? "on" : ""}" aria-label="${n} stars">★</button>`).join("")}</div>
        <button class="btn-line" data-act="receipt">View receipt</button>
      </div>` : "";
    return `${head}${riderCard}${codeBox}
      <ul class="stepper">${stepper}</ul>
      <div class="t-meta"><span>${CATEGORY_ICON[o.category] || "📦"} ${esc(o.item)}</span><span>${naira(o.price)} · ${esc(o.payment)}</span></div>
      ${done}
      ${["searching", "assigned", "picked_up"].includes(o.status) ? `<div class="t-actions"><button class="btn-line" data-act="share">Share tracking link</button>${o.status === "searching" ? `<button class="btn-line danger" data-act="cancel">Cancel</button>` : ""}</div>` : ""}`;
  }

  function receiptModal() {
    const o = order();
    if (v.sheet !== "receipt" || !o) return "";
    const r = rider(o.riderId);
    return `<div class="overlay"><div class="sheet-card receipt">
      <div class="sheet-grab"></div>
      <img src="../assets/img/ttc-mark.svg" alt="" width="36" height="36">
      <h3>Receipt</h3><p class="muted">${o.id} · ${new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
      <div class="q-row"><span>From</span><b>${esc(o.pickup)}</b></div>
      <div class="q-row"><span>To</span><b>${esc(o.dropoff)}</b></div>
      <div class="q-row"><span>Item</span><b>${esc(o.item)}</b></div>
      <div class="q-row"><span>Rider</span><b>${r ? esc(r.name) : "-"}</b></div>
      <div class="q-row"><span>Distance</span><b>${o.km} km</b></div>
      <div class="q-row"><span>Payment</span><b>${esc(o.payment)}</b></div>
      <div class="q-row q-total"><span>Total</span><b>${naira(o.price)}</b></div>
      <button class="cta" data-act="close-sheet">Done</button>
    </div></div>`;
  }

  // ---------- Render ----------
  function key() { return v.screen + ":" + (v.orderId || ""); }

  function render() {
    const k = key();
    if (k !== v._key) {
      v.map && v.map.destroy();
      v.map = null;
      root.innerHTML = shells[v.screen]();
      root.querySelectorAll("[data-region]").forEach((el) => (el.__html = null));
      v._key = k;
      if (v.screen === "track") {
        v.map = orderMap(root.querySelector("[data-map]"), order, { fitPadding: 50 });
      }
      if (v.screen === "chat") setTimeout(() => root.querySelector(".chat-form input")?.focus(), 50);
    }
    const regions = {};
    if (v.screen === "home") regions.body = homeBody();
    if (v.screen === "activity") regions.body = activityBody();
    if (v.screen === "account") regions.body = accountBody();
    if (v.screen === "send") { regions.quote = quoteBox(); regions.cta = payCta(); regions.sheet = paySheet(); }
    if (v.screen === "track") { regions.sheet = trackSheet(); regions.modal = receiptModal(); }
    if (v.screen === "chat") {
      const h = chat.html();
      const log = root.querySelector('[data-region="log"]');
      const atBottom = !log || log.scrollHeight - log.scrollTop - log.clientHeight < 60;
      regions.log = h.log;
      regions.chips = h.chips;
      fill(root, regions);
      if (atBottom && log) log.scrollTop = log.scrollHeight;
      return;
    }
    fill(root, regions);
  }

  // ---------- Events ----------
  bindChat(root, chat, render);
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-open],[data-act],[data-v],[data-pay],[data-quick],[data-rate]");
    if (!t) return;
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.open) return go("track", t.dataset.open);
    if (t.dataset.quick) { v.form.category = t.dataset.quick; return go("send"); }
    if (t.dataset.v) {
      const group = t.closest("[data-chips]").dataset.chips;
      v.form[group] = t.dataset.v;
      t.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === t));
      return render();
    }
    if (t.dataset.pay) { v.pay = t.dataset.pay; return render(); }
    if (t.dataset.rate) {
      const o = order();
      if (o) { o.rating = +t.dataset.rate; toast("Thanks for rating!"); emit(); }
      return;
    }
    const act = t.dataset.act;
    if (act === "book") {
      if (v.pay === "Card") { v.sheet = "pay"; return render(); }
      return placeOrder();
    }
    if (act === "pay") return placeOrder();
    if (act === "close-sheet") { v.sheet = null; return render(); }
    if (act === "receipt") { v.sheet = "receipt"; return render(); }
    if (act === "cancel") { cancelOrder(order()); return toast("Delivery cancelled, nothing charged"); }
    if (act === "share") { navigator.clipboard?.writeText("https://track.ttc.example/" + v.orderId).catch(() => {}); return toast("Tracking link copied, send it to the receiver"); }
    if (act === "wa") { e.preventDefault(); return toast("Opens WhatsApp in the real app"); }
  });
  root.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    v.form[f] = e.target.value;
    if (f === "pickup" || f === "dropoff") render();
  });
  root.addEventListener("change", (e) => {
    const f = e.target.dataset.f;
    if (f) { v.form[f] = e.target.value; render(); }
  });

  function placeOrder() {
    const f = v.form;
    const o = createOrder({ ...f, item: f.item || f.category }, { sender: "customer", payment: v.pay });
    if (!o) return;
    toast(v.pay === "Card" ? "Payment successful" : "Booked, finding a rider");
    go("track", o.id);
  }

  function tick() {
    if (v.map) v.map.sync();
  }

  render();
  return { render, tick, go };
}
