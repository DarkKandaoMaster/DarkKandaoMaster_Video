# 用 Playwright（本机 Edge，channel="msedge"）以 1920×1080 打开演示页，按场景截图。
# 用法：python -I shoot.py <场景> [输出目录]
#   debug   —— 第 1 步边权图 + 照片
#   manual  —— 真的用鼠标沿轮廓点几下（中途截图），闭合，然后一路走到第 3 步结束，各阶段截图
#   auto    —— 第 1 步什么都不点直接按 →（预设轮廓），其余同上
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "磁性套索演示.html"
scene = sys.argv[1] if len(sys.argv) > 1 else "manual"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else DEV / "截图"
OUT.mkdir(parents=True, exist_ok=True)

# 手动点击用的轮廓点（计算坐标 800×420），故意点得不太准，靠吸附 + 贴边
CLICKS = [(171, 86), (318, 92), (470, 100), (612, 200), (611, 306), (330, 313), (205, 311), (178, 210)]


def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        url = HTML.as_uri() + ("?debug=cost" if scene == "debug" else "")
        pg.goto(url)
        pg.wait_for_function("window.__demoReady === true", timeout=20000)
        pg.wait_for_timeout(300)

        def shot(name):
            path = OUT / f"{scene}-{name}.png"
            pg.screenshot(path=str(path))
            print("shot", path.name, pg.evaluate("JSON.stringify(window.__demo.state())"))

        def client(x, y):
            s = pg.evaluate(f"window.__demo.stageOfWorld({x},{y})")
            c = pg.evaluate(f"window.__demo.clientOfStage({s['x']},{s['y']})")
            return c["x"], c["y"]

        if scene == "debug":
            shot("cost")
            pg.keyboard.press("d")
            pg.wait_for_timeout(200)
            shot("photo")
            b.close()
            return

        if scene == "manual":
            for n, (x, y) in enumerate(CLICKS):
                cx, cy = client(x, y)
                pg.mouse.move(cx, cy, steps=6)
                pg.mouse.click(cx, cy)
                pg.wait_for_timeout(60)
                if n == 4:
                    nx, ny = client(*CLICKS[5])
                    pg.mouse.move((cx + nx) / 2, (cy + ny) / 2 + 4, steps=8)
                    pg.wait_for_timeout(120)
                    shot("1a-tracing")
            fx, fy = client(*CLICKS[0])
            pg.mouse.move(fx + 6, fy + 4, steps=8)
            pg.wait_for_timeout(150)
            shot("1b-before-close")
            pg.mouse.click(fx + 6, fy + 4)
        else:
            pg.keyboard.press("ArrowRight")
            pg.wait_for_timeout(2500)
            shot("1a-autotrace")
            pg.wait_for_timeout(5000)
        pg.wait_for_timeout(1300)
        shot("1c-cutout")
        pg.mouse.move(5, 5)

        # manual 场景用鼠标左键点击画面前进，auto 场景用方向键
        adv = (lambda: pg.mouse.click(960, 600)) if scene == "manual" else (lambda: pg.keyboard.press("ArrowRight"))
        if scene == "manual":
            pg.wait_for_timeout(500)
        for name, wait in [("2a-zoom", 3200), ("2b-dots", 1700), ("2c-edges", 1900)]:
            adv()
            pg.wait_for_timeout(wait)
            shot(name)
        adv()
        pg.wait_for_timeout(1000)
        shot("3a-dij0")
        for _ in range(3):          # 前 3 次一按一步
            adv()
            pg.wait_for_timeout(700)
        shot("3b-manual3")
        adv()                       # 第 4 下：开始自动播放
        pg.wait_for_timeout(1900)
        shot("3c-autoplay")
        adv()                       # 暂停
        pg.wait_for_timeout(1000)
        shot("3c-paused")
        adv()                       # 继续
        K = pg.evaluate("window.__demo.state().K")
        pg.wait_for_function("window.__demo.state().phase === 'reveal'", timeout=30000)
        pg.wait_for_timeout(3000)
        shot("3d-final")
        data = pg.evaluate("JSON.stringify(window.__demo.exportCheck(true))")
        (OUT / f"{scene}-check.json").write_text(data, encoding="utf-8")
        b.close()
    print("errors:", errors if errors else "none")


main()
