// One shared, in-memory state for all four apps, plus a small simulation
// so the platform feels alive (riders move, other businesses send orders).
import { AREA_LIST } from "../../assets/js/areas.js";
import { haversineKm } from "./util.js";
import { route, pointAlong } from "./geo.js";

export const AREAS = AREA_LIST;
export const area = (name) => AREAS.find((a) => a.name === name);

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
let pending = false;
export function emit() {
  if (pending) return;
  pending = true;
  queueMicrotask(() => {
    pending = false;
    listeners.forEach((fn) => fn());
  });
}

const now = Date.now();
const min = 60000;

export const S = {
  pricing: { base: 800, perKm: 180, minimum: 1500, medium: 15, large: 35, express: 30 },
  customer: { name: "Amaka Obi", phone: "0803 555 0142" },
  business: { name: "Medway Pharmacy", pickup: "Wuse 2", contact: "Mrs. Bello", staff: ["Mrs. Bello (Owner)", "Ahmed (Dispatch)", "Grace (Front desk)"] },
  myRiderId: "r1",
  riders: [
    { id: "r1", name: "Tunde Bakare", rating: 4.9, plate: "ABJ 482 QA", area: "Wuse 2", online: true, trips: 412, earnedToday: 9400, approved: true },
    { id: "r2", name: "Ibrahim Musa", rating: 4.8, plate: "BWR 113 RT", area: "Maitama", online: true, trips: 655, earnedToday: 12100, approved: true },
    { id: "r3", name: "Chinedu Okafor", rating: 4.7, plate: "KUJ 920 LG", area: "Utako", online: true, trips: 287, earnedToday: 7300, approved: true },
    { id: "r4", name: "Abubakar Sani", rating: 4.9, plate: "ABJ 301 KT", area: "Garki", online: true, trips: 531, earnedToday: 10850, approved: true },
    { id: "r5", name: "Sadiq Bello", rating: 4.6, plate: "GWA 774 XA", area: "Gwarinpa", online: true, trips: 198, earnedToday: 5600, approved: true },
    { id: "r6", name: "Emeka Nwosu", rating: 4.8, plate: "KWL 559 JN", area: "Jabi", online: false, trips: 344, earnedToday: 0, approved: true },
    { id: "r7", name: "Musa Danladi", rating: 4.7, plate: "ABJ 640 BB", area: "Wuye", online: true, trips: 402, earnedToday: 8200, approved: true }
  ],
  applicants: [
    { id: "a1", name: "Yusuf Danjuma", area: "Lugbe", submitted: now - 52 * min, checks: [
      { ok: true, text: "Name on ID matches licence" },
      { ok: true, text: "Licence valid until Aug 2028" },
      { ok: true, text: "Face photo matches ID photo" },
      { ok: true, text: "Motorcycle papers readable, plate ABJ 218 YT" }
    ] },
    { id: "a2", name: "Peter Eze", area: "Nyanya", submitted: now - 3 * 60 * min, checks: [
      { ok: true, text: "Name on ID matches licence" },
      { ok: false, text: "Licence expired in March 2026, ask for renewal" },
      { ok: true, text: "Face photo matches ID photo" },
      { ok: true, text: "Motorcycle papers readable, plate KUJ 551 HD" }
    ] },
    { id: "a3", name: "Haruna Bello", area: "Kubwa", submitted: now - 26 * 60 * min, checks: [
      { ok: true, text: "Name on ID matches licence" },
      { ok: true, text: "Licence valid until Jan 2027" },
      { ok: true, text: "Face photo matches ID photo" },
      { ok: false, text: "Motorcycle papers photo is blurry, request re-upload" }
    ] }
  ],
  orders: [],
  baseline: { deliveriesToday: 37, revenueToday: 141600, businessMonthDeliveries: 214, businessMonthSpend: 842300 },
  splitView: false
};

// Rider live positions
for (const r of S.riders) {
  const a = area(r.area);
  r.pos = [a.lat + (Math.random() - 0.5) * 0.012, a.lng + (Math.random() - 0.5) * 0.012];
}
export const rider = (id) => S.riders.find((r) => r.id === id);

// ---------- Pricing ----------
export function quote({ pickup, dropoff, size = "Small", speed = "Standard" }, p = S.pricing) {
  const a = area(pickup), b = area(dropoff);
  if (!a || !b || a === b) return null;
  const km = Math.round(haversineKm(a, b) * 1.3 * 10) / 10;
  let price = Math.max(p.base + p.perKm * km, p.minimum);
  if (size === "Medium") price *= 1 + p.medium / 100;
  if (size === "Large") price *= 1 + p.large / 100;
  if (speed === "Express") price *= 1 + p.express / 100;
  price = Math.round(price / 50) * 50;
  const tripMin = Math.round((km / 20) * 60 * (speed === "Express" ? 0.85 : 1)) + 4;
  return { km, price, tripMin, pickupMin: speed === "Express" ? 4 : 7 };
}

// ---------- Orders ----------
let seq = 1040;
const code = () => String(1000 + Math.floor(Math.random() * 9000));

export function createOrder(d, { sender = "customer", senderName, payment = "Card", silent = false } = {}) {
  const q = quote(d);
  if (!q) return null;
  const a = area(d.pickup), b = area(d.dropoff);
  const o = {
    id: "TTC-" + ++seq,
    sender,
    senderName: senderName || (sender === "business" ? S.business.name : S.customer.name),
    pickup: d.pickup, dropoff: d.dropoff,
    item: d.item || d.category || "Parcel", category: d.category || "Parcel",
    size: d.size || "Small", speed: d.speed || "Standard",
    recipientName: d.recipientName || "", recipientPhone: d.recipientPhone || "",
    notes: d.notes || "",
    price: q.price, km: q.km, tripMin: q.tripMin,
    payment, paid: payment === "Card" || payment === "Invoice",
    status: "searching", riderId: null, code: code(),
    createdAt: Date.now(), events: [{ s: "searching", t: Date.now() }],
    leg: null, legT: 0, legDur: 0, arrived: false, rating: 0
  };
  o.tripPath = route(a, b, (p) => { o.tripPath = p; });
  S.orders.unshift(o);
  // If nobody accepts in the rider app, a nearby rider takes it automatically.
  const wait = S.splitView || o.sender === "sim" ? (o.sender === "sim" ? 1500 : 30000) : 9000;
  o.autoAt = Date.now() + wait;
  if (!silent) emit();
  return o;
}

function nearestFreeRider(o) {
  const a = area(o.pickup);
  const busy = new Set(S.orders.filter((x) => ["assigned", "picked_up"].includes(x.status)).map((x) => x.riderId));
  return S.riders
    .filter((r) => r.online && r.approved && !busy.has(r.id) && r.id !== S.myRiderId)
    .sort((x, y) => haversineKm({ lat: x.pos[0], lng: x.pos[1] }, a) - haversineKm({ lat: y.pos[0], lng: y.pos[1] }, a))[0];
}

export function assign(o, riderId) {
  if (o.status !== "searching") return false;
  const r = rider(riderId);
  o.riderId = riderId;
  o.status = "assigned";
  o.events.push({ s: "assigned", t: Date.now() });
  const a = area(o.pickup);
  const from = { lat: r.pos[0], lng: r.pos[1] };
  o.toPickupPath = route(from, a, (p) => { o.toPickupPath = p; });
  startLeg(o, "toPickup", Math.max(9, Math.min(16, haversineKm(from, a) * 3)));
  emit();
  return true;
}

function startLeg(o, leg, seconds) {
  o.leg = leg;
  o.legT = 0;
  o.legDur = seconds * 1000;
  o.legStart = Date.now();
  o.arrived = false;
}

export function confirmPickup(o) {
  if (o.status !== "assigned") return;
  o.status = "picked_up";
  o.events.push({ s: "picked_up", t: Date.now() });
  startLeg(o, "trip", Math.max(14, Math.min(26, o.km * 1.4)));
  emit();
}

export function confirmDelivery(o) {
  if (o.status !== "picked_up") return;
  o.status = "delivered";
  o.leg = null;
  o.events.push({ s: "delivered", t: Date.now() });
  const r = rider(o.riderId);
  if (r) {
    r.earnedToday += Math.round(o.price * 0.8);
    r.trips += 1;
    const b = area(o.dropoff);
    r.pos = [b.lat, b.lng];
  }
  if (o.payment === "Cash") o.cashCollected = true;
  emit();
}

export function cancelOrder(o) {
  if (o.status !== "searching") return;
  o.status = "cancelled";
  o.events.push({ s: "cancelled", t: Date.now() });
  emit();
}

export function riderPos(o) {
  if (o.status === "assigned") return pointAlong(o.toPickupPath, o.legT);
  if (o.status === "picked_up") return pointAlong(o.tripPath, o.legT);
  return null;
}

export function etaMinutes(o) {
  if (o.status === "searching") return null;
  if (o.status === "assigned") return Math.max(1, Math.round((1 - o.legT) * 7)) + o.tripMin;
  if (o.status === "picked_up") return Math.max(1, Math.round((1 - o.legT) * o.tripMin));
  return 0;
}

// ---------- Seed data ----------
const SIM_SENDERS = [
  { name: "Mama Tee Kitchen", pickup: "Garki", items: ["Jollof rice x3", "Small chops tray", "Pepper soup"], category: "Food" },
  { name: "Glow Beauty Store", pickup: "Jabi", items: ["Skincare set", "Hair products"], category: "Parcel" },
  { name: "Chops & Co", pickup: "Utako", items: ["Shawarma x2", "Burger meal"], category: "Food" },
  { name: "Medway Pharmacy", pickup: "Wuse 2", items: ["Prescription refill", "Malaria pack"], category: "Medicine", business: true },
  { name: "Ade Gadgets", pickup: "Wuse", items: ["Phone charger", "Earbuds"], category: "Parcel" }
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function simOrder(withSender) {
  const s = withSender || pick(SIM_SENDERS);
  let drop;
  do drop = pick(AREAS).name; while (drop === s.pickup || quote({ pickup: s.pickup, dropoff: drop }).km > 22);
  return createOrder(
    { pickup: s.pickup, dropoff: drop, item: pick(s.items), category: s.category, size: "Small", speed: Math.random() < 0.3 ? "Express" : "Standard" },
    { sender: s.business ? "business" : "sim", senderName: s.name, payment: pick(["Card", "Card", "Transfer", "Cash"]), silent: true }
  );
}

// Past deliveries for history tables
(function seedHistory() {
  const past = [
    { pickup: "Wuse 2", dropoff: "Maitama", item: "Insulin pack", category: "Medicine", sender: "business", ago: 35 },
    { pickup: "Wuse 2", dropoff: "Asokoro", item: "Prescription refill", category: "Medicine", sender: "business", ago: 80 },
    { pickup: "Wuse 2", dropoff: "Gwarinpa", item: "Baby formula x2", category: "Medicine", sender: "business", ago: 140 },
    { pickup: "Jabi", dropoff: "Gudu", item: "Birthday cake", category: "Fragile", sender: "customer", ago: 60 * 26 },
    { pickup: "Garki", dropoff: "Central Area", item: "Documents for signing", category: "Documents", sender: "customer", ago: 60 * 75 },
    { pickup: "Garki", dropoff: "Wuse 2", item: "Jollof rice x3", category: "Food", sender: "sim", name: "Mama Tee Kitchen", ago: 20 },
    { pickup: "Jabi", dropoff: "Life Camp", item: "Skincare set", category: "Parcel", sender: "sim", name: "Glow Beauty Store", ago: 50 }
  ];
  const riders = ["r2", "r3", "r4", "r5", "r7"];
  past.forEach((p, i) => {
    const o = createOrder(p, { sender: p.sender, senderName: p.name, payment: i % 3 === 0 ? "Transfer" : "Card", silent: true });
    o.status = "delivered";
    o.riderId = riders[i % riders.length];
    o.createdAt = Date.now() - p.ago * min;
    o.events = [{ s: "searching", t: o.createdAt }, { s: "delivered", t: o.createdAt + (o.tripMin + 9) * min }];
    o.rating = 5;
    if (o.payment === "Transfer" && i === 3) o.paid = true;
  });
  // One transfer awaiting confirmation for the admin payments screen
  const t = createOrder({ pickup: "Wuse", dropoff: "Katampe", item: "Laptop", category: "Fragile", size: "Medium" }, { sender: "sim", senderName: "Ade Gadgets", payment: "Transfer", silent: true });
  t.status = "delivered"; t.riderId = "r4"; t.createdAt = Date.now() - 95 * min; t.events = [{ s: "delivered", t: t.createdAt + 40 * min }];
  S.orders.sort((a, b) => b.createdAt - a.createdAt);
  // Two live deliveries already on the road
  [SIM_SENDERS[0], SIM_SENDERS[1]].forEach((s) => {
    const o = simOrder(s);
    const r = nearestFreeRider(o);
    if (r) {
      assign(o, r.id);
      confirmPickup(o);
      o.legStart = Date.now() - o.legDur * (0.2 + Math.random() * 0.4);
    }
  });
})();

// ---------- Simulation loop ----------
let lastSpawn = Date.now();
export function simulate() {
  const t = Date.now();
  let changed = false;
  for (const o of S.orders) {
    if (o.status === "searching" && t >= o.autoAt) {
      const r = nearestFreeRider(o);
      if (r) { assign(o, r.id); changed = true; }
      else o.autoAt = t + 4000;
    }
    if (o.leg) {
      o.legT = Math.min(1, (t - o.legStart) / o.legDur);
      const p = riderPos(o);
      const r = rider(o.riderId);
      if (p && r) r.pos = p;
      if (o.legT >= 1 && !o.arrived) {
        o.arrived = true;
        changed = true;
        const manual = o.riderId === S.myRiderId;
        if (!manual) {
          // simulated riders complete their own steps
          setTimeout(() => (o.status === "assigned" ? confirmPickup(o) : confirmDelivery(o)), 1800);
        }
      }
    }
  }
  const active = S.orders.filter((o) => ["searching", "assigned", "picked_up"].includes(o.status) && o.sender === "sim").length;
  if (t - lastSpawn > 22000 && active < 3) {
    lastSpawn = t;
    simOrder();
    changed = true;
  }
  if (changed) emit();
}

// ---------- Derived numbers ----------
export function stats() {
  const today = S.orders.filter((o) => Date.now() - o.createdAt < 18 * 60 * min);
  const delivered = today.filter((o) => o.status === "delivered");
  const active = S.orders.filter((o) => ["searching", "assigned", "picked_up"].includes(o.status));
  return {
    active: active.length,
    searching: active.filter((o) => o.status === "searching").length,
    online: S.riders.filter((r) => r.online && r.approved).length,
    deliveredToday: S.baseline.deliveriesToday + delivered.length,
    revenueToday: S.baseline.revenueToday + delivered.reduce((s, o) => s + o.price, 0),
    awaitingPayment: S.orders.filter((o) => !o.paid && o.status !== "cancelled" && (o.payment === "Transfer" || o.payment === "Cash")).length
  };
}

export function snapshotForAI() {
  const busy = new Map(S.orders.filter((o) => ["assigned", "picked_up"].includes(o.status)).map((o) => [o.riderId, o.id]));
  const nearestArea = (pos) => AREAS.slice().sort((a, b) => haversineKm({ lat: pos[0], lng: pos[1] }, a) - haversineKm({ lat: pos[0], lng: pos[1] }, b))[0].name;
  return JSON.stringify({
    time: new Date().toLocaleTimeString("en-NG"),
    stats: stats(),
    riders: S.riders.map((r) => ({ name: r.name, online: r.online, busyWith: busy.get(r.id) || null, nearestArea: nearestArea(r.pos), rating: r.rating, earnedToday: r.earnedToday, tripsTotal: r.trips })),
    activeDeliveries: S.orders.filter((o) => ["searching", "assigned", "picked_up"].includes(o.status)).map((o) => ({ id: o.id, from: o.pickup, to: o.dropoff, sender: o.senderName, status: o.status, price: o.price, rider: rider(o.riderId)?.name || null })),
    recentDelivered: S.orders.filter((o) => o.status === "delivered").slice(0, 12).map((o) => ({ id: o.id, from: o.pickup, to: o.dropoff, sender: o.senderName, price: o.price, payment: o.payment, paid: o.paid })),
    riderApplicationsPending: S.applicants.length,
    pricing: S.pricing
  });
}
