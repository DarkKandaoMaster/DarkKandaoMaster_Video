# 交互回归测试（本机 Edge，channel="msedge"，真实时钟），在 1920×1080、1366×768、1280×1024 三种窗口下各跑两遍：
#   默认（能用 WebGL 就是 3D）和强制 2D（网址带 ?mode=2d）。每一遍：
#   打开在第 1 步；动画没放完时按一下 = 先放完（不跳步）；
#   前进：空格 / → / ↓ / PageDown / 左键点空白处 轮流用，从第 1 步一直按到最后一步（共 80 步），每步检查走到了哪一步；最后一步再按不动；
#   后退：← / ↑ / PageUp / 右键 轮流用，一路退回第 1 步；第 1 步再按 ← 不动；
#   数字键 1–9 跳到各段开头；Enter = 跳到本段最后一步（第 3 段 → "序列一层一层排好"那一步）；
#   第 8 段：点顶点换小练起点（点击坐标换算到 1920×1080）、倒计时重新开始、答案（序列、最远第几层、最远的是谁）跟着变；别的段点顶点只是"下一步"；R 恢复起点 v6；
#   D 切换 3D / 2D（强制 2D 时按 D 只提示、不报错）；F 全屏不报错；屏蔽右键菜单；
#   没有脚本错误，页面除了自己（file://）以外没有发出任何网络请求。
# 用法：python -I test_interact.py      输出：开发/交互测试结果.txt、开发/截图/交互-*.png
import sys; sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ref_bfs as R  # noqa: E402

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "图的广度优先遍历.html"
OUT = DEV / "截图"
lines, fails = [], []
TOTAL = 7 + 4 + 0 + 5 + (5 + 8) + 6 + (7 + 6) + 3 + 4       # 第 3 段另算
_EV = R.bfs(R.orders(R.N4, R.E4), 1, R.N4)["ev"]
# 起点 1 步；每出队一个顶点 = 出队 + 看邻接点 2 步；另有"下一个出队的是谁？"1 步、"第几层？/ 正好是第 2 层"2 步；队空 1 步；按层排好 1 步
WALK_STEPS = sum(1 if _EV[a]["t"] != "deq" else 2 for a, b in R.groups(_EV)) + 1 + 2 + 1
TOTAL += WALK_STEPS


def check(name, cond, extra=""):
    s = ("通过" if cond else "失败") + " | " + name + (f" （{extra}）" if extra and not cond else "")
    print(s); lines.append(s)
    if not cond: fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    for vw, vh in ((1920, 1080), (1366, 768), (1280, 1024)):
        for mode in ("auto", "2d"):
            tag = f"[{vw}×{vh} {'默认' if mode == 'auto' else '强制2D'}]"
            pg = b.new_page(viewport={"width": vw, "height": vh})
            errs, reqs = [], []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.on("request", lambda r: reqs.append(r.url))
            pg.goto(HTML.as_uri() + ("?mode=2d" if mode == "2d" else ""))
            pg.wait_for_function("window.__demoReady === true", timeout=20000)
            st = lambda: pg.evaluate("window.__demo.state()")
            client = lambda x, y: tuple(pg.evaluate(f"window.__demo.clientOfStage({x},{y})").values())
            wait = lambda ms: pg.wait_for_timeout(ms)
            fin = lambda: pg.evaluate("window.__demo.finishAnim()")

            def click_vertex(v, button="left"):
                q = pg.evaluate(f"window.__demo.vertexStage({v})")
                pg.mouse.click(*client(q["x"], q["y"]), button=button); wait(120)

            s = st(); total = s["total"]
            check(f"{tag} 打开是第 1 段第 1 步", (s["idx"], s["sec"]) == (0, 1), str(s))
            check(f"{tag} 一共 {TOTAL} 步", total == TOTAL, str(total))
            want = "3d" if mode == "auto" else "2d"
            check(f"{tag} 画面模式 = {want}", s["mode"] == want, f"{s['mode']}：{s['reason']}")
            # ---- 动画没放完时按一下 = 先放完 ----
            wait(1300); pg.keyboard.press("ArrowRight"); wait(60); pg.keyboard.press("ArrowRight"); wait(60); s = st()
            check(f"{tag} 动画没放完时再按一下：先放完，不跳步", s["idx"] == 1, str(s))
            pg.keyboard.press("ArrowLeft"); wait(100)
            check(f"{tag} ← 回到第 1 步", st()["idx"] == 0)
            # ---- 一路前进 ----
            ways = ["Space", "ArrowRight", "ArrowDown", "PageDown", "click"]
            bad = []
            for k in range(1, total):
                fin(); w = ways[k % len(ways)]
                if w == "click":
                    pg.mouse.click(*client(1880, 990)); wait(60)          # 右下角空白处
                else:
                    pg.keyboard.press(w); wait(60)
                s = st()
                if s["idx"] != k: bad.append((k, w, s["idx"]))
                if vw != 1920 and k in (3, 13, 24, 36, 40, 46, 53, 61, 66, 72, 76):
                    wait(int(s["dur"] * 1000) + 400); pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-{mode}-{k:02d}-{s['sec']}{s['kind']}{s['n']}.png"))
            check(f"{tag} 空格 / → / ↓ / PageDown / 左键：从第 1 步按到第 {total} 步，每步都对", not bad, str(bad[:5]))
            s = st(); check(f"{tag} 最后一步是第 9 段小结", (s["sec"], s["kind"], s["n"]) == (9, "end", 3), str(s))
            fin(); pg.keyboard.press("ArrowRight"); wait(80)
            check(f"{tag} 最后一步再按：不动", st()["idx"] == total - 1)
            # ---- 一路后退 ----
            backs = ["ArrowLeft", "ArrowUp", "PageUp", "rclick"]
            bad = []
            for k in range(total - 2, -1, -1):
                w = backs[k % len(backs)]
                if w == "rclick": pg.mouse.click(*client(1880, 990), button="right"); wait(40)
                else: pg.keyboard.press(w); wait(40)
                if st()["idx"] != k: bad.append((k, w, st()["idx"]))
            check(f"{tag} ← / ↑ / PageUp / 右键：从第 {total} 步退回第 1 步，每步都对", not bad, str(bad[:5]))
            pg.keyboard.press("ArrowLeft"); wait(60)
            check(f"{tag} 第 1 步再按 ←：不动", st()["idx"] == 0)
            # ---- 数字键跳段、Enter ----
            okj = []
            for n in range(1, 10):
                pg.keyboard.press(str(n)); wait(60); s = st()
                okj.append(s["sec"] == n and pg.evaluate("window.__demo.stepDump().idx") == s["idx"])
            check(f"{tag} 数字键 1–9 跳到各段开头", all(okj), str(okj))
            pg.keyboard.press("3"); wait(80); s0 = st()
            pg.keyboard.press("Enter"); wait(80); s = st()
            check(f"{tag} Enter：第 3 段跳到最后一步（序列一层一层排好）", s0["n"] == 0 and s["sec"] == 3 and s["n"] == WALK_STEPS - 1 and s["kind"] == "walk", str(s))
            wait(1500)
            if vw == 1920: pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-{mode}-第3段Enter.png"))
            # ---- 别的段点顶点 = 下一步 ----
            pg.keyboard.press("3"); wait(900); fin(); before = st()["idx"]
            click_vertex(5); s = st()
            check(f"{tag} 第 3 段点顶点：只是下一步", s["idx"] == before + 1 and s["practice"] == 6, str(s))
            # ---- 第 8 段：点顶点换起点 ----
            pg.keyboard.press("8"); wait(1200); s = st()
            check(f"{tag} 第 8 段默认小练起点 v6", s["sec"] == 8 and s["practice"] == 6 and s["n"] == 0, str(s))
            click_vertex(3); s = st()
            check(f"{tag} 第 8 段点 v3 → 起点换成 v3，回到小练第 1 步", s["practice"] == 3 and s["kind"] == "prac" and s["n"] == 0, str(s))
            wait(1300)
            cd1 = pg.evaluate("window.__demo.stepDump().texts")
            fin(); pg.keyboard.press(" "); wait(300); fin(); pg.keyboard.press(" "); wait(1500); s = st()
            d = pg.evaluate("window.__demo.stepDump()")
            pr = R.practice(3)
            check(f"{tag} 起点 v3：一按一步揭晓两问（{' '.join('v%d' % x for x in pr['seq'])}；最远第 {pr['maxl']} 层 {' '.join('v%d' % x for x in pr['far'])}）",
                  s["n"] == 2 and d["seq"] == [f"v{x}" for x in pr["seq"]] and d["maxL"] == pr["maxl"] and d["far"] == [f"v{x}" for x in pr["far"]], str(d))
            if vw == 1920 or mode == "2d": pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-{mode}-小练起点v3.png"))
            click_vertex(8); s = st()
            check(f"{tag} 揭晓后再点 v8 → 起点换成 v8，回到第 1 步重新计时", s["practice"] == 8 and s["n"] == 0, str(s))
            pg.keyboard.press("Enter"); wait(150); d = pg.evaluate("window.__demo.stepDump()")
            check(f"{tag} 第 8 段 Enter：直接看答案（起点 v8）", d["n"] == 2 and d["seq"] == [f"v{x}" for x in R.practice(8)["seq"]] and d["maxL"] == R.practice(8)["maxl"], str(d))
            pg.keyboard.press("r"); wait(150); s = st()
            check(f"{tag} R：小练起点恢复 v6，回到本段开头", s["practice"] == 6 and s["sec"] == 8 and s["n"] == 0, str(s))
            # ---- D、F、右键菜单 ----
            pg.keyboard.press("1"); wait(200); m0 = st()["mode"]; pg.keyboard.press("d"); wait(200); m1 = st()["mode"]; pg.keyboard.press("d"); wait(200); m2 = st()["mode"]
            if mode == "auto": check(f"{tag} D：3D → 2D → 3D", (m0, m1, m2) == ("3d", "2d", "3d"), str((m0, m1, m2)))
            else: check(f"{tag} 强制 2D 时按 D：还是 2D（只提示），不报错", (m0, m1, m2) == ("2d", "2d", "2d"), str((m0, m1, m2)))
            pg.keyboard.press("f"); wait(300); fs = pg.evaluate("window.__demo.isFullscreen()")
            if fs: pg.keyboard.press("f"); wait(300)
            check(f"{tag} F 全屏（无头浏览器里可能不允许全屏，只检查不报错）", True, f"进入全屏：{fs}")
            prevented = pg.evaluate("""(() => { const c = document.getElementById('cv'); const e = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 50, clientY: 50}); c.dispatchEvent(e); return e.defaultPrevented; })()""")
            check(f"{tag} 屏蔽浏览器右键菜单", prevented)
            # ---- 3D 两处真正在动（真实时钟下画了几帧） ----
            if mode == "auto":
                pg.keyboard.press("1"); wait(400); fin(); pg.keyboard.press(" "); wait(2500); s1 = st()
                pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-{mode}-水波石子落下.png"))
                pg.keyboard.press("6"); wait(200); fin(); pg.keyboard.press(" "); wait(3800); s2 = st()
                pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-{mode}-生成树提起来.png"))
                check(f"{tag} 3D 两处（水波第 2 步、生成树第 2 步）用真实时钟放完不报错、没掉回 2D",
                      (s1["sec"], s1["n"], s2["sec"], s2["kind"], s2["n"]) == (1, 1, 6, "lift", 1) and s2["mode"] == "3d", f"{s1} {s2}")
            check(f"{tag} 没有脚本错误", not errs, str(errs))
            others = [u for u in reqs if not u.startswith("file:")]
            check(f"{tag} 没有网络请求（只加载了页面本身）", not others and len(reqs) >= 1, str(others))
            pg.close()
    b.close()

n = len(lines)
(DEV / "交互测试结果.txt").write_text("\n".join(lines) + "\n\n总结： " + (f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败") + "\n", encoding="utf-8")
print("\n总结：", f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败：" + "；".join(fails))
sys.exit(1 if fails else 0)
