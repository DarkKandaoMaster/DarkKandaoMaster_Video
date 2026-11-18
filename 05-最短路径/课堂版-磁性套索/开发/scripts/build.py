# 把 开发/src/demo.template.html 里的 __PHOTO_DATA_URI__ 换成内嵌照片（base64），输出 ../磁性套索演示.html
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import base64
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent
tpl = (DEV / "src" / "demo.template.html").read_text(encoding="utf-8")
photo = (DEV / "photo_1200.jpg").read_bytes()
uri = "data:image/jpeg;base64," + base64.b64encode(photo).decode("ascii")
assert tpl.count("__PHOTO_DATA_URI__") == 1
out = ROOT / "磁性套索演示.html"
out.write_text(tpl.replace("__PHOTO_DATA_URI__", uri), encoding="utf-8")
print(out, out.stat().st_size, "bytes")
