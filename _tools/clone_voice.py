"""MiniMax 快速复刻（Voice Clone）：上传人声样本 → 克隆成音色 → 下载试听；也可用克隆好的音色合成任意文本。

用法（PY = myenv 的 python.exe；在根目录 D:\\Release\\DarkKandaoMaster_Video 跑）：
    $env:PYTHONIOENCODING="utf-8"
    # 路径都是占位示例；2026-11-04 用 makura_test_01 做的歌曲人声试验样本已弃用（移到 _待删除\项目整理-20261107\音色样本\）
    # 1) 克隆（花钱：9.9 元/音色，首次合成时扣；试听文本按合成价计费）
    & $PY _tools/clone_voice.py --file "docs/某样本.mp3" --voice-id my_voice_01 `
        --preview-text "大家好，今天我们轻松拿下 KMP！" --out "docs/某试听目录"
    # 2) 用克隆好的音色合成任意文本（复用 tts.py 的 synthesize，speech-2.8-hd、aigc_watermark=false）
    & $PY _tools/clone_voice.py --voice-id my_voice_01 --say "要合成的文本" --speed 1.1 --out "docs/某试听目录"

可选：--model（默认 speech-2.8-hd）、--noise-reduction / --volume-norm（克隆时让服务端降噪 / 音量归一）、
      --base-url（默认 https://api.minimaxi.com，与 tts.py 一致；官方文档写的是 https://api.minimax.cn）、
      --force（out 目录里已有该 voice_id 的成功克隆记录时，默认拒绝重复克隆，防止重复扣费）、--name（--say 产物文件名前缀）。

产物（都在 --out 目录）：
  - <voice_id>.clone.json             克隆接口的返回（不含密钥）+ file_id，用来防重复克隆
  - <voice_id>-preview.<ext>          克隆接口返回的试听音频（demo_audio 链接下载）
  - <voice_id>-<name>-speed<x>.mp3    --say 合成的音频（接口原始返回，没做响度归一）

音频要求（官方文档，2026-11 查）：mp3 / m4a / wav，10 秒 ~ 5 分钟，≤ 20 MB。
voice_id 规则：8~256 字符，首字符英文字母，只能用字母、数字、- 和 _，末字符不能是 - 或 _，不能与已有的重复。
复刻出来的音色 7 天内没有正式调用（合成）会被系统删除。

密钥：只用 tts.py 的 load_secrets(need_voice=False) 在进程内读 MINIMAX_API_KEY；
所有打印、记录文件都经过 redact()，请求头不打印。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tts import DEFAULT_MODEL, ToolError, load_secrets, synthesize  # noqa: E402

DEFAULT_BASE = "https://api.minimaxi.com"
VOICE_ID_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{6,254}[A-Za-z0-9]")
AUDIO_EXT = {".mp3", ".m4a", ".wav"}


def redact(obj, key: str):
    """把任何字符串里出现的密钥原值替换掉（递归处理 dict / list）。"""
    if isinstance(obj, str):
        return obj.replace(key, "***") if key else obj
    if isinstance(obj, dict):
        return {k: redact(v, key) for k, v in obj.items()}
    if isinstance(obj, list):
        return [redact(v, key) for v in obj]
    return obj


def short_url(u: str) -> str:
    """试听链接带签名参数，打印时只留 host + path。"""
    p = urlsplit(u)
    return f"{p.scheme}://{p.netloc}{p.path}" + (" (带查询参数)" if p.query else "")


def parse_json(r, key: str) -> dict:
    try:
        return r.json()
    except ValueError:
        raise ToolError(f"HTTP {r.status_code}，返回不是 JSON：{redact(r.text[:300], key)}") from None


def base_summary(data: dict) -> str:
    b = data.get("base_resp") or {}
    return f"status_code={b.get('status_code')} status_msg={b.get('status_msg')!r}"


def upload(base: str, key: str, path: Path) -> int:
    import requests
    print(f"[上传] {path.name}（{path.stat().st_size / 1e6:.2f} MB）purpose=voice_clone")
    with path.open("rb") as fh:
        # 文件名用 ASCII，避免 multipart 里中文文件名的编码问题
        r = requests.post(f"{base}/v1/files/upload",
                          headers={"Authorization": f"Bearer {key}"},
                          data={"purpose": "voice_clone"},
                          files={"file": (f"sample{path.suffix.lower()}", fh)},
                          timeout=180)
    data = parse_json(r, key)
    print(f"[上传] HTTP {r.status_code}，{base_summary(data)}")
    f = data.get("file") or {}
    if (data.get("base_resp") or {}).get("status_code") != 0 or not f.get("file_id"):
        raise ToolError(f"上传失败：{json.dumps(redact(data, key), ensure_ascii=False)[:500]}")
    print(f"[上传] file_id={f['file_id']} bytes={f.get('bytes')} filename={f.get('filename')} purpose={f.get('purpose')}")
    return int(f["file_id"])


def clone(base: str, key: str, file_id: int, voice_id: str, text: str, model: str,
          noise: bool, vol: bool) -> dict:
    import requests
    body = {
        "file_id": file_id,
        "voice_id": voice_id,
        "need_noise_reduction": noise,
        "need_volume_normalization": vol,
        "aigc_watermark": False,
        "language_boost": "Chinese",
    }
    if text:
        body["text"] = text
        body["model"] = model
    print(f"[克隆] voice_id={voice_id} model={model if text else '-'} 降噪={noise} 音量归一={vol} 试听文本={text!r}")
    r = requests.post(f"{base}/v1/voice_clone",
                      headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                      data=json.dumps(body, ensure_ascii=False).encode("utf-8"), timeout=300)
    data = redact(parse_json(r, key), key)
    print(f"[克隆] HTTP {r.status_code}，{base_summary(data)}")
    print(f"[克隆] input_sensitive={json.dumps(data.get('input_sensitive'), ensure_ascii=False)}")
    if data.get("extra_info"):
        print(f"[克隆] extra_info={json.dumps(data['extra_info'], ensure_ascii=False)}")
    if data.get("demo_audio"):
        print(f"[克隆] demo_audio={short_url(data['demo_audio'])}")
    return data


def download(url: str, dst: Path) -> None:
    import requests
    r = requests.get(url, timeout=120)
    if r.status_code != 200 or not r.content:
        raise ToolError(f"下载试听失败：HTTP {r.status_code}，{len(r.content)} 字节")
    if r.content[:1] == b"{":
        raise ToolError(f"试听链接返回的是 JSON 不是音频：{r.text[:200]}")
    dst.write_bytes(r.content)
    print(f"[试听] 已保存 {dst}（{len(r.content)} 字节）")


def do_clone(args, out: Path) -> int:
    path = Path(args.file).resolve()
    if not path.exists():
        raise ToolError(f"找不到样本 {path}")
    if path.suffix.lower() not in AUDIO_EXT:
        raise ToolError(f"样本格式应为 mp3/m4a/wav，收到 {path.suffix}")
    if path.stat().st_size > 20 * 1024 * 1024:
        raise ToolError("样本超过 20 MB")
    record = out / f"{args.voice_id}.clone.json"
    if record.exists() and not args.force:
        old = json.loads(record.read_text(encoding="utf-8"))
        if (old.get("response", {}).get("base_resp") or {}).get("status_code") == 0:
            raise ToolError(f"{record.name} 显示该 voice_id 已克隆成功；要重来请加 --force（会再次扣费）")
    key, _ = load_secrets(need_voice=False)
    file_id = upload(args.base_url, key, path)
    data = clone(args.base_url, key, file_id, args.voice_id, args.preview_text, args.model,
                 args.noise_reduction, args.volume_norm)
    record.write_text(json.dumps({"time": time.strftime("%Y-%m-%d %H:%M:%S"), "sample": str(path),
                                  "file_id": file_id, "voice_id": args.voice_id, "model": args.model,
                                  "preview_text": args.preview_text, "response": data},
                                 ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[记录] {record}")
    if (data.get("base_resp") or {}).get("status_code") != 0:
        raise ToolError(f"克隆失败：{base_summary(data)}")
    if data.get("demo_audio"):
        ext = Path(urlsplit(data["demo_audio"]).path).suffix or ".mp3"
        download(data["demo_audio"], out / f"{args.voice_id}-preview{ext}")
    elif args.preview_text:
        print("[试听] 接口没有返回 demo_audio")
    print(f"完成：file_id={file_id} voice_id={args.voice_id}")
    return 0


def do_say(args, out: Path) -> int:
    key, _ = load_secrets(need_voice=False)
    print(f"[合成] voice_id={args.voice_id} model={args.model} speed={args.speed:g}，{len(args.say)} 字：{args.say}")
    try:
        audio = synthesize(key, args.voice_id, args.say, args.model, args.speed)
    except RuntimeError as e:
        raise ToolError(f"合成失败：{redact(str(e), key)}") from None
    name = re.sub(r"[^A-Za-z0-9_\-]", "", args.name) or "say"
    dst = out / f"{args.voice_id}-{name}-speed{args.speed:g}.mp3"
    dst.write_bytes(audio)
    print(f"[合成] 已保存 {dst}（{len(audio)} 字节）")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="MiniMax 快速复刻：上传 → 克隆 → 试听；或 --say 用克隆音色合成")
    ap.add_argument("--voice-id", required=True, help="自定义音色 id（8~256 字符，字母开头）")
    ap.add_argument("--file", help="人声样本（mp3/m4a/wav，10 s~5 min，≤20 MB）；给了就走克隆流程")
    ap.add_argument("--preview-text", default="", help="克隆时的试听文本（≤1000 字符）")
    ap.add_argument("--say", default="", help="用该 voice_id 合成这段文本（不克隆）")
    ap.add_argument("--speed", type=float, default=1.0, help="--say 的语速")
    ap.add_argument("--name", default="say", help="--say 产物的文件名前缀（字母数字）")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--out", required=True, help="产物目录")
    ap.add_argument("--base-url", default=DEFAULT_BASE)
    ap.add_argument("--noise-reduction", action="store_true")
    ap.add_argument("--volume-norm", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args(argv)
    if not VOICE_ID_RE.fullmatch(args.voice_id):
        raise ToolError(f"voice_id 不合规（8~256 字符、字母开头、末位不能是 - 或 _）：{args.voice_id!r}")
    if bool(args.file) == bool(args.say):
        raise ToolError("--file（克隆）和 --say（合成）二选一")
    if len(args.preview_text) > 1000:
        raise ToolError("试听文本超过 1000 字符")
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    args.base_url = args.base_url.rstrip("/")
    return do_clone(args, out) if args.file else do_say(args, out)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ToolError as e:
        print(f"错误：{e}", file=sys.stderr)
        sys.exit(2)
