// Shared "Ask TTC AI" booking chat, used by the customer app and the business portal.
import { esc, naira, CATEGORY_ICON, toast } from "./util.js";
import { bookingAgent } from "./agent.js";
import { quote, createOrder } from "./store.js";

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

export function createChat({ defaultPickup = null, sender = "customer", payment = "Card", greeting, suggestions = [], onBooked }) {
  const c = { msgs: [{ role: "bot", text: greeting }], history: [], busy: false, listening: false };

  function bookingCard(m, i) {
    const items = m.deliveries.map((d) => ({ d, q: quote(d) })).filter((x) => x.q);
    const total = items.reduce((s, x) => s + x.q.price, 0);
    const rows = items.map(({ d, q }) => `
      <div class="bk-row">
        <span class="bk-ico">${CATEGORY_ICON[d.category] || "📦"}</span>
        <div class="bk-main"><b>${esc(d.pickup)} → ${esc(d.dropoff)}</b><span>${esc(d.item)} · ${esc(d.size)}${d.speed === "Express" ? " · Express" : ""} · ${q.km} km</span></div>
        <b class="bk-price">${naira(q.price)}</b>
      </div>`).join("");
    const done = m.booked;
    return `<div class="bk-card">${rows}
      <div class="bk-foot">
        ${done ? `<span class="bk-done">✓ Booked, finding riders</span>` :
        `<button class="btn-primary-sm" data-act="chat-confirm" data-i="${i}">Confirm${items.length > 1 ? " all" : ""} · ${naira(total)}</button>`}
        <span class="bk-pay">${payment === "Invoice" ? "Added to monthly invoice" : "Card •••• 4081"}</span>
      </div></div>`;
  }

  function html() {
    const log = c.msgs.map((m, i) => {
      if (m.role === "user") return `<div class="cm cm-user">${esc(m.text)}</div>`;
      return `<div class="cm cm-bot">${m.text ? `<p>${esc(m.text)}</p>` : ""}${m.deliveries?.length ? bookingCard(m, i) : ""}</div>`;
    }).join("") + (c.busy ? `<div class="cm cm-bot cm-typing"><span></span><span></span><span></span></div>` : "");
    const chips = c.msgs.length <= 1 ? `<div class="chat-chips">${suggestions.map((s) => `<button data-act="chat-suggest">${esc(s)}</button>`).join("")}</div>` : "";
    return { log, chips };
  }

  async function send(text, rerender) {
    text = text.trim();
    if (!text || c.busy) return;
    c.msgs.push({ role: "user", text });
    c.busy = true;
    rerender();
    const r = await bookingAgent(text, c.history, defaultPickup);
    c.busy = false;
    c.history.push({ role: "user", text }, { role: "model", text: r.reply || "" });
    c.history = c.history.slice(-10);
    c.msgs.push({ role: "bot", text: r.reply, deliveries: r.action === "book" ? r.deliveries : [], source: r.source });
    rerender();
  }

  function confirm(i, rerender) {
    const m = c.msgs[i];
    if (!m || m.booked) return;
    const orders = m.deliveries.map((d) => createOrder(d, { sender, payment })).filter(Boolean);
    m.booked = true;
    toast(orders.length > 1 ? `${orders.length} deliveries booked` : "Delivery booked, finding a rider");
    rerender();
    onBooked && onBooked(orders);
  }

  function listen(input, rerender, btn) {
    if (!SpeechRec || c.listening) return;
    const rec = new SpeechRec();
    rec.lang = "en-NG";
    rec.interimResults = true;
    c.listening = true;
    btn && btn.classList.add("rec");
    rec.onresult = (e) => { input.value = Array.from(e.results).map((r) => r[0].transcript).join(""); };
    rec.onend = () => {
      c.listening = false;
      btn && btn.classList.remove("rec");
      if (input.value.trim()) { const v = input.value; input.value = ""; send(v, rerender); }
    };
    rec.onerror = () => { c.listening = false; btn && btn.classList.remove("rec"); toast("Voice input isn't available here, type instead"); };
    rec.start();
  }

  return { c, html, send, confirm, listen, voice: !!SpeechRec };
}

// Wire common chat events inside a root element.
export function bindChat(root, chat, rerender) {
  root.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-chat-form]");
    if (!f) return;
    e.preventDefault();
    const input = f.querySelector("input");
    const v = input.value;
    input.value = "";
    chat.send(v, rerender);
  });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "chat-suggest") chat.send(b.textContent, rerender);
    if (b.dataset.act === "chat-confirm") chat.confirm(+b.dataset.i, rerender);
    if (b.dataset.act === "chat-mic") chat.listen(b.closest("[data-chat-form]").querySelector("input"), rerender, b);
  });
}

export function chatInput(chat, placeholder) {
  return `<form class="chat-form" data-chat-form>
    <input type="text" placeholder="${esc(placeholder)}" autocomplete="off" maxlength="500" aria-label="Message TTC AI">
    ${chat.voice ? `<button type="button" class="chat-mic" data-act="chat-mic" aria-label="Speak">🎙</button>` : ""}
    <button type="submit" class="chat-send" aria-label="Send">↑</button>
  </form>`;
}
