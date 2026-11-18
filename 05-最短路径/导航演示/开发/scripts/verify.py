# 独立核对（不复用页面里的 JS）：
#   1. 路网：显示权值都是 10 的倍数，和实测（总平面图）差 ≤ 10%；
#   2. heapq Dijkstra 与 Bellman-Ford 全源结果一致；枚举简单路径，检查每一对楼之间最短路是否唯一；
#   3. 页面导出的每一步状态（截图时导出的默认起终点 + test_interact.py 导出的全部楼对）：
#      锁定顺序 = 每次取 dist 最小（且没有同距离）；已锁定的 dist = 真实最短距离；
#      未锁定的 dist = 已锁定顶点（终点除外）+ 边长 的最小值，没有则 ∞；path（前驱）给出的值一致；
#      "改小"记录与前后两步的数字一致；终点锁定就停；
#   4. 第 1 步导航的蓝线 = 迪杰斯特拉的最短路径 = 枚举出的唯一最短路；"全程 xxx 米" = dist[终点]；
#      蓝线的折线 = 路径上各条边的道路折线首尾相接（揭晓时画的就是同一条）。
# 用法：python -I verify.py        输出：开发/核对结果.txt
import sys; sys.stdout.reconfigure(encoding="utf-8")
import heapq
import json
import math
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
NET = json.loads((DEV / "data" / "network.json").read_text(encoding="utf-8"))
SHOT = DEV / "截图"
lines, fails = [], []


def check(name, cond, extra=""):
    s = ("通过" if cond else "失败") + " | " + name + (f" （{extra}）" if extra else "")
    print(s); lines.append(s)
    if not cond: fails.append(name)


def head(s):
    print("\n== " + s); lines.append("\n== " + s)


V = [v["id"] for v in NET["vertices"]]
LET = {v["id"]: v["letter"] for v in NET["vertices"]}
BLD = [v["id"] for v in NET["vertices"] if v["bld"]]
ADJ = {v: [] for v in V}
W = {}
for e in NET["edges"]:
    ADJ[e["u"]].append((e["v"], e["w"])); ADJ[e["v"]].append((e["u"], e["w"]))
    W[frozenset((e["u"], e["v"]))] = e["w"]


def dijkstra(s):
    dist = {v: math.inf for v in V}; dist[s] = 0; pq = [(0, s)]; done = set()
    while pq:
        d, u = heapq.heappop(pq)
        if u in done: continue
        done.add(u)
        for v, w in ADJ[u]:
            if d + w < dist[v]: dist[v] = d + w; heapq.heappush(pq, (dist[v], v))
    return dist


def bellman_ford(s):
    dist = {v: math.inf for v in V}; dist[s] = 0
    for _ in range(len(V) - 1):
        for e in NET["edges"]:
            a, b, w = e["u"], e["v"], e["w"]
            if dist[a] + w < dist[b]: dist[b] = dist[a] + w
            if dist[b] + w < dist[a]: dist[a] = dist[b] + w
    return dist


def simple_paths(s, t):
    out = []
    def dfs(u, seen, L, p):
        if u == t: out.append((L, p)); return
        for v, w in ADJ[u]:
            if v not in seen: dfs(v, seen | {v}, L + w, p + [v])
    dfs(s, {s}, 0, [s]); out.sort(key=lambda x: x[0]); return out


ALL = {s: dijkstra(s) for s in V}


def check_trace(data, tag):
    s, t = data["start"], data["end"]
    ids = [v["id"] for v in data["vertices"]]
    D = ALL[s]
    tr = data["trace"]
    ok_init = True
    st0 = tr[0]
    for i, v in enumerate(ids):
        want = 0 if v == s else (W.get(frozenset((s, v))))
        got = st0["dist"][i]
        if (want is None and got is not None) or (want is not None and got != want): ok_init = False
    ok_init &= st0["locked"][ids.index(s)] and sum(st0["locked"]) == 1
    check(f"{tag} 初始化：起点放进 S，邻居 dist = 边长，其余 ∞", ok_init)
    locked = {s}; bad = []; ties = []; decs_ok = True; ndec = 0
    for k in range(1, len(tr)):
        st, pv = tr[k], tr[k - 1]
        u = st["u"]
        # 每次取没锁定里 dist 最小的，且没有同距离
        cand = [(pv["dist"][i], v) for i, v in enumerate(ids) if not pv["locked"][i] and pv["dist"][i] is not None]
        m = min(c[0] for c in cand)
        if [v for d, v in cand if d == m] != [u]: ties.append((k, [v for d, v in cand if d == m]))
        if pv["dist"][ids.index(u)] != m: bad.append((k, "没选最小"))
        locked.add(u)
        for i, v in enumerate(ids):
            if st["locked"][i] != (v in locked): bad.append((k, v, "locked 不对"))
            if v in locked:
                if st["dist"][i] != D[v]: bad.append((k, v, "已锁定的 dist ≠ 真实最短距离", st["dist"][i], D[v]))
            else:
                offers = [(D[x] + W[frozenset((x, v))], x) for x in locked if x != t and frozenset((x, v)) in W]
                want = min(offers)[0] if offers else None
                if st["dist"][i] != want: bad.append((k, v, "未锁定的 dist 不对", st["dist"][i], want))
            p = st["pred"][i]
            if v != s and st["dist"][i] is not None:
                if p is None or (W.get(frozenset((p, v))) is None) or D[p] + W[frozenset((p, v))] != st["dist"][i]: bad.append((k, v, "path 不一致"))
        for q in st["dec"]:
            i = ids.index(q["v"]); ndec += 1
            if not (pv["dist"][i] == q["old"] and st["dist"][i] == q["nu"] and q["nu"] < q["old"]): decs_ok = False
        for i, v in enumerate(ids):  # 数字变小了就一定有"改小"记录
            if pv["dist"][i] is not None and st["dist"][i] is not None and st["dist"][i] < pv["dist"][i] and not any(q["v"] == v for q in st["dec"]): decs_ok = False
        if u == t and k != len(tr) - 1: bad.append((k, "终点锁定后没停"))
    check(f"{tag} 每一步的 dist / path / 锁定（{len(tr)} 个状态 × {len(ids)} 个顶点）", not bad, str(bad[:3]) if bad else "")
    check(f"{tag} 锁定顺序没有同距离的歧义", not ties, str(ties) if ties else "")
    check(f"{tag} \"改小\"记录与数字一致", decs_ok, f"共 {ndec} 次改小")
    check(f"{tag} 终点被锁定就停", tr[-1]["u"] == t and data["K"] == len(tr) - 1, f"锁定 {data['K']} 次")
    paths = simple_paths(s, t)
    best = [p for L, p in paths if L == paths[0][0]]
    check(f"{tag} 最短路唯一", len(best) == 1, f"最短 {paths[0][0]} 米，共 {len(best)} 条；第二短 {paths[1][0] if len(paths) > 1 else '-'} 米")
    check(f"{tag} 导航蓝线 = 迪杰斯特拉最短路 = 枚举出的唯一最短路", data["navPath"] == best[0], "→".join(LET[v] for v in data["navPath"]))
    check(f"{tag} 全程 xxx 米 = dist[终点] = 真实最短距离", data["navDist"] == D[t] == tr[-1]["dist"][ids.index(t)] == paths[0][0], f"{data['navDist']} 米")
    check(f"{tag} 步行时间按 80 米/分钟向上取整", data["walkMin"] == max(1, math.ceil(data["navDist"] / 80)) and data["cardText"] == f"全程 {data['navDist']} 米 · 步行约 {data['walkMin']} 分钟", data["cardText"])
    # 蓝线折线 = 路径上各边的道路折线首尾相接
    E = {frozenset((e["u"], e["v"])): e for e in NET["edges"]}
    pts = []
    for a, b in zip(data["navPath"], data["navPath"][1:]):
        e = E[frozenset((a, b))]; q = e["pts"] if e["u"] == a else e["pts"][::-1]
        pts += q if not pts else q[1:]
    check(f"{tag} 蓝线沿着路径上各条路的折线走（第 1 步和揭晓画的是同一条）", data["navPts"] == pts, f"{len(pts)} 个折点")
    final = tr[-1]
    fin = [d for d in final["dist"] if d is not None]
    return dict(K=data["K"], ndec=ndec, distinct=len(set(fin)) == len(fin), best=paths[0][0], second=paths[1][0] if len(paths) > 1 else None)


def main():
    head("路网")
    vs = NET["vertices"]; es = NET["edges"]
    check("顶点数在 8–14 之间", 8 <= len(vs) <= 14, f"{len(vs)} 个顶点，{len(es)} 条边")
    check("显示权值都是 10 的倍数", all(e["w"] % 10 == 0 for e in es), " ".join(f"{LET[e['u']]}{LET[e['v']]}={e['w']}" for e in es))
    devs = [(LET[e["u"]] + LET[e["v"]], e["m_plan"], e["w"], 100 * (e["w"] - e["m_plan"]) / e["m_plan"]) for e in es]
    check("显示权值和实测差 ≤ 10%", all(abs(d[3]) <= 10 for d in devs), "；".join(f"{a} {m}→{w}（{p:+.1f}%）" for a, m, w, p in devs if abs(p) > 5))
    tweak = [(a, m, w) for (a, m, w, p), e in zip(devs, es) if w != round(m / 10) * 10]
    check("只有 README 里列出的两条边偏离\"取整到 10 米\"", len(tweak) == 2, str(tweak))
    head("最短路算法对拍")
    check("heapq Dijkstra 与 Bellman-Ford 全源一致", all(ALL[s] == bellman_ford(s) for s in V))
    amb = []
    for s in BLD:
        for t in BLD:
            if s == t: continue
            ps = simple_paths(s, t)
            if len(ps) > 1 and ps[1][0] == ps[0][0]: amb.append((s, t))
    check("所有楼对之间的最短路都唯一", not amb, str(amb) if amb else f"{len(BLD)} 栋楼，{len(BLD) * (len(BLD) - 1)} 个有序对")

    head("默认起终点（截图时导出：开发/截图/full-check.json）")
    data = json.loads((SHOT / "full-check.json").read_text(encoding="utf-8"))
    r = check_trace(data, "[默认]")
    check("[默认] 起点 = 生命科学学院、终点 = 32号教学楼", (data["start"], data["end"]) == (NET["default"]["start"], NET["default"]["end"]))
    check("[默认] 锁定到终点不超过 10 次", r["K"] <= 10, f"{r['K']} 次")
    check("[默认] 至少一次\"先找到较长的，后被改成更短的\"", r["ndec"] >= 1, f"{r['ndec']} 次")
    check("[默认] 结束时所有算出来的 dist 互不相同", r["distinct"])
    check("[默认] 有第二条长度接近的走法（≤ 15%）", r["second"] is not None and (r["second"] - r["best"]) / r["best"] <= 0.15, f"最短 {r['best']}，第二短 {r['second']}")
    # 前 3 下手动就能看到改小
    k_first_dec = next(k for k, st in enumerate(data["trace"]) if st["dec"])
    check("[默认] \"改小\"出现在前 3 次（一按一步的阶段）", k_first_dec <= 3, f"第 {k_first_dec} 次锁定时")

    p = SHOT / "pairs-check.json"
    if p.exists():
        head("换起点 / 终点（test_interact.py 导出：开发/截图/pairs-check.json）")
        allp = json.loads(p.read_text(encoding="utf-8"))
        nbad = 0
        for d in allp:
            before = len(fails)
            check_trace(d, f"[{LET[d['start']]}→{LET[d['end']]}]")
            nbad += len(fails) > before
        check("全部楼对都通过", nbad == 0, f"{len(allp)} 对")
    (DEV / "核对结果.txt").write_text("\n".join(lines) + "\n\n总结： " + ("全部通过" if not fails else f"{len(fails)} 项失败") + "\n", encoding="utf-8")
    print("\n总结：", "全部通过" if not fails else f"{len(fails)} 项失败")


main()
