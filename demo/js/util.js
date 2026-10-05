export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");

export function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}

export function clock(ts) {
  return new Date(ts).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

let toastTimer;
export function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// Re-render only the named regions inside a view root.
export function fill(root, regions) {
  for (const [name, html] of Object.entries(regions)) {
    const el = root.querySelector(`[data-region="${name}"]`);
    if (el && el.__html !== html) {
      el.innerHTML = html;
      el.__html = html;
    }
  }
}

export const STATUS_LABEL = {
  searching: "Finding a rider",
  assigned: "Rider heading to pickup",
  picked_up: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

export const CATEGORY_ICON = { Food: "🍲", Documents: "📄", Medicine: "💊", Parcel: "📦", Fragile: "🧁" };
