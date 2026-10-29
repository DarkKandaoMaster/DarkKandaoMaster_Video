"""从成片里按帧号抽 png（验收看图用）。

    & $PY ../_tools/grab_frames.py <视频> <输出目录> 名字=帧号 名字=帧号 ...
例（在视频工程目录里）：& $PY ../_tools/grab_frames.py 对称矩阵上三角.mp4 抽帧 s1-hook=180 s3-slide=700
帧号按 30 fps 换成秒，-ss 放在 -i 之前（解码时精确定位，且快）。
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 2
    video, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for arg in sys.argv[3:]:
        name, frame = arg.split("=")
        t = int(frame) / 30 + 0.001
        dst = out / f"{name}-f{int(frame):04d}.png"
        r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", str(video),
                            "-frames:v", "1", str(dst)], capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(("OK  " if r.returncode == 0 else "ERR ") + str(dst) + ("" if r.returncode == 0 else " " + r.stderr[-200:]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
