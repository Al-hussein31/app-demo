import { esc, naira, fill, toast, CATEGORY_ICON, initials } from "./util.js";
import { S, rider, assign, confirmPickup, confirmDelivery, area, emit } from "./store.js";
import { haversineKm } from "./util.js";
import { orderMap } from "./layers.js";

export function riderView(root) {
  const v = { screen: "home", _key: null, map: null, codeInput: "", declined: new Set() };
  const me = () => rider(S.myRiderId);
  const myActive = () => S.orders.find((o) => o.riderId === S.myRiderId && ["assigned", "picked_up"].includes(o.status));
  const offers = () => S.orders.filter((o) => o.status === "searching" && !v.declined.has(o.id));
  const earning = (o) => Math.round(o.price * 0.8 / 50) * 50;

  const nav = () => `<nav class="tabbar rider-tabs">
    ${[["home", "⌂", "Jobs"], ["earnings", "₦", "Earnings"], ["profile", "◯", "Profile"]]
      .map(([k, i, l]) => `<button data-go="${k}" class="${v.screen === k ? "on" : ""}"><span>${i}</span>${l}</button>`).join("")}
  </nav>`;

  const shells = {
    home: () => `<div class="scr rider"><div class="scr-body" data-region="body"></div>${nav()}</div>`,
    earnings: () => `<div class="scr rider"><header class="scr-head"><h2>Earnings</h2></header><div class="scr-body" data-region="body"></div>${nav()}</div>`,
    profile: () => `<div class="scr rider"><header class="scr-head"><h2>Profile</h2></header><div class="scr-body" data-region="body"></div>${nav()}</div>`,
    job: () => `<div class="scr scr-track rider"><div class="map-slot" data-map></div><div class="track-sheet" data-region="sheet"></div></div>`
  };

  function homeBody() {
    const r = me();
    const list = offers();
    return `<div class="r-top">
        <div class="hello"><small>Rider</small><h2>${esc(r.name.split(" ")[0])}</h2></div>
        <button class="toggle ${r.online ? "on" : ""}" data-act="toggle" aria-pressed="${r.online}"><span></span>${r.online ? "Online" : "Offline"}</button>
      </div>
      <div class="r-stats">
        <div><small>Today</small><b>${naira(r.earnedToday)}</b></div>
        <div><small>Rating</small><b>${r.rating}★</b></div>
        <div><small>Trips</small><b>${r.trips}</b></div>
      </div>
      <div class="verified">✓ Verified rider · documents approved</div>
      <div class="sec-h"><b>${r.online ? "Available jobs" : "You're offline"}</b>${r.online ? `<small class="muted">${list.length} nearby</small>` : ""}</div>
      ${!r.online ? `<p class="empty">Go online to start receiving delivery jobs.</p>` :
        list.length ? list.map((o) => {
          const d = haversineKm({ lat: r.pos[0], lng: r.pos[1] }, area(o.pickup));
          return `<div class="job ${o.speed === "Express" ? "express" : ""}">
            <div class="job-top"><span class="o-ico">${CATEGORY_ICON[o.category] || "📦"}</span><div><b>${naira(earning(o))}</b><small>you earn · ${o.km} km trip</small></div>${o.speed === "Express" ? `<span class="badge">⚡ Express</span>` : ""}</div>
            <div class="job-route"><div><span class="dot-a"></span>${esc(o.pickup)} <small>${d.toFixed(1)} km away</small></div><div><span class="dot-b"></span>${esc(o.dropoff)}</div></div>
            <small class="muted">${esc(o.senderName)} · ${esc(o.item)}</small>
            <div class="job-btns"><button class="btn-line" data-decline="${o.id}">Skip</button><button class="cta sm" data-accept="${o.id}">Accept</button></div>
          </div>`;
        }).join("") : `<div class="waiting"><div class="radar"></div><p>Waiting for jobs near you…</p><small>Tip: book a delivery in the Customer app or Business portal and it appears here.</small></div>`}`;
  }

  function jobSheet() {
    const o = myActive();
    if (!o) {
      return `<div class="t-head"><div><small>Job complete</small><h3>Nice one! +${naira(v.lastEarn || 0)}</h3></div></div>
        <button class="cta" data-go="home">Back to jobs</button>`;
    }
    const toPickup = o.status === "assigned";
    const place = toPickup ? o.pickup : o.dropoff;
    const a = area(place);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}&travelmode=driving`;
    const step = toPickup
      ? (o.arrived
        ? `<button class="cta" data-act="pickup">Confirm pickup</button>`
        : `<button class="cta ghost" disabled>Heading to pickup… ${Math.round(o.legT * 100)}%</button>`)
      : (o.arrived
        ? `<div class="code-entry"><label>Enter the receiver's delivery code<input data-code inputmode="numeric" maxlength="4" placeholder="• • • •" value="${esc(v.codeInput)}"></label>
            <small class="muted">Demo hint: the code is ${o.code}</small></div>
           <button class="cta" data-act="deliver">Confirm delivery</button>`
        : `<button class="cta ghost" disabled>On the way to drop-off… ${Math.round(o.legT * 100)}%</button>`);
    return `<div class="t-head"><div><small>${o.id} · ${toPickup ? "Go to pickup" : "Go to drop-off"}</small><h3>${esc(place)}</h3></div>
        <a class="nav-btn" href="${mapsUrl}" target="_blank" rel="noopener">Navigate ↗</a></div>
      <div class="job-route big">
        <div class="${toPickup ? "now" : "done"}"><span class="dot-a"></span><div><b>${esc(o.pickup)}</b><small>${esc(o.senderName)}</small></div></div>
        <div class="${toPickup ? "" : "now"}"><span class="dot-b"></span><div><b>${esc(o.dropoff)}</b><small>${esc(o.recipientName || "Receiver")}${o.recipientPhone ? " · " + esc(o.recipientPhone) : ""}</small></div></div>
      </div>
      <div class="t-meta"><span>${CATEGORY_ICON[o.category] || "📦"} ${esc(o.item)}</span><span>${o.payment === "Cash" ? `Collect ${naira(o.price)} cash` : "Paid"}</span></div>
      ${o.notes ? `<p class="note">“${esc(o.notes)}”</p>` : ""}
      ${step}`;
  }

  function earningsBody() {
    const r = me();
    const days = [["Mon", 11200], ["Tue", 8600], ["Wed", 13400], ["Thu", 9800], ["Fri", 15100], ["Sat", 12700], ["Today", r.earnedToday]];
    const max = Math.max(...days.map((d) => d[1]), 1);
    const week = days.reduce((s, d) => s + d[1], 0);
    return `<div class="earn-big"><small>This week</small><b>${naira(week)}</b><span>Next payout: Friday, to GTBank •••• 2231</span></div>
      <div class="bars" role="img" aria-label="Earnings for the last 7 days">${days.map(([d, n]) => `<div class="bar-col"><i style="height:${Math.max(4, (n / max) * 100)}%"></i><small>${d}</small></div>`).join("")}</div>
      <div class="list">
        <div class="li"><span>🏍</span>Trips this week<small>${48 + (r.trips - 412)}</small></div>
        <div class="li"><span>⏱</span>Online hours<small>41h</small></div>
        <div class="li"><span>✅</span>Acceptance rate<small>94%</small></div>
        <div class="li"><span>⭐</span>Rating<small>${r.rating}</small></div>
      </div>`;
  }

  function profileBody() {
    const r = me();
    const docs = [["Government ID (NIN)", "Verified"], ["Rider's licence", "Valid to Aug 2027"], ["Face photo", "Matches ID"], ["Motorcycle papers", r.plate], ["Guarantor", "Confirmed"]];
    return `<div class="acct-head"><div class="avatar-lg">${initials(r.name)}</div><div><b>${esc(r.name)}</b><small>${esc(r.plate)} · since 2026</small></div></div>
      <p class="lbl">Verification</p>
      <div class="list">${docs.map(([d, s]) => `<div class="li"><span class="ok">✓</span>${d}<small>${esc(s)}</small></div>`).join("")}</div>
      <p class="tiny">New riders upload these in the app. AI checks names, dates and photos, then TTC approves.</p>`;
  }

  function key() { return v.screen; }

  function render() {
    const active = myActive();
    if (active && v.screen !== "job") v.screen = "job";
    const k = key();
    if (k !== v._key) {
      v.map && v.map.destroy();
      v.map = null;
      root.innerHTML = shells[v.screen]();
      root.querySelectorAll("[data-region]").forEach((el) => (el.__html = null));
      v._key = k;
      if (v.screen === "job") {
        let last = active;
        v.map = orderMap(root.querySelector("[data-map]"), () => myActive() || last, { fitPadding: 40 });
      }
    }
    const regions = {};
    if (v.screen === "home") regions.body = homeBody();
    if (v.screen === "earnings") regions.body = earningsBody();
    if (v.screen === "profile") regions.body = profileBody();
    if (v.screen === "job") {
      const focused = document.activeElement?.matches?.("[data-code]");
      regions.sheet = jobSheet();
      fill(root, regions);
      if (focused) { const i = root.querySelector("[data-code]"); i?.focus(); i?.setSelectionRange(99, 99); }
      return;
    }
    fill(root, regions);
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-act],[data-accept],[data-decline]");
    if (!t) return;
    if (t.dataset.go) { v.screen = t.dataset.go; return render(); }
    if (t.dataset.accept) {
      const o = S.orders.find((x) => x.id === t.dataset.accept);
      if (o && assign(o, S.myRiderId)) { toast("Job accepted. Head to pickup"); v.codeInput = ""; }
      else toast("Another rider took this job");
      return render();
    }
    if (t.dataset.decline) { v.declined.add(t.dataset.decline); return render(); }
    const act = t.dataset.act;
    if (act === "toggle") { const r = me(); r.online = !r.online; toast(r.online ? "You're online" : "You're offline"); emit(); return; }
    if (act === "pickup") { confirmPickup(myActive()); toast("Pickup confirmed. Customer notified"); return; }
    if (act === "deliver") {
      const o = myActive();
      if (v.codeInput.trim() !== o.code) { toast("Code doesn't match. Ask the receiver for their 4-digit code"); return; }
      v.lastEarn = earning(o);
      confirmDelivery(o);
      toast(`Delivered! +${naira(v.lastEarn)}`);
      v.codeInput = "";
      return;
    }
  });
  root.addEventListener("input", (e) => {
    if (e.target.matches("[data-code]")) v.codeInput = e.target.value.replace(/\D/g, "");
  });

  function onShow() {
    // Give the person exploring the rider app time to accept jobs themselves.
    S.orders.filter((o) => o.status === "searching" && o.sender !== "sim").forEach((o) => { o.autoAt = Math.max(o.autoAt, Date.now() + 25000); });
  }

  render();
  return {
    render() {
      // After a job completes, stay on the summary until the rider taps back.
      if (v.screen === "job" && !myActive() && v._key === "job") { fill(root, { sheet: jobSheet() }); return; }
      render();
    },
    tick() { if (v.map) v.map.sync(); },
    onShow
  };
}
