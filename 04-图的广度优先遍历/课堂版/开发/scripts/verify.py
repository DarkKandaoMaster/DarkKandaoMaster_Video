# 独立核对（Python 自己算，不复用页面的 JS），输出 开发/核对结果.txt：
#   1. 数据：graphs.json 的 G4 / G6 = ref_bfs.py 里手写的教材数据 = 04 工程 src/bfs/trace.generated.ts 里的（B 站视频用的同一份），
#      连 28 个事件（类型、顶点、从哪来、队列、visited、序列）都和视频工程逐个比；
#   2. 算法：页面导出的三遍遍历（先挑小的 / 先挑大的 / 链倒过来）每个事件，第 3 段的拆步，分层（层号 = 最短边数，用"枚举所有简单路径"另算一遍），
#      水波里每个顶点在第几圈，出队才标记的反例，BFS 序列总数（7! 个排列暴力数），邻接表，非连通图每次调用，BFS 树 / DFS 树，课堂小练 8 个起点；
#   3. 逐步核对（shoot.py 导出 截图/full3d-check.json = 3D、截图/full2d-check.json = 强制 2D）：
#      步骤表（段 / 类型 / 段内第几 / 哪几步用 3D）、每一步屏幕上的每一行字（Python 按 README 写的规则独立生成）、
#      每一步结束时的 visited / 队列 / 序列 / 小人站在哪 / 顶点颜色 / 面板 / 这一步的事件 / 红栅栏 / 问号 / 水波 / 反例 / 邻接表 / 非连通图 / 伪代码 / 复杂度 / 生成树 / 小练 / 小结；
#   4. 3D 模式和 2D 模式导出的每一步完全一样；
#   5. 换了小练起点（截图/prac*-check.json）；
#   6. 每步屏幕字数（第三版目标：每步平均 ≤ 10 字；和本页第二版 开发/v2 比）、每步最多几行字、标题字数。
# 用法：python -I verify.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ref_bfs as R  # noqa: E402

DEV = Path(__file__).resolve().parents[1]
SHOT = DEV / "截图"
VIDEO = DEV.parents[1]                       # 04-图的广度优先遍历
V2_CHECK = DEV / "v2" / "截图" / "full3d-check.json"            # 第二版（改字号之前）留底的导出，用来比字数
DFS_CHECK = VIDEO.parent / "03-图的深度优先遍历" / "课堂版" / "开发" / "截图" / "full3d-check.json"
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
check("graphs.json 的 G4 边 = 教材图 7.13（ref_bfs.E4）", [tuple(e) for e in G["G4"]["edges"]] == R.E4 and G["G4"]["n"] == R.N4)
check("graphs.json 的 G6 边 = ref_bfs.E6", [tuple(e) for e in G["G6"]["edges"]] == R.E6 and G["G6"]["n"] == R.N6)
ts = (VIDEO / "src" / "bfs" / "trace.generated.ts").read_text(encoding="utf-8")


def grab(name):
    line = next(l for l in ts.splitlines() if l.startswith(f"export const {name}"))
    rhs = line.split(" = ", 1)[1].rstrip(";")
    rhs = re.sub(r" as [\w\[\], ]+$", "", rhs)
    return json.loads(rhs)


check("和 B 站视频工程（trace.generated.ts）的 G4 边一样", [tuple(e) for e in json.loads(re.search(r"G4 = \{ n: 8, edges: (\[.*?\]) as", ts).group(1))] == R.E4)
check("和 B 站视频工程的 G6 边一样", [tuple(e) for e in json.loads(re.search(r"G6 = \{ n: 6, edges: (\[.*?\]) as", ts).group(1))] == R.E6)
check("和 B 站视频工程的两条序列一样（先挑小的 = 教材序列）", grab("SEQ_ASC") == R.TEXTBOOK_SEQ and grab("SEQ_DESC") == [1, 3, 2, 7, 6, 5, 4, 8])
check("和 B 站视频工程的分层一样", grab("LAYERS: number[][]") == R.layers_by_sets(R.N4, R.E4, 1))
check("和 B 站视频工程的邻接表一样", grab("ADJLIST: number[][]") == R.adjlist(R.N4, R.E4))
check("和 B 站视频工程的反例一样（v5 出队后队列 v6 v7 v8 v8）、序列种数一样（8 种）", grab("WRONG_QUEUE_AFTER_V5") == [6, 7, 8, 8] and grab("ALL_BFS_COUNT") == 8)

# ---------------------------------------------------------------- 参考结果
ASC, DESC = R.orders(R.N4, R.E4), R.orders(R.N4, R.E4, desc=True)
REV = {v: list(reversed(ASC[v])) for v in ASC}
RA, RD, RR = R.bfs(ASC, 1, R.N4), R.bfs(DESC, 1, R.N4), R.bfs(REV, 1, R.N4)
EA, ED, ER = RA["ev"], RD["ev"], RR["ev"]
SA, SD = RA["seq"], RD["seq"]
LAYERS = R.layers_by_sets(R.N4, R.E4, 1)
LAYER = {v: k for k, L in enumerate(LAYERS) for v in L}
MAXL = len(LAYERS) - 1
SHORT = R.shortest_by_paths(R.N4, R.E4, 1)
ALL = R.all_bfs_seqs(R.N4, R.E4, 1)
CALLS = R.traverse(R.N6, R.E6)
TREE = sorted((p, c) for c, p in RA["parent"].items())
FAR = LAYERS[-1]
PATH = R.path_to(RA["parent"], FAR[0])
DPAR, DDEP, _ = R.dfs_tree(ASC, 1)
DFS_LEVELS = max(DDEP.values()) + 1
ADJ = R.adjlist(R.N4, R.E4)
SADJ = R.bfs({v: [i + 1 for i in ADJ[v - 1]] for v in range(1, R.N4 + 1)}, 1, R.N4)["seq"]
WLOG, WPUSH = R.mark_on_deq(ASC, 1, R.N4)

vid = grab("RUN_ASC: BEvent[]")
check(f"和 B 站视频工程的 {len(EA)} 个事件逐个一致（类型、顶点、从哪来、队列、visited、序列）",
      [(e["t"], e["v"], e["from"], e["queue"], e["visited"], e["seq"]) for e in vid] == [(e["t"], e["v"], e["frm"], e["queue"], e["visited"], e["seq"]) for e in EA])
check("先挑编号小的 = 教材序列 v1 v2 v3 v4 v5 v6 v7 v8", SA == R.TEXTBOOK_SEQ)
check("链全部倒过来走 = 先挑编号大的", RR["seq"] == SD)
check("按邻接表（下标）走 = 先挑编号小的", SADJ == SA)
check("层号（按层扩展集合）= BFS 算出的层号 = 枚举全部简单路径得到的最短边数", LAYER == RA["layer"] == SHORT)
check(f"{len(ALL)} 种 BFS 序列每一种的层都和分层一致（同层顶点挨在一起）", all(sorted(LAYER[v] for v in s) == [LAYER[v] for v in s] for s in ALL))


# 第 3 段拆步（README 的规则）：起点一步；每出队一个顶点拆"vX 出队""vX 的邻接点"两步；
# 第一次看完邻接点后插"下一个出队的是谁？"；看完邻接点后队里正好是最大的一层时插"现在队里是第几层？""正好是第 k 层"；队空一步；最后"序列一层一层排好"
BIG = max(range(len(LAYERS)), key=lambda k: (len(LAYERS[k]), -k))


def walk_steps(ev):
    out, nd = [], 0
    for g, (a, b) in enumerate(R.groups(ev)):
        t = ev[a]["t"]
        if t == "visit": out.append(("start", a, a, g, False))
        elif t == "deq":
            out.append(("deq", a, a, g, False)); out.append(("look", a + 1, b, g, nd == 0))
            if nd == 0: out.append(("askNext", b + 1, b, g, False))
            if ev[b]["queue"] == LAYERS[BIG]: out.append(("askLayer", b + 1, b, g, False)); out.append(("layer", b + 1, b, g, False))
            nd += 1
        else: out.append(("done", a, b, g, False))
    out.append(("layers", len(ev), len(ev) - 1, -1, False))
    return out


W2 = walk_steps(EA)


def walk_texts(m, a, b, first):
    if m == "start": return [f"从 {vn(EA[a]['v'])} 出发"]
    if m == "deq": return [f"{vn(EA[a]['v'])} 出队"]
    if m == "look":
        u = EA[a - 1]["v"]; enq = [e for e in EA[a:b + 1] if e["t"] == "enq"]
        if not enq: return [f"{vn(u)} 的邻接点都来过"]
        return [f"{vn(u)} 的邻接点入队"] + (["先挑编号小的"] if first else [])
    if m == "askNext": return ["下一个出队？"]
    if m == "askLayer": return ["队里是第几层？"]
    if m == "layer": return [f"正好第 {BIG} 层"]
    if m == "done": return ["队空 → 结束"]
    return ["按层排好"]


# 第 4 段：第一个"看到的邻接点已经插旗、而且还在队里"的事件（v5 看 v8）
MI = next(i for i, e in enumerate(EA) if e["t"] == "check" and e["inq"])
MU, MW = EA[MI]["frm"], EA[MI]["v"]
MG = next((a, b) for a, b in R.groups(EA) if a <= MI <= b)
WAT = next(l for l in WLOG if l["u"] == MU and not l["skip"])
WDUP = next(x for x in WAT["push"] if WAT["queue"].count(x) >= 2)
POND = [("title", None)] + [x for L in range(MAXL + 1) for x in ([("ask", L)] if L == MAXL else []) + [("ring", L)]] + [("flat", None)]
# 小结 4 步：(第几步出现, 这一行的字)
SUMMARY = [(0, ["一条路走到黑", "层层扩散"]), (1, ["栈", "队列"]), (1, ["进栈就插旗", "入队就插旗"]), (2, ["树多深，栈多深", "层号 = 最短边数"]),
           (3, ["序列不唯一，表定才唯一"]), (3, ["调几次 = 几个连通分量"]), (3, ["邻接矩阵 O(n²)，邻接表 O(n + e)"])]
SUMMARY_N = 4
SUM_UPTO = lambda n: [r for st, r in SUMMARY if st <= n]
left6 = [v for c in CALLS[1:] for v in c["seq"]]
D_FIRST = SD[1]                               # 先挑大的时 v1 之后第一个出队的顶点


def expected_texts(sec, kind, n, ps=6):
    if kind == "pond":
        k, L = POND[n]
        return {"title": ["图的广度优先遍历", "一圈一圈往外推"], "ask": [f"第 {L} 圈碰到谁？"], "flat": ["第几圈 = 第几层"]}.get(k) \
            or ([f"石子落在 {vn(1)}"] if L == 0 else [f"第 {L} 圈"])
    if kind == "tools":
        return [["visited = 插旗"], ["队列：先进先出"], ["队尾进，队头出"], ["记下访问序列"]][n]
    if kind == "walk":
        m, a, b, g, first = W2[n]; return walk_texts(m, a, b, first)
    if kind == "mark":
        return [[f"{vn(MW)} 什么时候插的旗？"], ["入队时就插了"], ["出队才插旗呢？"], [f"{vn(MU)} 又把 {vn(WDUP)} 入队"], [f"{vn(WDUP)} 进队两次！", "所以：入队就插旗"]][n]
    if kind == "redo":
        return [["先挑编号大的呢？"], ["先挑大的走一遍"], [f"{vn(D_FIRST)} 先出，它的先进"], ["两条都对：不唯一"], [f"从 v1 出发：共 {len(ALL)} 种"]][n]
    if kind == "adj":
        return [["给定邻接表"], ["链里存下标"], ["v1 的链：谁先入队？"], ["出队一个，沿链扫"], ["和 ① 一样"], ["链倒过来呢？"], ["变成 ②"], ["表定了 → 唯一"]][n]
    if kind == "lift":
        return [["BFS 生成树"], ["抓住 v1 提起来", f"共 {MAXL + 1} 层"], [f"{vn(FAR[0])} 离 v1 最少几条边？"], [f"{len(PATH) - 1} 条边 = 第 {MAXL} 层"],
                ["层号 = 最短边数"], [f"DFS {DFS_LEVELS} 层，BFS {MAXL + 1} 层"]][n]
    if kind == "nc":
        k = len(CALLS)
        return [["图不连通呢？"], ["从 v1 出发"], [f"{vl(left6)} 呢？"], ["外面套一层循环"],
                [f"{vn(CALLS[1]['start'])} 没访问 → 再调 BFS"], [f"{vn(CALLS[2]['start'])} 也再调一次"], [f"调 {k} 次 = {k} 个连通分量"]][n]
    if kind == "algo":
        if n <= 3: return ["算法 7.6"]
        return ["找邻接点最费时", "邻接矩阵", "O(n²)"] + (["邻接表", "O(n + e)"] if n == 5 else [])
    if kind == "prac":
        p = R.practice(ps)
        t = [f"小练：从 {vn(ps)} 出发", "① BFS 序列", "② 最远第几层？"]
        if n >= 2: t.append(f"→ 第 {p['maxl']} 层：{vl(p['far'])}")
        return t
    if kind == "end":
        return ["小结", "DFS", "BFS"] + [t for r in SUM_UPTO(n) for t in r]
    raise KeyError(kind)


# 期望的步骤表（段, 类型, 段内第几, 3D 模式下是否用 3D）
PLAN = [(1, "pond", n, True) for n in range(len(POND))] + [(2, "tools", n, True) for n in range(4)] + [(3, "walk", n, True) for n in range(len(W2))] \
    + [(4, "mark", n, True) for n in range(5)] + [(5, "redo", n, True) for n in range(5)] + [(5, "adj", n, False) for n in range(8)] \
    + [(6, "lift", n, True) for n in range(6)] + [(7, "nc", n, True) for n in range(7)] + [(7, "algo", n, False) for n in range(6)] \
    + [(8, "prac", n, False) for n in range(3)] + [(9, "end", n, False) for n in range(SUMMARY_N)]
SECS = sorted({p[0] for p in PLAN})
SEC_NAMES = ["水波", "两样工具", "走一遍", "入队就标记", "序列唯一吗", "层号 = 最短边数", "非连通图与算法", "课堂小练", "小结"]


def state_of(e, start):
    cur = e["cur"] if e["cur"] is not None else (start if e["t"] == "visit" else None)
    return dict(visited=TF(e["visited"]), queue=[vn(x) for x in e["queue"]], seq=[vn(x) for x in e["seq"]], cur=vn(cur) if cur else None,
                vstate={vn(v): "un" if not e["visited"][v - 1] else "in" if v in e["queue"] else "out" for v in range(1, R.N4 + 1)})


EMPTY = dict(t="-", v=0, frm=None, queue=[], visited=[False] * R.N4, seq=[], cur=None)
ev_norm = lambda evs: [(e["t"], e["v"], e["frm"], e["prev"], e["queue"], TF(e["visited"]), e["seq"], e["cur"]) for e in evs]
CODE = ["void BFSTraverse(Graph G) {", "  for (v = 0; v < G.vexnum; ++v) visited[v] = FALSE;", "  InitQueue(Q);", "  for (v = 0; v < G.vexnum; ++v)",
        "    if (!visited[v]) {", "      visited[v] = TRUE; Visit(v);", "      EnQueue(Q, v);", "      while (!QueueEmpty(Q)) {", "        DeQueue(Q, u);",
        "        for (w = FirstAdjVex(G, u); w >= 0; w = NextAdjVex(G, u, w))", "          if (!visited[w]) {", "            visited[w] = TRUE; Visit(w);",
        "            EnQueue(Q, w);", "          }", "      }", "    }", "}"]
NOTES = {11: (1, "← 入队就插旗"), 8: (2, "← 出队一个"), 4: (3, "← 非连通：再开一次")}

# ---------------------------------------------------------------- 2. 算法（页面导出的整套数据）
for tag in ("full3d", "full2d"):
    f = SHOT / f"{tag}-check.json"
    if not f.exists():
        check(f"{tag}-check.json 存在（先跑 shoot.py）", False); continue
    D = json.loads(f.read_text(encoding="utf-8"))
    head(f"2. 算法（{tag}，页面模式 = {D['mode']}）")
    check("页面的 G4 / G6 = 教材数据", [tuple(e) for e in D["G4"]["edges"]] == R.E4 and [tuple(e) for e in D["G6"]["edges"]] == R.E6)
    check(f"先挑编号小的：{len(EA)} 个事件逐个一致（类型、顶点、从哪来、小人从哪跳、队列、visited、序列、当前顶点）", ev_norm(D["runA"]) == ev_norm(EA))
    check(f"先挑编号大的：{len(ED)} 个事件逐个一致，序列 {vl(SD, ' ')}", ev_norm(D["runD"]) == ev_norm(ED))
    check("邻接表的链全部倒过来：事件逐个一致，序列 = 先挑编号大的", ev_norm(D["runRev"]) == ev_norm(ER))
    check(f"一按一步的分组（{len(R.groups(EA))} 组）一致", [tuple(x) for x in D["walk"]] == R.groups(EA))
    check(f"第 3 段拆成 {len(W2)} 步（起点 / 出队 / 看邻接点 / 两个提问 / 队空 / 按层排），每步包含的事件一致", [tuple(x) for x in D["walk2"]] == [(m, a, b) for m, a, b, g, fi in W2])
    check(f"分层 {LAYERS}，每个顶点的层号一致", D["layers"] == LAYERS and {int(k): v for k, v in D["layer"].items()} == LAYER)
    check(f"第 1 段水波：每个顶点正好在第（层号）圈上", D["pond"] == {vn(v): LAYER[v] for v in range(1, R.N4 + 1)})
    check(f"从 v1 出发的 BFS 序列共 {len(ALL)} 种（Python 用 7! 个排列逐个检查）", D["allN"] == len(ALL) == 8)
    check("邻接表（adjvex 从 0 起，链从小到大）一致", D["adjlist"] == ADJ)
    nc_ok = len(D["nc"]) == len(CALLS) and all(p["start"] == c["start"] and p["seq"] == c["seq"] and
                                               [(e["t"], e["v"], e["frm"], e["queue"], TF(e["visited"]), e["seq"]) for e in p["ev"]] ==
                                               [(e["t"], e["v"], e["frm"], e["queue"], TF(e["visited"]), e["seq"]) for e in c["ev"]] for p, c in zip(D["nc"], CALLS))
    check(f"非连通图：调用 {len(CALLS)} 次（{' | '.join(vl(c['seq'], ' ') for c in CALLS)}），每次的事件一致；并查集数出 {R.components(R.N6, R.E6)} 个连通分量",
          nc_ok and len(CALLS) == R.components(R.N6, R.E6))
    check(f"BFS 树的边 {['v%d-v%d' % e for e in TREE]}", sorted(tuple(e) for e in D["tree"]) == TREE)
    check(f"最远的 {vl(FAR)} 在第 {MAXL} 层，树上的路 {vl(PATH, ' ')} 正好 {MAXL} 条边", D["path"] == PATH and len(PATH) - 1 == MAXL == SHORT[FAR[0]])
    check(f"对比用的 DFS 树：深度一致，共 {DFS_LEVELS} 层", {int(k): v for k, v in D["dfs"]["depth"].items()} == DDEP and D["dfs"]["levels"] == DFS_LEVELS
          and {int(k): v for k, v in D["dfs"]["parent"].items()} == DPAR)
    W = D["wrong"]
    check(f"反例（出队才标记）：{vn(MU)} 出队后队列 {vl(WAT['queue'], ' ')}，{vn(WDUP)} 进了两次队；入队顺序 {vl(WPUSH, ' ')}",
          W["log"] == WLOG and W["pushes"] == WPUSH and W["after"] == WAT["queue"] == [6, 7, 8, 8] and W["dup"] == WDUP == 8
          and W["before"] == WAT["queue"][:len(WAT["queue"]) - len(WAT["push"])] and W["u"] == MU and W["w"] == MW and W["i"] == MI
          and W["unmark"] == [v for v in EA[MG[1]]["queue"] if not WAT["marked"][v - 1]])
    arcs = [dict(u=u, kids=[e["v"] for e in ED if e["t"] == "enq" and e["frm"] == u]) for u in R.layers_by_sets(R.N4, R.E4, 1)[1][::-1]]
    check(f"第 5 段：先挑大的时 {vl([a['u'] for a in arcs])} 依次出队，各自带进 {' / '.join(vl(a['kids']) for a in arcs)}", D["arcs"] == arcs)
    pa_ok = all(D["practice"][vn(s)] == dict(seq=[vn(x) for x in R.practice(s)["seq"]], layers=[[vn(x) for x in L] for L in R.practice(s)["layers"]],
                                            maxL=R.practice(s)["maxl"], far=[vn(x) for x in R.practice(s)["far"]], path=[vn(x) for x in R.practice(s)["path"]]) for s in range(1, R.N4 + 1))
    check("课堂小练 8 个起点：BFS 序列、分层、最远第几层、最远的是谁、树上的路，全部一致", pa_ok)
    check(f"一共 {len(PLAN)} 步；步骤表（段 / 类型 / 段内第几 / 哪几步用 3D）一致", D["steps"] == len(PLAN) == len(D["stepDumps"]) and [tuple(x) for x in D["plan"]] == PLAN)
    check("每段第一步的位置一致", {int(k): v for k, v in D["secFirst"].items()} == {s: next(i for i, p in enumerate(PLAN) if p[0] == s) for s in SECS})

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
        if kind == "pond":
            pk, L = POND[n]
            top = MAXL if pk == "flat" else (L - 1 if pk == "ask" else L if pk == "ring" else -1)
            lit = [] if pk in ("title", "flat") else sorted(vn(v) for l in range(top + 1) for v in LAYERS[l])
            exp_p = dict(lit=lit, rings=list(range(1, top + 1)), labels=list(range(0, top + 1)), ask=pk == "ask", flat=pk == "flat")
            if {x: d[x] for x in exp_p} != exp_p: bad_s.append((k, "pond", d, exp_p))
        if kind in ("tools", "walk", "redo", "mark"):
            if kind == "tools": e, st0 = EMPTY, 1
            elif kind == "walk": m, a, b, g, fi = W2[n]; e = EA[max(b, a - 1)]
            elif kind == "redo": e = EMPTY if n == 0 else ED[-1]
            else: e = EA[MG[1]]
            st = state_of(e, 1)
            if kind == "mark" and n >= 2:
                st["visited"] = TF(WAT["marked"])
                q = WAT["queue"][:len(WAT["queue"]) - len(WAT["push"])]
                st["queue"] = [vn(x) for x in q] + ([vn(WDUP) + "*"] if n >= 3 else [])
            for key in ("visited", "queue", "seq", "cur") + (("vstate",) if kind != "mark" else ()):
                if d[key] != st[key]: bad_s.append((k, key, d[key], st[key]))
            exp_pan = ["visited", "queue", "queueEnds", "seq"][: n + 1] if kind == "tools" else ["visited", "queue", "queueEnds"] if kind == "mark" and n >= 2 else ["visited", "queue", "queueEnds", "seq"]
            if d["panels"] != exp_pan: bad_s.append((k, "panels", d["panels"], exp_pan))      # 反例（mark 第 3～5 步）不显示访问序列
            if kind == "walk":
                evs = [f"{EA[i]['t']}:{vn(EA[i]['v'])}" for i in range(a, b + 1)]
                bars = [f"{vn(EA[i]['frm'])}→{vn(EA[i]['v'])}" for i in range(a, b + 1) if EA[i]["t"] == "check"] if m == "look" else []
                if d["mode"] != m or d["events"] != evs or d["bars"] != bars: bad_s.append((k, "walk", d["mode"], d["events"], d["bars"], (m, evs, bars)))
                if m == "askNext" and d.get("ask") != vn(e["queue"][0]): bad_s.append((k, "ask", d.get("ask")))
                if m == "layer" and d.get("hiLayer") != [vn(x) for x in LAYERS[BIG]]: bad_s.append((k, "hiLayer", d.get("hiLayer")))
                if m == "layers" and d.get("layers") != [LAYER[v] for v in SA]: bad_s.append((k, "layers", d.get("layers")))
            if kind == "redo" and d["rows"] != [[vn(x) for x in SA], st["seq"]]: bad_s.append((k, "rows", d["rows"]))
            if kind == "mark":
                checks = [EA[i] for i in range(MG[0], MG[1] + 1) if EA[i]["t"] == "check"]
                marked = (lambda v: e["visited"][v - 1]) if n <= 1 else (lambda v: WAT["marked"][v - 1])
                flags = sorted(vn(v) for v in range(1, R.N4 + 1) if marked(v))
                bars = [f"{vn(c['frm'])}→{vn(c['v'])}" for c in checks if marked(c["v"])]
                if d["flags"] != flags or d["bars"] != bars or d["ghost"] != (n >= 3): bad_s.append((k, "mark", d["flags"], d["bars"], d["ghost"], flags, bars))
        if kind == "adj":
            rows = [f"{v - 1} v{v} → " + " → ".join(str(w - 1) for w in (REV if n >= 5 else ASC)[v]) + " ∧" for v in range(1, R.N4 + 1)]
            if d["list"] != rows or d["chains"] != (n >= 1): bad_s.append((k, "list", d["list"], rows))
            exp_rows = ([["①", [vn(x) for x in SA]]] if n >= 4 else []) + ([["②", [vn(x) for x in SD]]] if n >= 6 else []) + ([["③", [vn(x) for x in SADJ]]] if n >= 3 else [])
            if d["rows"] != exp_rows: bad_s.append((k, "rows", d["rows"], exp_rows))
            if d["revSeq"] != [vn(x) for x in SD]: bad_s.append((k, "revSeq", d["revSeq"]))
        if kind == "lift":
            if sorted(d["tree"]) != sorted(f"v{a}-v{b}" for a, b in TREE) or d["layer"] != {vn(v): LAYER[v] for v in range(1, R.N4 + 1)} \
                    or d.get("path") != ([vn(x) for x in PATH] if n >= 3 else None) or d.get("dfsDepth") != ({vn(v): DDEP[v] for v in range(1, R.N4 + 1)} if n == 5 else None):
                bad_s.append((k, "lift", d))
        if kind == "nc":
            m = 0 if n == 0 else 1 if n <= 3 else 2 if n == 4 else len(CALLS)
            if d["calls"] != [dict(start=vn(c["start"]), seq=[vn(x) for x in c["seq"]]) for c in CALLS[:m]] or d["count"] != m: bad_s.append((k, "nc", d["calls"], d["count"], m))
        if kind == "algo":
            if n <= 3:
                code = [s + ("  " + NOTES[j][1] if j in NOTES and NOTES[j][0] <= n else "") for j, s in enumerate(CODE)]
                if d["code"] != code: bad_s.append((k, "code", d["code"], code))
            elif d["cx"] != dict(n=R.N4, e=len(R.E4), cards=n - 3): bad_s.append((k, "cx", d["cx"]))
        if kind == "prac":
            pr = R.practice(6)
            exp_p = dict(start="v6")
            if n >= 1: exp_p["seq"] = [vn(x) for x in pr["seq"]]
            if n >= 2: exp_p.update(maxL=pr["maxl"], far=[vn(x) for x in pr["far"]], path=[vn(x) for x in pr["path"]], layers=[pr["layer"][v] for v in pr["seq"]])
            if {x: d.get(x) for x in exp_p} != exp_p or set(d) - {"idx", "sec", "kind", "n", "texts"} != set(exp_p): bad_s.append((k, "prac", d, exp_p))
        if kind == "end" and d["rows"] != SUM_UPTO(n): bad_s.append((k, "end", d["rows"]))
    check(f"每一步屏幕上的每一行字（共 {nlines} 行）都和 Python 按规则生成的一样", not bad_t, str(bad_t[:2]))
    check("每一步结束时的状态（visited / 队列 / 序列 / 小人站在哪 / 顶点颜色 / 面板 / 这一步的事件 / 红栅栏 / 问号 / 水波 / 反例 / 邻接表 / 生成树 / 非连通图 / 伪代码 / 复杂度 / 小练 / 小结）都一致", not bad_s, str(bad_s[:2]))
    skips = [d["texts"][0].split(" ")[0] for d in D["stepDumps"] if d["kind"] == "walk" and d["texts"][0].endswith("的邻接点都来过")]
    exp_skips = [vn(EA[a - 1]["v"]) for m, a, b, g, fi in W2 if m == "look" and not any(EA[i]["t"] == "enq" for i in range(a, b + 1))]
    check(f"\"vX 的邻接点都来过\"出现在 {len(exp_skips)} 步：{'、'.join(exp_skips)} 的邻接点", skips == exp_skips == ["v5", "v6", "v7", "v8"], str(skips))

# ---------------------------------------------------------------- 4. 3D 和 2D 一样
head("4. 3D 模式和 2D 模式")
f3, f2 = SHOT / "full3d-check.json", SHOT / "full2d-check.json"
if f3.exists() and f2.exists():
    a, b = json.loads(f3.read_text(encoding="utf-8")), json.loads(f2.read_text(encoding="utf-8"))
    check("页面在 3D 测试里确实是 3D 模式、在 2D 测试里是 2D 模式", a["mode"] == "3d" and b["mode"] == "2d")
    strip = lambda ds: [{k: v for k, v in d.items() if k != "idx"} for d in ds]
    check(f"两种模式步数相同（{len(a['stepDumps'])} 步），每一步导出的字和状态完全相同", strip(a["stepDumps"]) == strip(b["stepDumps"]))
    check("两种模式导出的整套数据（遍历、分层、反例、小练……）完全相同", {k: v for k, v in a.items() if k not in ("stepDumps", "mode")} == {k: v for k, v in b.items() if k not in ("stepDumps", "mode")})

# ---------------------------------------------------------------- 5. 换了小练起点
head("5. 小练换起点（shoot.py … prac<起点>）")
for f in sorted(SHOT.glob("prac*-check.json")):
    D = json.loads(f.read_text(encoding="utf-8")); ps = int(re.search(r"prac(\d)", f.name).group(1))
    ds = [d for d in D["stepDumps"] if d["kind"] == "prac"]
    pr = R.practice(ps)
    ok_t = all(d["texts"] == expected_texts(8, "prac", d["n"], ps) for d in ds)
    ok_s = all(d["start"] == vn(ps) and (d["n"] < 1 or d["seq"] == [vn(x) for x in pr["seq"]]) and
               (d["n"] < 2 or (d["maxL"] == pr["maxl"] and d["far"] == [vn(x) for x in pr["far"]] and d["path"] == [vn(x) for x in pr["path"]]
                               and d["layers"] == [pr["layer"][v] for v in pr["seq"]])) for d in ds)
    others = [d for d in D["stepDumps"] if d["kind"] != "prac"]
    base = json.loads(f3.read_text(encoding="utf-8"))["stepDumps"]
    same_rest = [{k: v for k, v in d.items() if k != "idx"} for d in others] == [{k: v for k, v in d.items() if k != "idx"} for d in base if d["kind"] != "prac"]
    check(f"小练起点 v{ps}（{D['mode']}）：3 步的字和答案对（{vl(pr['seq'], ' ')}；最远第 {pr['maxl']} 层 {vl(pr['far'])}），别的段不受影响", ok_t and ok_s and len(ds) == 3 and same_rest)

# ---------------------------------------------------------------- 6. 字数
head("6. 每步屏幕字数（只算标题和说明这些句子，不算面板、表格、代码、顶点名字；空格不算）")
cnt = lambda ts: sum(len(re.sub(r"\s", "", t)) for t in ts)
if f3.exists():
    new = json.loads(f3.read_text(encoding="utf-8"))["stepDumps"]
    old = json.loads(V2_CHECK.read_text(encoding="utf-8"))["stepDumps"] if V2_CHECK.exists() else []
    tot_n = [cnt(d["texts"]) for d in new]
    info("段 | 步数 | 平均字数 | 最多")
    for s in SECS:
        nn = [cnt(d["texts"]) for d in new if d["sec"] == s]
        info(f"{s} {SEC_NAMES[s - 1]} | {len(nn)} | {sum(nn) / len(nn):.1f} | {max(nn)}")
    info(f"全片 | {len(tot_n)} | {sum(tot_n) / len(tot_n):.1f} | {max(tot_n)}")
    body = [d for d in new if not (d["kind"] in ("algo", "prac", "end"))]
    bn = [cnt(d["texts"]) for d in body]
    info(f"不算复杂度卡片 / 小练题目 / 小结：{len(bn)} 步，平均 {sum(bn) / len(bn):.1f} 字，最多 {max(bn)}")
    check(f"第三版目标：全片每步平均不超过 10 字（实际 {sum(tot_n) / len(tot_n):.1f}）", sum(tot_n) / len(tot_n) <= 10)
    if old:
        to = [cnt(d["texts"]) for d in old]
        bo = [cnt(d["texts"]) for d in old if d["kind"] not in ("algo", "prac", "end")]
        info(f"对照本页第二版（开发/v2）：{len(to)} 步，平均 {sum(to) / len(to):.1f} 字；不算卡片 / 小练 / 小结 {len(bo)} 步，平均 {sum(bo) / len(bo):.1f} 字")
        check("比第二版每步平均字数少", sum(tot_n) / len(tot_n) < sum(to) / len(to))
    if DFS_CHECK.exists():
        dn = [cnt(d["texts"]) for d in json.loads(DFS_CHECK.read_text(encoding="utf-8"))["stepDumps"]]
        info(f"参考：DFS 课堂版当前导出 {len(dn)} 步，平均 {sum(dn) / len(dn):.1f} 字")
    check("除了复杂度卡片、小练题目、小结以外，每一步最多 2 行字（标题 + 一行说明）", all(len(d["texts"]) <= 2 for d in body),
          str([(d["sec"], d["kind"], d["n"], d["texts"]) for d in body if len(d["texts"]) > 2][:3]))
    long = [d["texts"][0] for d in new if len(re.sub(r"\s", "", d["texts"][0])) > 13]
    check("每一步的标题都不超过 13 个字（v 编号算 2 个字）", not long, str(long))
    info("最长的标题：" + max((d["texts"][0] for d in new), key=lambda t: len(re.sub(r"\s", "", t))))

n = len([l for l in lines if l.startswith(("通过", "失败"))])
(DEV / "核对结果.txt").write_text("\n".join(lines) + "\n\n总结： " + (f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败") + "\n", encoding="utf-8")
print("\n总结：", f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败：" + "；".join(fails))
sys.exit(1 if fails else 0)
