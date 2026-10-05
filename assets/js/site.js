(function () {
  "use strict";
  var cfg = window.PROPOSAL_CONFIG || {};
  var contact = cfg.contact || {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- Contact links ----
  var waText = encodeURIComponent("Hi Hussein, I've gone through the TTC proposal.");
  var waUrl = "https://wa.me/" + (contact.whatsapp || "") + "?text=" + waText;
  document.querySelectorAll(".js-whatsapp").forEach(function (a) { a.href = waUrl; });
  document.querySelectorAll(".js-email").forEach(function (a) {
    a.href = "mailto:" + (contact.email || "") + "?subject=" + encodeURIComponent("TTC Delivery Platform proposal");
  });

  // ---- Team ----
  var teamEl = document.getElementById("team-list");
  if (teamEl && cfg.team) {
    teamEl.innerHTML = cfg.team.map(function (m) {
      var initials = (m.name || "?").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
      var avatar = m.photo ? '<img src="' + esc(m.photo) + '" alt="">' : esc(initials);
      return '<article class="team-card"><div class="avatar">' + avatar + '</div><b>' + esc(m.name) +
        '</b><span class="role">' + esc(m.role) + '</span><p>' + esc(m.note) + '</p></article>';
    }).join("");
  }

  // ---- Projects ----
  var projEl = document.getElementById("project-list");
  if (projEl && cfg.projects) {
    projEl.innerHTML = cfg.projects.map(function (p) {
      var host = p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      return '<a class="project" href="' + esc(p.url) + '" target="_blank" rel="noopener"><span>' + esc(p.tag) +
        '</span><b>' + esc(p.name) + '</b><p>' + esc(p.desc) + '</p><i>' + esc(host) + ' ↗</i></a>';
    }).join("");
  }

  // ---- Videos ----
  function mountVideo(el, url) {
    if (!el || !url) return false;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) {
      el.innerHTML = '<video src="' + esc(url) + '" controls playsinline preload="metadata"></video>';
    } else {
      var src = url
        .replace(/youtube\.com\/watch\?v=([\w-]+).*/, "youtube.com/embed/$1")
        .replace(/youtu\.be\/([\w-]+).*/, "youtube.com/embed/$1")
        .replace(/loom\.com\/share\//, "loom.com/embed/")
        .replace(/vimeo\.com\/(\d+).*/, "player.vimeo.com/video/$1");
      el.innerHTML = '<iframe src="' + esc(src) + '" title="Video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
    }
    return true;
  }
  var t = cfg.testimonial || {};
  if (mountVideo(document.querySelector('[data-video="testimonial"]'), t.videoUrl)) {
    document.getElementById("testimonial").hidden = false;
    if (t.quote) {
      var bq = document.getElementById("testimonial-quote");
      bq.hidden = false;
      bq.querySelector("p").textContent = "“" + t.quote + "”";
      bq.querySelector("footer").textContent = [t.person, t.company].filter(Boolean).join(" · ");
    }
  }
  if (mountVideo(document.querySelector('[data-video="launch"]'), cfg.launchVideoUrl)) {
    document.getElementById("launch-video").hidden = false;
  }

  // ---- Print: open every FAQ answer ----
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll(".faq details").forEach(function (d) { d.open = true; });
  });

  // ---- Proposal assistant ----
  var bot = document.getElementById("bot");
  var fab = document.querySelector(".bot-fab");
  var log = document.getElementById("bot-log");
  var form = document.getElementById("bot-form");
  var input = document.getElementById("bot-input");
  var chips = document.getElementById("bot-chips");
  var history = [];
  var busy = false;
  var greeted = false;

  function addMsg(role, text, html) {
    var div = document.createElement("div");
    div.className = "msg " + (role === "user" ? "msg-user" : "msg-bot");
    if (html) div.innerHTML = html; else div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function openBot() {
    bot.hidden = false;
    fab.hidden = true;
    fab.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      addMsg("bot", "Hi! I'm the assistant for Forge Growth's TTC proposal. Ask me anything about the plans, the timeline, the free 2 weeks or how the app works.");
    }
    setTimeout(function () { input.focus(); }, 50);
  }
  function closeBot() {
    bot.hidden = true;
    fab.hidden = false;
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }
  document.querySelectorAll(".js-open-bot").forEach(function (b) { b.addEventListener("click", openBot); });
  bot.querySelector(".bot-close").addEventListener("click", closeBot);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !bot.hidden) closeBot(); });

  // Offline fallback: best-matching FAQ answer.
  var STOP = "a an the is are do does we you our your what how why who can will if of to in for on and or it this that be with about any".split(" ");
  function words(s) {
    return s.toLowerCase().replace(/[^a-z0-9₦ ]/g, " ").split(/\s+/).filter(function (w) { return w.length > 1 && STOP.indexOf(w) < 0; });
  }
  function faqAnswer(q) {
    var qw = words(q);
    var best = null, bestScore = 0;
    document.querySelectorAll("#faq-list details").forEach(function (d) {
      var s = d.querySelector("summary").textContent;
      var a = d.querySelector("p").textContent;
      var sw = words(s), aw = words(a);
      var score = 0;
      qw.forEach(function (w) {
        if (sw.some(function (x) { return x.indexOf(w) === 0 || w.indexOf(x) === 0; })) score += 3;
        else if (aw.indexOf(w) >= 0) score += 1;
      });
      if (score > bestScore) { bestScore = score; best = a; }
    });
    return bestScore >= 2 ? best : null;
  }

  function waLink() {
    return ' <a href="' + esc(waUrl) + '" target="_blank" rel="noopener">Ask Hussein on WhatsApp</a>.';
  }

  async function ask(q) {
    if (busy || !q.trim()) return;
    busy = true;
    chips.hidden = true;
    addMsg("user", q);
    var typing = addMsg("bot", "Thinking…");
    typing.classList.add("msg-typing");
    var reply = null;
    try {
      var res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "proposal", message: q, history: history })
      });
      if (res.ok) reply = (await res.json()).reply;
    } catch (e) { /* fall back below */ }
    typing.remove();
    if (reply) {
      addMsg("bot", reply);
      history.push({ role: "user", text: q }, { role: "model", text: reply });
      history = history.slice(-12);
    } else {
      var fb = faqAnswer(q);
      if (fb) addMsg("bot", null, esc(fb) + "<br><br>Want more detail?" + waLink());
      else addMsg("bot", null, "Good question. I don't want to guess on that one." + waLink());
    }
    busy = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value;
    input.value = "";
    ask(q);
  });
  chips.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () { ask(b.textContent); });
  });
})();
