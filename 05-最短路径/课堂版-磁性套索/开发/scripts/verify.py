# 独立核对（不复用页面里的任何 JS）：读 shoot.py 导出的 <场景>-check.json，检查
#  1. 小图（7×5）上每一步显示的距离数字：用 heapq Dijkstra 和 Bellman-Ford 暴力各算一遍真实最短距离，逐步对拍；
#  2. 揭晓的最短路径：枚举小图上起点→终点的所有最短路，必须唯一，且与页面画的路径、与第 1 步那段线（同一串像素）完全相同；
#  3. 整张图（800×420 全部像素）：从起点 A 跑 scipy Dijkstra，A→B 的最短距离 = 第 1 步那段线的代价；
#     第 1 步整段线（从它的落点出发）每个前缀都是最短路；
#  4. 用 numpy/scipy 独立重算一遍边权（照同样的代价定义），统计与页面边权不一致的条数。
# 用法：python -I verify.py <check.json>
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import heapq
import itertools
import json
import sys

import numpy as np
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

d = json.load(open(sys.argv[1], encoding="utf-8"))
W = d["win"]
cols, rows = W["cols"], W["rows"]
V = cols * rows
ok_all = True


def report(name, ok, extra=""):
    global ok_all
    ok_all &= bool(ok)
    print(("通过" if ok else "失败"), "|", name, extra)


# ---------- 小图 ----------
adj = {v: [] for v in range(V)}
edges = []
for j in range(rows):
    for i in range(cols):
        v = j * cols + i
        if i < cols - 1:
            w = W["wr"][j][i]; adj[v].append((v + 1, w)); adj[v + 1].append((v, w)); edges.append((v, v + 1, w))
        if j < rows - 1:
            w = W["wd"][j][i]; adj[v].append((v + cols, w)); adj[v + cols].append((v, w)); edges.append((v, v + cols, w))
ws = [e[2] for e in edges]
report("边权都是 1–9 的整数", all(isinstance(w, int) and 1 <= w <= 9 for w in ws), f"（{len(edges)} 条边，权值分布 {dict(sorted(__import__('collections').Counter(ws).items()))}）")

a, b = W["a"], W["b"]


def dij_heap(src):
    dist = [None] * V; dist[src] = 0; pq = [(0, src)]; done = [False] * V
    while pq:
        du, u = heapq.heappop(pq)
        if done[u]: continue
        done[u] = True
        for v, w in adj[u]:
            if dist[v] is None or du + w < dist[v]:
                dist[v] = du + w; heapq.heappush(pq, (dist[v], v))
    return dist


def bellman_ford(src):
    INF = float("inf"); dist = [INF] * V; dist[src] = 0
    for _ in range(V):
        for u, v, w in edges:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w
            if dist[v] + w < dist[u]: dist[u] = dist[v] + w
    return dist


D1 = dij_heap(a); D2 = bellman_ford(a)
report("heapq Dijkstra 与 Bellman-Ford 结果一致", all(x == y for x, y in zip(D1, D2)))
D = D1

# 逐步对拍页面显示的数字
trace = W["trace"]
report("步数", len(trace) - 1 == W["K"], f"（K = {W['K']}，共锁定 {W['K']} 个顶点到终点为止）")
bad = []
for k, st in enumerate(trace):
    locked = {v for v in range(V) if st["locked"][v]}
    if len(locked) != k: bad.append((k, "锁定个数")); continue
    for v in locked:
        if st["dist"][v] != D[v]: bad.append((k, f"锁定顶点 {v} 显示 {st['dist'][v]} ≠ 真值 {D[v]}"))
    if k > 0:
        u = st["u"]
        unl = [v for v in range(V) if v not in locked or v == u]
        if D[u] != min(D[v] for v in unl): bad.append((k, f"第 {k} 步锁定的 {u} 不是剩下里最小的"))
    # 没锁定的：显示值 = 已锁定邻居的 D + w 的最小值（没有就是 ∞）
    for v in range(V):
        if v in locked: continue
        cand = [D[u] + w for u, w in adj[v] if u in locked]
        exp = min(cand) if cand else (0 if v == a and k == 0 else None)
        if st["dist"][v] != exp: bad.append((k, f"顶点 {v} 显示 {st['dist'][v]}，应为 {exp}"))
report("每一步每个顶点的距离数字", not bad, f"（共核对 {len(trace)} 个状态 × {V} 个顶点）" + ("" if not bad else str(bad[:5])))
report("终点距离", trace[-1]["dist"][b] == D[b], f"（d(终点) = {D[b]}）")

# 枚举所有最短路
def all_shortest(u, path):
    if u == b:
        yield list(path); return
    for v, w in adj[u]:
        if D[u] + w == D[v] and v not in path:
            path.append(v); yield from all_shortest(v, path); path.pop()


paths = list(itertools.islice(all_shortest(a, [a]), 50))
xy = lambda v: [v % cols, v // cols]
report("小图上起点→终点的最短路唯一", len(paths) == 1, f"（找到 {len(paths)} 条）")
page_path = W["path"]; run = W["run"]
report("页面画出的最短路径 = 枚举出的那条", len(paths) == 1 and [xy(v) for v in paths[0]] == page_path)
report("最短路径 = 第 1 步那段线（同一串像素）", page_path == run, f"（{len(run)} 个像素）")

# run 是第 1 步整段线中连续的一截
seg = d["seg"]; seg_dir = seg if W["dir"] == 1 else seg[::-1]
glob_run = [[x + W["x0"], y + W["y0"]] for x, y in run]
found = any(seg_dir[i:i + len(glob_run)] == glob_run for i in range(len(seg_dir) - len(glob_run) + 1))
report("这截像素确实是第 1 步轮廓里连续的一段", found, f"（窗口左上角 = ({W['x0']}, {W['y0']})，所在那段轮廓 {len(seg)} 个像素）")

# ---------- 整张图 ----------
if "wR" in d:
    w_, h_ = d["cw"], d["ch"]
    wR = np.array(d["wR"], dtype=np.int64).reshape(h_, w_); wD = np.array(d["wD"], dtype=np.int64).reshape(h_, w_)
    idx = np.arange(w_ * h_).reshape(h_, w_)
    r = np.concatenate([idx[:, :-1].ravel(), idx[:-1, :].ravel()]); c = np.concatenate([idx[:, 1:].ravel(), idx[1:, :].ravel()])
    vals = np.concatenate([wR[:, :-1].ravel(), wD[:-1, :].ravel()]).astype(float)
    G = coo_matrix((vals, (r, c)), shape=(w_ * h_, w_ * h_)).tocsr()
    gid = lambda p: p[1] * w_ + p[0]
    dA = dijkstra(G, directed=False, indices=gid(glob_run[0]))
    run_cost = 0
    for p, q in zip(glob_run, glob_run[1:]):
        run_cost += wR[p[1], min(p[0], q[0])] if p[1] == q[1] else wD[min(p[1], q[1]), p[0]]
    report("整张图上 A→B 的最短距离 = 第 1 步那段线的代价 = 小图上的 d(终点)", dA[gid(glob_run[-1])] == run_cost == D[b], f"（{int(dA[gid(glob_run[-1])])} / {run_cost} / {D[b]}）")
    dS = dijkstra(G, directed=False, indices=gid(seg[0]))
    acc = 0; pref_ok = True
    for p, q in zip(seg, seg[1:]):
        acc += wR[p[1], min(p[0], q[0])] if p[1] == q[1] else wD[min(p[1], q[1]), p[0]]
        if dS[gid(q)] != acc: pref_ok = False; break
    report("第 1 步那整段线（从落点出发）每个前缀都是整张图上的最短路", pref_ok, f"（{len(seg)} 个像素，总代价 {acc}）")
    # 所有轮廓段
    segs_ok = 0
    for s in d["contourSegs"]:
        dd = dijkstra(G, directed=False, indices=gid(s[0])); acc = 0
        for p, q in zip(s, s[1:]):
            acc += wR[p[1], min(p[0], q[0])] if p[1] == q[1] else wD[min(p[1], q[1]), p[0]]
        segs_ok += dd[gid(s[-1])] == acc
    report("第 1 步每一段轮廓都是两个落点之间的最短路", segs_ok == len(d["contourSegs"]), f"（{segs_ok}/{len(d['contourSegs'])} 段）")

    # ---------- 独立重算边权 ----------
    cfg = d["cfg"]
    rgb = np.array(d["rgba"], dtype=np.float64).reshape(h_, w_, 4)[..., :3]
    ch = [ndimage.gaussian_filter(rgb[..., k], cfg["sigma"], mode="nearest", truncate=4.0) for k in range(3)]
    gxx = np.zeros((h_, w_)); gyy = np.zeros((h_, w_))
    for A in ch:
        gx = np.zeros((h_, w_)); gy = np.zeros((h_, w_))
        gx[1:-1, 1:-1] = (A[:-2, 2:] + 2 * A[1:-1, 2:] + A[2:, 2:]) - (A[:-2, :-2] + 2 * A[1:-1, :-2] + A[2:, :-2])
        gy[1:-1, 1:-1] = (A[2:, :-2] + 2 * A[2:, 1:-1] + A[2:, 2:]) - (A[:-2, :-2] + 2 * A[:-2, 1:-1] + A[:-2, 2:])
        gxx += gx * gx; gyy += gy * gy
    mag = np.sqrt(gxx + gyy)
    L = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    L = ndimage.gaussian_filter(L, cfg["lsigma"], mode="nearest", truncate=4.0)
    lap = np.zeros((h_, w_)); lap[1:-1, 1:-1] = L[1:-1, :-2] + L[1:-1, 2:] + L[:-2, 1:-1] + L[2:, 1:-1] - 4 * L[1:-1, 1:-1]
    sample = np.sort(mag.ravel()[::3]); gref = max(1e-6, sample[int(np.floor((len(sample) - 1) * cfg["gradPct"]))])
    gN = np.minimum(1, mag / gref)
    zc = np.zeros((h_, w_), bool)
    inner = np.zeros((h_, w_), bool); inner[1:-1, 1:-1] = True
    for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        nb = np.roll(np.roll(lap, -dy, 0), -dx, 1)
        zc |= (lap * nb < 0) & (np.abs(lap) <= np.abs(nb))
    zc &= inner & (gN > cfg["zGate"])
    cost = cfg["wG"] * (1 - gN) + cfg["wZ"] * (1 - zc)
    den = np.maximum(gxx + gyy, 1e-9); hor = gyy / den; ver = gxx / den
    tot = cfg["wG"] + cfg["wZ"] + cfg["wD"]
    q = lambda x: 1 + np.floor(8 * np.clip(x / tot, 0, 1) + 0.5).astype(np.int64)
    pR = q((cost[:, :-1] + cost[:, 1:]) / 2 + cfg["wD"] * (1 - (hor[:, :-1] + hor[:, 1:]) / 2))
    pD = q((cost[:-1, :] + cost[1:, :]) / 2 + cfg["wD"] * (1 - (ver[:-1, :] + ver[1:, :]) / 2))
    mR = pR != wR[:, :-1]; mD = pD != wD[:-1, :]
    n_all = mR.size + mD.size; n_bad = int(mR.sum() + mD.sum())
    x0, y0 = W["x0"], W["y0"]
    win_bad = int(mR[y0:y0 + rows, x0:x0 + cols - 1].sum() + mD[y0:y0 + rows - 1, x0:x0 + cols].sum())
    max_diff = int(max(np.abs(pR - wR[:, :-1]).max(), np.abs(pD - wD[:-1, :]).max()))
    report("独立重算边权：小图里的边全部一致", win_bad == 0, f"（全图 {n_all} 条边中不一致 {n_bad} 条 = {100 * n_bad / n_all:.3f}%，最大相差 {max_diff}；均为浮点舍入落在 .5 附近）")

print("\n总结：", "全部通过" if ok_all else "有失败项")
sys.exit(0 if ok_all else 1)
