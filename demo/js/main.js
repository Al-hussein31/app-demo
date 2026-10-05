import { S, simulate, onChange } from "./store.js";
import { customerView } from "./customer.js";
import { riderView } from "./rider.js";
import { businessView } from "./business.js";
import { adminView } from "./admin.js";
import { $, $$ } from "./util.js";

const factories = { customer: customerView, rider: riderView, business: businessView, admin: adminView };
const views = {};
let visible = [];

function ensure(name) {
  if (!views[name]) views[name] = factories[name]($(`#${name}-root`));
  return views[name];
}

function show(tab) {
  if (!["customer", "business", "rider", "admin", "split"].includes(tab)) tab = "customer";
  const split = tab === "split";
  S.splitView = split;
  document.body.classList.toggle("split", split);
  visible = split ? ["customer", "rider"] : [tab];
  $$(".pane").forEach((p) => (p.hidden = !visible.includes(p.id.replace("pane-", ""))));
  $$(".tabs button").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on);
  });
  visible.forEach((n) => {
    const v = ensure(n);
    v.onShow && v.onShow();
    v.render();
  });
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  if (location.hash !== "#" + tab) history.replaceState(null, "", "#" + tab);
}

$$(".tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
window.addEventListener("hashchange", () => show(location.hash.slice(1)));

onChange(() => Object.values(views).forEach((v) => v.render()));

setInterval(() => {
  simulate();
  visible.forEach((n) => views[n]?.tick());
}, 200);
setInterval(() => visible.forEach((n) => views[n]?.render()), 1000);

show(location.hash.slice(1) || "customer");
