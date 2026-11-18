# 把下载的猫照片缩到 1200 宽，存成内嵌用的 JPEG，并输出 base64 文本；另出一张 800 宽带网格的图，方便挑预设轮廓点。
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import base64, sys
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
src = root / "下载" / "black_barn_cat_1200.jpg"
im = Image.open(src).convert("RGB")
im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
out = root / "photo_1200.jpg"
im.save(out, quality=86, optimize=True, progressive=False)
print("embedded", im.size, out.stat().st_size)
g = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS).resize((1600, 840), Image.NEAREST)
d = ImageDraw.Draw(g)
for x in range(0, 800, 20):
    d.line([(x*2, 0), (x*2, 840)], fill=(0, 255, 255) if x % 100 == 0 else (90, 200, 200), width=1)
    if x % 100 == 0: d.text((x*2+3, 3), str(x), fill=(255, 255, 0))
for y in range(0, 420, 20):
    d.line([(0, y*2), (1600, y*2)], fill=(0, 255, 255) if y % 100 == 0 else (90, 200, 200), width=1)
    if y % 100 == 0: d.text((3, y*2+3), str(y), fill=(255, 255, 0))
g.save(Path(sys.argv[1]))
