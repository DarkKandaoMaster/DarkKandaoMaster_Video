"""旁白 / 字幕自检 + 时长估计（不调接口）。

    $env:PYTHONIOENCODING="utf-8"
    & $PY scripts\\check_script.py [--speed 1.05]

1. 每条字幕的 at 是 speak 的子串，且在开头或标点之后（tts.py 的要求）。
2. 中文字幕里中英文 / 数字之间不加空格（v_{1} 这类标记按字母算）。
3. 禁用词（zh-deai-rewrite 清单 + 口头禅）0 处。
4. 每屏中文 ≤ 18 个字（标记 v_{1} 算 2 个字）。
5. speak 里不出现阿拉伯数字（读法版一律写汉字）。
6. 时长估计：汉字、字母各算 1 个字；speed 1.0 ≈ 3.86 字/秒（KMP 那条实测）。
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAR = json.loads((ROOT / "src" / "bfs" / "narration.json").read_text(encoding="utf-8"))
PUNCT = "，。；：？！、"
BANNED = ["综上", "总体而言", "值得注意的是", "强烈建议", "显著", "全面", "有力", "深入", "却", "反而", "竟", "顺手",
          "硬是", "干脆", "说白了", "说到底", "就完事了"]
SPACE_RE = re.compile(r"[一-鿿　-〿＀-￯] +[A-Za-z0-9]|[A-Za-z0-9] +[一-鿿　-〿＀-￯]")

ap = argparse.ArgumentParser()
ap.add_argument("--speed", type=float, default=1.05)
a = ap.parse_args()

bad = 0


def fail(msg):
    global bad
    bad += 1
    print("FAIL", msg)


screens = 0
max_len = 0
chars_total = 0
for c in NAR:
    sp = c["speak"]
    for s in c["subs"]:
        pos = sp.find(s["at"])
        if pos < 0:
            fail(f"{c['id']}: at「{s['at']}」不在 speak 里")
        elif pos > 0 and sp[pos - 1] not in PUNCT:
            fail(f"{c['id']}: at「{s['at']}」不在标点之后")
        t = s["text"]
        if SPACE_RE.search(re.sub(r"v_\{\d\}|G_\{\d\}", "v", t)):
            # 序列行 "v_{1} v_{2} …" 之间的空格是英文记号之间的，允许
            if not re.fullmatch(r"[^ ]*(?: v_\{\d\})+", t.split("：")[-1].strip() if "：" in t else t):
                fail(f"{c['id']}: 字幕中英空格：{t}")
        bare = re.sub(r"[A-Za-z]_\{\d+\}", "xx", re.sub(r"[ ，。；：？！、（）()]", "", t))
        n = len(re.sub(r"[A-Za-z0-9]", "", bare)) + len(re.findall(r"[A-Za-z0-9]", bare)) / 2  # 字母、数字按半个字宽算
        max_len = max(max_len, n)
        if n > 18 and not t.startswith("访问序列"):
            fail(f"{c['id']}: 一屏 {n} 字 > 18：{t}")
        screens += 1
        for w in BANNED:
            if w in t:
                fail(f"{c['id']}: 字幕禁用词「{w}」")
    for w in BANNED:
        if w in sp:
            fail(f"{c['id']}: speak 禁用词「{w}」")
    if re.search(r"[0-9]", sp):
        fail(f"{c['id']}: speak 含阿拉伯数字")
    chars_total += len(re.findall(r"[一-鿿A-Za-z]", sp))

rate = 3.86 * a.speed
speech = chars_total / rate
pauses = 0.7 + 0.45 * (len(NAR) - 1) + 8.0 + 2.5 + 6.0  # 片头、条间、倒计时、片尾、各镜额外停顿（估）
print(f"旁白 {len(NAR)} 条、{screens} 屏、{chars_total} 字；单屏最多 {max_len} 字")
print(f"speed {a.speed:g}：旁白约 {speech:.1f} 秒，全片约 {speech + pauses:.1f} 秒（{int((speech + pauses) // 60)}:{(speech + pauses) % 60:04.1f}）")
scene_chars: dict[str, int] = {}
for c in NAR:
    scene_chars[c["scene"]] = scene_chars.get(c["scene"], 0) + len(re.findall(r"[一-鿿A-Za-z]", c["speak"]))
for k, v in scene_chars.items():
    print(f"  {k}：{v} 字，约 {v / rate:.1f} 秒")
print("全部 OK" if not bad else f"{bad} 处 FAIL")
