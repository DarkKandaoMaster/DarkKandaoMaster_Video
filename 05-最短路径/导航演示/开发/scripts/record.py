# 录课堂备份视频：页面用 ?record（手动时钟），每一帧先 setTime 再截图，经管道交给 ffmpeg 编成 30fps H.264（无声）。
# 不依赖 Playwright 自带的录像，帧率稳定、和电脑快慢无关。完整走一遍默认起终点（生命科学学院 → 32 号教学楼）。
# 用法：python -I record.py [输出 mp4]
import sys; sys.stdout.reconfigure(encoding="utf-8")
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "导航演示.html"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DEV.parent / "导航演示-备份.mp4"
FPS = 30

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

    def frames(sec):
        for _ in range(round(sec * FPS)):
            T[0] += 1 / FPS
            pg.evaluate(f"window.__demo.setTime({T[0]:.4f})")
            ff.stdin.write(pg.screenshot(type="jpeg", quality=92))
            nframes[0] += 1

    def key(hold, k="ArrowRight"):
        pg.keyboard.press(k)
        frames(hold)

    frames(4.0)              # 手绘地图 + 问题
    key(5.5)                 # 导航：图钉、蓝线、全程 280 米
    key(3.4)                 # 地图放倒，路口 → 顶点
    key(3.2)                 # 路段 → 边，标长度
    key(3.4)                 # 迪杰斯特拉：初始化
    key(2.8)                 # 第 1 次锁定
    key(2.8)                 # 第 2 次锁定
    key(4.0)                 # 第 3 次锁定：32号楼 300 → 280
    pg.keyboard.press("ArrowRight")   # 第 4 下：自动播放，终点锁定后自动揭晓
    while pg.evaluate("window.__demo.state().phase") != "reveal":
        frames(0.2)
    frames(6.0)              # 揭晓
    b.close()

ff.stdin.close()
ff.wait()
print(OUT, f"{nframes[0]} 帧 = {nframes[0] / FPS:.1f} 秒")
