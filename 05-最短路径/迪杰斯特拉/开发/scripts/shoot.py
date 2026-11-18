# 用 Playwright（本机 Edge，channel="msedge"）打开页面，从第 1 步按到最后一步，每一步截一张图，
# 同时导出每一步屏幕上的文字 / 表格（stepDump）和整套数据（exportCheck），给 verify.py 逐格核对。
# 页面用 ?record（手动时钟），每步先按键、再把时钟往前拨到动画放完，所以截图和电脑快慢无关、可重复。
# 用法：python -I shoot.py [宽 高] [前缀] [起点字母]
#   例：python -I shoot.py 1920 1080 full
#       python -I shoot.py 1366 768 w1366
#       python -I shoot.py 1920 1080 startE E      （先换起点再走一遍）
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "迪杰斯特拉.html"
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1920
H = int(sys.argv[2]) if len(sys.argv) > 2 else 1080
TAG = sys.argv[3] if len(sys.argv) > 3 else f"{W}x{H}"
START = sys.argv[4] if len(sys.argv) > 4 else None
OUT = DEV / "截图"
OUT.mkdir(exist_ok=True)


def main():
    errors = []
    dumps = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        pg.goto(HTML.as_uri() + "?record=1")
        pg.wait_for_function("window.__demoReady === true", timeout=20000)
        T = [0.0]

        def at(sec):
            T[0] += sec
            pg.evaluate(f"window.__demo.setTime({T[0]:.3f})")

        at(0.5)
        if START:
            pg.evaluate(f"window.__demo.setStart('{START}')")
            at(2.0)
        total = pg.evaluate("window.__demo.state().total")
        for k in range(total):
            if k:
                pg.keyboard.press("ArrowRight")
                at(0.05)
            s = pg.evaluate("window.__demo.state()")
            assert s["idx"] == k, (s, k)
            at(3.6 if s["kind"] in ("u", "read") else 2.4)
            name = f"{TAG}-{k:02d}-{s['sec']}{s['kind']}{s['i'] if s['i'] is not None else (s['n'] if s['n'] is not None else '')}.png"
            pg.screenshot(path=str(OUT / name))
            d = pg.evaluate("window.__demo.stepDump()")
            dumps.append(d)
            print("shot", name)
        data = pg.evaluate("window.__demo.exportCheck()")
        data["stepDumps"] = dumps
        (OUT / f"{TAG}-check.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        b.close()
    print("errors:", errors if errors else "none")


main()
