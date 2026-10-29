"""成片后处理：视频流原样复制，音轨两遍 loudnorm（-16 LUFS / TP -1.5）+ 限幅，然后 ffprobe 自检。

    & $PY ../_tools/finish.py out/SymUpper.mp4 对称矩阵上三角.mp4      # 在视频工程目录里跑；路径都按当前目录算

自检打印：时长、分辨率、帧率、音轨编码，以及成片的积分响度 / 真峰值。
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

TARGET = {"I": -16.0, "TP": -1.5, "LRA": 11.0}


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def measure(path: Path) -> dict:
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af",
             f"loudnorm=I={TARGET['I']}:TP={TARGET['TP']}:LRA={TARGET['LRA']}:print_format=json", "-f", "null", "-"])
    txt = r.stderr
    j = txt[txt.rindex("{"): txt.rindex("}") + 1]
    return json.loads(j)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.parent.mkdir(parents=True, exist_ok=True)
    m = measure(src)
    print(f"原始：{float(m['input_i']):.1f} LUFS，TP {float(m['input_tp']):.1f} dBTP，LRA {float(m['input_lra']):.1f}")
    af = (
        f"loudnorm=I={TARGET['I']}:TP={TARGET['TP']}:LRA={TARGET['LRA']}"
        f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
        f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
        "alimiter=limit=0.84:attack=5:release=60:level=disabled,aresample=48000"
    )
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-c:v", "copy",
             "-af", af, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(dst)])
    if r.returncode != 0:
        print(r.stderr[-800:])
        return 1
    m2 = measure(dst)
    p = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(dst)])
    info = json.loads(p.stdout)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    print(f"成片：{dst}")
    print(f"  时长 {float(info['format']['duration']):.2f} s，{v['width']}×{v['height']}，{v['r_frame_rate']} fps，{v['codec_name']} {v.get('pix_fmt')}")
    print(f"  音轨 {a['codec_name'] if a else '无'} {a.get('sample_rate') if a else ''} Hz，"
          f"响度 {float(m2['input_i']):.1f} LUFS，真峰值 {float(m2['input_tp']):.1f} dBTP")
    return 0


if __name__ == "__main__":
    sys.exit(main())
