# 把路网（data/network.json，和导航演示同一份数据的副本）嵌进 src/dijkstra.template.html，
# 输出 ../迪杰斯特拉.html（单文件、完全离线），并检查里面没有任何网址。
# 用法：python -I build.py
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import json
import re
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent

tpl = (DEV / "src" / "dijkstra.template.html").read_text(encoding="utf-8")
net = json.loads((DEV / "data" / "network.json").read_text(encoding="utf-8"))
key = "/*NETWORK*/null"
assert tpl.count(key) == 1, key
out_s = tpl.replace(key, json.dumps(net, ensure_ascii=False))
urls = re.findall(r"(?i)\b(?:https?|ftp)://|\bwww\.|//[a-z0-9-]+\.[a-z]{2,}/|@import|<link\b|\bsrc\s*=\s*[\"']", out_s)
assert not urls, f"不能有网络地址 / 外部资源：{urls}"
out = ROOT / "迪杰斯特拉.html"
out.write_text(out_s, encoding="utf-8")
print(out, out.stat().st_size, "bytes；没有网址、没有外部资源")
