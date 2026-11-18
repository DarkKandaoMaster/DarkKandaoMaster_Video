# 交互回归测试（本机 Edge，channel="msedge"，真实时钟）：在 1920×1080、1366×768、1280×1024 三种窗口下
#   点楼名换终点 / 起点（点击坐标换算）、模式切换（按钮 + S 键）、R 恢复默认、翻页（点击 / 方向键 / 翻页笔 PageDown·PageUp / 右键 / 按钮）、
#   第 3 步前 3 下一按一步 → 第 4 下自动播放 → 点击暂停 → 右键退回 → 继续 → 终点锁定后自动揭晓、Enter、数字键跳步、屏蔽右键菜单。
# 另外在 1920×1080 下把所有楼对的核对数据导出到 开发/截图/pairs-check.json（verify.py 用）。
# 用法：python -I test_interact.py      输出：开发/交互测试结果.txt、开发/截图/交互-*.png
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "导航演示.html"
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

        def click_label(vid, button="left"):
            hits = {h["vid"]: h for h in pg.evaluate("window.__demo.labelHits()")}
            h = hits[vid]; pg.mouse.click(*client(h["x"], h["y"]), button=button); wait(120)

        check(f"{tag} 打开是第 1 步导入（手绘地图）", st()["phase"] == "intro")
        wait(800); pg.keyboard.press("ArrowRight"); wait(3800)
        s = st(); check(f"{tag} → 进入导航地图", s["phase"] == "nav", str(s))
        check(f"{tag} 默认 生命科学学院 → 32号教学楼，全程 280 米", (s["start"], s["end"], s["dist"]) == ("J", "X", 280))
        # 点"数字图书馆"换终点（检查点击坐标换算）
        click_label("L"); s = st()
        check(f"{tag} 点楼名换终点：数字图书馆", (s["start"], s["end"]) == ("J", "L") and s["dist"] == 130, str(s))
        # 点左下角的模式按钮切到"起点"，再点"和润楼"
        pg.mouse.click(*client(620 + 352, 928 + 29)); wait(100)
        check(f"{tag} 点模式按钮切到\"改起点\"", st()["mode"] == "start")
        click_label("C"); s = st()
        check(f"{tag} 点楼名换起点：和润楼", (s["start"], s["end"]) == ("C", "L"), str(s))
        wait(3000)
        pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-换起终点.png"))
        click_label("L"); s = st()
        check(f"{tag} 起点不能和终点相同（点终点那栋楼当起点被拒绝）", (s["start"], s["end"]) == ("C", "L"))
        pg.keyboard.press("s"); check(f"{tag} S 键切换模式", st()["mode"] == "end")
        pg.keyboard.press("r"); wait(100); s = st()
        check(f"{tag} R 恢复默认起终点", (s["start"], s["end"]) == ("J", "X"))
        wait(3500)
        # 点地图空白处 = 下一步
        pg.mouse.click(*client(1500, 600)); wait(2700)
        check(f"{tag} 点地图空白处 = 下一步（地图放倒）", st()["phase"] == "tilt")
        pg.keyboard.press("PageDown"); wait(2000)
        check(f"{tag} 翻页笔 PageDown = 下一步（连边）", st()["phase"] == "edges")
        pg.mouse.click(*client(1820, 1030)); wait(1300)
        check(f"{tag} 点\"下一步 ›\"按钮 = 下一步（迪杰斯特拉）", st()["phase"] == "dij" and st()["k"] == 0)
        pg.mouse.click(*client(800, 500), button="right"); wait(200)
        check(f"{tag} 右键 = 上一步", st()["phase"] == "edges")
        pg.keyboard.press("PageUp"); wait(150)
        check(f"{tag} 翻页笔 PageUp = 上一步", st()["phase"] == "tilt")
        pg.keyboard.press("3"); wait(1300)
        check(f"{tag} 数字键 3 跳到迪杰斯特拉", st()["phase"] == "dij" and st()["k"] == 0)
        ks = []
        for _ in range(3):
            pg.mouse.click(*client(700, 300)); wait(500); ks.append((st()["k"], st()["play"]))
        check(f"{tag} 前 3 下一按一步", ks == [(1, False), (2, False), (3, False)], str(ks))
        pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-锁定3.png"))
        pg.keyboard.press(" "); wait(200)
        check(f"{tag} 第 4 下开始自动播放", st()["play"] is True)
        wait(1300); s = st()
        check(f"{tag} 自动播放在走", s["k"] == 4, str(s))
        pg.mouse.click(*client(700, 300)); wait(150); s = st()
        check(f"{tag} 自动播放中点击 = 暂停", s["paused"] is True and s["play"] is False, str(s))
        pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-暂停.png"))
        pg.mouse.click(*client(700, 300), button="right"); wait(150); s = st()
        check(f"{tag} 暂停时右键 = 退回一次锁定", s["k"] == 3, str(s))
        pg.keyboard.press("ArrowRight"); wait(150)
        check(f"{tag} 再按一次 = 继续自动播放", st()["play"] is True)
        try:
            pg.wait_for_function("window.__demo.state().phase === 'reveal'", timeout=15000); ok = True
        except Exception:
            ok = False
        s = st(); check(f"{tag} 终点锁定后自动揭晓，只锁到终点为止", ok and s["k"] == s["K"] == 5, str(s))
        wait(3500); pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-揭晓.png"))
        pg.keyboard.press("ArrowLeft"); wait(100); s = st()
        check(f"{tag} 揭晓按 ← 回到迪杰斯特拉最后一步", s["phase"] == "dij" and s["k"] == 5)
        pg.keyboard.press("r"); wait(100)
        check(f"{tag} 第 3 步按 R 回到初始化", st()["k"] == 0)
        pg.keyboard.press("Enter"); wait(100)
        check(f"{tag} Enter 直接跳到揭晓", st()["phase"] == "reveal")
        pg.keyboard.press("1"); wait(100)
        check(f"{tag} 数字键 1 回到导入", st()["phase"] == "intro")
        pg.keyboard.press("4"); wait(100)
        check(f"{tag} 数字键 4 跳到揭晓", st()["phase"] == "reveal")
        pg.keyboard.press("2"); wait(100)
        check(f"{tag} 数字键 2 跳到变成图", st()["phase"] == "tilt")
        pg.mouse.click(*client(1686, 1030)); wait(100)
        check(f"{tag} 点\"‹\"按钮 = 上一步", st()["phase"] == "nav")
        prevented = pg.evaluate("""(() => { const c = document.getElementById('cv'); const e = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 50, clientY: 50}); c.dispatchEvent(e); return e.defaultPrevented; })()""")
        check(f"{tag} 屏蔽浏览器右键菜单", prevented)
        # 换一对起终点后，后面的步骤也跟着换
        pg.evaluate("window.__demo.setPair('C', 'L')"); pg.keyboard.press("4"); wait(3600)
        s = st(); check(f"{tag} 换成 和润楼 → 数字图书馆 后，揭晓用的是新的一对", (s["start"], s["end"], s["phase"]) == ("C", "L", "reveal"), str(s))
        pg.screenshot(path=str(OUT / f"交互-{vw}x{vh}-和润楼到图书馆-揭晓.png"))
        if vw == 1920:
            pairs = pg.evaluate("""(() => { const ids = ['W','X','L','N','J','C']; const out = [];
                for (const a of ids) for (const z of ids) { if (a === z) continue; window.__demo.setPair(a, z); out.push(window.__demo.exportCheck()); }
                return out; })()""")
            (OUT / "pairs-check.json").write_text(json.dumps(pairs, ensure_ascii=False), encoding="utf-8")
            check(f"{tag} 导出全部楼对的核对数据", len(pairs) == 30, f"{len(pairs)} 对")
        check(f"{tag} 没有脚本错误", not errs, str(errs))
        pg.close()
    b.close()

(DEV / "交互测试结果.txt").write_text("\n".join(lines) + "\n\n总结： " + ("全部通过" if not fails else f"{len(fails)} 项失败") + "\n", encoding="utf-8")
print("\n总结：", "全部通过" if not fails else f"{len(fails)} 项失败：" + "；".join(fails))
