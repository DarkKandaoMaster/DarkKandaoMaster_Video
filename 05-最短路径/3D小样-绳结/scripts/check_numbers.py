"""绳结模型小样的全部数字：图、Dijkstra 结果、绳结运动学自检，输出给画面用的 TS。

    & $PY scripts/check_numbers.py          # 在工程目录里跑（打印中文要先设 PYTHONIOENCODING=utf-8）

做的事：
1. Dijkstra（教材写法：每次锁定 dist 最小的未锁定顶点，再松弛它的邻居），记下每一步的松弛事件；
2. 用 Bellman-Ford 和"枚举所有简单路径"两种暴力方法核对 dist；
3. 检查题目要求：dist 互不相同（锁定顺序无歧义）、至少一次"先找到较长、后更新为更短"、
   至少一条边不在最短路径树上，且不在树上的边都有余量（|dist[u]-dist[v]| < w，不会被拉直）；
4. 按画面用的同一套运动学公式（见 src/dijkstra-rope/kinematics.ts）从 H=0 扫到 H=H_END：
   树边离桌高度、非树边是否始终松弛（3D 距离 < 绳长）、珠子之间会不会穿模；
5. 写出 src/dijkstra-rope/data.generated.ts 和 scripts/out/numbers.json。画面里的数字一律以这里为准。
"""
from __future__ import annotations

import heapq
import itertools
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INF = math.inf

# ───────────── 图（教材记号 v0…v6，源点 v0） ─────────────
NAMES = ["v0", "v1", "v2", "v3", "v4", "v5", "v6"]
EDGES = [  # (u, v, 权)
    (0, 2, 3),
    (2, 1, 2),
    (0, 4, 7),
    (1, 3, 4),
    (4, 6, 4),
    (3, 5, 4),
    (0, 1, 6),
    (2, 3, 8),
    (4, 3, 4),
    (6, 5, 4),
]
SRC = 0

# ───────────── 3D 布局（世界单位；桌面 y=0，x 向右，z 朝镜头） ─────────────
S = 0.45  # 1 个权值单位 = 0.45 世界单位（绳长 = 权 × S）
R = 0.18  # 珠子半径
# 桌面上的位置，以"权值单位"给（乘 S 得世界坐标）。每条边在桌面上的直线距离都明显短于绳长，绳子是松的。
TABLE_W = {
    0: (0.0, 0.0),
    2: (2.2, -1.0),
    1: (2.9, 0.4),
    4: (2.0, 4.0),
    3: (5.0, 2.4),
    6: (4.0, 6.2),
    5: (6.2, 3.6),
}
# 挂起来以后相对父结点的水平偏移（世界单位）：主链 v0-v2-v1-v3-v5 竖直，v4-v6 那一支往 +x 错开 0.6，
# 侧视时两支不重叠；没绷直的绳子往 -x（卷尺那侧）弯，卷尺放得更远（TAPE_DX），也不和树边重叠。
# 往 -x 错开不行：v4、v6 会被拖离 v3、v5，非树边被拉过绳长（脚本扫 H 时查出来的）。
OFFSET = {4: (0.6, 0.0)}
H_END = 14.0  # 最后提到的高度（权值单位），比最大 dist 13 多一点


def dijkstra(n: int, adj: dict[int, list[tuple[int, int]]], src: int):
    dist = [INF] * n
    prev = [-1] * n
    done = [False] * n
    dist[src] = 0
    steps = []
    for _ in range(n):
        u = min((i for i in range(n) if not done[i]), key=lambda i: dist[i])
        cand = sorted(dist[i] for i in range(n) if not done[i])
        assert len(cand) < 2 or cand[0] < cand[1], f"锁定 {NAMES[u]} 时有并列最小值 {cand[:2]}"
        done[u] = True
        ups = []
        for v, w in sorted(adj[u]):
            if done[v]:
                continue
            nd = dist[u] + w
            if nd < dist[v]:
                ups.append({"v": v, "old": None if dist[v] == INF else dist[v], "new": nd})
                dist[v] = nd
                prev[v] = u
        steps.append({"lock": u, "dist": dist[u], "updates": ups})
    return dist, prev, steps


def bellman_ford(n, edges, src):
    d = [INF] * n
    d[src] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            d[v] = min(d[v], d[u] + w)
            d[u] = min(d[u], d[v] + w)
    return d


def brute_paths(n, adj, src):
    best = [INF] * n
    best[src] = 0

    def go(u, seen, acc):
        for v, w in adj[u]:
            if v in seen:
                continue
            if acc + w < best[v]:
                best[v] = acc + w
            go(v, seen | {v}, acc + w)

    go(src, {src}, 0)
    return best


# ───────────── 运动学（与 kinematics.ts 同一套公式） ─────────────
def table_pos(i):
    x, z = TABLE_W[i]
    return (x * S, z * S)


def positions(H, dist, prev, wmap):
    """提升高度 H（权值单位）时每颗珠子中心的 3D 位置。按 dist 从小到大算（父先于子）。"""
    order = sorted(range(len(NAMES)), key=lambda i: dist[i])
    P = {}
    for v in order:
        h = max(0.0, H - dist[v]) * S
        if v == SRC:
            x, z = table_pos(v)
            P[v] = (x, R + h, z)
            continue
        p = prev[v]
        px, py, pz = P[p]
        hp = py - R
        o = OFFSET.get(v, (0.0, 0.0))
        ax, az = px + o[0], pz + o[1]
        if H >= dist[v]:
            P[v] = (ax, R + h, az)
            continue
        L = wmap[(p, v)] * S
        r = math.sqrt(max(0.0, L * L - hp * hp))
        tx, tz = table_pos(v)
        dx, dz = tx - ax, tz - az
        R0 = math.hypot(dx, dz)
        k = min(R0, r) / R0 if R0 > 1e-9 else 0.0
        P[v] = (ax + dx * k, R, az + dz * k)
    return P


def main() -> int:
    n = len(NAMES)
    adj: dict[int, list[tuple[int, int]]] = {i: [] for i in range(n)}
    wmap = {}
    for u, v, w in EDGES:
        adj[u].append((v, w))
        adj[v].append((u, w))
        wmap[(u, v)] = wmap[(v, u)] = w
    assert len(wmap) == 2 * len(EDGES), "有重边"

    dist, prev, steps = dijkstra(n, adj, SRC)
    assert dist == bellman_ford(n, EDGES, SRC), "Bellman-Ford 不一致"
    assert dist == brute_paths(n, adj, SRC), "枚举路径不一致"
    assert len(set(dist)) == n, f"dist 有并列：{dist}"
    order = [s["lock"] for s in steps]
    assert order == sorted(range(n), key=lambda i: dist[i])

    relax_better = [(NAMES[u["v"]], u["old"], u["new"]) for s in steps for u in s["updates"] if u["old"] is not None]
    assert relax_better, "没有'先长后短'的更新"

    tree = {(prev[v], v) for v in range(n) if prev[v] >= 0}
    edges_out = []
    for u, v, w in EDGES:
        is_tree = (u, v) in tree or (v, u) in tree
        slack = w - abs(dist[u] - dist[v])
        if is_tree:
            assert slack == 0
        else:
            assert slack > 0, f"非树边 {NAMES[u]}-{NAMES[v]} 余量为 0（另一条等长最短路）"
        edges_out.append({"u": u, "v": v, "w": w, "tree": is_tree, "slack": slack})
    assert any(not e["tree"] for e in edges_out)

    # 桌面初始：每条边直线距离 < 绳长（松的）
    table_ratio = {}
    for u, v, w in EDGES:
        (x1, z1), (x2, z2) = table_pos(u), table_pos(v)
        table_ratio[f"{NAMES[u]}-{NAMES[v]}"] = round(math.hypot(x1 - x2, z1 - z2) / (w * S), 3)
    assert max(table_ratio.values()) < 0.95, table_ratio

    # 扫 H：离桌时刻、非树边始终松、珠子不穿模
    worst_nontree = 0.0
    worst_tree = 0.0
    min_gap = INF
    lift_at = {}
    steps_n = 5800
    for k in range(steps_n + 1):
        H = H_END * k / steps_n
        P = positions(H, dist, prev, wmap)
        for v in range(n):
            if v not in lift_at and P[v][1] > R + 1e-9:
                lift_at[v] = H
        for e in edges_out:
            a, b = P[e["u"]], P[e["v"]]
            D = math.dist(a, b) / (e["w"] * S)
            if e["tree"]:
                worst_tree = max(worst_tree, D)
            else:
                worst_nontree = max(worst_nontree, D)
        for i, j in itertools.combinations(range(n), 2):
            min_gap = min(min_gap, math.dist(P[i], P[j]) - 2 * R)
    for v in range(n):
        if v != SRC:
            assert abs(lift_at[v] - dist[v]) < H_END / steps_n * 1.01, (NAMES[v], lift_at[v], dist[v])
    assert worst_nontree < 0.97, f"非树边被拉得太直：{worst_nontree:.3f}"
    assert min_gap > 0.05, f"珠子穿模：{min_gap:.3f}"

    final = positions(H_END, dist, prev, wmap)

    out = {
        "names": NAMES,
        "src": SRC,
        "S": S,
        "R": R,
        "H_END": H_END,
        "table": [table_pos(i) for i in range(n)],
        "offset": [OFFSET.get(i, (0.0, 0.0)) for i in range(n)],
        "edges": edges_out,
        "dist": dist,
        "prev": prev,
        "order": order,
        "steps": steps,
    }
    (ROOT / "scripts" / "out").mkdir(parents=True, exist_ok=True)
    (ROOT / "scripts" / "out" / "numbers.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    ts = (
        "// 由 scripts/check_numbers.py 生成，不要手改。画面里的数字一律以这里为准。\n"
        f"export const DATA = {json.dumps(out, ensure_ascii=False)} as const;\n"
    )
    (ROOT / "src" / "dijkstra-rope" / "data.generated.ts").write_text(ts, encoding="utf-8")

    print("顶点  dist  前驱  锁定次序")
    for rank, v in enumerate(order):
        print(f"{NAMES[v]:>4}  {dist[v]:>4}  {NAMES[prev[v]] if prev[v] >= 0 else '-':>4}  {rank + 1}")
    print("锁定顺序：", " → ".join(NAMES[v] for v in order))
    print("每一步松弛：")
    for s in steps:
        ups = "，".join(
            f"{NAMES[u['v']]}: {'∞' if u['old'] is None else u['old']}→{u['new']}" for u in s["updates"]
        ) or "（无）"
        print(f"  锁定 {NAMES[s['lock']]}（{s['dist']}）  {ups}")
    print("先长后短的更新：", relax_better)
    print("边：")
    for e in edges_out:
        tag = "树边（绷直）" if e["tree"] else f"非树边（松，余量 {e['slack']}）"
        print(f"  {NAMES[e['u']]}-{NAMES[e['v']]}  w={e['w']}  {tag}")
    print("桌面上 直线距离/绳长：", table_ratio)
    print(f"扫 H：非树边 3D 距离/绳长 最大 {worst_nontree:.3f}（<0.97 才算看得出松）；"
          f"树边最大 {worst_tree:.3f}（>1 是挂起后水平偏移带来的，偏移见 OFFSET）；珠子最小间隙 {min_gap:.3f}")
    print("离桌时的 H：", {NAMES[v]: round(h, 3) for v, h in sorted(lift_at.items(), key=lambda t: t[1])})
    print("H_END 时珠子高度（世界单位，珠心）：", {NAMES[v]: round(final[v][1], 3) for v in order})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
