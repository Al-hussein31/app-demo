import { haversineKm } from "./util.js";

const L = window.L;
const routeCache = new Map();

// A gently curved fallback path when the routing service isn't reachable.
function curve(a, b, n = 24) {
  const midLat = (a.lat + b.lat) / 2, midLng = (a.lng + b.lng) / 2;
  const dx = b.lng - a.lng, dy = b.lat - a.lat;
  const c = { lat: midLat + dx * 0.18, lng: midLng - dy * 0.18 };
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([
      (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * c.lat + t * t * b.lat,
      (1 - t) ** 2 * a.lng + 2 * (1 - t) * t * c.lng + t * t * b.lng
    ]);
  }
  return pts;
}

// Returns a path immediately (fallback), and calls onRoad(path) if a real road route arrives.
export function route(a, b, onRoad) {
  const key = [a.lat, a.lng, b.lat, b.lng].map((v) => v.toFixed(4)).join(",");
  if (routeCache.has(key)) return routeCache.get(key);
  const fallback = curve(a, b);
  routeCache.set(key, fallback);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 4000);
  fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=simplified&geometries=geojson`, { signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const coords = d?.routes?.[0]?.geometry?.coordinates;
      if (coords && coords.length > 1) {
        const path = coords.map(([lng, lat]) => [lat, lng]);
        routeCache.set(key, path);
        onRoad && onRoad(path);
      }
    })
    .catch(() => {});
  return fallback;
}

export function pointAlong(path, t) {
  if (!path || !path.length) return null;
  if (t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const segs = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = haversineKm({ lat: path[i - 1][0], lng: path[i - 1][1] }, { lat: path[i][0], lng: path[i][1] });
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const f = segs[i] ? target / segs[i] : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
    }
    target -= segs[i];
  }
  return path[path.length - 1];
}

export function makeMap(el, { center = [6.5, 3.39], zoom = 12, interactive = true, compact = false } = {}) {
  const map = L.map(el, {
    center, zoom, zoomControl: interactive && !compact, attributionControl: !compact,
    dragging: interactive, scrollWheelZoom: false, doubleClickZoom: interactive, touchZoom: interactive, keyboard: false
  });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 19, subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  }).addTo(map);
  if (compact) L.control.attribution({ position: "topright", prefix: false }).addTo(map);
  setTimeout(() => map.invalidateSize(), 60);
  return map;
}

const icon = (cls, html = "", size = 30) => L.divIcon({ className: "", html: `<div class="pin ${cls}">${html}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const BIKE = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M5 18.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0-1.8a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm14 1.8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0-1.8a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM14.2 6h2.6l1.6 5.1a4 4 0 0 0-1.7.9L15.6 9l-2.9 4.8H8.6a4 4 0 0 0-1.5-1.6L9 9h3.6l1-1.5h-.4V6Z"/></svg>`;
export const ICONS = {
  pickup: () => icon("pin-pickup", "A"),
  dropoff: () => icon("pin-drop", "B"),
  rider: () => icon("pin-rider", BIKE, 32),
  riderIdle: () => icon("pin-rider idle", BIKE, 26)
};
