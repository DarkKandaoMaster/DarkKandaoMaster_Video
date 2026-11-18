"""抽查 tts.py 算出的分句切点是否落在语音低谷（20 ms 能量包络）。

    & $PY scripts\\check_splits.py
    & $PY scripts\\check_splits.py --variant x       # 配音变体（narration.generated.x.ts / audio-x/）

对每条旁白的每个切点：打印切点处 dB、±250 ms 内最低点的位置与 dB、整条语音的中位 dB，
以及切点前后各 400 ms 的 ASCII 包络（每格 20 ms，'.' 低、'#' 高，'|' = 切点）。
tts.py 的切点放在停顿结束、下一句起音处：切点前 300 ms 内有比中位低 15 dB 的低谷、切点后 100 ms 内回到中位附近记 OK，否则记 CHECK。
"""
from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
_ap = argparse.ArgumentParser()
_ap.add_argument("--variant", default="", help="配音变体后缀（如 x）")
_VAR = _ap.parse_args().variant
GEN = ROOT / "src" / "sym-store-v2" / (f"narration.generated.{_VAR}.ts" if _VAR else "narration.generated.ts")
AUDIO = ROOT / "public"
SR = 16000
HOP = 0.02


def load(path: Path) -> np.ndarray:
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                       capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def env_db(x: np.ndarray) -> np.ndarray:
    n = int(SR * HOP)
    k = len(x) // n
    fr = x[: k * n].reshape(k, n)
    return 20 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-6)


gen = GEN.read_text(encoding="utf-8")
bad = 0
for m in re.finditer(r'\{ id: "([^"]+)".*?src: "([^"]+)".*?segs: (\[.*?\]), subs', gen):
    cid, src, segs = m.group(1), m.group(2), m.group(3)
    import json
    segs = json.loads(segs)
    db = env_db(load(AUDIO / src))
    med = float(np.median(db[db > -60])) if (db > -60).any() else -30
    print(f"== {cid}  中位 {med:.1f} dB")
    for s in segs[1:]:
        t = s["t"]
        i = int(round(t / HOP))
        lo, hi = max(0, i - 12), min(len(db), i + 13)
        j = lo + int(np.argmin(db[lo:hi]))
        a, b = max(0, i - 20), min(len(db), i + 20)
        art = ""
        for q in range(a, b):
            v = db[q]
            ch = "." if v < med - 25 else ":" if v < med - 15 else "+" if v < med - 6 else "#"
            art += ("|" if q == i else "") + ch
        # tts.py 把切点放在"停顿结束、下一句起音"处：要求切点前 300 ms 内有低谷，切点后 100 ms 内起音
        valley = float(db[max(0, i - 15):i].min()) if i > 0 else 0.0
        rise_ = float(db[i:i + 5].max()) if i < len(db) else -99.0
        ok = valley < med - 15 and rise_ > med - 10
        bad += not ok
        print(f"   {t:5.2f}s {s['text'][:10]:<10} 切点 {db[i]:6.1f} dB  最低 {db[j]:6.1f} dB @ {j * HOP:5.2f}s  "
              f"谷 {valley:6.1f} {'OK   ' if ok else 'CHECK'} {art}")
print(f"\n需要人工看的切点：{bad}")
