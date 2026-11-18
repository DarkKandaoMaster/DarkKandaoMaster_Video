# -*- coding: utf-8 -*-
r"""核对《迪杰斯特拉算法》字幕里的数字。

用法（在任意目录）：
    $env:PYTHONIOENCODING="utf-8"
    & D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe -I scripts\check_numbers.py [字幕文件]

做三件事：
1. 用导航演示 README 里的 8 个顶点、9 条边独立跑一遍迪杰斯特拉（朴素 O(n^2)，起点 G，终点 C），
   记下每一轮锁定谁、改了哪些 dist / path，并枚举所有简单路径核对最短路唯一、第二短 300。
2. 把字幕里每一句带数字的说法对应到上面算出的结果，逐条断言。
3. 抽出字幕正文里出现的全部数字，检查都在"允许出现的数字"集合里；统计字数、估算时长。
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SUB = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "字幕-v1.md"

# 导航演示 README「路网」表的显示值（米）
EDGES = [
    ("H", "F", 210), ("F", "C", 180), ("C", "A", 100), ("F", "E", 130), ("F", "G", 120),
    ("G", "D", 130), ("C", "B", 80), ("A", "B", 170), ("B", "D", 70),
]
V = sorted({x for e in EDGES for x in e[:2]})
W = {}
for a, b, w in EDGES:
    W[(a, b)] = W[(b, a)] = w
NB = {v: sorted(u for (x, u) in W if x == v) for v in V}
INF = float("inf")
SRC, DST = "G", "C"

fails = []


def check(cond, msg):
    print(("  ok  " if cond else "  FAIL ") + msg)
    if not cond:
        fails.append(msg)


# ---------- 1. 迪杰斯特拉（带过程记录） ----------
dist = {v: INF for v in V}
path = {v: None for v in V}
dist[SRC] = 0
S = {SRC}
for u in NB[SRC]:
    dist[u], path[u] = W[(SRC, u)], SRC
init = dict(dist)
rounds = []  # (锁定点, 锁定时 dist, [(邻居, 旧值, 新值)])
stop_round = None
while len(S) < len(V):
    cand = [v for v in V if v not in S and dist[v] < INF]
    m = min(dist[v] for v in cand)
    ties = [v for v in cand if dist[v] == m]
    assert len(ties) == 1, f"同距离平局 {ties}"
    u = ties[0]
    S.add(u)
    ups = []
    for v in NB[u]:
        if v in S:
            continue
        nd = dist[u] + W[(u, v)]
        if nd < dist[v]:
            ups.append((v, dist[v], nd))
            dist[v], path[v] = nd, u
    rounds.append((u, dist[u], ups))
    if u == DST and stop_round is None:
        stop_round = len(rounds)

print("过程（起点 G）：")
print("  初始化：", {v: init[v] for v in V if init[v] < INF})
for i, (u, d, ups) in enumerate(rounds, 1):
    print(f"  第{i}轮 锁定 {u}({d})  更新：", ", ".join(f"{v}:{o}->{n}" for v, o, n in ups) or "无")
print("  终点 C 在第", stop_round, "轮锁定")

# 倒推路径
chain = [DST]
while chain[-1] != SRC:
    chain.append(path[chain[-1]])
route = chain[::-1]

# 枚举简单路径
all_paths = []


def dfs(v, seen, length, p):
    if v == DST:
        all_paths.append((length, p[:]))
        return
    for u in NB[v]:
        if u not in seen:
            seen.add(u); p.append(u)
            dfs(u, seen, length + W[(v, u)], p)
            p.pop(); seen.remove(u)


dfs(SRC, {SRC}, 0, [SRC])
all_paths.sort()

# ---------- 2. 逐句核对字幕里的说法 ----------
print("\n字幕里的说法：")
check(len(V) == 8 and len(EDGES) == 9, "图有 8 个顶点、9 条边")
check(init["D"] == 130 and init["F"] == 120 and sorted(v for v in V if init[v] < INF and v != SRC) == ["D", "F"],
      "一开始只有 G 的两个邻居有路：D 130、F 120，其余无穷大")
r1, r2, r3, r4, r5 = rounds[:5]
check(r1[0] == "F" and r1[1] == 120, "第一轮锁定 F，120")
up1 = {v: n for v, o, n in r1[2]}
check(up1.get("C") == 300 and 120 + W[("F", "C")] == 300, "到 32 号楼 C：120 + 180 = 300（经 F，沿明达路）")
check(up1.get("E") == 250, "到北门 E：250")
check(up1.get("H") == 330, "到和润楼 H：330")
check(r2[0] == "D" and r2[1] == 130, "第二轮锁定 D，130")
up2 = {v: n for v, o, n in r2[2]}
check(up2.get("B") == 200 and 130 + W[("D", "B")] == 200, "从 D 到 B：130 + 70 = 200")
check(r3[0] == "B" and r3[1] == 200, "第三轮锁定 B，200")
up3 = {v: (o, n) for v, o, n in r3[2]}
check(up3.get("C") == (300, 280) and 200 + W[("B", "C")] == 280, "32 号楼：200 + 80 = 280 < 300，改成 280，path 改成 B")
check(path["C"] == "B", "C 最终 path = B")
check(r4[0] == "E" and r4[1] == 250 and 250 < 280, "第四轮锁定北门 E（250 < 280）")
check(r5[0] == "C" and r5[1] == 280 and stop_round == 5, "第五轮锁定 32 号楼 C（280），终点确定")
check(route == ["G", "D", "B", "C"], f"倒推：C←B←D←G，正向 {'→'.join(route)}")
check(sum(W[(a, b)] for a, b in zip(route, route[1:])) == 280 == dist["C"], "路线 G→D→B→C 一共 280 米 = dist[C]")
check(all_paths[0][0] == 280 and all_paths[1][0] > 280, "最短路唯一（280）")
check(all_paths[1] == (300, ["G", "F", "C"]), f"第二短 = 300，经 F 沿梁希路、明达路：{all_paths[1]}")
check(W[("G", "F")] == 120 and W[("F", "C")] == 180, "梁希路南段 G–F 120、明达路 F–C 180")
check(all(w >= 0 for *_, w in EDGES), "边长都非负")
check(len(chain) - 1 == 3, "路线经过 3 条边")

# ---------- 3. 字幕里出现的数字 + 字数 ----------
text = SUB.read_text(encoding="utf-8")
lines = text.splitlines()
body = [ln for ln in lines[1:] if ln.strip() and not ln.startswith("总字数")]
body_text = "\n".join(body)
nums = sorted({int(x) for x in re.findall(r"\d+", body_text)})
allowed = {32, 120, 130, 70, 180, 80, 200, 250, 280, 300, 330}
print("\n字幕正文里的数字：", nums)
check(set(nums) <= allowed, f"字幕数字都在核对过的集合里（多出：{sorted(set(nums) - allowed)}）")

# 禁用词（zh-deai-rewrite）
banned = ["综上", "总体而言", "值得注意的是", "强烈建议", "显著", "全面", "有力", "深入", "却", "反而", "竟", "顺手", "硬是", "干脆", "说白了"]
hit = [b for b in banned if b in body_text]
check(not hit, f"去 AI 味禁用词零命中（命中：{hit}）")
sp = re.findall(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef] +[A-Za-z0-9]|[A-Za-z0-9] +[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]", body_text)
check(not sp, f"中英 / 数字之间无空格（命中：{sp}）")

no_ws = re.sub(r"\s", "", body_text)
no_punct = re.sub(r"[，。、；：？！“”‘’（）《》—…·,.;:?!()\"'-]", "", no_ws)
secs = len(no_ws) / 240 * 60
print(f"\n正文 {len(body)} 段；含标点 {len(no_ws)} 字，不含标点 {len(no_punct)} 字")
print(f"按 240 字/分钟（含标点）估算约 {int(secs // 60)} 分 {int(round(secs % 60)):02d} 秒")

print("\n结果：", "全部通过" if not fails else f"{len(fails)} 项失败")
sys.exit(1 if fails else 0)
