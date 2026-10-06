"""
Original soundtrack + SFX for the TTC launch film.
120 BPM Afro-house / Amapiano groove in A minor, synthesized from scratch
(no samples), with sound effects placed on the film's cue sheet.

    python3 film/audio/make_soundtrack.py

Writes film/assets/music.wav, film/assets/sfx.wav (and soundtrack-preview.wav).
"""
import os
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 50.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM          # 0.5 s
STEP = BEAT / 4          # 16th note
BAR = BEAT * 4           # 2 s
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")


# ---------------------------------------------------------------- helpers
def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def stereo():
    return np.zeros((N, 2))


def place(buf, sig, t, gain=1.0, pan=0.0):
    """Add mono or stereo sig into buf at time t (s) with equal-power pan."""
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if sig.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], axis=1) * np.sqrt(2)
    j0 = max(0, -i)
    i0 = max(0, i)
    n = min(len(sig) - j0, N - i0)
    buf[i0:i0 + n] += sig[j0:j0 + n] * gain


def filt(x, kind, f, order=2):
    f = np.clip(f, 20, SR / 2 - 100)
    sos = butter(order, f, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def sweep(x, f0, f1, kind="lowpass", block=256):
    """Time-varying 2nd-order filter, cutoff swept exponentially f0 -> f1."""
    out = np.zeros_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        frac = b / max(1, nb - 1)
        f = f0 * (f1 / f0) ** frac
        if kind == "bandpass":
            sos = butter(1, [max(30, f * 0.7), min(SR / 2 - 200, f * 1.4)], btype="bandpass", fs=SR, output="sos")
        else:
            sos = butter(2, np.clip(f, 30, SR / 2 - 200), btype=kind, fs=SR, output="sos")
        seg = x[b * block:(b + 1) * block]
        if zi is None:
            zi = sosfilt_zi(sos) * 0
        y, zi = sosfilt(sos, seg, zi=zi)
        out[b * block:(b + 1) * block] = y
    return out


def env_exp(dur, decay, attack=0.002):
    t = t_axis(dur)
    e = np.exp(-t / decay)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return e * a


def sat(x, drive=1.5):
    return np.tanh(x * drive) / np.tanh(drive)


def noise(dur):
    return rng.standard_normal(int(SR * dur))


def note(n):
    """MIDI note -> Hz."""
    return 440.0 * 2 ** ((n - 69) / 12)


def osc_sine(freq, dur, phase=0.0):
    t = t_axis(dur)
    if np.isscalar(freq):
        return np.sin(2 * np.pi * freq * t + phase)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR + phase)


def osc_saw(freq, dur, harmonics=24):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        if freq * k > SR / 2.2:
            break
        s += ((-1) ** (k + 1)) * np.sin(2 * np.pi * freq * k * t) / k
    return s * (2 / np.pi)


def reverb_ir(dur=2.4, decay=0.7, seed=3):
    r = np.random.default_rng(seed)
    t = t_axis(dur)
    env = np.exp(-t / decay)
    ir = np.stack([r.standard_normal(len(t)) * env, r.standard_normal(len(t)) * env], axis=1)
    ir = filt(ir, "lowpass", 6000)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


IR = reverb_ir()


def reverb(buf, wet=0.25):
    y = np.stack([fftconvolve(buf[:, c], IR[:, c])[:N] for c in range(2)], axis=1)
    return buf + y * wet


# ---------------------------------------------------------------- drums & instruments
def kick():
    dur = 0.5
    t = t_axis(dur)
    f = 48 + 110 * np.exp(-t / 0.035)
    body = osc_sine(f, dur) * env_exp(dur, 0.16, 0.001)
    click = filt(noise(0.012), "highpass", 3000) * np.linspace(1, 0, int(0.012 * SR))
    body[: len(click)] += click * 0.25
    return sat(body, 2.2) * 0.95


def clap():
    dur = 0.35
    n = noise(dur)
    e = np.zeros(len(n))
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        seg = env_exp(dur, 0.008 if k < 2 else 0.11)[: len(e) - i]
        e[i:i + len(seg)] += seg
    return filt(n * e, "bandpass", [900, 3800]) * 0.9


def shaker(acc=1.0):
    dur = 0.07
    n = filt(noise(dur), "highpass", 6500)
    e = env_exp(dur, 0.018, 0.004)
    return n * e * 0.35 * acc


def open_hat():
    dur = 0.25
    n = filt(noise(dur), "highpass", 8000)
    return n * env_exp(dur, 0.07) * 0.32


def crash():
    dur = 2.6
    n = filt(noise(dur), "highpass", 4500)
    ring = sum(osc_sine(f, dur) for f in [3150, 4280, 5120, 6970]) * 0.04
    return (n * 0.6 + ring) * env_exp(dur, 0.75, 0.002) * 0.55


def log_drum(freq, dur=0.42):
    """Amapiano log drum: pitch-dropping body, woody overtone, saturated."""
    t = t_axis(dur)
    f = freq * (1 + 1.0 * np.exp(-t / 0.012))
    body = osc_sine(f, dur) * env_exp(dur, 0.18, 0.002)
    wood = osc_sine(f * 2.01, dur) * env_exp(dur, 0.04) * 0.35
    x = sat(body + wood, 3.0)
    return filt(x, "lowpass", 1800) * 0.75


def conga(freq):
    dur = 0.25
    t = t_axis(dur)
    f = freq * (1 + 0.25 * np.exp(-t / 0.01))
    tone = osc_sine(f, dur) * env_exp(dur, 0.07)
    slap = filt(noise(0.02), "bandpass", [1500, 5000]) * np.linspace(1, 0, int(0.02 * SR))
    tone[: len(slap)] += slap * 0.25
    return tone * 0.45


def marimba(freq, dur=0.6, bright=1.0):
    t = t_axis(dur)
    x = osc_sine(freq, dur) * env_exp(dur, 0.32, 0.002)
    x += osc_sine(freq * 3.93, dur) * env_exp(dur, 0.035, 0.001) * 0.35 * bright
    x += osc_sine(freq * 9.2, dur) * env_exp(dur, 0.012, 0.001) * 0.12 * bright
    return x * 0.5


def bell(freq, dur=1.6):
    t = t_axis(dur)
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * 2.2 * np.exp(-t / 0.25)
    x = np.sin(2 * np.pi * freq * t + mod) * env_exp(dur, 0.55, 0.002)
    return x * 0.35


def pad_chord(notes, dur, cutoff=1400):
    x = np.zeros(int(SR * dur))
    for n in notes:
        for det in (-0.09, 0.0, 0.08):
            x += osc_saw(note(n + det), dur, harmonics=18)
    x = filt(x / (len(notes) * 3), "lowpass", cutoff)
    a = int(0.25 * SR)
    r = int(0.35 * SR)
    e = np.ones(len(x))
    e[:a] = np.linspace(0, 1, a)
    e[-r:] = np.linspace(1, 0, r)
    return x * e * 0.55


# ---------------------------------------------------------------- music
music = stereo()

# A minor progression, one chord per bar: Am | F | C | G
PROG = [
    {"root": 45, "pad": [57, 60, 64], "stab": [69, 72, 76]},   # Am
    {"root": 41, "pad": [53, 57, 60], "stab": [65, 69, 72]},   # F
    {"root": 48, "pad": [55, 60, 64], "stab": [67, 72, 76]},   # C
    {"root": 43, "pad": [55, 59, 62], "stab": [67, 71, 74]},   # G
]

K, CL, OH, CR = kick(), clap(), open_hat(), crash()
kick_times = []

# --- Intro (0-8s): tension pad + heartbeat + clock ticks
intro_pad = pad_chord([45, 57, 60, 64], 8.0, cutoff=500)
intro_pad *= np.linspace(0.2, 1, len(intro_pad)) ** 1.5
place(music, intro_pad, 0, 0.55)
for b in range(14):
    t = b * BEAT
    if t < 7.0:
        place(music, filt(noise(0.012), "bandpass", [2500, 5000]) * np.linspace(1, 0, int(0.012 * SR)), t, 0.25, -0.3 if b % 2 else 0.3)
for t in [0.0, 0.32, 2.0, 2.32, 4.0, 4.32, 6.0, 6.32]:
    hb = osc_sine(55, 0.3) * env_exp(0.3, 0.09)
    place(music, sat(hb, 2), t, 0.5)
# snare roll 7.0 -> 7.75 accelerating
rt = 7.0
gap = 0.125
while rt < 7.72:
    place(music, filt(noise(0.06), "bandpass", [1200, 6000]) * env_exp(0.06, 0.03), rt, 0.18 + (rt - 7.0) * 0.5, 0)
    rt += gap
    gap = max(0.03, gap * 0.82)

# --- Groove (8-44s)
GROOVE_START, GROOVE_END = 8.0, 44.0
SECTION = lambda t: ("logo" if t < 12 else "chat" if t < 20 else "map" if t < 28 else "done" if t < 32 else "apps" if t < 40 else "climax")
log_pattern = [(0, 0), (3, 0), (6, 12), (7, 0), (10, 7), (12, 0), (14, 12)]
conga_pattern = [(3, 330), (6, 220), (11, 330), (13, 220), (15, 260)]
stab_pattern = [0, 3, 6, 10, 13]

bar_t = GROOVE_START
bar_i = 0
while bar_t < GROOVE_END - 1e-6:
    ch = PROG[bar_i % 4]
    sec = SECTION(bar_t)
    last_bar_before = lambda edge: abs(bar_t + BAR - edge) < 1e-6
    for s in range(16):
        t = bar_t + s * STEP
        # skip a beat of drums just before big moments for punch
        drop_gap = (abs(t - 27.875) < 1e-6) or (abs(t - 39.875) < 1e-6)
        if s % 4 == 0 and not drop_gap:
            place(music, K, t, 1.0)
            kick_times.append(t)
        if s in (4, 12):
            place(music, CL, t, 0.55 if sec == "chat" else 0.7, 0.05)
        acc = 1.0 if s % 4 == 2 else 0.6 if s % 2 else 0.8
        place(music, filt(shaker(acc), "lowpass", 12000), t, 0.6 if sec != "chat" else 0.45, 0.35 if s % 2 else -0.25)
        if s % 4 == 2 and sec != "chat":
            place(music, filt(OH, "lowpass", 14000), t, 0.55, 0.2)
        for ps, semi in log_pattern:
            if ps == s:
                place(music, log_drum(note(ch["root"] - 12 + semi + 12)), t, 0.9 if sec != "chat" else 0.75)
        if sec in ("map", "done", "apps", "climax"):
            for ps, f in conga_pattern:
                if ps == s:
                    place(music, conga(f), t, 0.8, -0.45 if f > 250 else 0.4)
        if s in stab_pattern and sec != "chat":
            for k, n in enumerate(ch["stab"]):
                place(music, marimba(note(n), 0.45, 0.8), t, 0.22 if sec != "climax" else 0.3, -0.3 + 0.3 * k)
    # pad per bar
    place(music, pad_chord(ch["pad"], BAR + 0.3, cutoff=1100 if sec == "chat" else 1600), bar_t, 0.32)
    # lead motif in apps/climax/done
    if sec in ("done", "apps", "climax"):
        motif = [0, 2, 3, 5, 7, 8, 10, 12]
        arp = ch["stab"] + [ch["stab"][0] + 12]
        for k, s in enumerate(motif):
            n = arp[[0, 1, 2, 1, 3, 2, 1, 2][k]]
            place(music, marimba(note(n + 12), 0.5, 1.2), bar_t + s * STEP, 0.16, 0.25 if k % 2 else -0.25)
    bar_t += BAR
    bar_i += 1

for t in (8.0, 28.0, 40.0):
    place(music, CR, t, 0.7, 0.1)

# Fills into 28s and 40s
for base in (27.0, 39.0):
    for k in range(8):
        place(music, filt(noise(0.08), "bandpass", [900, 5000]) * env_exp(0.08, 0.03), base + k * STEP, 0.15 + k * 0.05, -0.2 + k * 0.05)

# --- Outro (44-50s): final chord + bells
place(music, CR, 44.0, 0.6)
place(music, kick(), 44.0, 1.0)
place(music, log_drum(note(45 - 12 + 12)), 44.0, 1.0)
outro = pad_chord([45, 57, 60, 64, 69], 6.0, cutoff=2200)
outro *= np.exp(-t_axis(6.0) / 2.4)
place(music, outro, 44.0, 0.6)
for k, (dt, n) in enumerate([(0.0, 76), (0.25, 72), (0.5, 69), (0.75, 72), (1.5, 76), (2.0, 81)]):
    place(music, bell(note(n)), 44.0 + dt, 0.35, -0.3 + 0.12 * k)
place(music, kick(), 47.0, 0.8)
place(music, bell(note(57)), 47.0, 0.45)

# --- Sidechain pump (pads/stabs/logs breathe with the kick)
sc = np.ones(N)
idx = np.arange(N) / SR
for kt in kick_times:
    i = int(kt * SR)
    j = min(N, i + int(0.35 * SR))
    sc[i:j] = np.minimum(sc[i:j], 1 - 0.45 * np.exp(-(idx[i:j] - kt) / 0.09))
music *= sc[:, None] ** 0.6
music = reverb(music, 0.12)


# ---------------------------------------------------------------- SFX
sfx = stereo()


def s_type():
    d = 0.03
    c = filt(noise(d), "bandpass", [2000, 7000]) * env_exp(d, 0.006, 0.0005)
    c += osc_sine(1800 + rng.uniform(-300, 300), d) * env_exp(d, 0.004) * 0.3
    return c * 0.55


def s_impact(big=1.0):
    d = 1.4 if big > 1 else 0.7
    t = t_axis(d)
    f = 38 + 140 * np.exp(-t / 0.06)
    sub = osc_sine(f, d) * env_exp(d, 0.35 * big, 0.001)
    hit = filt(noise(d), "lowpass", 2400) * env_exp(d, 0.05)
    return sat(sub + hit * 0.6, 2.5) * 0.9


def s_whoosh(d=0.6, f0=300, f1=4000, rev=False):
    n = noise(d)
    x = sweep(n, f0, f1, "bandpass")
    t = t_axis(d)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    x = x * e
    if rev:
        x = x[::-1]
    pan = np.linspace(-0.8, 0.8, len(x))
    st = np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], axis=1) * np.sqrt(2)
    return st * 0.9


def s_riser(d=1.5):
    t = t_axis(d)
    n = sweep(noise(d), 400, 9000, "bandpass")
    tone = osc_saw(110, d, 10) * 0 + np.sin(2 * np.pi * np.cumsum(180 * 2 ** (t / d * 3)) / SR) * 0.25
    e = (t / d) ** 2.2
    return (n * 0.8 + tone) * e * 0.8


def s_revcym(d=1.0):
    n = filt(noise(d), "highpass", 5000)
    e = (t_axis(d) / d) ** 3
    return n * e * 0.6


def s_pop(f0=600, f1=1400):
    d = 0.09
    t = t_axis(d)
    f = f0 + (f1 - f0) * (t / d)
    return osc_sine(f, d) * env_exp(d, 0.03, 0.001) * 0.5


def s_click():
    d = 0.05
    c = filt(noise(d), "bandpass", [1500, 6000]) * env_exp(d, 0.004, 0.0003)
    c += osc_sine(900, d) * env_exp(d, 0.012) * 0.6
    return c * 0.8


def s_sonar():
    d = 1.4
    x = osc_sine(1320, d) * env_exp(d, 0.35, 0.003) + osc_sine(1980, d) * env_exp(d, 0.12) * 0.3
    out = x.copy()
    for k, dl in enumerate([0.18, 0.36, 0.54]):
        i = int(dl * SR)
        out[i:] += x[:-i] * (0.4 / (k + 1))
    return out * 0.32


def s_ding(n1=88, n2=95):
    a = bell(note(n1), 1.2)
    b = bell(note(n2), 1.2)
    x = np.zeros(len(a) + int(0.11 * SR))
    x[: len(a)] += a
    x[int(0.11 * SR): int(0.11 * SR) + len(b)] += b
    return x * 0.9


def s_glitch(d=0.35):
    x = noise(d)
    x = np.round(x * 3) / 3
    gate = (np.floor(t_axis(d) * 40) % 2).astype(float)
    tone = np.sign(osc_sine(220, d)) * 0.3
    return filt((x * 0.5 + tone) * gate, "bandpass", [300, 5000]) * env_exp(d, 0.2) * 0.5


def s_engine(d=2.2):
    """Motorbike pass-by: engine harmonics + doppler + pan sweep."""
    t = t_axis(d)
    centre = d / 2
    doppler = 1 + 0.18 * np.tanh((centre - t) * 3)
    f = 92 * doppler * (1 + 0.03 * np.sin(2 * np.pi * 11 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    eng = sum(np.sin(ph * k) / k ** 0.8 for k in range(1, 14)) * 0.25
    eng = sat(eng, 2.5) + filt(noise(d), "bandpass", [300, 2000]) * 0.15
    e = np.exp(-((t - centre) / (d * 0.28)) ** 2)
    x = filt(eng * e, "lowpass", 3500)
    pan = np.tanh((t - centre) * 2)
    return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], axis=1) * np.sqrt(2) * 0.55


def s_stamp():
    d = 0.6
    thud = s_impact(1.0)[: int(d * SR)]
    slap = filt(noise(d), "bandpass", [600, 3000]) * env_exp(d, 0.03)
    return thud * 0.9 + slap * 0.6


def s_ching(n=96):
    d = 0.5
    x = bell(note(n), d) * 1.2 + filt(noise(d), "highpass", 7000) * env_exp(d, 0.02) * 0.3
    return x * 0.7


def s_tick():
    d = 0.02
    return filt(noise(d), "bandpass", [3000, 8000]) * env_exp(d, 0.003) * 0.35


def s_sparkle(d=1.0, count=26):
    x = np.zeros(int(SR * d))
    for k in range(count):
        t0 = (k / count) * d * 0.8 + rng.uniform(0, 0.04)
        f = rng.uniform(2500, 6500)
        blip = osc_sine(f, 0.08) * env_exp(0.08, 0.02, 0.001) * rng.uniform(0.2, 0.5)
        i = int(t0 * SR)
        x[i:i + len(blip)] += blip[: len(x) - i]
    return x * 0.5


def s_shimmer(d=0.8):
    x = sweep(noise(d), 3000, 12000, "bandpass") * np.sin(np.pi * t_axis(d) / d)
    return x * 0.25


# ---- cue sheet (seconds) — mirrors film/index.html
# A: cold open
for k, t in enumerate([0.5, 0.58, 0.66, 0.74, 0.82]):       # A B U J A
    place(sfx, s_type(), t, 0.9, -0.2 + 0.1 * k)
place(sfx, s_tick(), 1.25, 1.0)
line = "A pharmacy in Wuse 2 needs insulin in Gwarinpa."
for k in range(len(line)):
    if line[k] != " ":
        place(sfx, s_type(), 2.0 + k * (1.4 / len(line)), 0.7, rng.uniform(-0.3, 0.3))
place(sfx, s_impact(), 3.5, 0.8)
for k, t in enumerate([4.0, 4.5, 5.0, 5.5, 6.0]):
    place(sfx, s_impact(), t, 0.75, (-1) ** k * 0.25)
    place(sfx, s_glitch(0.18), t, 0.5, (-1) ** (k + 1) * 0.3)
place(sfx, s_glitch(0.45), 6.5, 0.9)
place(sfx, s_riser(1.5), 6.25, 0.7)
place(sfx, s_whoosh(0.5, 400, 5000), 6.75, 0.6)
place(sfx, s_whoosh(0.5, 300, 6000), 7.25, 0.8)
place(sfx, s_revcym(1.0), 7.0, 0.9)
# B: drop + logo
place(sfx, s_impact(2.0), 8.0, 1.1)
place(sfx, s_impact(), 8.5, 0.6, -0.4)
place(sfx, s_impact(), 9.0, 0.6, 0.4)
place(sfx, s_whoosh(0.5, 500, 7000), 9.0, 0.5)
place(sfx, s_pop(300, 900), 9.5, 0.9)
place(sfx, s_impact(), 9.5, 0.5)
for k, t in enumerate([10.0, 10.125, 10.25]):
    place(sfx, s_click(), t, 0.6, -0.2 + 0.2 * k)
place(sfx, s_shimmer(0.9), 10.5, 0.9)
place(sfx, s_whoosh(0.6, 200, 3000), 11.45, 0.9)
# C: AI booking
place(sfx, s_whoosh(0.5, 300, 4000), 12.0, 0.7)
msg = "abeg carry insulin from my pharmacy for Wuse 2 go Gwarinpa, sharp sharp"
for k in range(len(msg)):
    if msg[k] != " ":
        place(sfx, s_type(), 12.75 + k * (1.7 / len(msg)), 0.55, rng.uniform(-0.2, 0.2))
place(sfx, s_whoosh(0.3, 800, 6000), 14.5, 0.6)
place(sfx, s_pop(700, 1500), 14.55, 0.7)
for t in (15.0, 15.15, 15.3):
    place(sfx, s_pop(900, 1000), t, 0.25)
place(sfx, s_pop(500, 1100), 15.5, 0.8)
for k in range(10):
    place(sfx, s_tick(), 15.75 + k * 0.075, 0.8)
place(sfx, s_ching(91), 16.5, 0.6)
place(sfx, s_click(), 16.75, 1.0)
place(sfx, s_sonar(), 17.0, 0.9)
place(sfx, s_sonar(), 17.5, 0.5)
place(sfx, s_ding(), 18.0, 0.8)
place(sfx, s_whoosh(0.8, 200, 8000), 19.25, 0.9)
# D: live map
place(sfx, s_pop(400, 800), 20.0, 0.7, -0.3)
place(sfx, s_pop(500, 1000), 20.25, 0.7, 0.3)
place(sfx, s_whoosh(1.0, 300, 3000), 20.5, 0.5)
place(sfx, s_engine(2.4), 21.3, 0.9)
place(sfx, s_pop(), 22.0, 0.6)
place(sfx, s_pop(), 23.0, 0.6)
place(sfx, s_engine(2.4), 23.9, 0.8)
place(sfx, s_pop(), 24.0, 0.6)
place(sfx, s_ding(84, 91), 26.5, 0.6)
place(sfx, s_riser(1.0), 27.0, 0.55)
# E: delivered
place(sfx, s_stamp(), 28.0, 1.1)
place(sfx, s_impact(2.0), 28.0, 0.6)
for k, t in enumerate([28.5, 29.0, 29.5, 30.0]):
    for j in range(5):
        place(sfx, s_tick(), t - 0.4 + j * 0.08, 0.6)
    place(sfx, s_ching(91 + k * 2), t, 0.7, -0.3 + 0.2 * k)
place(sfx, s_pop(300, 1200), 30.0, 0.9)
place(sfx, s_sparkle(1.2), 30.0, 0.9)
for k, (t, n) in enumerate(zip([30.5, 30.75, 31.0, 31.25, 31.5], [84, 88, 91, 96, 100])):
    place(sfx, bell(note(n), 0.9), t, 0.28, -0.4 + 0.2 * k)
place(sfx, s_whoosh(0.5, 300, 5000), 31.5, 0.7)
# F: platform
place(sfx, s_impact(), 32.0, 0.6)
for k, t in enumerate([33.0, 34.0, 35.0, 36.0]):
    place(sfx, s_whoosh(0.45, 400, 6000), t - 0.1, 0.6)
    place(sfx, s_click(), t + 0.2, 0.4, (-1) ** k * 0.4)
for k, t in enumerate([37.0, 37.5, 38.0, 38.5, 39.0, 39.5]):
    place(sfx, s_whoosh(0.25, 1000, 8000), t - 0.05, 0.35)
    place(sfx, s_tick(), t, 1.0)
place(sfx, s_riser(1.0), 39.0, 0.5)
# G: climax + end card
place(sfx, s_impact(2.0), 40.0, 1.0)
place(sfx, s_whoosh(0.5, 200, 3000), 40.0, 0.6)
place(sfx, s_impact(), 41.0, 0.6)
place(sfx, s_impact(), 42.0, 0.7)
place(sfx, s_whoosh(0.7, 300, 6000), 43.4, 0.8)
place(sfx, s_impact(2.0), 44.0, 0.8)
place(sfx, s_shimmer(1.2), 44.3, 0.8)
place(sfx, s_pop(600, 1200), 46.0, 0.5)
place(sfx, s_pop(700, 1400), 46.15, 0.5)

sfx = reverb(sfx, 0.18)


# ---------------------------------------------------------------- master
def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def limit(x, ceiling=0.95):
    """Soft limiter: linear below 70% of ceiling, smooth knee above."""
    knee = ceiling * 0.7
    a = np.abs(x)
    over = a > knee
    y = x.copy()
    y[over] = np.sign(x[over]) * (knee + (ceiling - knee) * np.tanh((a[over] - knee) / (ceiling - knee)))
    return y


def master(x, target_db, ref=(8.0, 44.0)):
    x = x / (np.max(np.abs(x)) + 1e-9)
    seg = x[int(ref[0] * SR):int(ref[1] * SR)]
    x = x * 10 ** ((target_db - rms_db(seg)) / 20)
    fade = int(1.2 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
    return limit(x, 0.95)


music_m = master(music, -15.0)
sfx_m = master(sfx, -21.5, ref=(0.0, 48.0))
mix = limit(music_m * 0.85 + sfx_m * 0.9, 0.95)

os.makedirs(OUT, exist_ok=True)
wavfile.write(os.path.join(OUT, "music.wav"), SR, (music_m * 32767).astype(np.int16))
wavfile.write(os.path.join(OUT, "sfx.wav"), SR, (sfx_m * 32767).astype(np.int16))
wavfile.write(os.path.join(OUT, "soundtrack-preview.wav"), SR, (mix * 32767).astype(np.int16))
print("wrote music.wav, sfx.wav, soundtrack-preview.wav", DUR, "s")
