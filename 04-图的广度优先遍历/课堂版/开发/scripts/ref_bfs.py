# 独立的 Python 参考实现（不读页面的 JS），给 verify.py 用；单独跑会打印全部要用到的数字。
#   - BFS 用 collections.deque（页面里是"数组 + 队头下标"的写法），两边独立算再比；
#   - 记号按严蔚敏《数据结构（C语言版）》第 7 章：顶点 v1…vn（编号从 1），邻接表 adjvex 存下标（从 0 起）；
#   - BFS 按教材算法 7.6：入队时就置 visited[w] = TRUE 并访问 w；出队 u，按邻接表顺序依次看 u 的邻接点；
#   - 层号从 0 起：起点 v1 是第 0 层，所以层号 = 离起点的最短边数。
# 用法：python -I ref_bfs.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import itertools
from collections import deque

# 教材图 7.13 的无向图 G4（和 04 工程 scripts/check_numbers.py 的 E4 一样，verify.py 会再对一次）
N4 = 8
E4 = [(1, 2), (1, 3), (2, 4), (2, 5), (3, 6), (3, 7), (4, 8), (5, 8), (6, 7)]
TEXTBOOK_SEQ = [1, 2, 3, 4, 5, 6, 7, 8]          # 教材给出的从 v1 出发的 BFS 序列
# 非连通图 G6：v1 v2 v3 三角形、v4–v5、v6 孤立（和 B 站视频、DFS 课堂版一样）
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


def bfs(order, start, n, visited=None):
    """教材算法 7.6。返回事件表：每个事件带事件后的 队列 / visited / 序列 / 当前顶点 快照。
    visit(start)：起点置 T、访问、入队；deq(u)：u 出队，成为当前顶点（prev = 出队前"小人"站在哪）；
    enq(w, from)：没来过 → 置 T、访问、入队；check(w, from)：来过了，跳过（inq = w 此刻还在队里）；done：队空。"""
    vis = dict(visited) if visited else {v: False for v in range(1, n + 1)}
    ev, seq, q = [], [], deque()
    parent, layer = {}, {}
    cur = None
    snap = lambda: dict(queue=list(q), visited=[vis[v] for v in range(1, n + 1)], seq=list(seq), cur=cur)
    vis[start] = True; q.append(start); seq.append(start); layer[start] = 0
    ev.append(dict(t="visit", v=start, frm=None, prev=None, **snap()))
    where = start
    while q:
        u = q.popleft(); cur = u
        ev.append(dict(t="deq", v=u, frm=None, prev=where, **snap()))
        where = u
        for w in order[u]:
            if not vis[w]:
                vis[w] = True; q.append(w); seq.append(w); parent[w] = u; layer[w] = layer[u] + 1
                ev.append(dict(t="enq", v=w, frm=u, prev=None, **snap()))
            else:
                ev.append(dict(t="check", v=w, frm=u, prev=None, inq=w in q, **snap()))
    cur = None
    ev.append(dict(t="done", v=start, frm=None, prev=None, **snap()))
    return dict(ev=ev, seq=seq, parent=parent, layer=layer, vis=vis, start=start)


def layers_by_sets(n, edges, start):
    """独立算法：按层扩展集合（不用队列）。"""
    a = adj_sets(n, edges)
    seen, frontier, out = {start}, [start], [[start]]
    while True:
        nxt = sorted({w for u in frontier for w in a[u] if w not in seen})
        if not nxt:
            return out
        seen |= set(nxt); out.append(nxt); frontier = nxt


def shortest_by_paths(n, edges, s):
    """独立算法：枚举全部简单路径取最短边数（不用 BFS）。"""
    a = adj_sets(n, edges)
    best = {v: None for v in range(1, n + 1)}

    def go(u, seen, d):
        if best[u] is None or d < best[u]:
            best[u] = d
        for w in a[u]:
            if w not in seen:
                go(w, seen | {w}, d + 1)

    go(s, {s}, 0)
    return best


def is_bfs_seq(seq, n, edges):
    """一个排列是不是合法的 BFS 序列：出队顺序 = 序列本身，每出一个，它没来过的邻接点必须紧接着（任意顺序）排在后面。"""
    a = adj_sets(n, edges)
    vis = {seq[0]}; i = 1
    for u in seq:
        new = {w for w in a[u] if w not in vis}
        if set(seq[i:i + len(new)]) != new:
            return False
        vis |= new; i += len(new)
    return i == len(seq)


def all_bfs_seqs(n, edges, start):
    """暴力：7! 个排列逐个检查。"""
    rest = [v for v in range(1, n + 1) if v != start]
    return [(start,) + p for p in itertools.permutations(rest) if is_bfs_seq((start,) + p, n, edges)]


def groups(ev):
    """一按一步的分组：每个 visit / deq / done 开一个新组，紧跟着的 enq / check 归到这一组。"""
    gs = []
    for i, e in enumerate(ev):
        if e["t"] in ("enq", "check") and gs:
            gs[-1][1] = i
        else:
            gs.append([i, i])
    return [tuple(g) for g in gs]


def mark_on_deq(order, start, n):
    """反例：等出队才标记（错的写法）。返回每个顶点出队处理完后的记录。"""
    marked = {v: False for v in range(1, n + 1)}
    q = deque([start]); pushes = [start]; log = []
    while q:
        u = q.popleft()
        if marked[u]:
            log.append(dict(u=u, skip=True, push=[], queue=list(q), marked=[marked[v] for v in range(1, n + 1)])); continue
        marked[u] = True; push = []
        for w in order[u]:
            if not marked[w]:
                q.append(w); pushes.append(w); push.append(w)
        log.append(dict(u=u, skip=False, push=push, queue=list(q), marked=[marked[v] for v in range(1, n + 1)]))
    return log, pushes


def dfs_tree(order, start):
    """对比用：教材递归 DFS 的生成树，深度从 0 起。"""
    parent, depth, seq = {}, {}, []
    def go(v, d):
        depth[v] = d; seq.append(v)
        for w in order[v]:
            if w not in depth:
                parent[w] = v; go(w, d + 1)
    go(start, 0)
    return parent, depth, seq


def adjlist(n, edges):
    o = orders(n, edges)
    return [[w - 1 for w in o[v]] for v in range(1, n + 1)]


def traverse(n, edges):
    """BFSTraverse：for v = 1..n，没访问过就从 v 出发 BFS 一次。"""
    o = orders(n, edges)
    vis = {v: False for v in range(1, n + 1)}
    calls = []
    for v in range(1, n + 1):
        if not vis[v]:
            r = bfs(o, v, n, visited=vis)
            calls.append(r); vis = r["vis"]
    return calls


def components(n, edges):
    p = list(range(n + 1))
    f = lambda x: x if p[x] == x else f(p[x])
    for u, w in edges:
        p[f(u)] = f(w)
    return len({f(v) for v in range(1, n + 1)})


def path_to(parent, v):
    p = [v]
    while p[0] in parent:
        p.insert(0, parent[p[0]])
    return p


def practice(start):
    r = bfs(orders(N4, E4), start, N4)
    L = layers_by_sets(N4, E4, start)
    far = L[-1]
    return dict(start=start, seq=r["seq"], layers=L, maxl=len(L) - 1, far=far, path=path_to(r["parent"], far[0]), layer=r["layer"])


if __name__ == "__main__":
    vn = lambda s: " ".join(f"v{x}" for x in s)
    asc, desc = orders(N4, E4), orders(N4, E4, desc=True)
    ra, rd = bfs(asc, 1, N4), bfs(desc, 1, N4)
    print("先挑小的：", vn(ra["seq"]), "（教材：", vn(TEXTBOOK_SEQ), "）")
    print("先挑大的：", vn(rd["seq"]))
    print("分层：", layers_by_sets(N4, E4, 1))
    for i, e in enumerate(ra["ev"]):
        print(f"  #{i:02d} {e['t']:<5} v{e['v']} 队列[{vn(e['queue'])}] visited {''.join('T' if b else 'F' for b in e['visited'])} cur {e['cur']}")
    print("分组：", groups(ra["ev"]))
    print("从 v1 出发的 BFS 序列：", len(all_bfs_seqs(N4, E4, 1)), "种")
    log, pushes = mark_on_deq(asc, 1, N4)
    print("出队才标记：入队顺序", vn(pushes))
    for l in log:
        print("   ", l)
    print("最短边数：", shortest_by_paths(N4, E4, 1))
    pd, dd, sd = dfs_tree(asc, 1)
    print("DFS 树：", pd, "深度", dd, "共", max(dd.values()) + 1, "层")
    print("邻接表：", adjlist(N4, E4))
    rev = {v: list(reversed(asc[v])) for v in asc}
    print("链全部倒过来：", vn(bfs(rev, 1, N4)["seq"]))
    for c in traverse(N6, E6):
        print("G6 调用 BFS(v%d)：" % c["start"], vn(c["seq"]))
    print("G6 连通分量：", components(N6, E6))
    for s in range(1, N4 + 1):
        p = practice(s)
        print(f"小练 从 v{s}：", vn(p["seq"]), "| 层", p["layers"], "| 最远第", p["maxl"], "层", vn(p["far"]), "| 路", vn(p["path"]))
