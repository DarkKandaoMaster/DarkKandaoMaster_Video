# 独立核对（Python 自己算，不复用页面的 JS），输出 开发/核对结果.txt。第三版（字大、加粗、再少字；第二版：少字、拆步、3D 贯穿主体）：
#   1. 数据：graphs.json 的 G4 / G6 = ref_dfs.py 里手写的教材数据 = 03 工程 src/dfs/trace.generated.ts 里的（B 站视频用的同一份）；
#   2. 算法：页面导出的三遍遍历（先挑小的 / 先挑大的 / 链倒过来）每个事件的类型、顶点、栈、visited、序列，
#      第 3 段的拆步（到达 / 往哪走 / 退回 / 结束），DFS 序列总数，邻接表，非连通图每次调用，生成树 / 深度 / 栈最深，课堂小练 8 个起点的答案；
#   3. 逐步核对（shoot.py 导出 截图/full3d-check.json = 3D 模式、截图/full2d-check.json = 强制 2D、截图/prac*-check.json = 换了小练起点）：
#      步骤表（段 / 类型 / 段内第几 / 哪几步用 3D）、每一步屏幕上的每一行字（Python 按 README 写的规则独立生成）、
#      每一步结束时的 visited / 栈 / 序列 / 当前顶点 / 顶点状态 / 这一步放了哪些事件 / 红栅栏 / 撞南墙 / 问号、迷宫、邻接表、非连通图、伪代码、小练、生成树；
#   4. 3D 模式和 2D 模式导出的每一步完全一样；
#   5. 换了小练起点；
#   6. 每步屏幕字数（标题 + 说明；第三版目标每步平均 ≤ 10 字，和第一版、第二版比）、每步最多几行字。
# 用法：python -I verify.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ref_dfs as R  # noqa: E402

DEV = Path(__file__).resolve().parents[1]
SHOT = DEV / "截图"
VIDEO = DEV.parents[1]                       # 03-图的深度优先遍历
lines, fails = [], []


def check(name, cond, extra=""):
    s = ("通过" if cond else "失败") + " | " + name + (f" （{extra}）" if extra and not cond else "")
    print(s); lines.append(s)
    if not cond: fails.append(name)


def info(s):
    print("    " + s); lines.append("    " + s)


def head(s):
    print("\n== " + s); lines.append("\n== " + s)


vn = lambda v: f"v{v}"
vl = lambda a, sep="、": sep.join(vn(x) for x in a)
TF = lambda vis: "".join("T" if b else "F" for b in vis)

# ---------------------------------------------------------------- 1. 数据
head("1. 数据")
G = json.loads((DEV / "data" / "graphs.json").read_text(encoding="utf-8"))
check("graphs.json 的 G4 边 = 教材图 7.13（ref_dfs.E4）", [tuple(e) for e in G["G4"]["edges"]] == R.E4 and G["G4"]["n"] == R.N4)
check("graphs.json 的 G6 边 = ref_dfs.E6", [tuple(e) for e in G["G6"]["edges"]] == R.E6 and G["G6"]["n"] == R.N6)
ts = (VIDEO / "src" / "dfs" / "trace.generated.ts").read_text(encoding="utf-8")
grab = lambda pat: json.loads(re.search(pat, ts).group(1))
check("和 B 站视频工程（trace.generated.ts）的 G4 边一样", [tuple(e) for e in grab(r"export const G4 = \{ n: 8, edges: (\[.*?\]) as")] == R.E4)
check("和 B 站视频工程的 G6 边一样", [tuple(e) for e in grab(r"export const G6 = \{ n: 6, edges: (\[.*?\]) as")] == R.E6)
check("和 B 站视频工程的两条序列一样", grab(r"export const SEQ_ASC = (\[.*?\]);") == R.TEXTBOOK_SEQ and grab(r"export const SEQ_DESC = (\[.*?\]);") == [1, 3, 7, 6, 2, 5, 8, 4])
check("和 B 站视频工程的邻接表一样", grab(r"export const ADJLIST: number\[\]\[\] = (\[.*?\]);") == R.adjlist(R.N4, R.E4))

# ---------------------------------------------------------------- 参考结果
ASC, DESC = R.orders(R.N4, R.E4), R.orders(R.N4, R.E4, desc=True)
REV = {v: list(reversed(ASC[v])) for v in ASC}
EA, SA, _ = R.dfs(ASC, 1, R.N4)
ED, SD, _ = R.dfs(DESC, 1, R.N4)
ER, SR, _ = R.dfs(REV, 1, R.N4)
GROUPS = R.groups(EA)
ALL = R.all_dfs_seqs(R.N4, R.E4, 1)
CALLS = R.traverse(R.N6, R.E6)
TREE = R.tree_edges(EA)
DEPTH = R.depth_of(EA)
DMAX, DEEP = R.max_depth(EA)
ADJ = R.adjlist(R.N4, R.E4)
# 按邻接表（下标从 0 起）走一遍：链里存的是下标，换回顶点编号再走
SADJ = R.dfs({v: [i + 1 for i in ADJ[v - 1]] for v in range(1, R.N4 + 1)}, 1, R.N4)[1]

check("先挑编号小的 = 教材序列 v1 v2 v4 v8 v5 v3 v6 v7", SA == R.TEXTBOOK_SEQ)
check("链全部倒过来走 = 先挑编号大的", SR == SD)
check("按邻接表（下标）走 = 先挑编号小的", SADJ == SA)


# 第 3 段拆步（README 的规则）：每到一个顶点拆成"走到"和"往哪走"两步，退回 / 结束各一步
def walk_steps(ev):
    out = []
    for g, (a, b) in enumerate(R.groups(ev)):
        t = ev[a]["t"]
        if t == "visit":
            out.append(("arrive", a, a, g)); out.append(("look", a + 1, b, g))
        else:
            out.append((t, a, b, g))
    return out


W2 = walk_steps(EA)


def walk_texts(mode, a, b, g):
    if mode == "arrive":
        e = EA[a]
        return [f"从 {vn(e['v'])} 出发" if e["frm"] is None else f"走到 {vn(e['v'])}"]
    if mode == "done":
        return ["栈空 → 结束"]
    e = EA[max(b, a - 1)]; cur = e["stack"][-1]
    U = [w for w in ASC[cur] if not e["visited"][w - 1]]
    if mode == "look":
        L = [f"{vn(cur)} 往哪走？"]
        if not U: L.append("撞南墙！")
        elif g == 0: L.append("先挑编号小的")
        return L
    frm = EA[a]["frm"]
    assert frm == cur
    return [f"退回 {vn(frm)}", f"还能去 {vl(U)}" if U else "没路 → " + ("再退" if len(e["stack"]) > 1 else "出栈")]


first_back = next(i for i, e in enumerate(EA) if e["t"] == "back")
WALL_V = EA[first_back]["v"]; WALL_BACK_TO = EA[first_back]["frm"]
WALL_CHECKS = [e["v"] for e in EA[:first_back] if e["t"] == "check" and e["frm"] == WALL_V]
MAZE_PATH = SA[: SA.index(WALL_V) + 1]
left6 = [v for c in CALLS[1:] for v in c[2]]
# 小结 3 步：(第几步出现, 这一行)
SUMMARY = [(0, "一条路走到黑"), (0, "visited + 递归栈"), (1, "序列不唯一，表定才唯一"), (1, "调几次 = 几个连通分量"), (2, "邻接矩阵 O(n²)，邻接表 O(n + e)")]
SUMMARY_N = 3


def expected_texts(sec, kind, n, ps=6):
    if kind == "maze":
        return [["图的深度优先遍历", "撞了南墙再回头"], ["一条路走到黑"], [f"到了 {vn(WALL_V)}，往哪走？"],
                ["都插过旗 → 撞南墙！"], [f"原路退回 {vn(WALL_BACK_TO)}"], ["迷宫就是一张图"]][n]
    if kind == "tools":
        return [["visited = 插旗"], ["递归栈 = 来时的路"], ["记下访问序列"]][n]
    if kind == "walk":
        return walk_texts(*W2[n][:3], W2[n][3])
    if kind == "redo":
        return [["先挑编号大的呢？"], ["先挑大的走一遍"], ["两条都对：不唯一"], [f"从 v1 出发：共 {len(ALL)} 种"]][n]
    if kind == "adj":
        return [["给定邻接表"], ["链里存下标"], ["v1 的链：先去哪？"], ["沿链找：没来过就去"],
                ["和 ① 一样"], ["链倒过来呢？"], ["变成 ②"], ["表定了 → 唯一"]][n]
    if kind == "nc":
        k = len(CALLS)
        return [["图不连通呢？"], ["从 v1 出发"], [f"{vl(left6)} 呢？"], ["外面套一层循环"],
                [f"{vn(CALLS[1][0])} 没访问 → 再调 DFS"], [f"{vn(CALLS[2][0])} 也再调一次"], [f"调 {k} 次 = {k} 个连通分量"]][n]
    if kind == "algo":
        if n <= 3: return ["算法 7.4、7.5"]
        return ["找邻接点最费时", "邻接矩阵", "O(n²)"] + (["邻接表", "O(n + e)"] if n == 5 else [])
    if kind == "prac":
        p = R.practice(ps)
        t = [f"小练：从 {vn(ps)} 出发", "① DFS 序列", "② 栈最深几个？"]
        if n >= 2: t.append(f"→ {p['depth']} 个")
        return t
    if kind == "end":
        if n == 0: return ["DFS 生成树"]
        if n == 1: return ["抓住 v1 提起来", f"共 {DMAX} 层"]
        if n == 2: return ["栈最深 = 这一条"]
        k = n - 3
        return ["小结"] + [t for st, t in SUMMARY if st <= k]
    raise KeyError(kind)


# 期望的步骤表（段, 类型, 段内第几, 3D 模式下是否用 3D）
PLAN = [(1, "maze", n, True) for n in range(6)] + [(2, "tools", n, True) for n in range(3)] + [(3, "walk", n, True) for n in range(len(W2))] \
    + [(4, "redo", n, True) for n in range(4)] + [(5, "adj", n, False) for n in range(8)] + [(6, "nc", n, True) for n in range(7)] \
    + [(7, "algo", n, False) for n in range(6)] + [(8, "prac", n, False) for n in range(3)] \
    + [(9, "end", 0, False), (9, "end", 1, True), (9, "end", 2, True)] + [(9, "end", n, False) for n in range(3, 3 + SUMMARY_N)]
SECS = sorted({p[0] for p in PLAN})
V1_STEPS = {1: 5, 2: 2, 3: 16, 4: 3, 5: 3, 6: 3, 7: 2, 8: 3, 9: 3}
SEC_NAMES = ["走迷宫", "两样工具", "走一遍", "序列不唯一", "邻接表", "非连通图", "算法与复杂度", "课堂小练", "小结"]


def state_of(e):
    return dict(visited=TF(e["visited"]), stack=[vn(x) for x in e["stack"]], seq=[vn(x) for x in e["seq"]],
                cur=vn(e["stack"][-1]) if e["stack"] else None,
                vstate={vn(v): "in" if v in e["stack"] else "out" if e["visited"][v - 1] else "un" for v in range(1, R.N4 + 1)})


EMPTY = dict(t="-", v=0, frm=None, stack=[], visited=[False] * R.N4, seq=[])


def ev_norm(evs):
    return [(e["t"], e["v"], e["frm"], e["stack"], TF(e["visited"]), e["seq"]) for e in evs]


# ---------------------------------------------------------------- 2. 算法（页面导出的整套数据）
for tag in ("full3d", "full2d"):
    f = SHOT / f"{tag}-check.json"
    if not f.exists():
        check(f"{tag}-check.json 存在（先跑 shoot.py）", False); continue
    D = json.loads(f.read_text(encoding="utf-8"))
    head(f"2. 算法（{tag}，页面模式 = {D['mode']}）")
    check("页面的 G4 / G6 = 教材数据", [tuple(e) for e in D["G4"]["edges"]] == R.E4 and [tuple(e) for e in D["G6"]["edges"]] == R.E6)
    check(f"先挑编号小的：{len(EA)} 个事件逐个一致（类型、顶点、从哪来、栈、visited、序列）", ev_norm(D["runA"]) == ev_norm(EA))
    check(f"先挑编号大的：{len(ED)} 个事件逐个一致，序列 {vl(SD, ' ')}", ev_norm(D["runD"]) == ev_norm(ED))
    check("邻接表的链全部倒过来：事件逐个一致，序列 = 先挑编号大的", ev_norm(D["runRev"]) == ev_norm(ER))
    check(f"第 3 段拆成 {len(W2)} 步（到达 / 往哪走 / 退回 / 结束），每步包含的事件一致", [tuple(x) for x in D["walk2"]] == [(m, a, b) for m, a, b, g in W2])
    check(f"从 v1 出发的 DFS 序列共 {len(ALL)} 种（Python 用 7! 个排列逐个模拟）", D["allN"] == len(ALL) == 8)
    check("邻接表（adjvex 从 0 起，链从小到大）一致", D["adjlist"] == ADJ)
    nc_ok = len(D["nc"]) == len(CALLS) and all(p["start"] == c[0] and p["seq"] == c[2] and ev_norm(p["ev"]) == ev_norm(c[1]) for p, c in zip(D["nc"], CALLS))
    check(f"非连通图：调用 {len(CALLS)} 次（{' | '.join(vl(c[2], ' ') for c in CALLS)}），每次的事件一致；并查集数出 {R.components(R.N6, R.E6)} 个连通分量", nc_ok and len(CALLS) == R.components(R.N6, R.E6))
    check(f"生成树的边 {['v%d-v%d' % e for e in TREE]}", [tuple(e) for e in D["tree"]] == TREE)
    check("每个顶点的深度一致", {int(k): v for k, v in D["depth"].items()} == DEPTH)
    check(f"栈最深 {DMAX} 层：{vl(DEEP, ' ')}", D["deep"]["d"] == DMAX and D["deep"]["chain"] == DEEP)
    par = {b: a for a, b in TREE}
    path = [DEEP[-1]]
    while path[-1] in par: path.append(par[path[-1]])
    check("栈最深时的栈 = 生成树里从 v1 到最深顶点的那条路", list(reversed(path)) == DEEP and max(DEPTH.values()) == DMAX)
    p = list(range(R.N4 + 1)); fnd = lambda x: x if p[x] == x else fnd(p[x]); cyc = False
    for a, b in TREE:
        if fnd(a) == fnd(b): cyc = True
        p[fnd(a)] = fnd(b)
    check(f"{R.N4} 个顶点、{len(TREE)} 条边、没有回路 → 生成树", len(TREE) == R.N4 - 1 and not cyc and len({fnd(v) for v in range(1, R.N4 + 1)}) == 1)
    pa_ok = all(D["practice"][vn(s)] == dict(seq=[vn(x) for x in R.practice(s)["seq"]], depth=R.practice(s)["depth"], deep=[vn(x) for x in R.practice(s)["deep"]]) for s in range(1, R.N4 + 1))
    check("课堂小练 8 个起点：DFS 序列、栈最深几层、栈里是哪几个，全部一致", pa_ok)
    check(f"一共 {len(PLAN)} 步；步骤表（段 / 类型 / 段内第几 / 哪几步用 3D）一致", D["steps"] == len(PLAN) == len(D["stepDumps"]) and [tuple(x) for x in D["plan"]] == PLAN, str(D["plan"][:3]))

    # ------------------------------------------------------------ 3. 逐步
    head(f"3. 逐步核对（{tag}）")
    bad_t, bad_s = [], []
    nlines = 0
    for k, (d, (sec, kind, n, _)) in enumerate(zip(D["stepDumps"], PLAN)):
        if (d["sec"], d["kind"], d["n"]) != (sec, kind, n):
            bad_s.append((k, "步骤类型", (d["sec"], d["kind"], d["n"]), (sec, kind, n))); continue
        exp = expected_texts(sec, kind, n)
        nlines += len(exp)
        if d["texts"] != exp: bad_t.append((k, d["texts"], exp))
        if kind in ("tools", "walk", "redo"):
            if kind == "tools": e = EMPTY
            elif kind == "walk": m, a, b, g = W2[n]; e = EA[max(b, a - 1)]
            else: e = EMPTY if n == 0 else ED[-1]
            st = state_of(e)
            for key in ("visited", "stack", "seq", "cur", "vstate"):
                if d[key] != st[key]: bad_s.append((k, key, d[key], st[key]))
            exp_pan = ["visited", "stack", "seq"][: n + 1] if kind == "tools" else ["visited", "seq"] if kind == "redo" and n >= 2 else ["visited", "stack", "seq"]
            if d["panels"] != exp_pan: bad_s.append((k, "panels", d["panels"], exp_pan))      # 第 4 段后两步栈是空的，不画
            if kind == "walk":
                evs = [f"{EA[i]['t']}:{vn(EA[i]['v'])}" for i in range(a, b + 1)]
                bars = [f"{vn(EA[i]['frm'])}→{vn(EA[i]['v'])}" for i in range(a, b + 1) if EA[i]["t"] == "check"]
                cur = e["stack"][-1] if e["stack"] else None
                U = [w for w in ASC[cur] if not e["visited"][w - 1]] if cur and m in ("look", "back") else []
                wall = m == "look" and not U
                if d["mode"] != m or d["events"] != evs or d["bars"] != bars or d["wall"] != wall or d["qs"] != [vn(x) for x in U]:
                    bad_s.append((k, "walk", d["mode"], d["events"], d["bars"], d["wall"], d["qs"], (m, evs, bars, wall, U)))
            if kind == "redo" and d["rows"] != [[vn(x) for x in SA], st["seq"]]: bad_s.append((k, "rows", d["rows"]))
        if kind == "maze":
            flags = [] if n == 0 else [vn(x) for x in sorted(MAZE_PATH)]
            walker = vn(1 if n == 0 else WALL_V if n <= 3 else WALL_BACK_TO)
            bars = [vn(x) for x in WALL_CHECKS] if n >= 3 else []
            if sorted(d["flags"]) != sorted(flags) or d["walker"] != walker or sorted(d["bars"]) != sorted(bars): bad_s.append((k, "maze", d["flags"], d["walker"], d["bars"], flags, walker, bars))
        if kind == "adj":
            rows = []
            for v in range(1, R.N4 + 1):
                l = [w - 1 for w in (REV if n >= 5 else ASC)[v]]
                rows.append(f"{v - 1} v{v} → " + " → ".join(map(str, l)) + " ∧")
            if d["list"] != rows or d["chains"] != (n >= 1): bad_s.append((k, "list", d["list"], rows))
            exp_rows = ([["①", [vn(x) for x in SA]]] if n >= 4 else []) + ([["②", [vn(x) for x in SD]]] if n >= 6 else []) + ([["③", [vn(x) for x in SADJ]]] if n >= 3 else [])
            if d["rows"] != exp_rows: bad_s.append((k, "rows", d["rows"], exp_rows))
            if d["revSeq"] != [vn(x) for x in SD]: bad_s.append((k, "revSeq", d["revSeq"]))
        if kind == "nc":
            m = 0 if n == 0 else 1 if n <= 3 else 2 if n == 4 else len(CALLS)
            if d["calls"] != [dict(start=vn(c[0]), seq=[vn(x) for x in c[2]]) for c in CALLS[:m]] or d["count"] != m: bad_s.append((k, "nc", d["calls"], d["count"], m))
        if kind == "algo":
            if n <= 3:
                notes = {3: (3, "← 非连通：再调一次"), 6: (1, "← 插旗"), 8: (2, "← 递归 = 压栈")}
                base = ["void DFSTraverse(Graph G) {", "    for (v = 0; v < G.vexnum; ++v) visited[v] = FALSE;", "    for (v = 0; v < G.vexnum; ++v)",
                        "        if (!visited[v]) DFS(G, v);", "}", "void DFS(Graph G, int v) {", "    visited[v] = TRUE; Visit(v);",
                        "    for (w = FirstAdjVex(G, v); w >= 0; w = NextAdjVex(G, v, w))", "        if (!visited[w]) DFS(G, w);", "}"]
                code = [s + ("  " + notes[j][1] if j in notes and notes[j][0] <= n else "") for j, s in enumerate(base)]
                if d["code"] != code: bad_s.append((k, "code", d["code"], code))
            elif d["cx"] != dict(n=R.N4, e=len(R.E4), cards=n - 3): bad_s.append((k, "cx", d["cx"]))
        if kind == "prac":
            pr = R.practice(6)
            if d["start"] != "v6" or (n >= 1 and d["seq"] != [vn(x) for x in pr["seq"]]) or (n >= 2 and d["deep"] != [vn(x) for x in pr["deep"]]): bad_s.append((k, "prac", d))
        if kind == "end" and n <= 2:
            if d["tree"] != [f"v{a}-v{b}" for a, b in TREE] or d["deep"] != [vn(x) for x in DEEP] or {k2: v for k2, v in d["depth"].items()} != {vn(v): x for v, x in DEPTH.items()}: bad_s.append((k, "end", d))
    check(f"每一步屏幕上的每一行字（共 {nlines} 行）都和 Python 按规则生成的一样", not bad_t, str(bad_t[:2]))
    check("每一步结束时的状态（visited / 栈 / 序列 / 当前顶点 / 顶点颜色 / 面板 / 这一步的事件 / 红栅栏 / 撞南墙 / 问号 / 迷宫 / 邻接表 / 非连通图 / 伪代码 / 复杂度 / 小练 / 生成树）都一致", not bad_s, str(bad_s[:2]))
    walls = [d["cur"] for d in D["stepDumps"] if d.get("wall")]
    check("撞南墙出现在两步：v5 往哪走、v7 往哪走", walls == ["v5", "v7"], str(walls))

# ---------------------------------------------------------------- 4. 3D 和 2D 一样
head("4. 3D 模式和 2D 模式")
f3, f2 = SHOT / "full3d-check.json", SHOT / "full2d-check.json"
if f3.exists() and f2.exists():
    a, b = json.loads(f3.read_text(encoding="utf-8")), json.loads(f2.read_text(encoding="utf-8"))
    check("页面在 3D 测试里确实是 3D 模式、在 2D 测试里是 2D 模式", a["mode"] == "3d" and b["mode"] == "2d")
    strip = lambda ds: [{k: v for k, v in d.items() if k != "idx"} for d in ds]
    check(f"两种模式步数相同（{len(a['stepDumps'])} 步），每一步导出的字和状态完全相同", strip(a["stepDumps"]) == strip(b["stepDumps"]))

# ---------------------------------------------------------------- 5. 换了小练起点
head("5. 小练换起点（shoot.py … prac<起点>）")
for f in sorted(SHOT.glob("prac*-check.json")):
    D = json.loads(f.read_text(encoding="utf-8")); ps = int(re.search(r"prac(\d)", f.name).group(1))
    ds = [d for d in D["stepDumps"] if d["kind"] == "prac"]
    pr = R.practice(ps)
    ok_t = all(d["texts"] == expected_texts(8, "prac", d["n"], ps) for d in ds)
    ok_s = all(d["start"] == vn(ps) and (d["n"] < 1 or d["seq"] == [vn(x) for x in pr["seq"]]) and (d["n"] < 2 or d["deep"] == [vn(x) for x in pr["deep"]]) for d in ds)
    others = [d for d in D["stepDumps"] if d["kind"] != "prac"]
    base = json.loads(f3.read_text(encoding="utf-8"))["stepDumps"]
    same_rest = [{k: v for k, v in d.items() if k != "idx"} for d in others] == [{k: v for k, v in d.items() if k != "idx"} for d in base if d["kind"] != "prac"]
    check(f"小练起点 v{ps}：3 步的字和答案对（{vl(pr['seq'], ' ')}；最深 {pr['depth']} 个），别的段不受影响", ok_t and ok_s and len(ds) == 3 and same_rest)

# ---------------------------------------------------------------- 6. 字数
head("6. 每步屏幕字数（只算标题和说明这些句子，不算面板、表格、代码、顶点名字；空格不算）")
cnt = lambda ts: sum(len(re.sub(r"\s", "", t)) for t in ts)
v1f = DEV / "v1" / "full3d-check-v1.json"
v2f = DEV / "v2" / "截图" / "full3d-check.json"            # 第二版（改字号之前）留底的导出
if f3.exists():
    new = json.loads(f3.read_text(encoding="utf-8"))["stepDumps"]
    olds = [("第一版", json.loads(v1f.read_text(encoding="utf-8"))["stepDumps"] if v1f.exists() else []),
            ("第二版", json.loads(v2f.read_text(encoding="utf-8"))["stepDumps"] if v2f.exists() else [])]
    tot_n = [cnt(d["texts"]) for d in new]
    info("段 | " + " | ".join(f"{nm} 步数 / 平均字数" for nm, o in olds if o) + " | 第三版 步数 / 平均字数")
    avg = lambda xs: sum(xs) / len(xs) if xs else 0
    for sct in SECS:
        cols = [f"{len([d for d in o if d['sec'] == sct])} / {avg([cnt(d['texts']) for d in o if d['sec'] == sct]):.1f}" for nm, o in olds if o]
        nn = [cnt(d["texts"]) for d in new if d["sec"] == sct]
        info(f"{sct} {SEC_NAMES[sct - 1]} | " + " | ".join(cols) + f" | {len(nn)} / {avg(nn):.1f}")
    info("全片 | " + " | ".join(f"{len(o)} / {avg([cnt(d['texts']) for d in o]):.1f}" for nm, o in olds if o) + f" | {len(tot_n)} / {avg(tot_n):.1f}（最多 {max(tot_n)}）")
    body = [d for d in new if not (d["kind"] in ("algo", "prac") or (d["kind"] == "end" and d["n"] >= 3))]
    bn = [cnt(d["texts"]) for d in body]
    info(f"不算复杂度卡片 / 小练题目 / 小结：{len(bn)} 步，平均 {avg(bn):.1f} 字，最多 {max(bn)}")
    check(f"第三版目标：全片每步平均不超过 10 字（实际 {avg(tot_n):.1f}）", avg(tot_n) <= 10)
    for nm, o in olds:
        if o: check(f"比{nm}每步平均字数少", avg(tot_n) < avg([cnt(d["texts"]) for d in o]))
    check("除了复杂度卡片、小练题目、小结以外，每一步最多 2 行字（标题 + 一行说明）", all(len(d["texts"]) <= 2 for d in body), str([(d["sec"], d["kind"], d["n"], d["texts"]) for d in body if len(d["texts"]) > 2][:3]))
    check("每一步的标题都不超过 13 个字（v 编号算 2 个字）", all(len(re.sub(r"\s", "", d["texts"][0])) <= 13 for d in new), str([d["texts"][0] for d in new if len(re.sub(r"\s", "", d["texts"][0])) > 13]))

n = len([l for l in lines if l.startswith(("通过", "失败"))])
(DEV / "核对结果.txt").write_text("\n".join(lines) + "\n\n总结： " + (f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败") + "\n", encoding="utf-8")
print("\n总结：", f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败：" + "；".join(fails))
sys.exit(1 if fails else 0)
