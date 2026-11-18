# 独立的 Python 参考实现（不读页面的 JS），给 verify.py 用；单独跑会打印全部要用到的数字。
#   - DFS 用"显式栈 + 每个顶点一个邻接点游标"的迭代写法（页面里是教材的递归写法），两边独立算再比；
#   - 记号按严蔚敏《数据结构（C语言版）》第 7 章：顶点 v1…vn（编号从 1），邻接表 adjvex 存下标（从 0 起）。
# 用法：python -I ref_dfs.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import itertools
import json
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]

# 教材图 7.13 的无向图 G4（和 03 工程 scripts/check_numbers.py 的 E4 一样，verify.py 会再对一次）
N4 = 8
E4 = [(1, 2), (1, 3), (2, 4), (2, 5), (3, 6), (3, 7), (4, 8), (5, 8), (6, 7)]
TEXTBOOK_SEQ = [1, 2, 4, 8, 5, 3, 6, 7]          # 教材给出的从 v1 出发的 DFS 序列
# 非连通图 G6：v1 v2 v3 三角形、v4–v5、v6 孤立（和 03 工程一样）
N6 = 6
E6 = [(1, 2), (1, 3), (2, 3), (4, 5)]


def adj_sets(n, edges):
    a = {v: set() for v in range(1, n + 1)}
    for u, w in edges:
        a[u].add(w); a[w].add(u)
    return a


def orders(n, edges, desc=False):
    a = adj_sets(n, edges)
    return {v: sorted(a[v], reverse=desc) for v in a}


def dfs(order, start, n, visited=None):
    """迭代 DFS。返回事件表：每个事件带事件后的栈 / visited / 序列快照。
    visit(v, from)：v 入栈、visited 置 T、写进序列；check(w, from)：看到已访问的邻接点 w，跳过；
    back(v, to)：v 出栈，回到 to；done(v)：起点出栈，栈空。"""
    vis = dict(visited) if visited else {v: False for v in range(1, n + 1)}
    ev, seq = [], []
    stack = []          # [顶点, 下一个要看的邻接点下标]
    snap = lambda: dict(stack=[x[0] for x in stack], visited=[vis[v] for v in range(1, n + 1)], seq=list(seq))
    vis[start] = True; stack.append([start, 0]); seq.append(start)
    ev.append(dict(t="visit", v=start, frm=None, **snap()))
    while stack:
        top = stack[-1]; u = top[0]
        if top[1] < len(order[u]):
            w = order[u][top[1]]; top[1] += 1
            if vis[w]:
                ev.append(dict(t="check", v=w, frm=u, **snap()))
            else:
                vis[w] = True; stack.append([w, 0]); seq.append(w)
                ev.append(dict(t="visit", v=w, frm=u, **snap()))
        else:
            stack.pop()
            if stack:
                ev.append(dict(t="back", v=u, frm=stack[-1][0], **snap()))
            else:
                ev.append(dict(t="done", v=u, frm=None, **snap()))
    return ev, seq, vis


def all_dfs_seqs(n, edges, start):
    """暴力：7! 个排列逐个检查是不是合法的 DFS 序列（栈模拟：下一个必须是"栈顶最近的、还有未访问邻接点的顶点"的邻接点）。"""
    a = adj_sets(n, edges)
    res = []
    rest = [v for v in range(1, n + 1) if v != start]
    for p in itertools.permutations(rest):
        s = (start,) + p
        vis = {start}; st = [start]; good = True
        for w in s[1:]:
            while st and all(x in vis for x in a[st[-1]]):
                st.pop()
            if not st or w not in a[st[-1]]:
                good = False; break
            vis.add(w); st.append(w)
        if good:
            res.append(s)
    return res


def groups(ev):
    """页面的"一按一步"分组规则：每个 visit / back / done 开一个新步，紧跟着的 check 归到这一步。"""
    gs = []
    for i, e in enumerate(ev):
        if e["t"] == "check" and gs:
            gs[-1][1] = i
        else:
            gs.append([i, i])
    return [tuple(g) for g in gs]


def max_depth(ev):
    best = max(ev, key=lambda e: len(e["stack"]))      # 第一次到最深
    return len(best["stack"]), best["stack"]


def tree_edges(ev):
    return [(e["frm"], e["v"]) for e in ev if e["t"] == "visit" and e["frm"] is not None]


def depth_of(ev):
    d = {}
    for e in ev:
        if e["t"] == "visit":
            d[e["v"]] = len(e["stack"])        # 1 起：起点第 1 层
    return d


def adjlist(n, edges):
    """严蔚敏画法的邻接表：链按下标从小到大，adjvex 从 0 起。"""
    o = orders(n, edges)
    return [[w - 1 for w in o[v]] for v in range(1, n + 1)]


def traverse(n, edges):
    """DFSTraverse：for v = 1..n，没访问过就调一次 DFS。返回每次调用的事件表。"""
    o = orders(n, edges)
    vis = {v: False for v in range(1, n + 1)}
    calls = []
    for v in range(1, n + 1):
        if not vis[v]:
            ev, seq, vis = dfs(o, v, n, visited=vis)
            calls.append((v, ev, seq))
    return calls


def components(n, edges):
    p = list(range(n + 1))
    f = lambda x: x if p[x] == x else f(p[x])
    for u, w in edges:
        p[f(u)] = f(w)
    return len({f(v) for v in range(1, n + 1)})


def practice(start):
    ev, seq, _ = dfs(orders(N4, E4), start, N4)
    d, st = max_depth(ev)
    return dict(start=start, seq=seq, depth=d, deep=st)


if __name__ == "__main__":
    vn = lambda s: " ".join(f"v{x}" for x in s)
    asc, desc = orders(N4, E4), orders(N4, E4, desc=True)
    ea, sa, _ = dfs(asc, 1, N4)
    ed, sd, _ = dfs(desc, 1, N4)
    print("先挑小的：", vn(sa), "（教材：", vn(TEXTBOOK_SEQ), "）")
    print("先挑大的：", vn(sd))
    print("分组（先挑小的）：", len(groups(ea)), "步")
    for a, b in groups(ea):
        print("   ", [(ea[i]["t"], ea[i]["v"]) for i in range(a, b + 1)], "栈", ea[b]["stack"])
    print("从 v1 出发的 DFS 序列：", len(all_dfs_seqs(N4, E4, 1)), "种")
    print("栈最深：", max_depth(ea), "；树边", tree_edges(ea), "；深度", depth_of(ea))
    print("邻接表：", adjlist(N4, E4))
    rev = {v: list(reversed(asc[v])) for v in asc}
    print("链全部倒过来：", vn(dfs(rev, 1, N4)[1]))
    for v, ev, seq in traverse(N6, E6):
        print("G6 调用 DFS(v%d)：" % v, vn(seq))
    print("G6 连通分量：", components(N6, E6))
    for s in range(1, N4 + 1):
        p = practice(s)
        print(f"小练 从 v{s}：", vn(p["seq"]), "| 栈最深", p["depth"], vn(p["deep"]))
