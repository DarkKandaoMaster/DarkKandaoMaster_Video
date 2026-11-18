# 独立的 Python 参考实现（不读页面的 JS）：照教材的朴素迪杰斯特拉（O(n²)），算到全部顶点都确定。
# verify.py 用它生成"应该是什么"，再和页面导出的数据逐格对比。
# 单独跑：python -I ref_dijkstra.py   → 打印每个起点的过程，以及哪些起点会出现同距离平局
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
import math
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
NET = json.loads((DEV / "data" / "network.json").read_text(encoding="utf-8"))
LET = {v["id"]: v["letter"] for v in NET["vertices"]}
ID_OF = {v["letter"]: v["id"] for v in NET["vertices"]}
LETTERS = sorted(LET.values())                     # A..H
W = {}
for e in NET["edges"]:
    a, b = LET[e["u"]], LET[e["v"]]
    W[(a, b)] = W[(b, a)] = e["w"]
NB = {x: sorted(y for (p, y) in W if p == x) for x in LETTERS}
INF = math.inf


def run(s):
    """返回 dict：init（初始化状态）、rounds（每轮：选谁、平局、更新算式、更新后状态）。
    平局规则：同距离时挑字母靠前的（页面上会写出来）。"""
    dist = {v: INF for v in LETTERS}; path = {v: None for v in LETTERS}; S = {s}
    dist[s] = 0
    for v in NB[s]:
        dist[v] = W[(s, v)]; path[v] = s
    init = dict(dist=dict(dist), path=dict(path), S=sorted(S))
    rounds = []
    while len(S) < len(LETTERS):
        cand = [(dist[v], v) for v in LETTERS if v not in S and dist[v] < INF]
        if not cand: break
        m = min(c[0] for c in cand)
        tied = sorted(v for d, v in cand if d == m)
        u = tied[0]
        before = dict(dist=dict(dist), path=dict(path), S=sorted(S))
        S.add(u)
        ups, skipped = [], []
        for v in NB[u]:
            if v in S: skipped.append(v); continue
            nd = dist[u] + W[(u, v)]
            ch = nd < dist[v]
            ups.append(dict(v=v, w=W[(u, v)], du=dist[u], nd=nd, old=dist[v], changed=ch))
            if ch:
                dist[v] = nd; path[v] = u
        rounds.append(dict(u=u, du=dist[u], tied=tied, before=before, ups=ups, skipped=skipped,
                           after=dict(dist=dict(dist), path=dict(path), S=sorted(S))))
    return dict(start=s, init=init, rounds=rounds, dist=dict(dist), path=dict(path))


def chain(r, v):
    out = [v]
    while out[-1] != r["start"]:
        out.append(r["path"][out[-1]])
    return out          # v ← … ← 起点


def bellman_ford(s):
    d = {v: INF for v in LETTERS}; d[s] = 0
    for _ in range(len(LETTERS) - 1):
        for (a, b), w in W.items():
            if d[a] + w < d[b]: d[b] = d[a] + w
    return d


def fmt(x):
    return "∞" if x == INF else str(x)


if __name__ == "__main__":
    for s in LETTERS:
        r = run(s)
        order = [x["u"] for x in r["rounds"]]
        ties = [(i + 1, x["tied"], x["before"]["dist"][x["u"]]) for i, x in enumerate(r["rounds"]) if len(x["tied"]) > 1]
        nch = sum(1 for x in r["rounds"] for q in x["ups"] if q["changed"] and q["old"] < INF)
        nno = sum(1 for x in r["rounds"] for q in x["ups"] if not q["changed"])
        print(f"起点 {s}: 锁定顺序 {' '.join(order)}  dist {' '.join(f'{v}={fmt(r['dist'][v])}' for v in LETTERS)}  "
              f"改小 {nch} 次  不改 {nno} 次  平局 {ties if ties else '无'}  BF一致 {bellman_ford(s) == r['dist']}")
    r = run("G")
    print()
    for i, x in enumerate(r["rounds"]):
        print(f"第{i+1}轮 锁定 {x['u']}({x['du']}) 跳过 {x['skipped']}")
        for q in x["ups"]:
            print(f"   {q['v']}: dist[{x['u']}] + {q['w']} = {q['nd']} {'<' if q['changed'] else '≥'} {fmt(q['old'])} → {'改为 %d，path = %s' % (q['nd'], x['u']) if q['changed'] else '不改'}")
    for v in LETTERS:
        if v != "G": print(" ← ".join(chain(r, v)), r["dist"][v])
