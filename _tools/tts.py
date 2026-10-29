"""旁白批量配音：src/<slug>/narration.json → MiniMax T2A v2 → mp3（响度归一化）→ 时长与分句时刻清单。

用法（PY = myenv 的 python.exe；在视频工程目录里跑可省略 --project；src/ 下只有一条视频时可省略 --slug）：
    & $PY ../_tools/tts.py                                   # 只合成签名变了的条目，然后重算清单
    & $PY _tools/tts.py --project 2026-10-28-上下三角矩阵       # 在根目录跑
    & $PY ../_tools/tts.py --only s3b                        # 只重做某几条（逗号分隔）
    & $PY ../_tools/tts.py --force                           # 全部重做
    & $PY ../_tools/tts.py --no-api                          # 不调接口，只按现有 mp3 重算清单 / 分句时刻

narration.json：数组，每项 {id, scene, speak, subs:[{at, text, en?}]}（en = 可选的英文字幕行）
  - speak：送 TTS 的原文（"a i j""j 减 i"这类读法版）
  - subs：字幕。at = 这条字幕在 speak 里从哪段文字开始（必须是 speak 的子串，且位于标点之后或开头）；
          text = 屏幕上显示的排版版（a_{ij}、j − i）。

产物（都在 --project 指的工程里）：
  - public/<slug>/audio/<id>.mp3            loudnorm 后的旁白（I=-16 / TP=-1.5）
  - src/<slug>/narration.generated.ts       每条的帧数、语音起止、按标点切开的分句时刻、字幕时刻（勿手改）
  - scripts/cache/<slug>-tts.json           每条的签名（sha1）与时长，签名不变就不再调接口
  - scripts/raw/<slug>/<id>.mp3             接口原始返回（gitignore）

分句时刻：按标点切开 speak，在"按字数比例估计的时刻"附近找 20 ms 能量包络最深的低谷当切点
（MiniMax 句中停顿太短，silencedetect 抓不到）。画面动画和字幕都按这些时刻对齐。

MiniMax 调用方式与 WickMind 课堂素材工程的 scripts/tts.py 相同：api.minimaxi.com/v1/t2a_v2，
speech-2.8-hd，aigc_watermark=false。密钥只从 WickMind 仓库的 config/.env 读入（绝对路径），
任何日志、清单、缓存里都不出现密钥或 voice_id 原值。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from project import ProjectError, add_project_arg, find_slug, project_dir

ENV_FILE = Path(r"D:\Release\WickMind\config\.env")   # 密钥文件：只读取，不复制、不打印

API_URL = "https://api.minimaxi.com/v1/t2a_v2"
DEFAULT_MODEL = "speech-2.8-hd"
MAX_TEXT = 3000
MIN_SECONDS = 0.3
ATTEMPTS = 3
FPS = 30
SPLIT_PUNCT = "，。；：？！、"
PUNCT = set("，。！？、；：“”‘’（）《》〈〉【】…—·,.!?;:'\"()[]<>-~ \t\r\n\u3000")


class ToolError(Exception):
    """可预期的错误：打印一行说明后退出，不抛堆栈。"""


def load_secrets() -> tuple[str, str]:
    try:
        from dotenv import dotenv_values
    except ImportError as e:
        raise ToolError("缺少 python-dotenv，请用 myenv 的 Python 运行") from e
    if not ENV_FILE.exists():
        raise ToolError(f"找不到密钥文件 {ENV_FILE}")
    vals = dotenv_values(ENV_FILE)
    key = (vals.get("MINIMAX_API_KEY") or "").strip()
    voice = (vals.get("MINIMAX_VOICE_ID") or "").strip()
    print(f"密钥文件：MINIMAX_API_KEY {'已读到' if key else '缺失'}，MINIMAX_VOICE_ID {'已读到' if voice else '缺失'}")
    if not key or not voice:
        raise ToolError("密钥文件里缺少 MINIMAX_API_KEY 或 MINIMAX_VOICE_ID")
    return key, voice


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def duration(path: Path) -> float:
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)])
    if r.returncode != 0:
        raise ToolError(f"ffprobe 失败：{path.name}")
    return float(r.stdout.strip())


def loudnorm(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(dst.stem + ".tmp.mp3")
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src),
             "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1",
             "-c:a", "libmp3lame", "-b:a", "128k", str(tmp)])
    if r.returncode != 0:
        raise ToolError(f"ffmpeg 响度归一化失败：{src.name}：{r.stderr.strip()[:200]}")
    os.replace(tmp, dst)


def signature(model: str, voice: str, speed: float, speak: str) -> str:
    return hashlib.sha1("\x1f".join([model, voice, f"{speed:g}", speak]).encode("utf-8")).hexdigest()


def synthesize(key: str, voice: str, speak: str, model: str, speed: float) -> bytes:
    body = {
        "model": model,
        "text": speak,
        "stream": False,
        "language_boost": "Chinese",
        "output_format": "hex",
        "aigc_watermark": False,  # 显式关闭末尾音频节奏标识（水印）
        "voice_setting": {"voice_id": voice, "speed": speed, "vol": 1, "pitch": 0},
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
    }
    req = urllib.request.Request(
        API_URL, data=json.dumps(body, ensure_ascii=False).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}") from None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise RuntimeError(f"网络错误：{type(e).__name__}") from None
    data = json.loads(raw)
    base = data.get("base_resp") or {}
    if base.get("status_code") != 0:
        raise RuntimeError(f"API 错误 {base.get('status_code')}：{base.get('status_msg')}")
    audio_hex = (data.get("data") or {}).get("audio") or ""
    if not audio_hex:
        raise RuntimeError("响应里没有 data.audio")
    return bytes.fromhex(audio_hex)


# ── 分句时刻 ──────────────────────────────────────────────────────────
def envelope(path: Path) -> tuple[list[float], float]:
    """20 ms 一帧的能量包络（dB），用 numpy 算；返回 (包络, 帧长秒)。"""
    import numpy as np
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                       capture_output=True)
    x = np.frombuffer(r.stdout, dtype="<i2").astype(np.float64) / 32768.0
    hop = 320
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    return db.tolist(), hop / 16000


def split_segments(speak: str) -> list[str]:
    segs, cur = [], ""
    for ch in speak:
        cur += ch
        if ch in SPLIT_PUNCT:
            segs.append(cur)
            cur = ""
    if cur.strip():
        segs.append(cur)
    return segs


def count_chars(s: str) -> int:
    return sum(1 for ch in s if ch not in PUNCT)


def segment_times(path: Path, speak: str) -> dict:
    """按标点切开 speak，在"按字数比例估计的时刻"附近 ±0.6 s 找能量包络最深的低谷当切点。
    MiniMax 的句中停顿很短（常常不到 0.1 s、也不到 -30 dB），所以不用 silencedetect，直接找低谷。"""
    import numpy as np
    total = duration(path)
    db_list, hop = envelope(path)
    db = np.array(db_list)
    if len(db) == 0:
        raise ToolError(f"解码失败：{path.name}")
    peak = float(np.percentile(db, 95))
    voiced = np.where(db > peak - 30)[0]
    onset = float(voiced[0] * hop) if len(voiced) else 0.0
    end = float((voiced[-1] + 1) * hop) if len(voiced) else total
    smooth = np.convolve(db, np.ones(5) / 5, mode="same")  # 100 ms 平滑：找的是一段低谷，不是单帧
    segs = split_segments(speak)
    weights = [max(1, count_chars(s)) for s in segs]
    tot = sum(weights)
    times = [onset]
    acc = 0
    for k in range(1, len(segs)):
        acc += weights[k - 1]
        expect = onset + (end - onset) * acc / tot
        lo = max(times[-1] + 0.3, expect - 0.6)
        hi = min(end - 0.2, expect + 0.6)
        i0, i1 = int(lo / hop), int(hi / hop)
        if i1 <= i0:
            times.append(max(times[-1] + 0.1, expect))
            continue
        # 低谷越深越好，离估计值越远略扣分
        idx = np.arange(i0, i1)
        score = smooth[i0:i1] + 6 * np.abs(idx * hop - expect)
        m = int(idx[int(np.argmin(score))])
        floor = smooth[m]
        j = m
        while j + 1 < len(db) and db[j + 1] < floor + 8:   # 走到低谷结束、下一个字开始
            j += 1
        times.append(round((j + 1) * hop, 3))
    return {"total": total, "onset": onset, "end": end,
            "segs": [{"text": s, "t": round(t, 3)} for s, t in zip(segs, times)]}


# ── 主流程 ────────────────────────────────────────────────────────────
def ts(s) -> str:
    return json.dumps(s, ensure_ascii=False)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="MiniMax T2A v2 旁白批量配音 → Remotion 清单")
    add_project_arg(ap, slug=True)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default=None)
    ap.add_argument("--no-api", action="store_true", help="不调接口，只按现有 mp3 重算清单")
    args = ap.parse_args(argv)
    try:
        ROOT = project_dir(args.project)
        args.slug = find_slug(ROOT, args.slug)
    except ProjectError as e:
        raise ToolError(str(e)) from None
    SCRIPTS = ROOT / "scripts"
    print(f"工程 {ROOT.name}，slug {args.slug}")

    src_dir = ROOT / "src" / args.slug
    narration_path = src_dir / "narration.json"
    items = json.loads(narration_path.read_text(encoding="utf-8-sig"))
    ids = [it["id"] for it in items]
    if len(set(ids)) != len(ids):
        raise ToolError("旁白 id 重复")
    for it in items:
        if len(it["speak"]) > MAX_TEXT:
            raise ToolError(f"{it['id']} 太长")
        for sub in it.get("subs", []):
            if sub["at"] not in it["speak"]:
                raise ToolError(f"{it['id']} 的字幕起点 {sub['at']!r} 不在 speak 里")
    only = {s.strip() for s in args.only.split(",")} if args.only else None

    audio_dir = ROOT / "public" / args.slug / "audio"
    raw_dir = SCRIPTS / "raw" / args.slug
    cache_path = SCRIPTS / "cache" / f"{args.slug}-tts.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    failures: list[str] = []

    if not args.no_api:
        key, voice = load_secrets()
        print(f"模型 {args.model}，语速 {args.speed:g}")
        raw_dir.mkdir(parents=True, exist_ok=True)
        for it in items:
            iid = it["id"]
            if only and iid not in only:
                continue
            sig = signature(args.model, voice, args.speed, it["speak"])
            out = audio_dir / f"{iid}.mp3"
            if not args.force and cache.get(iid, {}).get("sig") == sig and out.exists():
                print(f"[{iid}] 缓存命中")
                continue
            raw_path = raw_dir / f"{iid}.mp3"
            ok = False
            for attempt in range(1, ATTEMPTS + 1):
                try:
                    raw_path.write_bytes(synthesize(key, voice, it["speak"], args.model, args.speed))
                    if duration(raw_path) <= MIN_SECONDS:
                        raise RuntimeError("时长过短")
                    ok = True
                    break
                except (RuntimeError, ToolError, json.JSONDecodeError) as e:
                    print(f"[{iid}] 第 {attempt}/{ATTEMPTS} 次失败：{e}")
                    time.sleep(1.5 * attempt)
            if not ok:
                failures.append(iid)
                continue
            loudnorm(raw_path, out)
            cache[iid] = {"sig": sig, "model": args.model, "seconds": round(duration(out), 3)}
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"[{iid}] 合成完成 {cache[iid]['seconds']:.2f}s")

    # 清单
    lines = [
        "// 由 _tools/tts.py 生成，勿手改。时刻单位：秒（相对该条旁白开始）",
        "export type Seg = { text: string; t: number };",
        "export type Sub = { text: string; t: number; en?: string };",
        "export type Clip = { id: string; scene: string; speak: string; src: string; seconds: number; frames: number;",
        "  onset: number; end: number; segs: Seg[]; subs: Sub[] };",
        "export const CLIPS: Clip[] = [",
    ]
    total = 0.0
    print(f"\n{'id':<6}{'秒':>7}{'起':>6}{'止':>7}  分句时刻")
    for it in items:
        out = audio_dir / f"{it['id']}.mp3"
        if not out.exists():
            raise ToolError(f"缺音频：{it['id']}")
        info = segment_times(out, it["speak"])
        # 字幕时刻：at 所在分句的起点
        subs = []
        for sub in it.get("subs", []):
            pos = it["speak"].index(sub["at"])
            acc, t = 0, info["segs"][0]["t"]
            for seg in info["segs"]:
                if acc <= pos:
                    t = seg["t"]
                acc += len(seg["text"])
            cue = {"text": sub["text"], "t": t}
            if sub.get("en"):
                cue["en"] = sub["en"]   # 双语字幕：英文一行（可选，没有就只出中文）
            subs.append(cue)
        sec = round(info["total"], 3)
        total += sec
        lines.append(
            f"  {{ id: {ts(it['id'])}, scene: {ts(it['scene'])}, speak: {ts(it['speak'])}, "
            f"src: {ts(f'{args.slug}/audio/' + it['id'] + '.mp3')}, seconds: {sec}, frames: {math.ceil(sec * FPS)}, "
            f"onset: {round(info['onset'], 3)}, end: {round(info['end'], 3)}, segs: {ts(info['segs'])}, subs: {ts(subs)} }},"
        )
        print(f"{it['id']:<6}{sec:>7.2f}{info['onset']:>6.2f}{info['end']:>7.2f}  "
              + " ".join(f"{s['t']:.2f}" for s in info["segs"]))
    lines.append("];")
    (src_dir / "narration.generated.ts").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"合计 {total:.2f}s，{len(items)} 条 → src/{args.slug}/narration.generated.ts")
    if failures:
        print(f"失败：{', '.join(failures)}")
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ToolError as e:
        print(f"错误：{e}", file=sys.stderr)
        sys.exit(2)
