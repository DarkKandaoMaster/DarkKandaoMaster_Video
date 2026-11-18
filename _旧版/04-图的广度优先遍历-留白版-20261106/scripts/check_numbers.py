"""《图的广度优先遍历》里所有序列、每一步的队列和 visited、层号、最短边数、限时题答案的暴力核对 + 画面数据生成。

    $env:PYTHONIOENCODING="utf-8"
    & $PY scripts\\check_numbers.py            # 在工程目录里跑；打印核对结果，并写 src/bfs/trace.generated.ts

画面只读 trace.generated.ts（事件序列、每一步的队列和 visited），旁白里的数字照抄本脚本的输出。

记号：严蔚敏《数据结构（C语言版）》第 7 章。顶点 v1…v8（下标 i 对应顶点表第 i-1 行，邻接表里的 adjvex 从 0 起）。
例图 G4（教材图 7.13）：边 v1-v2, v1-v3, v2-v4, v2-v5, v3-v6, v3-v7, v4-v8, v5-v8, v6-v7。
教材算法 7.6（BFSTraverse）：入队时就置 visited[w] = TRUE 并访问 w；出队 u，依次看 u 的邻接点。
层号：起点 v1 为第 0 层，第 k 层 = 由第 k-1 层的顶点出队时入队的那些顶点。
"""
from __future__ import annotations

import itertools
import json
import sys
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "bfs" / "trace.generated.ts"

FAIL = []


def ok(cond: bool, msg: str) -> None:
    print(("OK   " if cond else "FAIL ") + msg)
    if not cond:
        FAIL.append(msg)


def name(v: int) -> str:
    return f"v{v}"


def seq_str(s) -> str:
    return " ".join(name(v) for v in s)


# ---------------------------------------------------------------- 图
N4 = 8
E4 = [(1, 2), (1, 3), (2, 4), (2, 5), (3, 6), (3, 7), (4, 8), (5, 8), (6, 7)]
TEXTBOOK_BFS = [1, 2, 3, 4, 5, 6, 7, 8]


def adj_of(n: int, edges) -> dict[int, set[int]]:
    a = {v: set() for v in range(1, n + 1)}
    for u, w in edges:
        a[u].add(w)
        a[w].add(u)
    return a


ADJ4 = adj_of(N4, E4)


# ---------------------------------------------------------------- 1. 带事件的 BFS（教材算法 7.6）
def bfs_trace(adj_order: dict[int, list[int]], start: int, n: int, visited=None):
    """按 adj_order 给的邻接点顺序做 BFS，记录画面要用的每一步事件。
    事件：visit（起点：置 T、访问、入队）、deq（队头出队）、enq（邻接点没来过：置 T、访问、入队）、
         check（邻接点来过了，跳过）、done（队空，结束）。
    arc = 这个邻接点在 from 顶点的邻接表里是第几个（0 起），给邻接表那一镜高亮边结点用。
    layer = 顶点所在的层（起点 0）。"""
    visited = visited if visited is not None else {v: False for v in range(1, n + 1)}
    events = []
    q: deque[int] = deque()
    seq = []
    layer = {}

    def snap():
        return dict(queue=list(q), visited=[visited[v] for v in range(1, n + 1)], seq=list(seq))

    visited[start] = True
    seq.append(start)
    q.append(start)
    layer[start] = 0
    events.append(dict(t="visit", v=start, frm=None, arc=None, layer=0, **snap()))
    while q:
        u = q.popleft()
        events.append(dict(t="deq", v=u, frm=None, arc=None, layer=layer[u], **snap()))
        for k, w in enumerate(adj_order[u]):
            if not visited[w]:
                visited[w] = True
                seq.append(w)
                q.append(w)
                layer[w] = layer[u] + 1
                events.append(dict(t="enq", v=w, frm=u, arc=k, layer=layer[w], **snap()))
            else:
                events.append(dict(t="check", v=w, frm=u, arc=k, layer=layer[w], **snap()))
    events.append(dict(t="done", v=start, frm=None, arc=None, layer=0, **snap()))
    return events, seq, layer


ASC = {v: sorted(ADJ4[v]) for v in ADJ4}           # 邻接表（链表按下标从小到大，教材画法）
DESC = {v: sorted(ADJ4[v], reverse=True) for v in ADJ4}

print("== 1. G4 上的 BFS（从 v1 出发，入队时标记）")
ev_asc, seq_asc, layer_asc = bfs_trace(ASC, 1, N4)
ev_desc, seq_desc, layer_desc = bfs_trace(DESC, 1, N4)
print("  先挑编号小的（= 邻接表顺序）：", seq_str(seq_asc))
print("  先挑编号大的：               ", seq_str(seq_desc))
ok(seq_asc == TEXTBOOK_BFS, "编号小的先挑 = 教材序列 v1 v2 v3 v4 v5 v6 v7 v8")
ok(seq_asc != seq_desc, "两种挑法序列不同")
ok(seq_desc == [1, 3, 2, 7, 6, 5, 4, 8], "编号大的先挑 = v1 v3 v2 v7 v6 v5 v4 v8")


def print_events(evs):
    for i, e in enumerate(evs):
        qs = "[" + " ".join(name(x) for x in e["queue"]) + "]"
        vis = "".join("T" if b else "F" for b in e["visited"])
        if e["t"] == "visit":
            what = f"起点 {name(e['v'])}：标记、访问、入队"
        elif e["t"] == "deq":
            what = f"{name(e['v'])} 出队（第{e['layer']}层）"
        elif e["t"] == "enq":
            what = f"  {name(e['frm'])} 的邻接点 {name(e['v'])}：没来过，标记、入队（链上第{e['arc']}个）"
        elif e["t"] == "check":
            what = f"  {name(e['frm'])} 的邻接点 {name(e['v'])}：来过了，跳过（链上第{e['arc']}个）"
        else:
            what = "队空，结束"
        print(f"  #{i:02d} {what:<40} 队列{qs:<18} visited {vis}")


print("  -- 事件（先挑编号小的）")
print_events(ev_asc)
print("  -- 事件（先挑编号大的）")
print_events(ev_desc)
maxq_asc = max(len(e["queue"]) for e in ev_asc)
maxq_desc = max(len(e["queue"]) for e in ev_desc)
print(f"  队列最长：编号小的先挑 {maxq_asc} 个，编号大的先挑 {maxq_desc} 个")


# 层：独立算法（按层扩展集合，不用队列）
def layers_by_sets(adj, start):
    seen = {start}
    frontier = [start]
    out = [[start]]
    while True:
        nxt = sorted({w for u in frontier for w in adj[u] if w not in seen})
        if not nxt:
            return out
        seen |= set(nxt)
        out.append(nxt)
        frontier = nxt


LAYERS = layers_by_sets(ADJ4, 1)
print("  各层：", " | ".join(f"第{k}层 " + " ".join(name(v) for v in L) for k, L in enumerate(LAYERS)))
ok(LAYERS == [[1], [2, 3], [4, 5, 6, 7], [8]], "分层 v1 | v2 v3 | v4 v5 v6 v7 | v8")
ok(all(layer_asc[v] == k for k, L in enumerate(LAYERS) for v in L), "队列 BFS 算出的层号与按层扩展一致")
ok(all(layer_desc[v] == layer_asc[v] for v in ADJ4), "两种挑法层号相同（层只和图有关）")
# 序列按层排：第 k 层的顶点在序列里连续出现
pos = {v: i for i, v in enumerate(seq_asc)}
ok(all(max(pos[v] for v in LAYERS[k]) < min(pos[v] for v in LAYERS[k + 1]) for k in range(len(LAYERS) - 1)),
   "访问序列里各层依次连续排列")

# 关键时刻
deq4 = next(i for i, e in enumerate(ev_asc) if e["t"] == "deq" and e["v"] == 4)
ok(ev_asc[deq4 + 2]["t"] == "enq" and ev_asc[deq4 + 2]["v"] == 8 and ev_asc[deq4 + 2]["frm"] == 4, "v8 由 v4 出队时入队（并在那时标记）")
deq3_done = next(i for i, e in enumerate(ev_asc) if e["t"] == "deq" and e["v"] == 4)
ok(ev_asc[deq3_done]["queue"] == [5, 6, 7], "v4 出队后队列是 v5 v6 v7")
q_before_v4 = ev_asc[deq3_done - 1]["queue"]
ok(q_before_v4 == [4, 5, 6, 7], "v3 处理完时队列正好是第 2 层 v4 v5 v6 v7")
chk = [e for e in ev_asc if e["t"] == "check" and e["frm"] == 5]
ok([e["v"] for e in chk] == [2, 8], "v5 出队时看 v2、v8：都已标记，跳过")
ok(chk[1]["visited"][8 - 1] is True and 8 in chk[1]["queue"], "看 v8 那一刻 v8 还在队里，但 visited 已是 T")


# 对照：出队时才标记（错法）——会有顶点入队两次
def bfs_mark_on_deq(adj_order, start, n):
    marked = {v: False for v in range(1, n + 1)}
    q = deque([start])
    pushes = [start]
    log = []
    while q:
        u = q.popleft()
        if marked[u]:
            log.append((u, "出队时发现已标记，丢掉", list(q)))
            continue
        marked[u] = True
        for w in adj_order[u]:
            if not marked[w]:
                q.append(w)
                pushes.append(w)
        log.append((u, "出队、标记、邻接点入队", list(q)))
    return pushes, log


pushes, wrong_log = bfs_mark_on_deq(ASC, 1, N4)
dup = sorted({v for v in pushes if pushes.count(v) > 1})
print("  （对照）出队才标记：入队顺序", seq_str(pushes), "；入队不止一次的：", seq_str(dup))
for u, what, qq in wrong_log:
    print(f"     {name(u)} {what}，队列 [{seq_str(qq)}]")
ok(pushes.count(8) == 2, "出队才标记时 v8 入队 2 次（v4、v5 各一次）")
ok(8 in dup, "v8 在重复名单里")
q_after_v5_wrong = next(qq for u, what, qq in wrong_log if u == 5)
print("  （对照）出队才标记，v5 处理完后的队列：", seq_str(q_after_v5_wrong))
ok(q_after_v5_wrong == [6, 7, 8, 8], "出队才标记：v5 处理完后队列是 v6 v7 v8 v8")

# ---------------------------------------------------------------- 2. 全部 BFS 序列（枚举每个顶点的邻接点顺序）
print("== 2. 从 v1 出发的全部 BFS 序列")


def all_bfs(adj, start, n):
    """枚举：每次出队一个顶点时，它没来过的邻接点可以按任意顺序入队。"""
    res = set()

    def go(q, visited, seq):
        if not q:
            res.add(tuple(seq))
            return
        u, rest = q[0], q[1:]
        new = [w for w in sorted(adj[u]) if w not in visited]
        for perm in itertools.permutations(new):
            go(rest + list(perm), visited | set(perm), seq + list(perm))

    go([start], {start}, [start])
    return res


ALL = all_bfs(ADJ4, 1, N4)
print(f"  共 {len(ALL)} 种：")
for s in sorted(ALL):
    print("    ", seq_str(s))
ok(tuple(seq_asc) in ALL and tuple(seq_desc) in ALL, "两条演示序列都在枚举结果里")


# 独立算法 1：按全排列逐个模拟检查（不复用 all_bfs）
def is_bfs_seq(seq, adj) -> bool:
    if len(set(seq)) != len(seq) or len(seq) != len(adj):
        return False
    visited = {seq[0]}
    i = 1                      # seq 里下一个该被入队的位置
    for u in seq:              # 出队顺序 = 入队顺序 = 序列本身
        new = {w for w in adj[u] if w not in visited}
        got = set(seq[i:i + len(new)])
        if got != new:
            return False
        visited |= new
        i += len(new)
    return i == len(seq)


brute = {(1,) + p for p in itertools.permutations(range(2, N4 + 1)) if is_bfs_seq((1,) + p, ADJ4)}
ok(brute == ALL, f"全排列 7! = 5040 个里逐个模拟，合法的也是 {len(brute)} 个，且完全相同")


# 独立算法 2：枚举每个顶点邻接表的所有排列（3!·2!… 种邻接表），各跑一次教材 BFS
def all_by_lists():
    vs = list(range(1, N4 + 1))
    choices = [list(itertools.permutations(sorted(ADJ4[v]))) for v in vs]
    out = set()
    for combo in itertools.product(*choices):
        order = {v: list(c) for v, c in zip(vs, combo)}
        _, s, _ = bfs_trace(order, 1, N4)
        out.add(tuple(s))
    return out


by_lists = all_by_lists()
ok(by_lists == ALL, f"枚举全部邻接表顺序各跑一次 BFS，得到的序列也是这 {len(by_lists)} 种")
for s in range(1, N4 + 1):
    print(f"    从 {name(s)} 出发：{len(all_bfs(ADJ4, s, N4))} 种")
# 同层内可换序，但下一层要跟着上一层的出队顺序：v3 先出队时 v6 v7 必在 v4 v5 前
ok(all((s.index(6) < s.index(4) and s.index(7) < s.index(5)) == (s.index(3) < s.index(2)) for s in ALL),
   "v3 先于 v2 出队 ⇔ v6、v7 排在 v4、v5 前面（下一层跟着上一层的顺序）")

# ---------------------------------------------------------------- 3. 邻接表
print("== 3. 邻接表（顶点表 + 边链表，adjvex 为下标，从 0 起，按下标从小到大）")
ADJLIST = {v: [w - 1 for w in ASC[v]] for v in range(1, N4 + 1)}
for v in range(1, N4 + 1):
    print(f"  {v - 1} | {name(v)} | → " + " → ".join(str(a) for a in ADJLIST[v]) + " ∧")
n_arcs = sum(len(x) for x in ADJLIST.values())
ok(n_arcs == 2 * len(E4), f"边结点共 {n_arcs} 个 = 2e = 2×{len(E4)}")
ev_list, seq_list, _ = bfs_trace({v: [a + 1 for a in ADJLIST[v]] for v in ADJLIST}, 1, N4)
ok(seq_list == TEXTBOOK_BFS, "按邻接表做 BFS 得到唯一序列 v1 v2 v3 v4 v5 v6 v7 v8")
# 教材 CreateUDG 头插：按 E4 顺序输入边时链表顺序反过来
head = {v: [] for v in range(1, N4 + 1)}
for u, w in E4:
    head[u].insert(0, w)
    head[w].insert(0, u)
ok(all(head[v] == list(reversed(ASC[v])) for v in head), "按 E4 顺序头插建表 = 每条链全部倒序")
_, seq_head, _ = bfs_trace(head, 1, N4)
print("  链倒过来（头插建表）的 BFS：", seq_str(seq_head))
ok(seq_head == seq_desc, "链倒过来走出来就是第二条 v1 v3 v2 v7 v6 v5 v4 v8")

# ---------------------------------------------------------------- 4. 层号 = 最短边数
print("== 4. 层号 = 离 v1 的最短边数（无权图）")


def shortest_by_paths(adj, s, n):
    """独立算法：枚举所有简单路径取最短边数（不用 BFS）。"""
    best = {v: None for v in range(1, n + 1)}

    def dfs(u, seen, d):
        if best[u] is None or d < best[u]:
            best[u] = d
        for w in adj[u]:
            if w not in seen:
                dfs(w, seen | {w}, d + 1)

    dfs(s, {s}, 0)
    return best


SP = shortest_by_paths(ADJ4, 1, N4)
print("  最短边数：", "，".join(f"{name(v)}={SP[v]}" for v in range(1, N4 + 1)))
ok(all(SP[v] == layer_asc[v] for v in range(1, N4 + 1)), "每个顶点：层号 = 枚举全部简单路径得到的最短边数")
# v8 的一条最短路：沿 BFS 入队关系往回找父亲
parent = {e["v"]: e["frm"] for e in ev_asc if e["t"] == "enq"}
path8 = [8]
while path8[-1] != 1:
    path8.append(parent[path8[-1]])
path8.reverse()
print("  v8 的最短路（BFS 树上）：", " → ".join(name(v) for v in path8), f"，{len(path8) - 1} 条边")
ok(path8 == [1, 2, 4, 8] and SP[8] == 3, "v8 在第 3 层：v1 → v2 → v4 → v8，3 条边")
# 对照：DFS（先挑小的）到 v5 走的是 v1 v2 v4 v8 v5（4 条边），BFS 里 v5 在第 2 层
ok(SP[5] == 2, "v5 最短 2 条边（v1 → v2 → v5）")
BFS_TREE = sorted((e["frm"], e["v"]) for e in ev_asc if e["t"] == "enq")
print("  BFS 生成树的边：", "，".join(f"{name(a)}-{name(b)}" for a, b in BFS_TREE))
ok(len(BFS_TREE) == N4 - 1, "BFS 生成树 7 条边")

# ---------------------------------------------------------------- 5. 非连通图
print("== 5. 非连通图：BFSTraverse 调用 BFS 的次数 = 连通分量个数")
N6 = 6
E6 = [(1, 2), (1, 3), (2, 3), (4, 5)]
ADJ6 = adj_of(N6, E6)
ASC6 = {v: sorted(ADJ6[v]) for v in ADJ6}
visited6 = {v: False for v in range(1, N6 + 1)}
calls = []
events6 = []
for v in range(1, N6 + 1):            # for (v = 0; v < G.vexnum; ++v) if (!visited[v]) { ... BFS ... }
    if not visited6[v]:
        evs, s, _ = bfs_trace(ASC6, v, N6, visited=visited6)
        calls.append(s)
        events6.append(evs)
print("  各次调用访问到：", " | ".join(seq_str(c) for c in calls))


def components(n, edges):
    parent_ = list(range(n + 1))

    def find(x):
        while parent_[x] != x:
            parent_[x] = parent_[parent_[x]]
            x = parent_[x]
        return x

    for u, w in edges:
        parent_[find(u)] = find(w)
    return len({find(v) for v in range(1, n + 1)})


ok(len(calls) == components(N6, E6) == 3, f"调用 {len(calls)} 次，并查集数出连通分量 {components(N6, E6)} 个")
ok(calls == [[1, 2, 3], [4, 5], [6]], "三次分别是 v1 v2 v3 / v4 v5 / v6")

# ---------------------------------------------------------------- 6. 复杂度（只做计数核对）
print("== 6. 复杂度")
n, e = N4, len(E4)
print(f"  G4：n={n}，e={e}；邻接矩阵 BFS 扫描 n×n={n * n} 格；邻接表扫描 n+2e={n + 2 * e} 个结点")
scan_list = sum(1 + len(ADJLIST[v]) for v in ADJLIST)
ok(scan_list == n + 2 * e, "邻接表：每个顶点出队 1 次 + 每个边结点看 1 次")
n_checks = sum(1 for ev in ev_asc if ev["t"] in ("enq", "check"))
ok(n_checks == 2 * e, f"BFS 一共看了 {n_checks} 次邻接点 = 2e")

# ---------------------------------------------------------------- 7. 限时题
print("== 7. 限时题：下面哪个不是 G4 从 v1 出发的 BFS 序列？")
QUIZ = [
    ("A", [1, 2, 3, 5, 4, 7, 6, 8]),
    ("B", [1, 3, 2, 4, 5, 6, 7, 8]),
    ("C", [1, 3, 2, 6, 7, 4, 5, 8]),
    ("D", [1, 2, 3, 4, 5, 7, 6, 8]),
]
answer = None
for lab, s in QUIZ:
    valid = tuple(s) in ALL
    valid2 = is_bfs_seq(tuple(s), ADJ4)
    ok(valid == valid2, f"{lab} 两种算法判断一致")
    print(f"  {lab}. {seq_str(s)}  → {'合法' if valid else '不合法'}")
    if not valid:
        answer = lab
bad = [lab for lab, s in QUIZ if tuple(s) not in ALL]
ok(len(bad) == 1, f"恰好一个不合法：{bad}")
ok(answer == "B", "答案是 B")
qb = dict(QUIZ)["B"]
ok([sorted(qb[1:3]), sorted(qb[3:7]), qb[7:]] == [[2, 3], [4, 5, 6, 7], [8]], "B 的分层是对的（v2 v3 | v4 v5 v6 v7 | v8），错在同层顺序")
ok(qb.index(3) < qb.index(2) and qb.index(4) < qb.index(6), "B 的错：v3 先出队，v6、v7 应在 v4、v5 前面，B 却把 v4、v5 放在前面")
demo = {tuple(seq_asc), tuple(seq_desc)}
ok(all(tuple(s) not in demo for _, s in QUIZ), "四个选项都不是演示过的两条序列")
ok(all(len(s) == 8 and s[0] == 1 for _, s in QUIZ), "四个选项都从 v1 出发、各 8 个顶点")
ok(len({tuple(s) for _, s in QUIZ}) == 4, "四个选项互不相同")

# ---------------------------------------------------------------- 写 TS
def ev_ts(evs):
    return [dict(t=e["t"], v=e["v"], from_=e["frm"], arc=e["arc"], layer=e["layer"], queue=e["queue"], visited=e["visited"], seq=e["seq"]) for e in evs]


def dump(x) -> str:
    return json.dumps(x, ensure_ascii=False).replace('"from_"', '"from"')


lines = [
    "// 由 scripts/check_numbers.py 生成，勿手改。顶点用 1 起的编号（1 = v1），adjvex 用 0 起的下标（教材邻接表画法）。",
    "import type { BEvent } from \"../graph/bfs\";",
    f"export const G4 = {{ n: {N4}, edges: {dump([list(x) for x in E4])} as [number, number][] }};",
    f"export const RUN_ASC: BEvent[] = {dump(ev_ts(ev_asc))} as BEvent[];",
    f"export const RUN_DESC: BEvent[] = {dump(ev_ts(ev_desc))} as BEvent[];",
    f"export const RUN_LIST: BEvent[] = {dump(ev_ts(ev_list))} as BEvent[];",
    f"export const SEQ_ASC = {dump(seq_asc)};",
    f"export const SEQ_DESC = {dump(seq_desc)};",
    f"export const LAYERS: number[][] = {dump(LAYERS)};",
    f"export const LAYER_OF: Record<number, number> = {dump({str(v): layer_asc[v] for v in range(1, N4 + 1)})};",
    f"export const PARENT_ASC: Record<number, number> = {dump({str(k): v for k, v in parent.items()})};",
    f"export const SHORTEST: Record<number, number> = {dump({str(v): SP[v] for v in range(1, N4 + 1)})};",
    f"export const PATH_V8 = {dump(path8)};",
    f"export const WRONG_QUEUE_AFTER_V5 = {dump(q_after_v5_wrong)};",
    f"export const ALL_BFS_COUNT = {len(ALL)};",
    f"export const ADJLIST: number[][] = {dump([ADJLIST[v] for v in range(1, N4 + 1)])};",
    f"export const G6 = {{ n: {N6}, edges: {dump([list(x) for x in E6])} as [number, number][] }};",
    f"export const G6_CALLS: BEvent[][] = {dump([ev_ts(x) for x in events6])} as BEvent[][];",
    f"export const QUIZ: {{ label: string; seq: number[]; valid: boolean }}[] = {dump([dict(label=l, seq=s, valid=tuple(s) in ALL) for l, s in QUIZ])};",
    f"export const QUIZ_ANSWER = {dump(answer)};",
    "",
]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"写出 {OUT.relative_to(ROOT)}")

print()
print("全部 OK" if not FAIL else f"有 {len(FAIL)} 处 FAIL")
sys.exit(1 if FAIL else 0)
