# 用 Playwright（本机 Edge，channel="msedge"）打开页面，从第 1 步按到最后一步，每一步截一张图，
# 同时导出每一步屏幕上的文字和状态（stepDump）和整套数据（exportCheck），给 verify.py 逐项核对。
# 页面用 ?record（手动时钟），每步先按键、再把时钟往前拨到动画放完，所以截图和电脑快慢无关、可重复。
# 用法：python -I shoot.py [宽 高] [前缀] [2d|3d] [小练起点]
#   例：python -I shoot.py 1920 1080 full3d 3d        （3D 模式；检测到 WebGL 才算数，否则报错）
#       python -I shoot.py 1920 1080 full2d 2d        （强制 2D：网址带 ?mode=2d）
#       python -I shoot.py 1366 768 w1366 3d
#       python -I shoot.py 1920 1080 prac3 2d 3       （小练起点换成 v3 再走一遍）
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "图的广度优先遍历.html"
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1920
H = int(sys.argv[2]) if len(sys.argv) > 2 else 1080
TAG = sys.argv[3] if len(sys.argv) > 3 else f"{W}x{H}"
MODE = sys.argv[4] if len(sys.argv) > 4 else "3d"
PSTART = int(sys.argv[5]) if len(sys.argv) > 5 else None
OUT = DEV / "截图"
OUT.mkdir(exist_ok=True)


def main():
    errors, reqs = [], []
    dumps = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        pg.on("request", lambda r: reqs.append(r.url))
        pg.goto(HTML.as_uri() + "?record=1" + ("&mode=2d" if MODE == "2d" else ""))
        pg.wait_for_function("window.__demoReady === true", timeout=20000)
        T = [0.0]

        def at(sec):
            T[0] += sec
            pg.evaluate(f"window.__demo.setTime({T[0]:.3f})")

        at(0.5)
        st = pg.evaluate("window.__demo.state()")
        assert st["mode"] == MODE, f"要的是 {MODE}，页面是 {st['mode']}（{st['reason']}）"
        if PSTART:
            pg.evaluate(f"window.__demo.setPractice({PSTART})")
            pg.evaluate("window.__demo.goStep(0)")
            at(0.5)
        total = pg.evaluate("window.__demo.state().total")
        for k in range(total):
            if k:
                pg.keyboard.press("ArrowRight")
                at(0.05)
            s = pg.evaluate("window.__demo.state()")
            assert s["idx"] == k, (s, k)
            at(s["dur"] + 0.6)
            name = f"{TAG}-{k:02d}-{s['sec']}{s['kind']}{s['n']}.png"
            pg.screenshot(path=str(OUT / name))
            dumps.append(pg.evaluate("window.__demo.stepDump()"))
            print("shot", name)
        data = pg.evaluate("window.__demo.exportCheck()")
        data["stepDumps"] = dumps
        data["mode"] = MODE
        (OUT / f"{TAG}-check.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        b.close()
    others = [u for u in reqs if not u.startswith("file:")]
    print("requests:", len(reqs), "non-file:", others)
    print("errors:", errors if errors else "none")
    if errors or others:
        sys.exit(1)


main()
