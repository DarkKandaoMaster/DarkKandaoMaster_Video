# 独立核对（Python 自己算，不复用页面的 JS），输出 开发/核对结果.txt：
#   1. 数据：路网和导航演示是同一份；页面上 8 个顶点的位置 = 导航演示第 2 步结束时的位置（按导航演示源码里的镜头参数独立重算）；
#   2. 算法：参考实现（ref_dijkstra.py，朴素 O(n²)）与 Bellman-Ford 全源一致；列出哪些起点会出现同距离平局；
#   3. 8 个起点（test_interact.py 导出 截图/starts-check.json）：页面每个状态的 dist / path / S、每轮锁谁、每条更新算式、
#      最终 dist / path、倒推链、第 5 段挑的演示点、第 6 段反证用的那一刻（B、X、数字和不等式）、第 7 段每个练习起点的答案，
#      全部和 Python 对上；
#   4. 逐步核对（shoot.py 导出 截图/full-check.json = 默认起点 G、截图/startE-check.json = 起点 E）：
#      每一步屏幕上的每一行字（Python 按同样的规则独立生成）、第 4 段历史表的每一格、锁定行、圈出的格子、第 5 段结果表；
#   5. 负权反例：朴素迪杰斯特拉先锁 P（2），而真正最短是 1；伪代码不超过 10 行。
# 用法：python -I verify.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
import math
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ref_dijkstra as R  # noqa: E402

DEV = Path(__file__).resolve().parents[1]
SHOT = DEV / "截图"
NAV_DEV = DEV.parents[1] / "导航演示" / "开发"
lines, fails = [], []
INF = math.inf


def check(name, cond, extra=""):
    s = ("通过" if cond else "失败") + " | " + name + (f" （{extra}）" if extra else "")
    print(s); lines.append(s)
    if not cond: fails.append(name)


def head(s):
    print("\n== " + s); lines.append("\n== " + s)


LET = R.LETTERS
BLD = {v["letter"]: v["bld"] for v in R.NET["vertices"]}
fmt = lambda x: "∞" if x == INF else str(x)


# ---------------- 按页面的规则（README 里写明的）独立生成期望值 ----------------
def s_set(S, order, start):
    xs = [start] + [v for v in order[1:] if v in S]
    return "S = { " + ", ".join(xs) + " }"


def states_of(r):
    return [r["init"]] + [x["after"] for x in r["rounds"]]


def order_of(r):
    return [r["start"]] + [x["u"] for x in r["rounds"]]


def pick_read(r):
    s = r["start"]; others = [v for v in LET if v != s]
    hops = lambda v: len(R.chain(r, v)) - 1
    srt = sorted(others, key=lambda v: (-hops(v), 0 if v == "C" else 1, v))
    demo = srt[:2]
    on = {x for v in demo for x in R.chain(r, v)}
    quiz = next((v for v in srt[2:] if v not in on), srt[2])
    return demo, quiz


def pick_proof(r):
    sts = states_of(r)
    for k in range(3, len(r["rounds"]) + 1):
        st = sts[k - 1]; B = r["rounds"][k - 1]["u"]
        cand = sorted((v for v in LET if v not in st["S"] and st["dist"][v] < INF and v != B), key=lambda v: (st["dist"][v], v))
        if cand:
            adj = [v for v in cand if (v, B) in R.W]          # 优先和 B 直接相连的候选
            X = adj[0] if adj else cand[0]
            return dict(k=k, B=B, dB=st["dist"][B], X=X, dX=st["dist"][X], S=sorted(st["S"]), st=st)
    return None


def practice(ps):
    r = R.run(ps); f = r["rounds"][0]["u"]
    qt = "C" if ps != "C" else "G"
    ch = list(reversed(R.chain(r, qt)))
    ws = [R.W[(a, b)] for a, b in zip(ch, ch[1:])]
    return dict(ps=ps, first=f, dfirst=r["dist"][f], qt=qt, dq=r["dist"][qt], route=ch, ws=ws)


def default_practice(start):
    return "E" if start != "E" else "G"


def expected_texts(r, step, ps):
    s = r["start"]; sts = states_of(r); order = order_of(r); k = step["kind"]; T = []
    if k == "nav":
        T.append("刚才的导航：从生命科学学院出发，算到32号教学楼就停了" if s == "G" else "起点：" + s + (f"（{BLD[s]}）" if BLD[s] else ""))
    elif k in ("title", "all"):
        T += ["单源最短路径", "从一个起点出发，到其余所有点的最短路径"]
        if k == "all": T.append("导航：算到终点就停　　今天：每个点都要算出来")
    elif k == "idea":
        T += ["迪杰斯特拉的核心思想", "① 从还没确定的点里，挑离起点最近的一个"]
        if step["n"] >= 2: T.append("② 把它确定下来（锁定）")
        if step["n"] >= 3: T += ["③ 再用它去更新邻居", "重复这三步，直到所有点都确定"]
    elif k == "three":
        f = r["rounds"][0]["u"]
        rows = [["dist[v]", "从起点到 v，目前找到的最短距离", f"例：dist[{f}] = {r['dist'][f]}　（之后还可能被改小）"],
                ["path[v]", "这条路上，v 的前一个点", f"例：path[{f}] = {s}　（倒着读，就是整条路）"],
                ["S", "已经确定（锁定）的点", f"一开始 S = {{ {s} }}　（图上锁定的点涂成橙色）"]]
        T.append("要记的三样东西")
        for j in range(step["n"]): T += rows[j]
    elif k == "init":
        T += ["初始化", s_set(sts[0]["S"], order, s), f"{s} 的邻居：dist = 边长，path = {s}",
              "　".join(f"{v}：{R.W[(s, v)]}" for v in R.NB[s]), "其余：dist = ∞（还到不了）"]
    elif k == "q":
        i = step["i"]
        T += [f"第 {i} 轮：下一个锁定谁？", f"看第 {i} 列：还没确定的点里，dist 最小的", s_set(sts[i - 1]["S"], order, s)]
    elif k == "l":
        i = step["i"]; x = r["rounds"][i - 1]
        T += [f"第 {i} 轮：锁定 {x['u']}（dist = {x['du']}）", f"第 {i} 列里 {x['u']} 最小 → 确定下来，加入 S", s_set(sts[i]["S"], order, s)]
        if len(x["tied"]) > 1: T += [f"{'、'.join(x['tied'])} 一样近（都是 {x['du']}）", f"挑哪个都对，这里按字母先锁 {x['u']}"]
        if i == len(r["rounds"]): T.append("全部顶点都确定了，算法结束！")
    elif k == "u":
        i = step["i"]; x = r["rounds"][i - 1]; u = x["u"]
        T.append(f"第 {i} 轮：用 {u}（{x['du']}）更新邻居")
        if x["ups"]:
            if x["skipped"]: T.append(f"{'、'.join(x['skipped'])} 已确定，不用看")
            for q in x["ups"]:
                T.append(f"{q['v']}：dist[{u}] + {q['w']} = {q['nd']} {'<' if q['changed'] else '≥'} {fmt(q['old'])}")
                T.append(f"　→ 改为 {q['nd']}，path = {u}" if q["changed"] else "　→ 不改")
        else:
            T += [f"{u} 的邻居 {'、'.join(x['skipped'])} 都已确定", "没有要更新的，下一列照抄"]
    elif k in ("rfinal", "quiz", "read", "tree"):
        T.append("读路径：顺着 path 往回找")
        if k == "rfinal": T += ['每个点只记了"前一个点"', "从目标点一路往回", f"找到起点 {s} 就停"]
        elif k == "quiz": T.append(f"你来读：{step['v']} 怎么走？")
        elif k == "read":
            v = step["v"]; c = R.chain(r, v)
            T += [f"你来读：{v} 怎么走？" if step.get("quiz") else f"{v} 怎么走？", " ← ".join(c), "倒过来：" + " → ".join(reversed(c)), f"dist[{v}] = {r['dist'][v]}"]
        else: T += ["所有 path 边连起来", "= 最短路径树", f"从 {s} 到每个点的最短路", "都在这棵树上"]
    elif k == "proof":
        pf = pick_proof(r); B, X, n = pf["B"], pf["X"], step["n"]
        L = [(0, f"此刻：{B} 刚被锁定，dist[{B}] = {pf['dB']}"), (1, f"假设：到 {B} 还有一条更短的路（< {pf['dB']}）（图上红虚线）"),
             (2, f"它总要走出 S，第一个出 S 的点记作 X（比如 {X}）"), (3, f"光走到 X，就至少要 dist[{X}] = {pf['dX']}"),
             (3, f"{B} 是没确定的点里最近的：dist[X] ≥ dist[{B}] = {pf['dB']}"), (4, f"后面的边长都 ≥ 0 → 整条路 ≥ {pf['dB']}，矛盾！"),
             (4, "所以：锁定那一刻，dist 就是最短距离")]
        T.append("讨论：锁定之后，dist 还会变小吗？"); T += [t for m, t in L if n >= m]
    elif k == "neg":
        T += ["前提：边长不能是负数", f"有向图反例：迪杰斯特拉第一个锁定 P，dist[P] = {NEG['dijP']}"]
        if step["n"] >= 1: T += [f"可是 起 → Q → P = 5 + (−4) = {NEG['trueP']} < {NEG['dijP']}，P 锁早了！", "所以：迪杰斯特拉要求边权 ≥ 0"]
    elif k == "prac":
        p = practice(ps); n = step["n"]
        T += ["课堂小练", "起点换成 " + ((BLD[ps] + " ") if BLD[ps] else "") + ps + "，先在纸上算：", "① 第一个被锁定的是谁？", f"② dist[{p['qt']}] 是多少？"]
        if n >= 1: T.append(f"→ {p['first']}（dist = {p['dfirst']}）")
        if n >= 2: T.append(f"→ {p['dq']}（{' → '.join(p['route'])}{(' = ' + ' + '.join(map(str, p['ws']))) if len(p['ws']) > 1 else ''}）")
    elif k == "code":
        T.append("算法框架")
    elif k == "sum":
        T += ["小结", "单源最短路径：一个起点 → 其余所有点", "每轮：挑没确定的点里 dist 最小的，锁定，再更新邻居",
              "更新：dist[u] + w(u, v) < dist[v] 就改，path[v] = u", "锁定后不会再变短（前提：边权不能为负）",
              "读路径：顺着 path 倒推；时间复杂度 O(n²)", '拓展：PS 里的"磁性套索"抠图，用的也是它']
    return T


def expected_table(r, step):
    s = r["start"]; sts = states_of(r); rows = [v for v in LET if v != s]; k = step["kind"]
    if k == "init": cols, lock, active = 1, 0, 1
    elif k == "q": cols, lock, active = step["i"], step["i"] - 1, step["i"]
    elif k == "l": cols, lock, active = step["i"], step["i"], step["i"]
    else: cols, lock, active = step["i"] + 1, step["i"], step["i"] + 1
    def cell(j, v):
        st = sts[j - 1]
        if v in st["S"]: return ""
        return "∞" if st["dist"][v] == INF else f"{st['dist'][v]} {st['path'][v]}"
    return dict(rows=rows, cols=[[cell(j, v) for v in rows] for j in range(1, cols + 1)],
                lock=[r["rounds"][j - 1]["u"] for j in range(1, lock + 1)], active=active,
                circled=[f"{j}:{r['rounds'][j - 1]['u']}" for j in range(1, lock + 1)])


def expected_steps(r):
    demo, quiz = pick_read(r); R_ = len(r["rounds"])
    S = [dict(sec=1, kind="nav"), dict(sec=1, kind="title"), dict(sec=1, kind="all")]
    S += [dict(sec=2, kind="idea", n=n) for n in (1, 2, 3)] + [dict(sec=3, kind="three", n=n) for n in (1, 2, 3)]
    S.append(dict(sec=4, kind="init"))
    for i in range(1, R_ + 1):
        S += [dict(sec=4, kind="q", i=i), dict(sec=4, kind="l", i=i)]
        if i < R_: S.append(dict(sec=4, kind="u", i=i))
    S += [dict(sec=5, kind="rfinal"), dict(sec=5, kind="read", v=demo[0]), dict(sec=5, kind="read", v=demo[1]),
          dict(sec=5, kind="quiz", v=quiz), dict(sec=5, kind="read", v=quiz, quiz=True), dict(sec=5, kind="tree")]
    S += [dict(sec=6, kind="proof", n=n) for n in range(5)] + [dict(sec=6, kind="neg", n=0), dict(sec=6, kind="neg", n=1)]
    S += [dict(sec=7, kind="prac", n=n) for n in range(3)] + [dict(sec=8, kind="code", n=n) for n in range(3)] + [dict(sec=9, kind="sum")]
    return S


# ---------------- 负权反例 ----------------
def neg_example():
    V = ["起", "P", "Q"]; E = [("起", "P", 2), ("起", "Q", 5), ("Q", "P", -4)]
    dist = {v: INF for v in V}; dist["起"] = 0; done = set(); order = []
    while len(done) < len(V):
        u = min((v for v in V if v not in done), key=lambda v: dist[v]); done.add(u); order.append(u)
        for a, b, w in E:
            if a == u and b not in done and dist[u] + w < dist[b]: dist[b] = dist[u] + w
    bf = {v: INF for v in V}; bf["起"] = 0
    for _ in range(len(V) - 1):
        for a, b, w in E:
            if bf[a] + w < bf[b]: bf[b] = bf[a] + w
    return dict(order=order, dijP=dist["P"], trueP=bf["P"], firstLocked=order[1])


NEG = neg_example()


def main():
    head("数据：和导航演示同一份路网、同一组顶点位置")
    mine = json.loads((DEV / "data" / "network.json").read_text(encoding="utf-8"))
    nav = json.loads((NAV_DEV / "data" / "network.json").read_text(encoding="utf-8"))
    check("data/network.json 和导航演示的 network.json 完全相同", mine == nav)
    check("8 个顶点、9 条边，边长都是正数（迪杰斯特拉的前提）", len(mine["vertices"]) == 8 and len(mine["edges"]) == 9 and all(e["w"] > 0 for e in mine["edges"]))
    tpl = (NAV_DEV / "src" / "demo.template.html").read_text(encoding="utf-8")
    m = re.search(r"graph:\s*\{\s*k:\s*([\d.]+),\s*ox:\s*([\d.]+),\s*oy:\s*([\d.]+),\s*sx:\s*([\d.]+),\s*sy:\s*([\d.]+),\s*th:\s*([\d.]+)\s*\*\s*DEG,\s*P:\s*([\d.]+),\s*px:\s*([\d.]+),\s*py:\s*([\d.]+)", tpl)
    k_, ox, oy, sx, sy, th, P, px, py = map(float, m.groups()); th = math.radians(th)

    def proj(wx, wy):
        dx, dy = (wx - ox) * k_, (wy - oy) * k_
        x, y, z = sx + dx, sy + dy * math.cos(th), dy * math.sin(th)
        f = P / (P - z)
        return px + (x - px) * f, py + (y - py) * f

    full = json.loads((SHOT / "full-check.json").read_text(encoding="utf-8"))
    errs = []
    for v in mine["vertices"]:
        want = proj(*v["xy"]); got = full["basePos"][v["letter"]]
        errs.append(math.hypot(want[0] - got[0], want[1] - got[1]))
    check("页面开场的顶点位置 = 导航演示第 2 步结束时的位置（按导航演示源码的镜头参数重算）", max(errs) < 0.1, f"最大偏差 {max(errs):.3f} 像素")
    st0 = full["stepDumps"][0]
    check("第 1 步（承接）是\"导航风格\"那一帧：起 / 终 + 楼名，曲线路段", st0["kind"] == "nav")

    head("算法对拍（Python 参考实现 vs Bellman-Ford），以及同距离平局")
    ties = {}
    for s in LET:
        r = R.run(s)
        check(f"起点 {s}：朴素迪杰斯特拉 = Bellman-Ford", r["dist"] == R.bellman_ford(s), " ".join(f"{v}={fmt(r['dist'][v])}" for v in LET))
        t = [(i + 1, x["tied"]) for i, x in enumerate(r["rounds"]) if len(x["tied"]) > 1]
        if t: ties[s] = t
    check("8 个起点都没有同距离平局（页面约定的\"按字母先锁\"规则用不上）", not ties, str(ties) if ties else "")
    r = R.run("G")
    nch = [(i + 1, q["v"], q["old"], q["nd"]) for i, x in enumerate(r["rounds"]) for q in x["ups"] if q["changed"] and q["old"] < INF]
    nno = [(i + 1, q["v"], q["nd"], q["old"]) for i, x in enumerate(r["rounds"]) for q in x["ups"] if not q["changed"]]
    check("默认起点 G：有一次\"改小\"（C：300 → 280）", nch == [(3, "C", 300, 280)], str(nch))
    check("默认起点 G：有一次\"不改\"（A：380 ≥ 370）", nno == [(5, "A", 380, 370)], str(nno))
    check("默认起点 G：7 轮，锁定顺序 F D B E C H A", [x["u"] for x in r["rounds"]] == list("FDBECHA"))

    head("8 个起点：页面导出的整套数据（截图/starts-check.json）")
    p = SHOT / "starts-check.json"
    allx = json.loads(p.read_text(encoding="utf-8")) if p.exists() else []
    check("导出了 8 个起点", sorted(d["start"] for d in allx) == LET, f"{len(allx)} 个")
    for d in allx:
        s = d["start"]; r = R.run(s); sts = states_of(r); tag = f"[起点 {s}]"
        ok_states = len(d["states"]) == len(sts) and all(
            all(ds["dist"][v] == (None if st["dist"][v] == INF else st["dist"][v]) and ds["path"][v] == st["path"][v] for v in LET) and ds["S"] == sorted(st["S"])
            for ds, st in zip(d["states"], sts))
        check(f"{tag} 每个状态的 dist / path / S（{len(sts)} 个状态 × 8 个顶点）", ok_states)
        check(f"{tag} 锁定顺序", d["order"] == order_of(r), " ".join(d["order"]))
        ok_r = len(d["rounds"]) == len(r["rounds"]) and all(
            a["u"] == b["u"] and a["du"] == b["du"] and a["tied"] == b["tied"] and a["skipped"] == b["skipped"] and
            [(q["v"], q["w"], q["du"], q["nd"], q["old"], q["changed"]) for q in a["ups"]] ==
            [(q["v"], q["w"], q["du"], q["nd"], None if q["old"] == INF else q["old"], q["changed"]) for q in b["ups"]]
            for a, b in zip(d["rounds"], r["rounds"]))
        nup = sum(len(x["ups"]) for x in r["rounds"])
        check(f"{tag} 每轮锁谁、每条更新算式（{nup} 条）、跳过的已确定邻居", ok_r)
        check(f"{tag} 最终 dist / path", d["dist"] == r["dist"] and d["path"] == r["path"])
        check(f"{tag} 每个点的倒推链（v ← … ← 起点）", d["chains"] == {v: " ← ".join(R.chain(r, v)) for v in LET if v != s})
        # 倒推链确实是最短路：沿链边长之和 = dist
        okc = all(sum(R.W[(a, b)] for a, b in zip(R.chain(r, v), R.chain(r, v)[1:])) == r["dist"][v] for v in LET if v != s)
        check(f"{tag} 沿倒推链把边长加起来 = dist", okc)
        demo, quiz = pick_read(r)
        check(f"{tag} 第 5 段：演示 {'、'.join(demo)}，学生读 {quiz}（读的点不在演示过的路上）", d["read"] == {"demo": demo, "quiz": quiz} and quiz not in {x for v in demo for x in R.chain(r, v)})
        pf = pick_proof(r)
        logic = (pf["B"] == min((v for v in LET if v not in pf["st"]["S"] and pf["st"]["dist"][v] < INF), key=lambda v: (pf["st"]["dist"][v], v))
                 and pf["X"] not in pf["st"]["S"] and pf["st"]["path"][pf["X"]] in pf["st"]["S"] and pf["dX"] >= pf["dB"] and pf["dB"] == r["dist"][pf["B"]])
        check(f"{tag} 第 6 段反证：第 {pf['k']} 轮锁 {pf['B']}（{pf['dB']}），X = {pf['X']}（{pf['dX']} ≥ {pf['dB']}），X 的前一个点在 S 里",
              logic and d["proof"] == {k: pf[k] for k in ("k", "B", "dB", "X", "dX", "S")})
        okp = True; nps = 0
        for ps, got in d.get("practiceAll", {}).items():
            nps += 1
            if got != practice(ps): okp = False
        check(f"{tag} 第 7 段：换成另外 7 个练习起点，\"第一个锁谁、dist[C]（或 dist[G]）、路线\"都对", okp and nps == 7, f"{nps} 个")

    for fn, start in (("full-check.json", "G"), ("startE-check.json", "E")):
        fp = SHOT / fn
        if not fp.exists():
            check(f"找到 {fn}", False); continue
        head(f"逐步核对：{fn}（起点 {start}）—— 每一步屏幕上的字、历史表每一格")
        d = json.loads(fp.read_text(encoding="utf-8"))
        r = R.run(start); ps = default_practice(start)
        exp = expected_steps(r); dumps = d["stepDumps"]
        check(f"[{start}] 步数 = 9 段共 {len(exp)} 步", len(dumps) == len(exp) == d["steps"], f"页面 {len(dumps)} 步")
        bad_t, bad_tab, bad_seq, ncell = [], [], [], 0
        for j, (e, g) in enumerate(zip(exp, dumps)):
            if (e["sec"], e["kind"], e.get("i"), e.get("n"), e.get("v")) != (g["sec"], g["kind"], g["i"], g["n"], g["v"]):
                bad_seq.append(j)
            want = expected_texts(r, e, ps)
            if g["texts"] != want: bad_t.append((j, g["kind"], [x for x in g["texts"] if x not in want][:2], [x for x in want if x not in g["texts"]][:2]))
            if e["kind"] in ("init", "q", "l", "u"):
                t = expected_table(r, e); ncell += sum(len(c) for c in t["cols"])
                if g.get("table") != t: bad_tab.append((j, g["kind"], g.get("i")))
            if e["kind"] in ("rfinal", "read", "quiz", "tree"):
                if g.get("final") != [f"{v} {r['dist'][v]} {r['path'][v]}" for v in LET if v != start]: bad_tab.append((j, "final"))
            if e["kind"] == "code":
                if not (len(g["code"]) <= 10 and g["code"][0].startswith("初始化")): bad_tab.append((j, "code"))
        check(f"[{start}] 步骤顺序（段 / 类型 / 第几轮）", not bad_seq, str(bad_seq[:5]))
        check(f"[{start}] 每一步屏幕上的每一行字（{sum(len(expected_texts(r, e, ps)) for e in exp)} 行）", not bad_t, str(bad_t[:3]))
        check(f"[{start}] 第 4 段历史表：每一格 / 锁定行 / 圈出的格子（共 {ncell} 格次）+ 第 5 段结果表", not bad_tab, str(bad_tab[:3]))
        lastq = [g for g in dumps if g["kind"] == "l"][-1]
        check(f"[{start}] 最后一轮锁定后，锁定行 = 锁定顺序（{' '.join(lastq['table']['lock'])}）", lastq["table"]["lock"] == [x["u"] for x in r["rounds"]])
        check(f"[{start}] 第 4 段每一列都是\"选点前\"的状态，被选中的就是该列未确定格里最小的",
              all(min((sts_["dist"][v], v) for v in LET if v not in sts_["S"] and sts_["dist"][v] < INF)[1] == x["u"]
                  for sts_, x in zip(states_of(r), r["rounds"])))

    head("负权反例（第 6 段最后两步）")
    check("朴素迪杰斯特拉：起点之后第一个锁定 P，dist[P] = 2", NEG["firstLocked"] == "P" and NEG["dijP"] == 2, f"锁定顺序 {'→'.join(NEG['order'])}")
    check("Bellman-Ford：真正的最短 dist[P] = 1（起 → Q → P = 5 − 4）", NEG["trueP"] == 1)

    (DEV / "核对结果.txt").write_text("\n".join(lines) + "\n\n总结： " + (f"{len(lines) - sum(1 for x in lines if x.startswith(chr(10)))} 项全部通过" if not fails else f"{len(fails)} 项失败") + "\n", encoding="utf-8")
    print("\n总结：", "全部通过" if not fails else f"{len(fails)} 项失败：" + "；".join(fails))


main()
