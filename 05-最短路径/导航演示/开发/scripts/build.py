# 把底图（data/basemap.svg）、路网（data/network.json）、手绘地图（base64）嵌进 src/demo.template.html，
# 输出 ../导航演示.html（单文件、完全离线）
# 用法：python -I build.py
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import base64
import json
import re
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent
MAPS = ROOT.parent / "地图"

tpl = (DEV / "src" / "demo.template.html").read_text(encoding="utf-8")
svg = (DEV / "data" / "basemap.svg").read_text(encoding="utf-8")
svg = re.sub(r'\swidth="\d+" height="\d+"', ' preserveAspectRatio="none"', svg, count=1)
net = json.loads((DEV / "data" / "network.json").read_text(encoding="utf-8"))
hand = (MAPS / "手绘地图.jpg").read_bytes()
uri = "data:image/jpeg;base64," + base64.b64encode(hand).decode("ascii")

for key in ("<!--BASEMAP-->", "/*NETWORK*/null", "__HAND_URI__"):
    assert tpl.count(key) == 1, key
out_s = (tpl.replace("<!--BASEMAP-->", svg)
         .replace("/*NETWORK*/null", json.dumps(net, ensure_ascii=False))
         .replace("__HAND_URI__", uri))
assert "http://" not in out_s.replace('xmlns="http://www.w3.org/2000/svg"', "") and "https://" not in out_s, "不能有网络地址"
out = ROOT / "导航演示.html"
out.write_text(out_s, encoding="utf-8")
print(out, out.stat().st_size, "bytes")
