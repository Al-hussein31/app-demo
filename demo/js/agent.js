// Talks to /api/chat (Gemini). If the AI isn't reachable, a simple local parser
// keeps the demo working, so it never breaks in front of the owners.
import { AREAS, S, stats, rider, quote } from "./store.js";
import { naira, haversineKm } from "./util.js";

async function callApi(payload) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- Booking agent ----------
const ALIASES = [
  ["victoria island", "Victoria Island"], ["v.i", "Victoria Island"], ["vi", "Victoria Island"],
  ["lekki phase 1", "Lekki Phase 1"], ["lekki", "Lekki Phase 1"], ["admiralty", "Lekki Phase 1"],
  ["ikeja gra", "Ikeja GRA"], ["allen", "Ikeja"], ["computer village", "Ikeja"], ["ikeja", "Ikeja"],
  ["unilag", "Yaba"], ["yaba", "Yaba"], ["sabo", "Yaba"],
  ["lagos island", "Lagos Island"], ["marina", "Lagos Island"], ["idumota", "Lagos Island"], ["island", "Lagos Island"],
  ["ebute metta", "Ebute Metta"], ["ebute-metta", "Ebute Metta"],
  ["sangotedo", "Sangotedo"], ["ajah", "Ajah"], ["ikoyi", "Ikoyi"], ["surulere", "Surulere"], ["apapa", "Apapa"],
  ["festac", "Festac"], ["gbagada", "Gbagada"], ["maryland", "Maryland"], ["ogudu", "Ogudu"], ["oshodi", "Oshodi"],
  ["magodo", "Magodo"], ["ojota", "Ojota"], ["ketu", "Ketu"]
];

function findAreas(text) {
  const t = " " + text.toLowerCase().replace(/[^a-z0-9.\- ]/g, " ") + " ";
  const hits = [];
  const taken = [];
  for (const [alias, name] of ALIASES) {
    const re = new RegExp(`[^a-z]${alias.replace(/\./g, "\\.")}[^a-z]`, "g");
    let m;
    while ((m = re.exec(t))) {
      const start = m.index, end = m.index + m[0].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      hits.push({ name, at: start });
    }
  }
  return hits.sort((a, b) => a.at - b.at);
}

function guessCategory(t) {
  if (/(food|rice|jollof|chop|meal|shawarma|soup|pizza|burger|amala|suya)/.test(t)) return "Food";
  if (/(drug|medicine|pharm|prescription|insulin|tablet|malaria)/.test(t)) return "Medicine";
  if (/(document|docs|file|paper|letter|contract|envelope)/.test(t)) return "Documents";
  if (/(fragile|glass|cake|laptop|tv|phone screen)/.test(t)) return "Fragile";
  return "Parcel";
}

export function localBooking(message, defaultPickup) {
  const t = message.toLowerCase();
  const hits = findAreas(message);
  const category = guessCategory(t);
  const size = /(big|large|heavy|bulky)/.test(t) ? "Large" : /medium/.test(t) ? "Medium" : "Small";
  const speed = /(quick|fast|express|urgent|sharp|asap|now now)/.test(t) ? "Express" : "Standard";
  const fromIdx = t.search(/\bfrom\b|\bpick ?up\b|\bcollect\b/);
  let pickup = null;
  let drops = hits.map((h) => h.name);
  if (fromIdx >= 0) {
    const after = hits.find((h) => h.at >= fromIdx);
    if (after) {
      pickup = after.name;
      drops = hits.filter((h) => h !== after).map((h) => h.name);
    }
  }
  if (!pickup && defaultPickup) pickup = defaultPickup;
  if (!pickup && drops.length >= 2) pickup = drops.shift();
  drops = [...new Set(drops)].filter((d) => d !== pickup);
  if (!pickup) return { reply: "Sure. Where should the rider pick up from? (e.g. Lekki, Yaba, Ikeja)", action: "ask", deliveries: [] };
  if (!drops.length) return { reply: `Got it, pickup from ${pickup}. Where are we delivering to?`, action: "ask", deliveries: [] };
  const item = category === "Parcel" ? "Package" : category;
  return {
    reply: drops.length > 1
      ? `I've prepared ${drops.length} deliveries from ${pickup}. Check the prices and confirm.`
      : `Here's your ${speed === "Express" ? "express " : ""}delivery from ${pickup} to ${drops[0]}. Confirm and I'll find a rider.`,
    action: "book",
    deliveries: drops.map((d) => ({ pickup, dropoff: d, item, category, size, speed, recipientName: "", recipientPhone: "", notes: "" }))
  };
}

export async function bookingAgent(message, history, defaultPickup) {
  const api = await callApi({ mode: "booking", message, history, defaultPickup });
  if (api && api.reply !== undefined) return { ...api, source: "ai" };
  return { ...localBooking(message, defaultPickup), source: "local" };
}

// ---------- Admin assistant ----------
function localAdmin(q) {
  const t = q.toLowerCase();
  const s = stats();
  const busy = new Set(S.orders.filter((o) => ["assigned", "picked_up"].includes(o.status)).map((o) => o.riderId));
  const areaHit = findAreas(q)[0];
  if (/(free|available|idle)/.test(t)) {
    let free = S.riders.filter((r) => r.online && !busy.has(r.id));
    if (areaHit) {
      const a = AREAS.find((x) => x.name === areaHit.name);
      free = free.map((r) => ({ r, d: haversineKm({ lat: r.pos[0], lng: r.pos[1] }, a) })).sort((x, y) => x.d - y.d).slice(0, 3)
        .map(({ r, d }) => `• ${r.name}: ${d.toFixed(1)} km away, ${r.rating}★`);
      return `Closest free riders to ${areaHit.name}:\n${free.join("\n") || "None right now."}`;
    }
    return `${free.length} riders are free right now:\n${free.map((r) => "• " + r.name).join("\n")}`;
  }
  if (/(revenue|money|made|earn|sales)/.test(t)) return `Revenue today is ${naira(s.revenueToday)} from ${s.deliveredToday} deliveries. ${s.awaitingPayment} payments are waiting for confirmation.`;
  if (/(payment|transfer|cash|confirm)/.test(t)) return `${s.awaitingPayment} transfer or cash payments are waiting for confirmation. Open Payments to confirm them.`;
  if (/(application|applicant|approve|verification)/.test(t)) return `${S.applicants.length} rider applications are waiting. The AI checks flagged ${S.applicants.filter((a) => a.checks.some((c) => !c.ok)).length} for follow-up.`;
  if (/(best|top|rider of)/.test(t)) {
    const top = S.riders.slice().sort((a, b) => b.earnedToday - a.earnedToday).slice(0, 3);
    return "Top riders today:\n" + top.map((r) => `• ${r.name}: ${naira(r.earnedToday)}, ${r.rating}★`).join("\n");
  }
  return `Right now: ${s.active} active deliveries (${s.searching} waiting for a rider), ${s.online} riders online, ${s.deliveredToday} delivered today, ${naira(s.revenueToday)} revenue.`;
}

export async function adminAssistant(q, history, snapshot) {
  const api = await callApi({ mode: "admin", message: q, history, state: snapshot });
  if (api?.reply) return api.reply;
  return localAdmin(q);
}

export function priceFor(d) {
  return quote(d);
}

export { rider };
