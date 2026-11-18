# 录课堂备份视频：页面用 ?record（手动时钟），每一帧先 setTime 再截图，经管道交给 ffmpeg 编成 30fps H.264（无声）。
# 默认（3D）从第 1 步完整按到最后一步（第三版共 77 步）；每步停留 = 这一步的动画时长 + 一段留白（给老师讲的时间，录像里只是让画面停一停）。
# 用法：python -I record.py [输出 mp4] [2d]
import sys; sys.stdout.reconfigure(encoding="utf-8")
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = DEV.parent / "图的广度优先遍历.html"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DEV.parent / "图的广度优先遍历-备份.mp4"
MODE = sys.argv[2] if len(sys.argv) > 2 else "3d"
FPS = 30
EXTRA = {"pond": 2.4, "tools": 2.5, "walk": 2.0, "mark": 2.8, "redo": 2.5, "adj": 3.0, "lift": 2.8, "nc": 2.8, "algo": 4.0, "prac": 3.5, "end": 3.0}

ff = subprocess.Popen(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
     "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT)],
    stdin=subprocess.PIPE)

marks = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto(HTML.as_uri() + "?record=1" + ("&mode=2d" if MODE == "2d" else ""))
    pg.wait_for_function("window.__demoReady === true", timeout=20000)
    T = [0.0]
    nframes = [0]

    def frames(sec):
        for _ in range(round(sec * FPS)):
            T[0] += 1 / FPS
            pg.evaluate(f"window.__demo.setTime({T[0]:.4f})")
            ff.stdin.write(pg.screenshot(type="jpeg", quality=92))
            nframes[0] += 1

    st = pg.evaluate("window.__demo.state()")
    assert st["mode"] == MODE, st
    total = st["total"]
    for k in range(total):
        if k: pg.keyboard.press("ArrowRight")
        s = pg.evaluate("window.__demo.state()")
        assert s["idx"] == k, (s, k)
        marks.append((round(nframes[0] / FPS, 2), k + 1, s["sec"], s["kind"], s["n"]))
        frames(s["dur"] + EXTRA[s["kind"]] + (2.0 if (s["kind"], s["n"]) == ("prac", 0) else 0))
    b.close()

ff.stdin.close()
ff.wait()
print(OUT, f"{nframes[0]} 帧 = {nframes[0] / FPS:.1f} 秒")
(DEV / "录屏时间点.txt").write_text("秒\t第几步\t段\t类型\t段内第几\n" + "\n".join("\t".join(map(str, m)) for m in marks) + "\n", encoding="utf-8")
