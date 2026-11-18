# 录课堂备份视频：页面用 ?record（手动时钟），每一帧先 setTime 再截图，经管道交给 ffmpeg 编成 30fps H.264（无声）。
# 按默认起点（生命科学学院 G）从第 1 步完整走到第 50 步，每步停留的时间按画面内容定（算式、读路径停久一点）。
# 用法：python -I record.py [输出 mp4]
import sys; sys.stdout.reconfigure(encoding="utf-8")
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "迪杰斯特拉.html"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DEV.parent / "迪杰斯特拉-备份.mp4"
FPS = 30
HOLD = {"nav": 4.0, "title": 3.5, "all": 3.5, "idea": 3.0, "three": 3.5, "init": 5.0, "q": 3.0, "l": 3.5, "u": 5.0,
        "rfinal": 3.5, "read": 5.0, "quiz": 3.0, "tree": 5.0, "proof": 4.5, "neg": 4.5, "prac": 5.0, "code": 4.5, "sum": 6.0}

ff = subprocess.Popen(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
     "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT)],
    stdin=subprocess.PIPE)

marks = []
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

    total = pg.evaluate("window.__demo.state().total")
    for k in range(total):
        if k: pg.keyboard.press("ArrowRight")
        s = pg.evaluate("window.__demo.state()")
        assert s["idx"] == k, (s, k)
        marks.append((round(nframes[0] / FPS, 2), k, s["sec"], s["kind"], s["i"] if s["i"] is not None else s["n"]))
        frames(HOLD[s["kind"]])
    b.close()

ff.stdin.close()
ff.wait()
print(OUT, f"{nframes[0]} 帧 = {nframes[0] / FPS:.1f} 秒")
(DEV / "录屏时间点.txt").write_text("秒\t步\t段\t类型\t第几\n" + "\n".join("\t".join(map(str, m)) for m in marks) + "\n", encoding="utf-8")
