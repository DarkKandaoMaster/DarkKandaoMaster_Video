"""用 numpy 合成系列视频共用的背景音乐与音效（不用任何外部素材）。

    & $PY ../_tools/synth_audio.py                 # 写 <工程>/public/bgm/calm-01.wav 与 public/sfx/*.wav（在视频工程目录里跑）
    & $PY _tools/synth_audio.py --project _template # 在根目录跑
    & $PY ../_tools/synth_audio.py --seconds 150   # BGM 时长（默认 130 s，片子比它短就在 Remotion 里截断 + 淡出）

BGM「calm-01」：D 大调附近的 Lo-fi 风，76 BPM。柔和电钢琴和弦（正弦 + 少量二次谐波 + 颤音）+ 很轻的拨弦分解
+ 低音 + 极轻的沙锤；整体压低高频、动态平缓，给讲解垫底，不抢旁白。
音效：tick（格子落位，轻木质）、whoosh（大块移动）、pop（出现）、ding（答案）、ding_hi（例题答案）。
"""
from __future__ import annotations

import argparse
import wave
from pathlib import Path

import numpy as np

from project import add_project_arg, project_dir

SR = 44100
RNG = np.random.default_rng(11)


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def write(path: Path, x: np.ndarray, peak: float = 0.89) -> None:
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


def t_of(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def onepole(x: np.ndarray, a: float) -> np.ndarray:
    """一阶低通（向量化近似：用 lfilter 形式的递推，numpy 实现）"""
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


# ── 乐器 ──────────────────────────────────────────────────────────────
def epiano(f: float, dur: float, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    env = np.minimum(1, t / 0.012) * np.exp(-t * 1.1)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 4.6 * t)
    x = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 2.5) + 0.05 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 6)
    # 尾部淡出防爆音
    tail = np.minimum(1, (dur - t) / 0.08)
    return x * env * trem * tail * vel


def pad(f: float, dur: float, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    x = sum(np.sin(2 * np.pi * f * (1 + d) * t + ph) for d, ph in ((0, 0), (0.0035, 1.3), (-0.003, 2.1)))
    return x / 3 * env * vel


def pluck(f: float, dur: float = 0.6, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 14)
    return x * np.minimum(1, t / 0.004) * vel


def bass(f: float, dur: float, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    env = np.minimum(1, t / 0.02) * np.exp(-t * 0.9) * np.minimum(1, (dur - t) / 0.1)
    return (np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t)) * env * vel


_SHAKER = None


def shaker() -> np.ndarray:
    global _SHAKER
    if _SHAKER is None:
        dur = 0.06
        t = t_of(dur)
        n = RNG.uniform(-1, 1, len(t))
        n = n - onepole(n, 0.3)
        _SHAKER = n * np.sin(np.pi * np.minimum(1, t / dur)) ** 2
    return _SHAKER


# ── BGM ──────────────────────────────────────────────────────────────
BPM = 76
BEAT = 60 / BPM
BAR = BEAT * 4
# Gmaj7 – F#m7 – Em7 – A7sus（D 大调里的 IV–iii–ii–V），循环
PROG = [
    (43, [59, 62, 66, 69]),  # Gmaj7：B D F# A
    (42, [57, 61, 64, 69]),  # F#m7：A C# E A
    (40, [55, 59, 62, 67]),  # Em7：G B D G
    (45, [55, 59, 62, 64]),  # A7sus：G B D E
]


def build_bgm(seconds: float) -> np.ndarray:
    bars = int(np.ceil(seconds / BAR)) + 1
    L = np.zeros((int((bars * BAR + 4) * SR), 2))

    def add(sig: np.ndarray, at: float, gain: float, pan: float = 0.0) -> None:
        i = int(at * SR)
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(len(L), i + len(sig))
        if j <= i:
            return
        s = sig[: j - i] * gain
        L[i:j, 0] += s * (1 - max(0, pan))
        L[i:j, 1] += s * (1 + min(0, pan))

    arp_pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for b in range(bars):
        t0 = b * BAR
        root, ch = PROG[b % 4]
        intro = b < 2
        # 电钢琴和弦：第 1 拍长音 + 第 3 拍后半轻点
        for k, n in enumerate(ch):
            add(epiano(midi(n), BAR * 0.95, 0.9), t0 + k * 0.012, 0.11, -0.15 + 0.1 * k)
            add(epiano(midi(n), BEAT * 1.2, 0.5), t0 + 2.5 * BEAT, 0.06, 0.1)
        # pad 垫底
        for n in ch[:3]:
            add(pad(midi(n - 12), BAR + 0.6), t0 - 0.3, 0.05)
        # 低音
        if not intro:
            add(bass(midi(root), BEAT * 2.6), t0, 0.32)
            add(bass(midi(root + 7), BEAT * 1.2), t0 + 2.75 * BEAT, 0.18)
        # 拨弦分解（第 3 小节起，八分音符，很轻）
        if b >= 2:
            for e, k in enumerate(arp_pat):
                add(pluck(midi(ch[k] + 12), 0.5), t0 + e * BEAT / 2, 0.05 if e % 2 else 0.07, 0.3)
        # 极轻沙锤：后半拍
        if b >= 4:
            for e in range(8):
                if e % 2:
                    add(shaker(), t0 + e * BEAT / 2, 0.025, 0.4)
    out = L.copy()
    # 两路交叉短延迟 = 房间感；再整体低通一次，去掉刺耳的高频
    for d, g in ((0.11, 0.22), (0.17, 0.15)):
        k = int(d * SR)
        out[k:, 0] += L[:-k, 1] * g
        out[k:, 1] += L[:-k, 0] * g
    # 向量化低通：频域简易滚降
    n = len(out)
    spec = np.fft.rfft(out, axis=0)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    roll = 1 / np.sqrt(1 + (freqs / 4200) ** 4)
    out = np.fft.irfft(spec * roll[:, None], n=n, axis=0)
    out = out[: int(seconds * SR)]
    fade = int(3.0 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    fin = int(1.5 * SR)
    out[:fin] *= np.linspace(0, 1, fin)[:, None]
    return out


# ── 音效 ──────────────────────────────────────────────────────────────
def sfx_tick() -> np.ndarray:
    t = t_of(0.09)
    x = (np.sin(2 * np.pi * 1320 * t) + 0.4 * np.sin(2 * np.pi * 2970 * t)) * np.exp(-t * 70)
    n = RNG.uniform(-1, 1, len(t)) * np.exp(-t * 300) * 0.3
    return (x + n) * np.minimum(1, t / 0.001)


def sfx_whoosh(dur: float = 0.5) -> np.ndarray:
    t = t_of(dur)
    n = RNG.uniform(-1, 1, len(t))
    out = np.empty_like(n)
    a1 = a2 = 0.0
    for i, v in enumerate(n):
        p = i / len(n)
        a1 += (0.015 + 0.12 * p) * (v - a1)
        a2 += (0.004 + 0.03 * p) * (v - a2)
        out[i] = a1 - a2
    return out * np.sin(np.pi * t / dur) ** 2


def sfx_pop() -> np.ndarray:
    t = t_of(0.12)
    f = 420 + 700 * (1 - np.exp(-t * 40))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 32) * np.minimum(1, t / 0.002)


def glock(f: float, dur: float) -> np.ndarray:
    t = t_of(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.5) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 8)
    return x * np.minimum(1, t / 0.002)


def sfx_ding(base: float) -> np.ndarray:
    x = np.zeros(int(1.3 * SR))
    for i, mul in enumerate((1.0, 1.5)):
        s = glock(base * mul, 1.1) * (1 - 0.3 * i)
        j = int(i * 0.07 * SR)
        x[j:j + len(s)] += s[: len(x) - j]
    return x


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, default=130)
    add_project_arg(ap)
    args = ap.parse_args()
    ROOT = project_dir(args.project) / "public"
    write(ROOT / "bgm" / "calm-01.wav", build_bgm(args.seconds), 0.8)
    sfx = {"tick": sfx_tick(), "whoosh": sfx_whoosh(), "pop": sfx_pop(), "ding": sfx_ding(midi(81)), "ding_hi": sfx_ding(midi(86))}
    for k, v in sfx.items():
        write(ROOT / "sfx" / f"{k}.wav", v, 0.8)
    print("ok: bgm/calm-01.wav,", ", ".join(f"sfx/{k}.wav" for k in sfx))


if __name__ == "__main__":
    main()
