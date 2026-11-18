"""《图的深度优先遍历》里所有序列、栈、visited 状态、限时题答案的暴力核对 + 画面数据生成。

    $env:PYTHONIOENCODING="utf-8"
    & $PY scripts\\check_numbers.py            # 在工程目录里跑；打印核对结果，并写 src/dfs/trace.generated.ts

画面只读 trace.generated.ts（事件序列、每一步的栈和 visited），旁白里的数字照抄本脚本的输出。

记号：严蔚敏《数据结构（C语言版）》第 7 章。顶点 v1…v8（下标 i 对应顶点表第 i-1 行，邻接表里的 adjvex 从 0 起）。
例图 G4（教材图 7.13）：边 v1-v2, v1-v3, v2-v4, v2-v5, v3-v6, v3-v7, v4-v8, v5-v8, v6-v7。
"""
from __future__ import annotations

import itertools
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "dfs" / "trace.generated.ts"

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
TEXTBOOK_DFS = [1, 2, 4, 8, 5, 3, 6, 7]


def adj_of(n: int, edges) -> dict[int, set[int]]:
    a = {v: set() for v in range(1, n + 1)}
    for u, w in edges:
        a[u].add(w)
        a[w].add(u)
    return a


ADJ4 = adj_of(N4, E4)


# ---------------------------------------------------------------- 1. 带事件的 DFS（教材 DFS 递归写法）
def dfs_trace(adj_order: dict[int, list[int]], start: int, n: int, visited=None, stack_base=None):
    """按 adj_order 给的邻接点顺序做递归 DFS，记录画面要用的每一步事件。
    事件：visit（压栈、visited 置 T、序列加一个）、check（看一个已访问的邻接点，跳过）、
         back（栈顶出栈，指针沿边退回父顶点）、done（起点出栈，栈空）。
    arc = 这个邻接点在 from 顶点的邻接表里是第几个（0 起），给邻接表那一镜高亮边结点用。"""
    visited = visited if visited is not None else {v: False for v in range(1, n + 1)}
    events = []
    stack = list(stack_base or [])
    seq = []

    def snap():
        return dict(stack=list(stack), visited=[visited[v] for v in range(1, n + 1)], seq=list(seq))

    def dfs(v: int, parent: int | None, arc: int | None):
        visited[v] = True
        stack.append(v)
        seq.append(v)
        events.append(dict(t="visit", v=v, frm=parent, arc=arc, **snap()))
        for k, w in enumerate(adj_order[v]):
            if not visited[w]:
                dfs(w, v, k)
            else:
                events.append(dict(t="check", v=w, frm=v, arc=k, **snap()))
        stack.pop()
        if parent is not None:
            events.append(dict(t="back", v=v, frm=parent, arc=None, **snap()))
        else:
            events.append(dict(t="done", v=v, frm=None, arc=None, **snap()))

    dfs(start, None, None)
    return events, seq


ASC = {v: sorted(ADJ4[v]) for v in ADJ4}           # 邻接表（链表按下标从小到大，教材画法）
DESC = {v: sorted(ADJ4[v], reverse=True) for v in ADJ4}

print("== 1. G4 上的 DFS（从 v1 出发）")
ev_asc, seq_asc = dfs_trace(ASC, 1, N4)
ev_desc, seq_desc = dfs_trace(DESC, 1, N4)
print("  先挑编号小的（= 邻接表顺序）：", seq_str(seq_asc))
print("  先挑编号大的：               ", seq_str(seq_desc))
ok(seq_asc == TEXTBOOK_DFS, "编号小的先挑 = 教材序列 v1 v2 v4 v8 v5 v3 v6 v7")
ok(seq_asc != seq_desc, "两种挑法序列不同")


def print_events(evs):
    for i, e in enumerate(evs):
        st = "[" + " ".join(name(x) for x in e["stack"]) + "]"
        vis = "".join("T" if b else "F" for b in e["visited"])
        if e["t"] == "visit":
            what = f"访问 {name(e['v'])}" + (f"（从 {name(e['frm'])} 来，链上第{e['arc']}个）" if e["frm"] else "（起点）")
        elif e["t"] == "check":
            what = f"  {name(e['frm'])} 看 {name(e['v'])}：已访问，跳过（链上第{e['arc']}个）"
        elif e["t"] == "back":
            what = f"退回：{name(e['v'])} 出栈，回到 {name(e['frm'])}"
        else:
            what = f"{name(e['v'])} 出栈，栈空，结束"
        print(f"  #{i:02d} {what:<34} 栈{st:<22} visited {vis}")


print("  -- 事件（先挑编号小的）")
print_events(ev_asc)
print("  -- 事件（先挑编号大的）")
print_events(ev_desc)
depth_asc = max(len(e["stack"]) for e in ev_asc)
depth_desc = max(len(e["stack"]) for e in ev_desc)
print(f"  栈最深：编号小的先挑 {depth_asc} 层，编号大的先挑 {depth_desc} 层")

# 第一次撞南墙：第一个 back 事件
first_back = next(i for i, e in enumerate(ev_asc) if e["t"] == "back")
fb = ev_asc[first_back]
ok(fb["v"] == 5 and fb["frm"] == 8, f"第一次回退在 v5 → v8（事件 #{first_back}）")
ok([x for x in ev_asc[first_back - 1]["stack"]] == [1, 2, 4, 8, 5], "撞南墙那一刻栈是 v1 v2 v4 v8 v5")
# 到 v5 时两个邻接点都访问过
checks_at_5 = [e["v"] for e in ev_asc if e["t"] == "check" and e["frm"] == 5]
ok(checks_at_5 == [2, 8], "v5 的邻接点 v2、v8 都已访问")
# 从 v5 一路退到 v1 之前，依次退的顶点
backs = []
for e in ev_asc[first_back:]:
    if e["t"] == "visit":
        break
    if e["t"] == "back":
        backs.append((e["v"], e["frm"]))
print("  第一段回退：", "，".join(f"{name(a)}→{name(b)}" for a, b in backs))
ok(backs == [(5, 8), (8, 4), (4, 2), (2, 1)], "第一段回退 v5→v8→v4→v2→v1")
ok(any(e["t"] == "check" and e["frm"] == 2 and e["v"] == 5 for e in ev_asc), "退回 v2 时看 v5：已访问")

# ---------------------------------------------------------------- 2. 全部 DFS 序列（暴力枚举所有挑法）
print("== 2. 从 v1 出发的全部 DFS 序列")


def all_dfs(adj, start, n):
    res = set()

    def go(stack, visited, seq):
        while stack and not any(not visited[w] for w in adj[stack[-1]]):
            stack = stack[:-1]
        if not stack:
            res.add(tuple(seq))
            return
        u = stack[-1]
        for w in sorted(adj[u]):
            if not visited[w]:
                vis2 = dict(visited)
                vis2[w] = True
                go(stack + [w], vis2, seq + [w])

    vis = {v: False for v in range(1, n + 1)}
    vis[start] = True
    go([start], vis, [start])
    return res


ALL = all_dfs(ADJ4, 1, N4)
print(f"  共 {len(ALL)} 种")
ok(tuple(seq_asc) in ALL and tuple(seq_desc) in ALL, "两条演示序列都在枚举结果里")


# 另一种独立算法：按全排列逐个模拟检查（不复用 all_dfs）
def is_dfs_seq(seq, adj) -> bool:
    if len(set(seq)) != len(seq):
        return False
    visited = {seq[0]}
    stack = [seq[0]]
    for w in seq[1:]:
        while stack and all(x in visited for x in adj[stack[-1]]):
            stack.pop()
        if not stack or w not in adj[stack[-1]] or w in visited:
            return False
        visited.add(w)
        stack.append(w)
    return len(visited) == len(adj)


brute = {(1,) + p for p in itertools.permutations(range(2, N4 + 1)) if is_dfs_seq((1,) + p, ADJ4)}
ok(brute == ALL, f"全排列 7! = 5040 个里逐个模拟，合法的也是 {len(brute)} 个，且完全相同")
# 从每个顶点出发各有多少种（只打印）
for s in range(1, N4 + 1):
    print(f"    从 {name(s)} 出发：{len(all_dfs(ADJ4, s, N4))} 种")

# ---------------------------------------------------------------- 3. 邻接表
print("== 3. 邻接表（顶点表 + 边链表，adjvex 为下标，从 0 起，按下标从小到大）")
ADJLIST = {v: [w - 1 for w in ASC[v]] for v in range(1, N4 + 1)}
for v in range(1, N4 + 1):
    print(f"  {v - 1} | {name(v)} | → " + " → ".join(str(a) for a in ADJLIST[v]) + " ∧")
n_arcs = sum(len(x) for x in ADJLIST.values())
ok(n_arcs == 2 * len(E4), f"边结点共 {n_arcs} 个 = 2e = 2×{len(E4)}")
ev_list, seq_list = dfs_trace({v: [a + 1 for a in ADJLIST[v]] for v in ADJLIST}, 1, N4)
ok(seq_list == TEXTBOOK_DFS, "按邻接表做 DFS 得到唯一序列 v1 v2 v4 v8 v5 v3 v6 v7")
# 链头插法建表（教材 CreateUDG 头插：输入边顺序 E4）时链表顺序反过来，序列随之变化（只打印，旁白不讲）
head = {v: [] for v in range(1, N4 + 1)}
for u, w in E4:
    head[u].insert(0, w)
    head[w].insert(0, u)
_, seq_head = dfs_trace(head, 1, N4)
print("  （参考）按 E4 顺序头插建表，链表顺序：", {name(v): [name(x) for x in head[v]] for v in head})
print("  （参考）这张表的 DFS：", seq_str(seq_head))

# ---------------------------------------------------------------- 4. 非连通图
print("== 4. 非连通图：DFSTraverse 调用 DFS 的次数 = 连通分量个数")
N6 = 6
E6 = [(1, 2), (1, 3), (2, 3), (4, 5)]
ADJ6 = adj_of(N6, E6)
ASC6 = {v: sorted(ADJ6[v]) for v in ADJ6}
visited6 = {v: False for v in range(1, N6 + 1)}
calls = []
events6 = []
for v in range(1, N6 + 1):            # for (v = 0; v < G.vexnum; ++v) if (!visited[v]) DFS(G, v);
    if not visited6[v]:
        evs, s = dfs_trace(ASC6, v, N6, visited=visited6)
        calls.append(s)
        events6.append(evs)
print("  各次调用访问到：", " | ".join(seq_str(c) for c in calls))


def components(n, edges):
    parent = list(range(n + 1))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, w in edges:
        parent[find(u)] = find(w)
    return len({find(v) for v in range(1, n + 1)})


ok(len(calls) == components(N6, E6) == 3, f"调用 {len(calls)} 次，并查集数出连通分量 {components(N6, E6)} 个")
ok(calls == [[1, 2, 3], [4, 5], [6]], "三次分别是 v1 v2 v3 / v4 v5 / v6")
ok(components(N4, E4) == 1, "G4 连通，只调用 1 次")

# ---------------------------------------------------------------- 5. 复杂度（只做计数核对）
print("== 5. 复杂度")
n, e = N4, len(E4)
print(f"  G4：n={n}，e={e}；邻接矩阵 DFS 扫描 n×n={n * n} 格；邻接表扫描 n+2e={n + 2 * e} 个结点")
scan_matrix = n * n
scan_list = sum(1 + len(ADJLIST[v]) for v in ADJLIST)
ok(scan_list == n + 2 * e, "邻接表：每个顶点 1 次 + 每个边结点 1 次")

# ---------------------------------------------------------------- 6. 限时题
print("== 6. 限时题：下面哪个不是 G4 从 v1 出发的 DFS 序列？")
QUIZ = [
    ("A", [1, 3, 6, 7, 2, 5, 8, 4]),
    ("B", [1, 2, 5, 8, 4, 3, 7, 6]),
    ("C", [1, 2, 4, 5, 8, 3, 6, 7]),
    ("D", [1, 3, 7, 6, 2, 4, 8, 5]),
]
answer = None
for lab, s in QUIZ:
    valid = tuple(s) in ALL
    valid2 = is_dfs_seq(tuple(s), ADJ4)
    ok(valid == valid2, f"{lab} 两种算法判断一致")
    print(f"  {lab}. {seq_str(s)}  → {'合法' if valid else '不合法'}")
    if not valid:
        answer = lab
bad = [lab for lab, s in QUIZ if tuple(s) not in ALL]
ok(len(bad) == 1, f"恰好一个不合法：{bad}")
ok(answer == "C", "答案是 C")
# 说明 C 错在哪：走到 v4 时栈顶 v4 的邻接点 v8 还没访问，v5 不是 v4 的邻接点
ok(8 in ADJ4[4] and 5 not in ADJ4[4], "C 的错：v4 的邻接点只有 v2、v8；v8 未访问，下一步只能是 v8")
ok(all(len(s) == 8 and s[0] == 1 for _, s in QUIZ), "四个选项都从 v1 出发、各 8 个顶点")
ok(sorted(tuple(s) for _, s in QUIZ) != [] and len({tuple(s) for _, s in QUIZ}) == 4, "四个选项互不相同")

# ---------------------------------------------------------------- 写 TS
def ev_ts(evs):
    return [dict(t=e["t"], v=e["v"], from_=e["frm"], arc=e["arc"], stack=e["stack"], visited=e["visited"], seq=e["seq"]) for e in evs]


def dump(x) -> str:
    return json.dumps(x, ensure_ascii=False).replace('"from_"', '"from"')


lines = [
    "// 由 scripts/check_numbers.py 生成，勿手改。顶点用 1 起的编号（1 = v1），adjvex 用 0 起的下标（教材邻接表画法）。",
    "export type DfsEvent = { t: \"visit\" | \"check\" | \"back\" | \"done\"; v: number; from: number | null; arc: number | null;",
    "  stack: number[]; visited: boolean[]; seq: number[] };",
    f"export const G4 = {{ n: {N4}, edges: {dump([list(x) for x in E4])} as [number, number][] }};",
    f"export const RUN_ASC: DfsEvent[] = {dump(ev_ts(ev_asc))} as DfsEvent[];",
    f"export const RUN_DESC: DfsEvent[] = {dump(ev_ts(ev_desc))} as DfsEvent[];",
    f"export const RUN_LIST: DfsEvent[] = {dump(ev_ts(ev_list))} as DfsEvent[];",
    f"export const SEQ_ASC = {dump(seq_asc)};",
    f"export const SEQ_DESC = {dump(seq_desc)};",
    f"export const ALL_DFS_COUNT = {len(ALL)};",
    f"export const ADJLIST: number[][] = {dump([ADJLIST[v] for v in range(1, N4 + 1)])};",
    f"export const G6 = {{ n: {N6}, edges: {dump([list(x) for x in E6])} as [number, number][] }};",
    f"export const G6_CALLS: DfsEvent[][] = {dump([ev_ts(x) for x in events6])} as DfsEvent[][];",
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
