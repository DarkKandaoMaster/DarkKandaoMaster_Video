"""自检 脚本.md：字幕排版 + 禁用词 + 每屏字数 + 旁白时长估计。

用法（在工程目录 _旧版\02-KMP重制方案-20261103 里）：
    $env:PYTHONIOENCODING="utf-8"
    & D:\\Programs\\DevEnvironments\\Anaconda\\anaconda3\\envs\\myenv\\python.exe scripts\\check_script.py

读 脚本.md 里各镜旁白表格：
    | id | speak | 中文字幕 | English |
    旁白行 id 形如 s2c；停顿行 id 为 ⏸，speak 列写"（停1.0秒：…）"。
    字幕列里的 " / " 是分屏切点。
检查：
  1. 中文字幕：中文与英文/数字之间的空格，正则零命中；
  2. speak + 中文字幕：禁用词零命中；
  3. 每屏字幕 ≤ 18 个汉字；中英分屏数一致；
  4. speak 列不出现阿拉伯数字和符号（= [ ] + − ×）；
  5. speak 总字数（汉字、字母各算 1），按 speed 1.0（3.86 字/秒）和 1.1（4.25 字/秒）估各镜起止和全片时长。
附加（只报告，不算失败）：整份 脚本.md 正文里的中英空格命中数。
"""
from __future__ import annotations

import re
from pathlib import Path

MD = Path(__file__).resolve().parent.parent / "脚本.md"

SPACE_RE = re.compile(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef] +[A-Za-z0-9]|[A-Za-z0-9] +[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]")
BANNED = ["综上", "总体而言", "值得注意的是", "强烈建议", "显著", "全面", "有力", "深入", "却", "反而", "竟",
          "顺手", "硬是", "干脆", "说白了", "说到底", "就完事了"]
HAN = re.compile(r"[\u4e00-\u9fff]")
UNIT = re.compile(r"[\u4e00-\u9fff]|[A-Za-z]|[0-9]")
SPEAK_BAD = re.compile(r"[0-9=\[\]+−×]")

RATES = [("speed 1.0（3.86字/秒）", 3.86), ("speed 1.1（4.25字/秒）", 3.86 * 1.1)]
HEAD, GAP, TAIL = 0.5, 0.3, 2.5


def main() -> None:
    text = MD.read_text(encoding="utf-8")
    rows = []          # (shot, kind, id, speak, sub, en, pause_sec)
    shot = "?"
    shot_titles = {}
    for line in text.splitlines():
        m = re.match(r"^### (第(\d+)镜[^（(]*)", line)
        if m:
            shot = m.group(2)
            shot_titles[shot] = m.group(1).strip()
            continue
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 4:
            continue
        if re.fullmatch(r"s\d+[a-z]", cells[0]):
            rows.append((shot, "say", cells[0], cells[1], cells[2], cells[3], 0.0))
        elif cells[0] == "⏸":
            mm = re.search(r"停([\d.]+)秒", cells[1])
            rows.append((shot, "pause", "⏸", cells[1], "", "", float(mm.group(1)) if mm else 0.0))

    says = [r for r in rows if r[1] == "say"]
    fails = []

    print("1. 中文字幕中英空格（正则零命中）")
    hits = []
    for r in says:
        for scr in r[4].split(" / "):
            for mm in SPACE_RE.finditer(scr):
                hits.append(f"{r[2]}: …{scr[max(0, mm.start() - 4): mm.end() + 4]}…")
    print(f"   命中 {len(hits)} 处", *("   " + h for h in hits), sep="\n" if hits else "")
    if hits:
        fails.append("中英空格")

    print("2. 禁用词（speak + 中文字幕）")
    bw = []
    for r in says:
        for w in BANNED:
            for col, name in ((r[3], "speak"), (r[4], "字幕")):
                if w in col:
                    bw.append(f"{r[2]} {name}: {w}")
    print(f"   命中 {len(bw)} 处", *("   " + h for h in bw), sep="\n" if bw else "")
    if bw:
        fails.append("禁用词")

    print("3. 每屏字幕 ≤ 18 汉字；中英分屏数一致")
    over, mismatch, max_han, n_screens = [], [], 0, 0
    for r in says:
        zh = r[4].split(" / ")
        en = r[5].split(" / ")
        n_screens += len(zh)
        for scr in zh:
            h = len(HAN.findall(scr))
            max_han = max(max_han, h)
            if h > 18:
                over.append(f"{r[2]}: {scr}（{h} 字）")
        if len(zh) != len(en):
            mismatch.append(f"{r[2]}: 中 {len(zh)} 屏 / 英 {len(en)} 屏")
    print(f"   共 {n_screens} 屏，单屏最多 {max_han} 个汉字；超 18 的 {len(over)} 屏；中英分屏数不一致 {len(mismatch)} 条")
    for x in over + mismatch:
        print("   " + x)
    if over or mismatch:
        fails.append("字幕分屏")

    print("4. speak 列不含阿拉伯数字 / 符号")
    sb = [f"{r[2]}: {''.join(SPEAK_BAD.findall(r[3]))}" for r in says if SPEAK_BAD.search(r[3])]
    print(f"   命中 {len(sb)} 条", *("   " + h for h in sb), sep="\n" if sb else "")
    if sb:
        fails.append("speak 符号")

    print("5. 旁白字数与时长估计")
    total_u = sum(len(UNIT.findall(r[3])) for r in says)
    pauses = sum(r[6] for r in rows if r[1] == "pause")
    gaps = HEAD + GAP * (len(says) - 1) + TAIL + pauses
    print(f"   旁白 {len(says)} 条，共 {total_u} 字（汉字、字母各算 1）；"
          f"停顿 {gaps:.1f} 秒（片头 {HEAD}、条间 {GAP}×{len(says) - 1}、显式停顿 {pauses:.1f}、片尾 {TAIL}）")
    for label, rate in RATES:
        t = HEAD
        first = True
        shot_span = {}
        for r in rows:
            if r[1] == "say":
                if not first:
                    t += GAP
                first = False
                s0 = t
                t += len(UNIT.findall(r[3])) / rate
                a, b = shot_span.get(r[0], (s0, t))
                shot_span[r[0]] = (min(a, s0), t)
            else:
                t += r[6]
                a, b = shot_span.get(r[0], (t, t))
                shot_span[r[0]] = (a, t)
        t += TAIL
        print(f"   {label}：旁白 {total_u / rate:5.1f} 秒，全片约 {t:5.1f} 秒（{int(t // 60)}:{t % 60:04.1f}）")
        for k in sorted(shot_span, key=int):
            a, b = shot_span[k]
            print(f"      第{k}镜 {int(a // 60)}:{a % 60:04.1f}–{int(b // 60)}:{b % 60:04.1f}（{b - a:4.1f} 秒）{shot_titles.get(k, '')}")
    for r in says:
        u = len(UNIT.findall(r[3]))
        print(f"      {r[2]:4s} {u:3d} 字  {u / 3.86:4.1f} / {u / (3.86 * 1.1):4.1f} 秒")

    allhits = len(SPACE_RE.findall(text))
    print(f"附加：整份 脚本.md 中英空格命中 {allhits} 处（只报告）")

    print()
    print("全部 OK" if not fails else f"不通过：{fails}")


if __name__ == "__main__":
    main()
