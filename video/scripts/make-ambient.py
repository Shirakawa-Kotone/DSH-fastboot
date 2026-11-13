#!/usr/bin/env python3
"""Generate a subtle 120 s ambient bed with cut whooshes for the DSH Fastboot video."""
import math
import random
import struct
import wave
from array import array

SR = 32000
DUR = 120.0
N = int(SR * DUR)

L = array("f", [0.0]) * N
R = array("f", [0.0]) * N

# Am9, Fmaj7, Cmaj9, G6 — 8 x 15 s
CHORDS = [
    [110.00, 164.81, 261.63, 329.63],
    [87.31, 130.81, 164.81, 220.00],
    [130.81, 196.00, 246.94, 329.63],
    [98.00, 146.83, 196.00, 246.94],
    [110.00, 164.81, 261.63, 329.63],
    [87.31, 130.81, 164.81, 220.00],
    [130.81, 196.00, 246.94, 329.63],
    [98.00, 146.83, 196.00, 246.94],
]

SEG = 15.0
FADE = 3.2

for si, chord in enumerate(CHORDS):
    t0 = si * SEG
    start = int(t0 * SR)
    end = min(N, int((t0 + SEG) * SR))
    for ni, freq in enumerate(chord):
        pan = -0.38 + 0.25 * ni
        gl = math.sqrt((1.0 - pan) / 2.0)
        gr = math.sqrt((1.0 + pan) / 2.0)
        detune = 1.0 + (ni - 1.5) * 0.0006
        for i in range(start, end):
            t = i / SR
            local = t - t0
            # smooth edges; segments crossfade
            env = min(1.0, local / FADE, (SEG - local) / FADE)
            if env <= 0:
                continue
            env = env * env * (3 - 2 * env)
            lfo = 0.82 + 0.18 * math.sin(2 * math.pi * 0.061 * t + ni * 1.7)
            v = math.sin(2 * math.pi * freq * detune * t + ni * 0.9)
            v += 0.45 * math.sin(2 * math.pi * freq * 0.5 * t + ni * 2.1)
            amp = 0.085 * env * lfo
            L[i] += v * amp * gl
            R[i] += v * amp * gr

# cut whooshes at scene boundaries (seconds)
CUTS = [8, 28, 44, 60, 74, 84, 100, 112]
random.seed(7)
for cut in CUTS:
    length = int(0.95 * SR)
    start = int((cut - 0.42) * SR)
    lp = 0.0
    for k in range(length):
        i = start + k
        if i < 0 or i >= N:
            continue
        x = k / length
        env = math.sin(math.pi * x) ** 2
        noise = random.uniform(-1.0, 1.0)
        lp += 0.18 * (noise - lp)
        hp = noise - lp
        # gentle rise into the cut, quick decay after
        edge = min(1.0, x / 0.35, (1.0 - x) / 0.25)
        v = hp * env * edge * 0.08
        L[i] += v * 0.95
        R[i] += v * 1.05

# master fades + normalize
peak = 0.0
for i in range(N):
    fade = min(1.0, i / (1.5 * SR), (N - i) / (4.0 * SR))
    L[i] *= fade
    R[i] *= fade
    peak = max(peak, abs(L[i]), abs(R[i]))
scale = 0.82 / peak if peak > 0 else 1.0

frames = bytearray()
for i in range(N):
    l = int(max(-1.0, min(1.0, L[i] * scale)) * 32767)
    r = int(max(-1.0, min(1.0, R[i] * scale)) * 32767)
    frames += struct.pack("<hh", l, r)

with wave.open("public/ambient.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(bytes(frames))
print(f"wrote public/ambient.wav  {N / SR:.1f}s  peak={peak:.3f}")
