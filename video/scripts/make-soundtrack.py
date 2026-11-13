#!/usr/bin/env python3
"""Original 114 s synth soundtrack for the DSH Fastboot video.

100 BPM, A minor (Am-F-C-G), four-on-the-floor kick, offbeat hats, plucked
arpeggio, sub bass and a soft pad. Sections follow the edit: intro, problem,
serial/concurrent, mechanisms, data, outro.
"""
import math
import random
import struct
import wave
from array import array

SR = 44100
DUR = 114.0
N = int(SR * DUR)
BEAT = 0.6
BAR = BEAT * 4

L = array("f", [0.0]) * N
R = array("f", [0.0]) * N

CHORDS = [
    [220.00, 261.63, 329.63],   # Am
    [174.61, 220.00, 261.63],   # F
    [261.63, 329.63, 392.00],   # C
    [196.00, 246.94, 293.66],   # G
]
BASS = [55.00, 43.65, 65.41, 49.00]
ARP = [
    [440.00, 523.25, 659.25],
    [349.23, 440.00, 523.25],
    [523.25, 659.25, 783.99],
    [392.00, 493.88, 587.33],
]

random.seed(17)


def sections(t):
    """(drums, snare, arp_gain, bass_gain) for a given time."""
    if t < 8:
        return 0, 0, 0.55, 0
    if t < 22:
        return 1, 0, 0.8, 0.9
    if t < 38:
        return 1, 1, 1.0, 1.0
    if t < 54:
        return 1, 0, 0.45, 0.75
    if t < 68:
        return 1, 1, 1.0, 1.0
    if t < 78:
        return 1, 0, 0.7, 0.85
    if t < 106:
        return 1, 1, 1.0, 1.0
    return 0, 0, 0.5, 0


def duck(t):
    if t < 8 or t >= 106:
        return 1.0
    phase = t % BEAT
    return 1.0 - 0.42 * math.exp(-phase / 0.075)


def chord_at(t):
    if t >= 108:
        return 0
    return int(t / BAR) % 4


# ---------- pad ----------
for bar_i in range(int(DUR / BAR) + 1):
    start = bar_i * BAR
    if start >= DUR:
        break
    ci = 0 if start >= 108 else bar_i % 4
    for ni, freq in enumerate(CHORDS[ci]):
        dur = BAR * 1.04
        a = int(start * SR)
        b = min(N, int((start + dur) * SR))
        pan = -0.45 + ni * 0.45
        gl = math.sqrt((1 - pan) / 2)
        gr = math.sqrt((1 + pan) / 2)
        for i in range(a, b):
            t = i / SR
            local = t - start
            env = min(1.0, local / 0.35, (dur - local) / 0.5)
            if env <= 0:
                continue
            env = env * env * (3 - 2 * env)
            d = duck(t)
            v = math.sin(2 * math.pi * freq * t) + 0.18 * math.sin(
                2 * math.pi * freq * 1.003 * t + 1.1
            )
            amp = 0.052 * env * d * (0.9 + 0.1 * math.sin(t * 0.4 + ni))
            L[i] += v * amp * gl
            R[i] += v * amp * gr


# ---------- bass ----------
step = BEAT / 2
pattern = [0, 0, 0, 12, 0, 0, 7, 0]  # semitone offsets, eighth notes
n_steps = int(DUR / step)
for s in range(n_steps):
    start = s * step
    if start < 8 or start >= 106:
        continue
    ci = chord_at(start)
    semi = pattern[s % 8]
    freq = BASS[ci] * (2 ** (semi / 12))
    dur = step * 0.94
    a = int(start * SR)
    b = min(N, int((start + dur) * SR))
    for i in range(a, b):
        t = i / SR
        local = t - start
        env = min(1.0, local / 0.008) * math.exp(-local * 3.6)
        d = duck(t)
        v = math.sin(2 * math.pi * freq * t)
        v += 0.28 * math.sin(2 * math.pi * freq * 2 * t)
        amp = 0.15 * env * d
        L[i] += v * amp * 0.98
        R[i] += v * amp * 1.02


# ---------- arpeggio (with stereo delay) ----------
seq = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2]
sixteenth = BEAT / 4
arp_steps = int(DUR / sixteenth)
for s in range(arp_steps):
    start = s * sixteenth
    if start >= 108:
        break
    ci = chord_at(start)
    note = ARP[ci][seq[s % 16]]
    gain, snare, arp_gain, _ = sections(start)
    dur = 0.19
    for copy, offset, mul in ((0, 0.0, 1.0), (1, 0.225, 0.28)):
        a = int((start + offset) * SR)
        if a >= N:
            continue
        b = min(N, int((start + offset + dur) * SR))
        pan = -0.55 if (s + copy) % 2 == 0 else 0.55
        gl = math.sqrt((1 - pan) / 2)
        gr = math.sqrt((1 + pan) / 2)
        for i in range(a, b):
            t = i / SR
            local = t - start - offset
            if local < 0:
                continue
            env = min(1.0, local / 0.005) * math.exp(-local * 9.5)
            v = math.sin(2 * math.pi * note * t)
            v += 0.35 * math.sin(2 * math.pi * note * 2.002 * t)
            amp = 0.055 * env * arp_gain * mul
            L[i] += v * amp * gl
            R[i] += v * amp * gr


# ---------- drums ----------
def add_kick(start, amp=0.42):
    dur = 0.34
    a = int(start * SR)
    b = min(N, int((start + dur) * SR))
    for i in range(a, b):
        t = i / SR
        local = t - start
        f = 44 + 86 * math.exp(-local * 23)
        env = math.exp(-local * 9)
        v = math.sin(2 * math.pi * f * local)
        click = (random.uniform(-1, 1) * math.exp(-local * 180)) * 0.2
        val = (v + click) * env * amp
        L[i] += val
        R[i] += val


def add_snare(start, amp=0.12):
    dur = 0.22
    a = int(start * SR)
    b = min(N, int((start + dur) * SR))
    prev = 0.0
    for i in range(a, b):
        local = i / SR - start
        n = random.uniform(-1, 1)
        hp = n - prev
        prev = n
        env = math.exp(-local * 20)
        tone = math.sin(2 * math.pi * 185 * local) * math.exp(-local * 26)
        val = (hp * 0.8 + tone * 0.35) * env * amp
        L[i] += val * 0.95
        R[i] += val * 1.05


def add_hat(start, amp=0.035):
    dur = 0.09
    a = int(start * SR)
    b = min(N, int((start + dur) * SR))
    prev = 0.0
    for i in range(a, b):
        local = i / SR - start
        n = random.uniform(-1, 1)
        hp = n - prev
        prev = n
        env = math.exp(-local * 55)
        val = hp * env * amp
        L[i] += val * 1.05
        R[i] += val * 0.9


def add_sub(start, amp=0.24):
    dur = 1.3
    a = int(start * SR)
    b = min(N, int((start + dur) * SR))
    for i in range(a, b):
        local = i / SR - start
        f = 28 + 34 * math.exp(-local * 3.5)
        env = math.exp(-local * 2.2) * min(1.0, local / 0.03)
        v = math.sin(2 * math.pi * f * local) * env * amp
        L[i] += v
        R[i] += v


def add_riser(start, dur=1.6, amp=0.055):
    a = int(start * SR)
    b = min(N, int((start + dur) * SR))
    prev = 0.0
    for i in range(a, b):
        local = i / SR - start
        n = random.uniform(-1, 1)
        prev = prev * 0.82 + n * 0.18
        hp = n - prev
        env = (local / dur) ** 2.2
        v = hp * env * amp
        L[i] += v
        R[i] += v


kick_starts = []
t = 8.0
while t < 106.0:
    beat_index = round(t / BEAT)
    half_time = 68.0 <= t < 78.0
    if not half_time or beat_index % 2 == 0:
        add_kick(t)
    kick_starts.append(t)
    t += BEAT

for beat_t in [22.0 + i * BEAT for i in range(int((106.0 - 22.0) / BEAT))]:
    phase = round((beat_t - 22.0) / BEAT) % 4
    if phase in (1, 3) and not (38.0 <= beat_t < 54.0):
        add_snare(beat_t)

for beat_t in [8.0 + i * BEAT for i in range(int((106.0 - 8.0) / BEAT))]:
    add_hat(beat_t + BEAT / 2, 0.032)
    if beat_t >= 78 and beat_t < 94:
        add_hat(beat_t + BEAT / 4, 0.02)
        add_hat(beat_t + BEAT * 3 / 4, 0.02)

for cut in (22.0, 38.0, 54.0, 68.0, 78.0, 94.0):
    add_riser(cut - 1.5, 1.5, 0.05)
for hit in (22.0, 78.0):
    add_sub(hit, 0.25)

# cut whooshes
for cut in (8.0, 22.0, 38.0, 54.0, 68.0, 78.0, 94.0, 106.0):
    dur = 0.85
    a = int((cut - 0.35) * SR)
    b = min(N, int((cut + 0.5) * SR))
    prev = 0.0
    for i in range(max(0, a), b):
        local = i / SR - (cut - 0.35)
        n = random.uniform(-1, 1)
        prev = prev * 0.72 + n * 0.28
        hp = n - prev
        x = local / dur
        env = math.sin(math.pi * x) ** 2
        v = hp * env * 0.045
        L[i] += v * 0.9
        R[i] += v * 1.1

# ---------- master ----------
peak = 0.0
for i in range(N):
    fade = min(1.0, i / (0.8 * SR), (N - i) / (3.5 * SR))
    L[i] *= fade
    R[i] *= fade
    if L[i] > 0.95:
        L[i] = 0.95
    if L[i] < -0.95:
        L[i] = -0.95
    if R[i] > 0.95:
        R[i] = 0.95
    if R[i] < -0.95:
        R[i] = -0.95
    peak = max(peak, abs(L[i]), abs(R[i]))
scale = 0.88 / peak if peak > 0 else 1.0
# gentle soft clip and normalize
frames = bytearray()
for i in range(N):
    l = math.tanh(L[i] * scale * 1.08) * 0.92
    r = math.tanh(R[i] * scale * 1.08) * 0.92
    frames += struct.pack("<hh", int(l * 32767), int(r * 32767))

with wave.open("public/soundtrack.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(bytes(frames))
print(f"wrote public/soundtrack.wav  {N / SR:.1f}s  peak={peak:.3f}")
