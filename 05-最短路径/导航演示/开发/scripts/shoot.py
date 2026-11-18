# 用 Playwright（本机 Edge，channel="msedge"）打开演示页，按步骤截图，并导出核对数据。
# 页面用 ?record（手动时钟），每一步先 setTime 再截图，所以截图和电脑快慢无关、可重复。
# 用法：python -I shoot.py [宽 高] [前缀] [额外查询串]
#   例：python -I shoot.py 1920 1080 full
#       python -I shoot.py 1366 768 w1366
#       python -I shoot.py 1920 1080 debug debug=proj
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "导航演示.html"
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1920
H = int(sys.argv[2]) if len(sys.argv) > 2 else 1080
TAG = sys.argv[3] if len(sys.argv) > 3 else f"{W}x{H}"
EXTRA = ("&" + sys.argv[4]) if len(sys.argv) > 4 else ""
OUT = DEV / "截图"
OUT.mkdir(exist_ok=True)


def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        pg = b.new_page(viewport={"width": W, "height": H})
        pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        pg.goto(HTML.as_uri() + "?record=1" + EXTRA)
        pg.wait_for_function("window.__demoReady === true", timeout=20000)
        T = [0.0]

        def at(sec):
            T[0] += sec
            pg.evaluate(f"window.__demo.setTime({T[0]:.3f})")

        def shot(name):
            path = OUT / f"{TAG}-{name}.png"
            pg.screenshot(path=str(path))
            print("shot", path.name, pg.evaluate("JSON.stringify(window.__demo.state())"))

        def key(k="ArrowRight"):
            pg.keyboard.press(k)

        at(1.6); shot("1a-手绘导入")
        key(); at(0.5); shot("1b-淡入导航")
        at(3.6); shot("1c-导航路线")
        key(); at(1.0); shot("2a-放倒中")
        at(2.0); shot("2b-路口变顶点")
        key(); at(2.4); shot("2c-路段变边")
        key(); at(1.8); shot("3a-初始化")
        key(); at(0.25); shot("3b-锁定1-跳动")
        at(1.5); shot("3b-锁定1")
        key(); at(1.6); shot("3c-锁定2")
        key(); at(0.7); shot("3d-锁定3-改小")
        at(1.2); shot("3d-锁定3")
        key()                                   # 第 4 下：自动播放
        n = 0
        while pg.evaluate("window.__demo.state().phase") != "reveal" and n < 400:
            at(0.1); n += 1
            if n == 14: shot("3e-自动播放")
        at(0.4); shot("4a-揭晓开始")
        at(1.6); shot("4b-揭晓蓝线")
        at(2.0); shot("4c-揭晓结束")
        data = pg.evaluate("JSON.stringify(window.__demo.exportCheck())")
        (OUT / f"{TAG}-check.json").write_text(data, encoding="utf-8")
        b.close()
    print("errors:", errors if errors else "none")


main()
