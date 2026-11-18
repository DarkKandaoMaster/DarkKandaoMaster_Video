# 把截图拼成 2×2 的总览图（每张缩到一半），方便快速逐张检查：python -I sheet.py 前缀 → 截图/总览-前缀-NN.png
import sys; sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

from PIL import Image, ImageDraw

DEV = Path(__file__).resolve().parents[1]
SHOT = DEV / "截图"
TAG = sys.argv[1] if len(sys.argv) > 1 else "full"
files = sorted(f for f in SHOT.glob(f"{TAG}-*.png"))
for k in range(0, len(files), 4):
    sheet = Image.new("RGB", (1920, 1080), "white")
    d = ImageDraw.Draw(sheet)
    for j, f in enumerate(files[k:k + 4]):
        im = Image.open(f).convert("RGB")
        im.thumbnail((958, 538))
        x, y = (j % 2) * 962, (j // 2) * 542
        sheet.paste(im, (x, y))
        d.rectangle([x, y, x + im.width, y + 18], fill="black")
        d.text((x + 4, y + 3), f.stem.encode("ascii", "replace").decode(), fill="white")
    out = SHOT / f"总览-{TAG}-{k // 4:02d}.png"
    sheet.save(out)
    print(out.name)
