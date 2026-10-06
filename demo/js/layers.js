// Keeps a Leaflet map in sync with one or more orders and riders.
import { makeMap, ICONS } from "./geo.js";
import { area, riderPos, rider, S } from "./store.js";

const L = window.L;

export function orderMap(el, getOrder, { interactive = true, fitPadding = 40 } = {}) {
  const map = makeMap(el, { interactive, compact: true });
  const layers = { trip: null, toPickup: null, a: null, b: null, r: null };
  let tripRef, pickRef, lastId, lastStatus;

  function sync() {
    const o = getOrder();
    if (!o) return;
    const a = area(o.pickup), b = area(o.dropoff);
    if (o.id !== lastId) {
      Object.values(layers).forEach((l) => l && l.remove());
      Object.keys(layers).forEach((k) => (layers[k] = null));
      layers.a = L.marker([a.lat, a.lng], { icon: ICONS.pickup() }).addTo(map);
      layers.b = L.marker([b.lat, b.lng], { icon: ICONS.dropoff() }).addTo(map);
      tripRef = pickRef = null;
      lastId = o.id;
      lastStatus = null;
    }
    if (o.tripPath !== tripRef) {
      layers.trip && layers.trip.remove();
      layers.trip = L.polyline(o.tripPath, { color: "#FF5A1F", weight: 5, opacity: 0.9 }).addTo(map);
      tripRef = o.tripPath;
      lastStatus = null;
    }
    if (o.status === "assigned" && o.toPickupPath && o.toPickupPath !== pickRef) {
      layers.toPickup && layers.toPickup.remove();
      layers.toPickup = L.polyline(o.toPickupPath, { color: "#0E1726", weight: 4, opacity: 0.55, dashArray: "6 8" }).addTo(map);
      pickRef = o.toPickupPath;
      lastStatus = null;
    }
    if (o.status !== "assigned" && layers.toPickup) { layers.toPickup.remove(); layers.toPickup = null; pickRef = null; }
    const p = riderPos(o);
    if (p) {
      if (!layers.r) layers.r = L.marker(p, { icon: ICONS.rider(true), zIndexOffset: 1000 }).addTo(map);
      else layers.r.setLatLng(p);
    } else if (layers.r && o.status !== "delivered") { layers.r.remove(); layers.r = null; }
    if (o.status !== lastStatus) {
      lastStatus = o.status;
      const pts = [[a.lat, a.lng], [b.lat, b.lng]];
      if (o.status === "assigned" && o.toPickupPath) pts.push(o.toPickupPath[0]);
      map.fitBounds(pts, { padding: [fitPadding, fitPadding], maxZoom: 14 });
    }
  }
  sync();
  return { map, sync, destroy: () => map.remove() };
}

// Fleet view: all riders + active deliveries.
export function fleetMap(el, { filter = () => true } = {}) {
  const map = makeMap(el, { zoom: 11.5 });
  const riderMarkers = new Map();
  const lines = new Map();
  function sync() {
    const active = S.orders.filter((o) => ["assigned", "picked_up"].includes(o.status) && filter(o));
    const busy = new Map(active.map((o) => [o.riderId, o]));
    for (const r of S.riders) {
      if (!r.online || !r.approved) { riderMarkers.get(r.id)?.remove(); riderMarkers.delete(r.id); continue; }
      let m = riderMarkers.get(r.id);
      const isBusy = busy.has(r.id);
      if (!m) {
        m = L.marker(r.pos, { icon: isBusy ? ICONS.rider(true) : ICONS.riderIdle() }).addTo(map).bindTooltip(r.name);
        m._busy = isBusy;
        riderMarkers.set(r.id, m);
      } else {
        m.setLatLng(r.pos);
        if (m._busy !== isBusy) { m.setIcon(isBusy ? ICONS.rider(true) : ICONS.riderIdle()); m._busy = isBusy; }
      }
    }
    const ids = new Set(active.map((o) => o.id));
    for (const [id, l] of lines) if (!ids.has(id)) { l.remove(); lines.delete(id); }
    for (const o of active) {
      const l = lines.get(o.id);
      if (!l || l._ref !== o.tripPath) {
        l && l.remove();
        const nl = L.polyline(o.tripPath, { color: "#FF5A1F", weight: 3, opacity: 0.6 }).addTo(map);
        nl._ref = o.tripPath;
        lines.set(o.id, nl);
      }
    }
  }
  sync();
  map.setView([9.065, 7.455], 12);
  return { map, sync, destroy: () => map.remove() };
}

export { rider };
