# 交互回归测试（本机 Edge，channel="msedge"，真实时钟），在 1920×1080、1366×768、1280×1024 三种窗口下：
#   打开在第 1 步；第 1 段点顶点换起点（点击坐标换算）、R 恢复起点 G；
#   前进：空格 / → / ↓ / PageDown / 左键点空白 / "下一步 ›"按钮轮流用，从第 1 步一直按到最后一步（共 50 步），每步检查走到了哪一步；
#   动画没放完时按一下 = 先放完（不跳步）；最后一步再按不动；
#   后退：← / ↑ / PageUp / 右键 / "‹"按钮轮流用，一路退回第 1 步；
#   数字键 1–9 跳段；Enter = 跳到本段最后一步；第 4 段点顶点不会换起点（= 下一步）；
#   第 7 段：点顶点换练习起点、点到正在讲的起点会被拒绝、Enter / 按钮"用 X 当起点完整算一遍"→ 起点换掉并回到第 4 段；R 恢复；
#   H 隐藏 / 显示提示、F 全屏不报错、屏蔽右键菜单、没有脚本错误。
# 另外在 1920×1080 下导出 8 个起点（以及每个起点下 7 个练习起点）的核对数据 → 截图/starts-check.json（verify.py 用）。
# 用法：python -I test_interact.py      输出：开发/交互测试结果.txt、开发/截图/交互-*.png
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "迪杰斯特拉.html"
OUT = DEV / "截图"
lines, fails = [], []


def check(name, cond, extra=""):
    s = ("通过" if cond else "失败") + " | " + name + (f" {extra}" if extra else "")
    print(s); lines.append(s)
    if not cond: fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    for vw, vh in ((1920, 1080), (1366, 768), (1280, 1024)):
        tag = f"[{vw}×{vh}]"
        pg = b.new_page(viewport={"width": vw, "height": vh})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(HTML.as_uri())
        pg.wait_for_function("window.__demoReady === true", timeout=20000)
        st = lambda: pg.evaluate("window.__demo.state()")
        client = lambda x, y: tuple(pg.evaluate(f"window.__demo.clientOfStage({x},{y})").values())
        wait = lambda ms: pg.wait_for_timeout(ms)
        fin = lambda: pg.evaluate("window.__demo.finishAnim()")

        def click_vertex(letter, button="left"):
            q = pg.evaluate(f"window.__demo.vertexStage('{letter}')")
            pg.mouse.click(*client(q["x"], q["y"]), button=button); wait(120)

        s = st(); total = s["total"]
        check(f"{tag} 打开是第 1 段第 1 步，起点 G", (s["idx"], s["sec"], s["start"]) == (0, 1, "G"), str(s))
        check(f"{tag} 一共 50 步", total == 50, str(total))
        # ---- 第 1 段：点顶点换起点 ----
        wait(900); click_vertex("C"); s = st()
        check(f"{tag} 第 1 段点顶点 C → 起点换成 C，仍在第 1 段", s["start"] == "C" and s["sec"] == 1, str(s))
        wait(900); click_vertex("H"); s = st()
        check(f"{tag} 再点 H → 起点换成 H", s["start"] == "H", str(s))
        pg.keyboard.press("r"); wait(150); s = st()
        check(f"{tag} R 恢复默认起点 G", s["start"] == "G" and s["sec"] == 1, str(s))
        # ---- 动画没放完时按一下 = 先放完 ----
        wait(1200); pg.keyboard.press("ArrowRight"); wait(60); pg.keyboard.press("ArrowRight"); wait(60); s = st()
        check(f"{tag} 动画没放完时再按一下：先放完，不跳步", s["idx"] == 1, str(s))
        pg.keyboard.press("ArrowLeft"); wait(100)
        check(f"{tag} ← 回到第 1 步", st()["idx"] == 0)
        # ---- 一路前进 ----
        ways = ["Space", "ArrowRight", "ArrowDown", "PageDown", "click", "button"]
        bad = []
        for k in range(1, total):
            fin(); w = ways[k % len(ways)]
            if w == "click":
                pg.mouse.click(*client(1880, 560)); wait(60)       # 右边空白处（不点到顶点 / 按钮）
            elif w == "button":
                pg.mouse.click(*client(1820, 1032)); wait(60)
            else:
                pg.keyboard.press(w); wait(60)
            s = st()
            if s["idx"] != k: bad.append((k, w, s["idx"]))
            if k in (12, 18, 31, 40, 45) and vw != 1920:
                wait(3200); pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-{k:02d}-{s['sec']}{s['kind']}.png"))
        check(f"{tag} 空格 / → / ↓ / PageDown / 左键 / 下一步按钮：从第 1 步按到第 50 步，每步都对", not bad, str(bad[:5]))
        s = st(); check(f"{tag} 最后一步是第 9 段小结", (s["sec"], s["kind"]) == (9, "sum"), str(s))
        fin(); pg.keyboard.press("ArrowRight"); wait(80)
        check(f"{tag} 最后一步再按：不动", st()["idx"] == total - 1)
        # ---- 一路后退 ----
        backs = ["ArrowLeft", "ArrowUp", "PageUp", "rclick", "pbutton"]
        bad = []
        for k in range(total - 2, -1, -1):
            w = backs[k % len(backs)]
            if w == "rclick": pg.mouse.click(*client(1880, 560), button="right"); wait(40)
            elif w == "pbutton": pg.mouse.click(*client(1686, 1032)); wait(40)
            else: pg.keyboard.press(w); wait(40)
            if st()["idx"] != k: bad.append((k, w, st()["idx"]))
        check(f"{tag} ← / ↑ / PageUp / 右键 / ‹ 按钮：从第 50 步退回第 1 步，每步都对", not bad, str(bad[:5]))
        pg.keyboard.press("ArrowLeft"); wait(60)
        check(f"{tag} 第 1 步再按 ←：不动", st()["idx"] == 0)
        # ---- 数字键跳段 ----
        okj = []
        for n in range(1, 10):
            pg.keyboard.press(str(n)); wait(60); s = st()
            okj.append(s["sec"] == n and (n == 1 or st()["idx"] > 0))
        check(f"{tag} 数字键 1–9 跳到各段开头", all(okj), str(okj))
        pg.keyboard.press("4"); wait(80); s0 = st()
        pg.keyboard.press("Enter"); wait(80); s = st()
        check(f"{tag} Enter：跳到本段最后一步（第 4 段 → 第 7 轮锁定）", s["sec"] == 4 and s["kind"] == "l" and s["i"] == 7, str(s))
        pg.keyboard.press("4"); wait(1000); fin(); before = st()["idx"]
        click_vertex("C"); s = st()
        check(f"{tag} 第 4 段点顶点：不换起点，只是下一步", s["start"] == "G" and s["idx"] == before + 1, str(s))
        wait(2500)
        if vw == 1920: pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-第4段点顶点.png"))
        # ---- 第 7 段：练习起点 ----
        pg.keyboard.press("7"); wait(1000); s = st()
        check(f"{tag} 第 7 段默认练习起点 E", s["sec"] == 7 and s["practice"] == "E", str(s))
        click_vertex("D"); s = st()
        check(f"{tag} 第 7 段点顶点 D → 练习起点换成 D，回到小练第 1 步", s["practice"] == "D" and s["kind"] == "prac" and s["n"] == 0, str(s))
        click_vertex("G"); s = st()
        check(f"{tag} 点到正在讲的起点 G：被拒绝（练习起点还是 D）", s["practice"] == "D", str(s))
        wait(1500); fin(); pg.keyboard.press(" "); wait(1200); fin(); pg.keyboard.press(" "); wait(2500); s = st()
        check(f"{tag} 小练一按一步揭晓两问", s["kind"] == "prac" and s["n"] == 2, str(s))
        pr = pg.evaluate("window.__demo.exportCheck().practice")
        check(f"{tag} 练习起点 D：第一个锁 B（70），dist[C] = 150", (pr["first"], pr["dfirst"], pr["dq"]) == ("B", 70, 150), str(pr))
        pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-小练换成D.png"))
        pg.keyboard.press("Enter"); wait(150); s = st()
        check(f"{tag} 第 7 段 Enter：用 D 当起点完整算一遍（起点 = D，回到第 4 段开头）", s["start"] == "D" and s["sec"] == 4 and s["kind"] == "init", str(s))
        check(f"{tag} 换成 D 后练习起点自动换成 E（不和起点相同）", s["practice"] == "E", str(s))
        pg.keyboard.press("Enter"); wait(150); s = st()
        ex = pg.evaluate("window.__demo.exportCheck()")
        check(f"{tag} 起点 D：后面整套流程跟着换（第 4 段最后锁定 H，dist[H] = 460）", s["kind"] == "l" and ex["order"][-1] == "H" and ex["dist"]["H"] == 460, str(ex["order"]))
        wait(1500)
        pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-起点D-第4段结尾.png"))
        pg.keyboard.press("5"); wait(400); pg.keyboard.press("Enter"); wait(2500)
        pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-起点D-最短路径树.png"))
        pg.keyboard.press("7"); wait(300)
        pg.mouse.click(*client(1535, 912)); wait(150); s = st()
        check(f"{tag} 点按钮\"用 E 当起点，完整算一遍\" → 起点 = E，回到第 4 段", s["start"] == "E" and s["sec"] == 4, str(s))
        pg.keyboard.press("r"); wait(150); s = st()
        check(f"{tag} R：起点恢复 G、练习起点恢复 E，回到本段开头", (s["start"], s["practice"], s["sec"], s["kind"]) == ("G", "E", 4, "init"), str(s))
        # ---- H、F、右键菜单 ----
        h0 = st()["hints"]; pg.keyboard.press("h"); wait(60); h1 = st()["hints"]; pg.keyboard.press("h"); wait(60); h2 = st()["hints"]
        check(f"{tag} H 隐藏 / 再按显示底部提示", h0 and not h1 and h2)
        pg.keyboard.press("f"); wait(300); fs = pg.evaluate("window.__demo.isFullscreen()")
        if fs: pg.keyboard.press("f"); wait(300)
        check(f"{tag} F 全屏（无头浏览器里可能不允许全屏，只检查不报错）", True, f"进入全屏：{fs}")
        prevented = pg.evaluate("""(() => { const c = document.getElementById('cv'); const e = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 50, clientY: 50}); c.dispatchEvent(e); return e.defaultPrevented; })()""")
        check(f"{tag} 屏蔽浏览器右键菜单", prevented)
        if vw == 1920:
            allx = []
            for s_ in "ABCDEFGH":
                pg.keyboard.press("1"); wait(50)
                pg.evaluate(f"window.__demo.setStart('{s_}')")
                d = pg.evaluate("window.__demo.exportCheck()")
                pa = {}
                for ps in "ABCDEFGH":
                    if ps == s_: continue
                    pg.evaluate(f"window.__demo.setPractice('{ps}')")
                    pa[ps] = pg.evaluate("window.__demo.exportCheck().practice")
                d["practiceAll"] = pa
                allx.append(d)
            (OUT / "starts-check.json").write_text(json.dumps(allx, ensure_ascii=False), encoding="utf-8")
            check(f"{tag} 导出 8 个起点（每个起点 7 个练习起点）的核对数据", len(allx) == 8 and all(len(d["practiceAll"]) == 7 for d in allx))
        check(f"{tag} 没有脚本错误", not errs, str(errs))
        pg.close()
    b.close()

n = len(lines)
(DEV / "交互测试结果.txt").write_text("\n".join(lines) + "\n\n总结： " + (f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败") + "\n", encoding="utf-8")
print("\n总结：", f"{n} 项全部通过" if not fails else f"{len(fails)} 项失败：" + "；".join(fails))
