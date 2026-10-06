"""
Builds film/vertical/index.html (1080x1920, 9:16) from film/index.html (1920x1080).
Same timeline, same soundtrack; every scene re-laid out for portrait.

    python3 film/make_vertical.py
    cd film/vertical && npx hyperframes@0.8.134 render -f 30 -q high -o ../../assets/video/ttc-launch-film-9x16.mp4
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()


def sub(s, a, b):
    assert a in s, "not found: " + a[:90]
    return s.replace(a, b)


R = [
    # ---- canvas
    ('<meta name="viewport" content="width=1920, height=1080" />', '<meta name="viewport" content="width=1080, height=1920" />'),
    ("<title>TTC — Launch Film</title>", "<title>TTC — Launch Film (9:16)</title>"),
    ("html, body { width: 1920px; height: 1080px;", "html, body { width: 1080px; height: 1920px;"),
    ("#root { position: relative; width: 1920px; height: 1080px;", "#root { position: relative; width: 1080px; height: 1920px;"),
    ('data-composition-id="ttc-launch" data-start="0" data-duration="50" data-width="1920" data-height="1080"',
     'data-composition-id="ttc-launch-vertical" data-start="0" data-duration="50" data-width="1080" data-height="1920"'),
    ('window.__timelines["ttc-launch"] = tl;', 'window.__timelines["ttc-launch-vertical"] = tl;'),

    # ---- S1 two-line typed sentence + two-line ONE / SENTENCE?
    ('<div id="needLine" class="center">A pharmacy in <b>Wuse 2</b> needs insulin in <b>Gwarinpa</b>.</div>',
     '<div id="needLine" class="center"><span id="nl1" style="display:inline-block">A pharmacy in <b>Wuse 2</b></span><br><span id="nl2" style="display:inline-block">needs insulin in <b>Gwarinpa</b>.</span></div>'),
    ('  tl.set("#needLine", { opacity: 1, clipPath: "inset(0 100% 0 0)" }, 2.0);\n  tl.to("#needLine", { clipPath: "inset(0 0% 0 0)", duration: 1.4, ease: "steps(47)" }, 2.0);',
     '  tl.set("#needLine", { opacity: 1 }, 2.0);\n  gsap.set(["#nl1", "#nl2"], { clipPath: "inset(0 100% 0 0)" });\n  tl.to("#nl1", { clipPath: "inset(0 0% 0 0)", duration: 0.65, ease: "steps(20)" }, 2.0);\n  tl.to("#nl2", { clipPath: "inset(0 0% 0 0)", duration: 0.75, ease: "steps(27)" }, 2.65);'),
    ('var oneCh = splitChars($("#oneSentence"));',
     'var oneCh = splitChars($("#oneSentence"));\n  oneCh[3].replaceWith(document.createElement("br")); oneCh.splice(3, 1);'),
    ('tl.to("#city", { y: -150, scale: 0.55,', 'tl.to("#city", { y: -260, scale: 0.55,'),
    ('tl.to("#clock", { y: -230, opacity: 0.85,', 'tl.to("#clock", { y: -330, opacity: 0.85,'),

    # ---- S3 captions on two lines, dive straight up
    ('<span class="big">ONE <em>SENTENCE.</em></span>', '<span class="big">ONE<br><em>SENTENCE.</em></span>'),
    ('<span class="big">ENGLISH <em>OR PIDGIN.</em></span>', '<span class="big">ENGLISH<br><em>OR PIDGIN.</em></span>'),
    ('<span class="big">PRICED <em>INSTANTLY.</em></span>', '<span class="big">PRICED<br><em>INSTANTLY.</em></span>'),
    ('<span class="big">RIDER IN <em>SECONDS.</em></span>', '<span class="big">RIDER IN<br><em>SECONDS.</em></span>'),
    ('tl.to("#stage3", { scale: 7, x: 260, y: -180,', 'tl.to("#stage3", { scale: 7, x: 0, y: -220,'),

    # ---- S4 taller world, portrait camera, pills at the bottom
    ('<rect width="2400" height="1500" fill="#0B1526"/>', '<rect x="-400" y="-900" width="3200" height="3300" fill="#0B1526"/>'),
    ("  for (var i = 0; i < 46; i++) {\n    var y = i * 34 + rand() * 12, x = -50;", "  for (var i = 0; i < 100; i++) {\n    var y = -900 + i * 34 + rand() * 12, x = -50;"),
    ("    var x2 = j * 34 + rand() * 12, y2 = -50;\n    while (y2 < 1550) {", "    var x2 = j * 34 + rand() * 12, y2 = -950;\n    while (y2 < 2450) {"),
    ('mapEl.style.transform = "translate(" + (960 - cx * s) + "px," + (560 - cy * s) + "px) scale(" + s + ")";',
     'mapEl.style.transform = "translate(" + (540 - cx * s) + "px," + (1000 - cy * s) + "px) scale(" + s + ")";'),
    ("    var s1 = 1.45, c1 = { x: pt.x, y: pt.y };", "    var s1 = 1.6, c1 = { x: pt.x, y: pt.y };"),
    ("    var sNow = 0.95 + (1.45 - 0.95) * P.zoom;", "    var sNow = 0.95 + (1.6 - 0.95) * P.zoom;"),

    # ---- S5 confetti spreads vertically
    ("x: Math.cos(ang) * dist * 1.3, y: Math.sin(ang) * dist * 0.75 - 200,", "x: Math.cos(ang) * dist * 0.7, y: Math.sin(ang) * dist * 1.25 - 200,"),

    # ---- S6 stacked devices, two-line feature flips
    ('<div class="dev lap" id="dBiz" style="left:150px; top:300px">', '<div class="dev lap" id="dBiz" style="left:40px; top:430px">'),
    ('<div class="dev lap" id="dAdm" style="left:950px; top:300px">', '<div class="dev lap" id="dAdm" style="left:400px; top:780px">'),
    ('<div class="dev phn" id="dCus" style="left:640px; top:370px">', '<div class="dev phn" id="dCus" style="left:110px; top:1190px">'),
    ('<div class="dev phn" id="dRid" style="left:1010px; top:370px">', '<div class="dev phn" id="dRid" style="left:700px; top:1190px">'),
    ('tl.to("#platHead", { y: -345, scale: 0.42,', 'tl.to("#platHead", { y: -600, scale: 0.6,'),
    ('<div class="flip" id="f1">LIVE <i>TRACKING</i></div>', '<div class="flip" id="f1">LIVE<br><i>TRACKING</i></div>'),
    ('<div class="flip" id="f2">PAYSTACK <i>PAYMENTS</i></div>', '<div class="flip" id="f2">PAYSTACK<br><i>PAYMENTS</i></div>'),
    ('<div class="flip" id="f3">VERIFIED <i>RIDERS</i></div>', '<div class="flip" id="f3">VERIFIED<br><i>RIDERS</i></div>'),
    ('<div class="flip" id="f4">BUSINESS <i>PORTAL</i></div>', '<div class="flip" id="f4">BUSINESS<br><i>PORTAL</i></div>'),
    ('<div class="flip" id="f5">AI IN <i>PIDGIN</i></div>', '<div class="flip" id="f5">AI IN<br><i>PIDGIN</i></div>'),
    ('<div class="flip" id="f6">AUTOMATIC <i>PRICING</i></div>', '<div class="flip" id="f6">AUTOMATIC<br><i>PRICING</i></div>'),

    # ---- S7 six-line stack
    ('<span class="bt">SEND ANYTHING.</span>', '<span class="bt">SEND<br>ANYTHING.</span>'),
    ('<span class="bt n">ANYWHERE IN ABUJA.</span>', '<span class="bt n">ANYWHERE<br>IN ABUJA.</span>'),
    ('<span class="bt">IN ONE SENTENCE.</span>', '<span class="bt">IN ONE<br>SENTENCE.</span>'),
]

OVERRIDES = """
    /* ================= 9:16 overrides ================= */
    #city { top: 700px; font-size: 200px; }
    #clock { top: 960px; }
    #needLine { top: 900px; font-size: 60px; line-height: 1.3; }
    #now { top: 1130px; font-size: 160px; }
    .prob .w { font-size: 124px; white-space: nowrap; }
    .prob .tag { font-size: 28px; }
    #whatIf { top: 700px; font-size: 84px; }
    #oneSentence { top: 840px; font-size: 172px; line-height: 1.02; }
    #logoWrap { top: 690px; }
    #shock, #shock2 { top: 840px; }
    #wordmark { top: 1040px; }
    #delivery { top: 1200px; }
    #tagline { top: 470px; font-size: 46px; }
    #stage3 { left: 320px; top: 780px; }
    #caps { left: 70px; top: 240px; width: 940px; }
    #capIdx { left: 70px; top: 180px; }
    .cap .big { font-size: 128px; }
    #s4 { background: #0B1526; }
    #map svg { overflow: visible; }
    #hud { left: 50px; top: 120px; }
    #pills { left: 50px; right: auto; top: 1500px; width: 980px; }
    .pill { right: auto; left: 0; }
    #stamp { top: 430px; width: 980px; height: 230px; margin-left: -490px; font-size: 124px; }
    #stamp .ck { font-size: 104px; margin-right: 22px; }
    #codeLbl { top: 800px; font-size: 26px; }
    #code { top: 870px; }
    #stars { top: 1180px; }
    #rated { top: 1320px; font-size: 26px; padding: 0 40px; }
    #confetti i { left: 540px; top: 980px; }
    #platHead { top: 760px; font-size: 112px; }
    .lap { width: 640px; }
    .lap .scr { height: 416px; }
    .lap .base { margin: 0 -30px; height: 22px; }
    .phn { width: 250px; height: 540px; }
    #flipWrap { top: 760px; height: 340px; }
    .flip { font-size: 138px; }
    #flipCount { top: 1130px; }
    .marq { font-size: 170px; }
    #marq1 { top: 60px; } #marq2 { top: 1660px; }
    #bigType { left: 70px; top: 430px; }
    .bt { font-size: 150px; line-height: 1.0; }
    #endLogo { top: 500px; flex-direction: column; gap: 30px; }
    #endWord { text-align: center; }
    #endTag { top: 1180px; font-size: 92px; }
    #stores { top: 1360px; flex-direction: column; align-items: center; gap: 18px; }
    #credit { top: 1800px; }
  </style>"""

out = src
for a, b in R:
    out = sub(out, a, b)
out = sub(out, "  </style>", OVERRIDES)
VDIR = os.path.join(HERE, "vertical")
os.makedirs(VDIR, exist_ok=True)
link = os.path.join(VDIR, "assets")
if not os.path.lexists(link):
    os.symlink("../assets", link)  # share fonts, images and the soundtrack
open(os.path.join(VDIR, "index.html"), "w", encoding="utf-8").write(out)
open(os.path.join(VDIR, "meta.json"), "w").write('{"id":"ttc-launch-film-vertical","name":"TTC Launch Film 9:16"}\n')
print("wrote vertical/index.html")
