# 交互回归测试：双击闭合、右键 / Backspace 撤销、R 重来、← 后退、数字键跳步、拖入照片替换、非 1920×1080 窗口下点击坐标、性能。
# 用法：python -I test_interact.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import base64
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "磁性套索演示.html"
OUT = DEV / "截图"
fails = []


def check(name, cond, extra=""):
    print(("通过" if cond else "失败"), "|", name, extra)
    if not cond: fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    for vw, vh in ((1920, 1080), (1366, 768), (1280, 1024)):
        pg = b.new_page(viewport={"width": vw, "height": vh})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(HTML.as_uri())
        pg.wait_for_function("window.__demoReady === true", timeout=20000)
        st = lambda: pg.evaluate("window.__demo.state()")

        def client(x, y):
            s = pg.evaluate(f"window.__demo.stageOfWorld({x},{y})")
            return tuple(pg.evaluate(f"window.__demo.clientOfStage({s['x']},{s['y']})").values())

        tag = f"[{vw}×{vh}]"
        # 点击坐标换算：点到猫左耳尖附近，吸附后的落点应在 5 像素内
        for xy in [(171, 86), (318, 92), (470, 100)]:
            pg.mouse.click(*client(*xy)); pg.wait_for_timeout(50)
        seeds = pg.evaluate("window.__demo.exportCheck(false).seeds")
        check(f"{tag} 点击落点换算正确", len(seeds) == 3 and all(abs(a - c) <= 5 and abs(bb - d) <= 5 for (a, bb), (c, d) in zip(seeds, [(171, 86), (318, 92), (470, 100)])), str(seeds))
        # 右键撤销
        pg.mouse.click(*client(470, 100), button="right"); pg.wait_for_timeout(50)
        check(f"{tag} 右键撤销一个点", st()["seeds"] == 2)
        pg.keyboard.press("Backspace"); pg.wait_for_timeout(50)
        check(f"{tag} Backspace 撤销一个点", st()["seeds"] == 1)
        # 性能：一次点击（整图 Dijkstra）多久
        ms = pg.evaluate("(() => { const t = performance.now(); for (let i = 0; i < 5; i++) window.__dij_probe = 1; return 0; })()")
        for xy in [(318, 92), (470, 100), (612, 200), (611, 306), (330, 313), (205, 311)]:
            pg.mouse.click(*client(*xy)); pg.wait_for_timeout(30)
        t = pg.evaluate("""(() => { const c = document.getElementById('cv'); const r = c.getBoundingClientRect();
            const t0 = performance.now(); c.dispatchEvent(new MouseEvent('click', {clientX: r.left + r.width*0.3, clientY: r.top + r.height*0.6, bubbles: true}));
            return performance.now() - t0; })()""")
        check(f"{tag} 一次点击（整图 Dijkstra + 回溯）耗时", t < 400, f"{t:.0f} ms")
        pg.keyboard.press("Backspace")
        # 双击闭合（在最后一个点附近双击）
        x, y = client(178, 210)
        pg.mouse.dblclick(x, y); pg.wait_for_timeout(100)
        s = st()
        check(f"{tag} 双击闭合", s["closed"] is True, str(s))
        n_seeds = s["seeds"]
        segs = pg.evaluate("window.__demo.exportCheck(false).contourSegs.map(s => s.length)")
        check(f"{tag} 双击没有留下零长度的段", min(segs) > 4, str(segs))
        # 前进到第 3 步，再一路后退
        for _ in range(4): pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(30)
        pg.wait_for_timeout(1200)
        pg.keyboard.press("ArrowRight")  # 可能还在动画里：第一下跳到动画结束
        names = []
        for _ in range(8):
            pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(30); names.append(st()["phase"])
        check(f"{tag} 前进到第 3 步", "dij" in names, str(names))
        pg.keyboard.press("r"); pg.wait_for_timeout(30)
        check(f"{tag} 第 3 步按 R 回到 k=0", st()["k"] == 0 and st()["phase"] == "dij")
        pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
        check(f"{tag} Enter 直接跳到揭晓", st()["phase"] == "reveal" and st()["k"] == st()["K"], str(st()))
        seq = []
        for _ in range(40):
            pg.keyboard.press("ArrowLeft"); seq.append(st()["phase"])
        check(f"{tag} ← 一路退回第 1 步，轮廓保留", seq[-1] == "draw" and st()["closed"] and st()["seeds"] == n_seeds)
        pg.keyboard.press("3"); pg.wait_for_timeout(30)
        check(f"{tag} 数字键 3 跳到第 3 步", st()["phase"] == "dij")
        pg.keyboard.press("1"); pg.keyboard.press("r"); pg.wait_for_timeout(30)
        check(f"{tag} 第 1 步按 R 清空轮廓", st()["seeds"] == 0 and not st()["closed"])
        pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(200); pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(200)
        check(f"{tag} 空白时按 → 自动描轮廓（再按一下立即描完）", st()["closed"] and st()["seeds"] == 13, str(st()))
        pg.keyboard.press("h"); pg.wait_for_timeout(100)
        if vw == 1366:
            pg.screenshot(path=str(OUT / "interact-1366x768-hints-off.png"))
        pg.keyboard.press("h")
        if vw in (1920, 1366):
            # ---- 鼠标 / 按钮 / 翻页笔 / 自动播放 ----
            def stage_click(x, y, button="left"):
                c = pg.evaluate(f"window.__demo.clientOfStage({x},{y})"); pg.mouse.click(c["x"], c["y"], button=button); pg.wait_for_timeout(40)
            pg.keyboard.press("1"); pg.keyboard.press("r"); pg.wait_for_timeout(50)
            for xy in [(171, 86), (318, 92), (612, 200)]:
                pg.mouse.click(*client(*xy)); pg.wait_for_timeout(30)
            stage_click(1820, 1030)   # 右下角“下一步 ›”：闭合前点它 = 闭合，不落点
            check(f"{tag} 闭合前点“下一步”按钮：闭合且不多落点", st()["closed"] and st()["seeds"] == 3, str(st()))
            pg.wait_for_timeout(1100)
            stage_click(960, 500)
            check(f"{tag} 闭合后左键点画面 = 下一步（进入放大）", st()["phase"] == "zoom", str(st()))
            stage_click(960, 500, "right")
            check(f"{tag} 第 2 步右键 = 上一步（回到抠图）", st()["phase"] == "draw" and st()["closed"], str(st()))
            pg.keyboard.press("PageDown"); pg.wait_for_timeout(40)
            check(f"{tag} 翻页笔 PageDown = 下一步", st()["phase"] == "zoom")
            pg.keyboard.press("PageUp"); pg.wait_for_timeout(40)
            check(f"{tag} 翻页笔 PageUp = 上一步", st()["phase"] == "draw")
            stage_click(1820, 1030); pg.wait_for_timeout(40)
            check(f"{tag} 点“下一步 ›”按钮前进", st()["phase"] == "zoom")
            stage_click(1686, 1030); pg.wait_for_timeout(40)
            check(f"{tag} 点“‹”按钮后退", st()["phase"] == "draw")
            stage_click(1820, 1030)
            for _ in range(8):
                if st()["phase"] == "dij": break
                stage_click(960, 500); stage_click(960, 500)
            check(f"{tag} 一路左键点到第 3 步", st()["phase"] == "dij" and st()["k"] == 0, str(st()))
            K = st()["K"]
            for i in range(3):
                stage_click(960, 500); pg.wait_for_timeout(300)
            s3 = st()
            check(f"{tag} 前 3 下一按一步", s3["k"] == 3 and not s3["play"], str(s3))
            stage_click(960, 500); pg.wait_for_timeout(1300)
            s4 = st()
            check(f"{tag} 第 4 下开始自动播放", s4["play"] and s4["k"] >= 4, str(s4))
            stage_click(960, 500); k_pause = st()["k"]; pg.wait_for_timeout(1500)
            check(f"{tag} 自动播放中点击 = 暂停", st()["paused"] and st()["k"] == k_pause, str(st()))
            stage_click(960, 500, "right")
            check(f"{tag} 第 3 步右键 = 退回一次锁定", st()["k"] == k_pause - 1, str(st()))
            pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(50)
            check(f"{tag} 再按一次 = 继续自动播放", st()["play"], str(st()))
            pg.wait_for_function("window.__demo.state().phase === 'reveal'", timeout=20000)
            s5 = st()
            check(f"{tag} 自动播放到终点锁定后自动揭晓，且只锁到终点为止", s5["phase"] == "reveal" and s5["k"] == K, str(s5))
            menu = pg.evaluate("""(() => { const c = document.getElementById('cv'); const r = c.getBoundingClientRect();
                const ev = new MouseEvent('contextmenu', {clientX: r.left + 50, clientY: r.top + 50, bubbles: true, cancelable: true}); c.dispatchEvent(ev); return ev.defaultPrevented; })()""")
            check(f"{tag} 屏蔽浏览器右键菜单", menu)
        if vw == 1920:
            # 拖一张照片进来（用候选缩略图里的红墙黑猫当作“学校里拍的照片”）
            img = DEV / "下载" / "候选缩略图" / "Solid_black_cat_beside_a_red_clay-block_wall_on_Margarita_Island,_Venezuela.jpg"
            b64 = base64.b64encode(img.read_bytes()).decode()
            pg.evaluate("""(b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
                const f = new File([u], 'my.jpg', {type: 'image/jpeg'}); const dt = new DataTransfer(); dt.items.add(f);
                window.dispatchEvent(new DragEvent('dragover', {dataTransfer: dt, bubbles: true}));
                window.dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true})); }""", b64)
            pg.wait_for_timeout(1500)
            s = st()
            check("拖入照片后回到第 1 步、轮廓清空、没有报错（画布未被污染）", s["phase"] == "draw" and s["seeds"] == 0 and not errs, str(errs))
            pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(300)
            check("换照片后空白按 → 不会自动描（提示先点几下）", st()["seeds"] == 0)
            pts = [(132, 132), (175, 128), (222, 165), (298, 152), (318, 270), (290, 315), (160, 300), (140, 210)]
            cw = pg.evaluate("window.__demo.exportCheck(false).cw")
            sc = cw / 480
            for x0, y0 in pts:
                pg.mouse.click(*client(x0 * sc, y0 * sc)); pg.wait_for_timeout(40)
            pg.mouse.click(*client(pts[0][0] * sc + 1, pts[0][1] * sc + 1)); pg.wait_for_timeout(1300)
            pg.screenshot(path=str(OUT / "interact-dropped-photo.png"))
            check("换照片后能闭合", st()["closed"])
        check(f"{tag} 没有脚本错误", not errs, str(errs))
        pg.close()
    b.close()
print("\n总结：", "全部通过" if not fails else f"失败 {fails}")
