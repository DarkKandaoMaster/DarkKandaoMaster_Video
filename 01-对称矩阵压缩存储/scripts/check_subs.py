"""核对屏幕字幕与定稿旁白 字幕-v6.md 逐字一致。

    & $PY scripts\\check_subs.py

做法：把 narration.json 里所有 subs[].text 按顺序拼起来，a_{43} 这类排版写法换回 v6 用的 Unicode 下标（a₄₃、aᵢⱼ），
再和 字幕-v6.md 正文（去掉标题行和换行）逐字比较；同时检查每屏中文字数（不超过 22 个汉字）和 at 是否在 speak 里。
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NARR = ROOT / "src" / "sym-store-v2" / "narration.json"
V6 = ROOT / "字幕-v6.md"
SUBSCRIPT = {**{str(d): chr(0x2080 + d) for d in range(10)}, "i": "ᵢ", "j": "ⱼ"}

items = json.loads(NARR.read_text(encoding="utf-8"))
v6_lines = [ln.strip() for ln in V6.read_text(encoding="utf-8").splitlines()]
v6 = "".join(ln for ln in v6_lines if ln and not ln.startswith("#"))


def to_unicode(s: str) -> str:
    return re.sub(r"([A-Za-z])_\{([^}]+)\}", lambda m: m.group(1) + "".join(SUBSCRIPT[c] for c in m.group(2)), s)


bad = 0
joined = ""
for it in items:
    for sub in it["subs"]:
        joined += to_unicode(sub["text"])
        han = len(re.findall(r"[一-鿿]", sub["text"]))
        flag = "" if han <= 22 else "  ← 超过 22 字"
        bad += han > 22
        if sub["at"] not in it["speak"]:
            print(f"[ERR] {it['id']} 的 at「{sub['at']}」不在 speak 里")
            bad += 1
        print(f"  {it['id']:<4} {han:2d} 字  {sub['text']}{flag}")

if joined == v6:
    print(f"\n字幕与 字幕-v6.md 逐字一致（{len(v6)} 字符）")
else:
    bad += 1
    n = next((k for k in range(min(len(joined), len(v6))) if joined[k] != v6[k]), min(len(joined), len(v6)))
    print(f"\n[ERR] 第 {n} 个字符起不一致：\n  字幕：…{joined[max(0, n - 15):n + 25]}\n  v6  ：…{v6[max(0, n - 15):n + 25]}")
print("全部通过" if bad == 0 else f"有 {bad} 处问题")
