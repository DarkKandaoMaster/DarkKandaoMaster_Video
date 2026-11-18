"""BGM 垫在旁白下面合不合适：客观测量（2026-11-09，配合 BGM对比.md）。

输入（先用 remotion.audio.config.ts 渲好，见 BGM对比.md）：
  out/stems/voice.wav             只有旁白（REMOTION_STEM=voice）
  out/stems/bgm-<名>.wav          只有 BGM，带闪避，音量和成片混音里一样（REMOTION_STEM=bgm）
  out/stems/mix-<名>.wav          正常混音（旁白 + BGM + 音效），未经 finish.py
  public/bgm/<名>.wav             BGM 原文件（看它本身的起伏 / 鼓点，不含闪避）
  <成片>.mp4                      finish.py 之后的成片（算 finish 的增益，换算成片里的绝对响度）

    $env:PYTHONIOENCODING="utf-8"; & $PY scripts\\measure_bgm.py

指标（响度按 ITU-R BS.1770 K 加权自己算，400 ms 窗 = momentary，3 s 窗 = short-term，步长 100 ms）：
  - 说话窗：旁白 momentary ≥ 旁白积分响度 − 20 LU 的 400 ms 窗
  - SMR：同一窗里 旁白 − BGM（LU ≈ dB），给中位数和最差 10%（第 10 百分位）
  - 1–4 kHz：同一窗里 BGM 与旁白在 1–4 kHz 的能量差（BGM − 旁白，dB，越负越好），中位数和最差 10%（第 90 百分位）
  - 停顿：第一句到最后一句之间、旁白 momentary < −70 LUFS 的窗；BGM 在停顿里的 momentary 中位数 / 最大值，
    与说话窗里 BGM 中位数的差（涌上来多少），并换算到成片里的绝对 LUFS
  - LRA：EBU Tech 3342（3 s 窗，绝对门限 −70，相对门限 −20 LU，10%–95% 百分位）
  - onset：librosa onset_detect，每秒个数；打击乐占比：librosa HPSS 后 percussive 能量 / 总能量
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
STEMS = ROOT / "out" / "stems"
NAMES = ["bright-01", "bright-02", "bright-03"]
FINAL = {"bright-01": "对称矩阵压缩存储.mp4", "bright-02": "对称矩阵压缩存储-bgm02.mp4", "bright-03": "对称矩阵压缩存储-bgm03.mp4"}
QUIZ = (3357 / 30, 3433 / 30)  # s10 结束 → s11 开始（小题 2.5 s 停顿），帧号来自 print_timeline.py
WIN, HOP = 0.4, 0.1


def kweight(x: np.ndarray, sr: int) -> np.ndarray:
    """BS.1770 K 加权：高架（+4 dB @ ~1.7 kHz）+ 高通（~38 Hz）。系数公式同 libebur128（ffmpeg ebur128 用的那份），任意采样率。"""
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh = 10 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1.0 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
    y = signal.lfilter(b, a, x, axis=0)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    a = [1.0, 2.0 * (K * K - 1.0) / (1.0 + K / Q + K * K), (1.0 - K / Q + K * K) / (1.0 + K / Q + K * K)]
    return signal.lfilter([1.0, -2.0, 1.0], a, y, axis=0)


def frame_power(x: np.ndarray, sr: int, win: float, hop: float = HOP) -> np.ndarray:
    """每窗各声道均方之和（x 为 [n, ch]）"""
    p = (x ** 2).sum(axis=1)
    c = np.concatenate([[0.0], np.cumsum(p)])
    w, h = int(round(win * sr)), int(round(hop * sr))
    starts = np.arange(0, len(p) - w + 1, h)
    return (c[starts + w] - c[starts]) / w


def lufs(power: np.ndarray) -> np.ndarray:
    return -0.691 + 10 * np.log10(np.maximum(power, 1e-20))


def integrated(xk: np.ndarray, sr: int) -> float:
    pw = frame_power(xk, sr, 0.4, 0.1)
    l = lufs(pw)
    g = pw[l > -70]
    rel = lufs(np.array([g.mean()]))[0] - 10
    return float(lufs(np.array([pw[(l > -70) & (l > rel)].mean()]))[0])


def lra(xk: np.ndarray, sr: int) -> float:
    l = lufs(frame_power(xk, sr, 3.0, 0.1))
    l = l[l > -70]
    rel = 10 * np.log10(np.mean(10 ** (l / 10))) - 20
    l = l[l > rel]
    return float(np.percentile(l, 95) - np.percentile(l, 10))


def load(p: Path) -> tuple[np.ndarray, int]:
    x, sr = sf.read(str(p), always_2d=True)
    return x.astype(np.float64), sr


def ffmpeg_i(path: Path) -> float:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    t = r.stderr
    return float(json.loads(t[t.rindex("{"): t.rindex("}") + 1])["input_i"])


def main() -> None:
    v, sr = load(STEMS / "voice.wav")
    vk = kweight(v, sr)
    Lv = lufs(frame_power(vk, sr, WIN))
    Iv = integrated(vk, sr)
    t = np.arange(len(Lv)) * HOP + WIN / 2  # 窗中心
    speech = Lv >= Iv - 20
    first, last = t[speech][0], t[speech][-1]
    pause = (Lv < -70) & (t > first) & (t < last)
    quiz = (t > QUIZ[0] + 0.3) & (t < QUIZ[1] - 0.3)
    sos = signal.butter(4, [1000, 4000], btype="bandpass", fs=sr, output="sos")
    Pv_band = frame_power(signal.sosfilt(sos, v, axis=0), sr, WIN)
    print(f"旁白积分响度 {Iv:.1f} LUFS；说话窗 {speech.sum()} 个（{speech.mean() * 100:.0f}%），停顿窗 {pause.sum()} 个，小题停顿窗 {quiz.sum()} 个")
    rows = {}
    for name in NAMES:
        b, sr_b = load(STEMS / f"bgm-{name}.wav")
        assert sr_b == sr
        n = min(len(b), len(v))
        bk = kweight(b[:n], sr)
        Lb = lufs(frame_power(bk, sr, WIN))[: len(Lv)]
        smr = (Lv - Lb)[speech]
        Pb_band = frame_power(signal.sosfilt(sos, b[:n], axis=0), sr, WIN)[: len(Lv)]
        band = (10 * np.log10(np.maximum(Pb_band, 1e-20)) - 10 * np.log10(np.maximum(Pv_band, 1e-20)))[speech]
        # 整段功率平均版本（说话窗内）
        smr_avg = 10 * np.log10(10 ** (Lv[speech] / 10).mean()) - 10 * np.log10(10 ** (Lb[speech] / 10).mean())
        Lb_speech_med = float(np.median(Lb[speech]))
        mix, _ = load(STEMS / f"mix-{name}.wav")
        I_mix = integrated(kweight(mix, sr), sr)
        final = ROOT / FINAL[name]
        gain = ffmpeg_i(final) - I_mix if final.exists() else float("nan")
        raw, sr_r = load(ROOT / "public" / "bgm" / f"{name}.wav")
        raw = raw[: int(len(v) / sr * sr_r)]  # 只看片中用到的 122.9 s
        rk = kweight(raw, sr_r)
        mono = librosa.resample(raw.mean(axis=1).astype(np.float32), orig_sr=sr_r, target_sr=22050)
        onsets = librosa.onset.onset_detect(y=mono, sr=22050, units="time")
        S = librosa.stft(mono)
        H, P = librosa.decompose.hpss(S)
        perc = float(10 * np.log10((np.abs(P) ** 2).sum() / (np.abs(S) ** 2).sum()))
        # 1–4 kHz 在 BGM 原文件里占的比例（原文件自己的频谱分布）
        Pr_band = (signal.sosfilt(signal.butter(4, [1000, 4000], btype="bandpass", fs=sr_r, output="sos"), raw, axis=0) ** 2).sum()
        band_share = float(10 * np.log10(Pr_band / (raw ** 2).sum()))
        rows[name] = {
            "SMR 中位数": float(np.median(smr)),
            "SMR 最差10%": float(np.percentile(smr, 10)),
            "SMR 功率平均": float(smr_avg),
            "1-4k BGM-旁白 中位数": float(np.median(band)),
            "1-4k BGM-旁白 最差10%": float(np.percentile(band, 90)),
            "BGM 说话时 中位数 LUFS(混音)": Lb_speech_med,
            "停顿 BGM 中位数 - 说话时": float(np.median(Lb[pause]) - Lb_speech_med),
            "停顿 BGM 最大 - 说话时": float(np.max(Lb[pause]) - Lb_speech_med),
            "停顿 BGM 中位数 成片LUFS": float(np.median(Lb[pause]) + gain),
            "停顿 BGM 最大 成片LUFS": float(np.max(Lb[pause]) + gain),
            "小题停顿 BGM 中位数 成片LUFS": float(np.median(Lb[quiz]) + gain),
            "小题停顿 BGM 最大 成片LUFS": float(np.max(Lb[quiz]) + gain),
            "旁白 成片LUFS": Iv + gain,
            "finish 增益": gain,
            "BGM 片中 LRA(含闪避)": lra(bk, sr),
            "BGM 原文件 LRA": lra(rk, sr_r),
            "BGM 原文件 积分": integrated(rk, sr_r),
            "BGM 原文件 1-4k 占比 dB": band_share,
            "onset 每秒": len(onsets) / (len(mono) / 22050),
            "打击乐能量占比 dB": perc,
        }
    keys = list(rows[NAMES[0]].keys())
    print(f"{'指标':<32}" + "".join(f"{n:>12}" for n in NAMES))
    for k in keys:
        print(f"{k:<32}" + "".join(f"{rows[n][k]:>12.1f}" if k != "onset 每秒" else f"{rows[n][k]:>12.2f}" for n in NAMES))
    (STEMS / "measure.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
