"""用 numpy 合成一首轻快明亮的 BGM（给浅色、轻松风格的视频用）+ 两个新音效。不用任何外部素材。

    & $PY ../_tools/synth_bright.py                # 写 <工程>/public/bgm/bright-01.wav、public/sfx/stamp.wav、public/sfx/snap.wav
    & $PY _tools/synth_bright.py --project _template   # 在根目录跑
    & $PY ../_tools/synth_bright.py --bars 64      # 小节数（默认 64 小节，约 142 s）

BGM bright-01：C 大调，108 BPM，4/4。和声 C - Am - F - G（I-vi-IV-V），第三段换 F - G - Em - Am。
乐器：马林巴质感的旋律（正弦 + 3.93 倍泛音快衰减）、拨弦分解（八分音符）、柔和键盘和弦（第 1、3 拍）、
圆润低音、轻打击乐（软底鼓、手拍、十六分沙锤）。
无缝循环：整段按整数小节长度生成，尾部延音折回到开头（环形相加），文件首尾都不淡入淡出，
可以直接循环，也可以在 Remotion 里截断 + 淡出。旁白闪避由 src/components/bgm.ts 负责。
"""
from __future__ import annotations

import argparse
import wave
from pathlib import Path

import numpy as np

from project import add_project_arg, project_dir

SR = 44100
RNG = np.random.default_rng(23)

BPM = 108
BEAT = 60 / BPM
BAR = BEAT * 4


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def t_of(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def write(path: Path, x: np.ndarray, peak: float = 0.8) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    m = np.max(np.abs(x)) or 1.0
    x = x / m * peak
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def _shape(x: np.ndarray, gain: np.ndarray) -> np.ndarray:
    n = len(x)
    spec = np.fft.rfft(x, axis=0)
    return np.fft.irfft(spec * (gain[:, None] if x.ndim == 2 else gain), n=n, axis=0)


def lowpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    return _shape(x, 1 / np.sqrt(1 + (freqs / fc) ** (2 * order)))


def highpass(x: np.ndarray, fc: float) -> np.ndarray:
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    return _shape(x, (freqs / fc) ** 2 / np.sqrt(1 + (freqs / fc) ** 4))


# ── 乐器 ──────────────────────────────────────────────────────────────
def marimba(f: float, dur: float = 0.9, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5)
    x += 0.35 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t * 22)
    x += 0.10 * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t * 60)
    return x * np.minimum(1, t / 0.0025) * np.minimum(1, (dur - t) / 0.05) * vel


def pluck(f: float, dur: float = 0.5, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 16)
    x += 0.15 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 26)
    return x * np.minimum(1, t / 0.003) * np.minimum(1, (dur - t) / 0.04) * vel


def keys(f: float, dur: float, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 2.2) * np.minimum(1, (dur - t) / 0.06)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
    x += 0.08 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 8)
    return x * env * vel


def bass(f: float, dur: float, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    env = np.minimum(1, t / 0.008) * np.exp(-t * 2.6) * np.minimum(1, (dur - t) / 0.05)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.06 * np.sin(2 * np.pi * 3 * f * t)
    return x * env * vel


def kick() -> np.ndarray:
    t = t_of(0.28)
    f = 48 + 90 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 13) * np.minimum(1, t / 0.002)


def clap() -> np.ndarray:
    t = t_of(0.22)
    n = RNG.uniform(-1, 1, len(t))
    env = np.zeros_like(t)
    for d in (0.0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 55), 0) * 0.6
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) * 18), 0) * 0.5
    return lowpass(highpass(n * env, 900), 6000)


def shaker() -> np.ndarray:
    t = t_of(0.07)
    n = highpass(RNG.uniform(-1, 1, len(t)), 5000)
    return n * np.sin(np.pi * t / 0.07) ** 2


# ── 编曲 ──────────────────────────────────────────────────────────────
# (低音根音, 和弦音)
C_, Am, F_, G_, Em = (36, [60, 64, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (40, [55, 59, 64])
PROG_A = [C_, Am, F_, G_]
PROG_B = [F_, G_, Em, Am]
# 旋律：每小节 8 个八分音符位（None = 休止）
MEL_A = [
    [72, None, 76, None, 79, 76, None, 74],
    [72, None, 69, None, 72, None, 76, None],
    [77, None, 76, 72, None, 69, None, 72],
    [74, None, 79, None, 74, 71, None, None],
]
MEL_A2 = [
    [79, None, 76, None, 72, 76, None, 79],
    [81, None, 79, None, 76, None, 72, None],
    [77, None, 81, 79, None, 77, 76, 74],
    [74, None, 71, None, 74, None, 79, None],
]
MEL_B = [
    [81, None, 79, 77, None, 76, None, 74],
    [79, None, None, 74, 76, None, 79, None],
    [76, None, 79, None, 83, None, 79, 76],
    [72, None, 76, None, 81, None, None, None],
]


def build(bars: int) -> np.ndarray:
    length = int(round(bars * BAR * SR))
    L = np.zeros((length + int(4 * SR), 2))

    def add(sig: np.ndarray, at: float, gain: float, pan: float = 0.0) -> None:
        i = int(round(at * SR))
        j = min(len(L), i + len(sig))
        if j <= i:
            return
        s = sig[: j - i] * gain
        L[i:j, 0] += s * (1 - max(0, pan))
        L[i:j, 1] += s * (1 + min(0, pan))

    K, CL, SH = kick(), clap(), shaker()
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    for b in range(bars):
        t0 = b * BAR
        sec = (b // 8) % 4  # 每 8 小节一段：A  A'  B  A'
        prog = PROG_B if sec == 2 else PROG_A
        root, ch = prog[b % 4]
        lead = (MEL_B if sec == 2 else (MEL_A if sec == 0 else MEL_A2))[b % 4]
        for k, n in enumerate(ch):
            add(keys(midi(n), BEAT * 1.8), t0 + k * 0.006, 0.07, -0.25 + 0.25 * k)
            add(keys(midi(n), BEAT * 0.9, 0.7), t0 + 2 * BEAT, 0.05, 0.25 - 0.25 * k)
        for e, k in enumerate(arp):
            add(pluck(midi(ch[k] + 12), 0.45), t0 + e * BEAT / 2, 0.06 if e % 2 else 0.08, 0.45)
        add(bass(midi(root), BEAT * 1.3), t0, 0.30)
        add(bass(midi(root), BEAT * 0.45), t0 + 1.5 * BEAT, 0.16)
        add(bass(midi(root + 7), BEAT * 0.9), t0 + 2 * BEAT, 0.22)
        add(bass(midi(root + 12 if b % 2 else root + 4), BEAT * 0.45), t0 + 3.5 * BEAT, 0.14)
        if b % 16 not in (0, 1):  # 每 16 小节的前 2 小节旋律休息
            for e, n in enumerate(lead):
                if n is not None:
                    add(marimba(midi(n), 0.8), t0 + e * BEAT / 2, 0.16, -0.2)
        for q in range(4):
            if q in (0, 2):
                add(K, t0 + q * BEAT, 0.42)
            if q in (1, 3):
                add(CL, t0 + q * BEAT, 0.20, 0.1)
        if b % 4 == 3:
            add(K, t0 + 3.5 * BEAT, 0.25)
        for s in range(16):
            add(SH, t0 + s * BEAT / 4, 0.05 if s % 2 else 0.085, -0.4)
    out = L.copy()
    for d, g in ((0.093, 0.18), (0.141, 0.12)):  # 交叉短延迟 = 一点空间感
        k = int(d * SR)
        out[k:, 0] += L[:-k, 1] * g
        out[k:, 1] += L[:-k, 0] * g
    body = out[:length].copy()
    tail = out[length:]
    body[: len(tail)] += tail  # 环形折回：循环接缝无断点
    body = lowpass(body, 7000)
    body = highpass(body, 35)
    return body


# ── 新音效 ────────────────────────────────────────────────────────────
def sfx_stamp() -> np.ndarray:
    """盖章：低频闷响 + 纸面噪声"""
    t = t_of(0.35)
    f = 70 + 140 * np.exp(-t * 40)
    ph = 2 * np.pi * np.cumsum(f) / SR
    thud = np.sin(ph) * np.exp(-t * 22)
    n = lowpass(RNG.uniform(-1, 1, len(t)), 2500) * np.exp(-t * 35) * 0.8
    return (thud + n) * np.minimum(1, t / 0.0015)


def sfx_snap() -> np.ndarray:
    """拼图卡上：两下很短的木质 click"""
    x = np.zeros(int(0.25 * SR))
    for d, f, g in ((0.0, 1800, 1.0), (0.055, 2400, 0.8)):
        t = t_of(0.08)
        s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 90) * g
        i = int(d * SR)
        x[i:i + len(s)] += s
    return x


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bars", type=int, default=64)
    add_project_arg(ap)
    a = ap.parse_args()
    ROOT = project_dir(a.project) / "public"
    bgm = build(a.bars)
    write(ROOT / "bgm" / "bright-01.wav", bgm, 0.8)
    write(ROOT / "sfx" / "stamp.wav", sfx_stamp(), 0.8)
    write(ROOT / "sfx" / "snap.wav", sfx_snap(), 0.8)
    print(f"ok: bgm/bright-01.wav ({len(bgm) / SR:.1f} s, {a.bars} 小节 @ {BPM} BPM), sfx/stamp.wav, sfx/snap.wav")


if __name__ == "__main__":
    main()
