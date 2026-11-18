# 录课堂备份视频：页面用 ?record（手动时钟 + 画一个假鼠标），每一帧先 setTime 再截图，经管道交给 ffmpeg 编成 30fps H.264。
# 不依赖 Playwright 自带的录像（它要另下载 ffmpeg），所以帧率稳定、和电脑快慢无关。
# 用法：python -I record.py [输出 mp4]
import sys; sys.stdout.reconfigure(encoding="utf-8")
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "磁性套索演示.html"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DEV.parent / "磁性套索演示-备份.mp4"
FPS = 30
# 沿轮廓点的位置（计算坐标 800×420），和页面里的预设轮廓差不多，但点得随意一点
CLICKS = [(171, 86), (240, 110), (318, 92), (402, 106), (498, 99), (562, 130), (594, 154), (617, 216), (612, 307), (430, 313), (207, 311), (179, 212), (169, 141)]

ff = subprocess.Popen(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
     "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT)],
    stdin=subprocess.PIPE)

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto(HTML.as_uri() + "?record=1")
    pg.wait_for_function("window.__demoReady === true", timeout=20000)
    T = [0.0]
    nframes = [0]

    def frames(sec, each=None):
        n = round(sec * FPS)
        for i in range(n):
            if each: each(i / max(1, n - 1))
            T[0] += 1 / FPS
            pg.evaluate(f"window.__demo.setTime({T[0]:.4f})")
            ff.stdin.write(pg.screenshot(type="jpeg", quality=92))
            nframes[0] += 1

    def client(x, y):
        s = pg.evaluate(f"window.__demo.stageOfWorld({x},{y})")
        c = pg.evaluate(f"window.__demo.clientOfStage({s['x']},{s['y']})")
        return c["x"], c["y"]

    def key(k, hold):
        pg.keyboard.press(k)
        frames(hold)

    ease = lambda u: u * u * (3 - 2 * u)
    pos = [1500.0, 1000.0]

    def move_to(x, y, sec):
        x0, y0 = pos

        def each(u):
            e = ease(u)
            pg.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
        frames(sec, each)
        pos[0], pos[1] = x, y

    frames(1.5)
    first = client(*CLICKS[0])
    move_to(*first, 1.2)
    pg.mouse.click(*first); frames(0.5)
    for xy in CLICKS[1:]:
        c = client(*xy)
        move_to(*c, 1.0)
        pg.mouse.click(*c)
        frames(0.35)
    move_to(first[0] + 4, first[1] + 3, 1.0)
    frames(0.4)
    pg.mouse.click(first[0] + 4, first[1] + 3)
    frames(3.0)
    pg.mouse.move(1919, 1079)
    key("ArrowRight", 4.6)   # 放大
    key("ArrowRight", 3.2)   # 像素 → 顶点
    key("ArrowRight", 4.0)   # 连边、标权值
    key("ArrowRight", 2.5)   # 迪杰斯特拉开始
    for _ in range(3):       # 前 3 次一按一步
        key("ArrowRight", 1.3)
    pg.keyboard.press("ArrowRight")   # 第 4 下：自动播放，终点锁定后自动揭晓
    while pg.evaluate("window.__demo.state().phase") != "reveal":
        frames(0.2)
    frames(5.5)              # 揭晓
    b.close()

ff.stdin.close()
ff.wait()
print(OUT, f"{nframes[0]} 帧 = {nframes[0] / FPS:.1f} 秒")
