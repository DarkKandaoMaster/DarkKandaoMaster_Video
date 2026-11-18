# 拼出 ../图的广度优先遍历.html（单文件、完全离线）：
#   src/bfs.template.html  ←  data/graphs.json（/*DATA*/）+ vendor/three.iife.min.js（/*THREE*/，three.js r187，MIT，许可头原样保留）
# 然后检查产物里没有网址、没有外部资源：
#   - 不许出现 <link>、src=、@import、url(、fetch(、XMLHttpRequest、import(、WebSocket、EventSource、sendBeacon；
#   - 网址形式的字符串只允许一个：three.js 里 document.createElementNS 用的 XHTML 命名空间 "http://www.w3.org/1999/xhtml"
#     （这是命名空间标识，不会发起网络请求；交互测试里还会记录页面的全部网络请求，确认只加载了页面本身）。
# 用法：python -I build.py
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import json
import re
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent
OUT = ROOT / "图的广度优先遍历.html"

tpl = (DEV / "src" / "bfs.template.html").read_text(encoding="utf-8")
data = json.loads((DEV / "data" / "graphs.json").read_text(encoding="utf-8"))
data.pop("_说明", None)
three = (DEV / "vendor" / "three.iife.min.js").read_text(encoding="utf-8")
assert "SPDX-License-Identifier: MIT" in three and "Permission is hereby granted" in three, "three.js 的 MIT 许可头必须保留"
assert "</script" not in three.lower(), "three.js 里不能有 </script>"

for key in ("/*DATA*/null", "/*THREE*/"):
    assert tpl.count(key) == 1, key
out_s = tpl.replace("/*DATA*/null", json.dumps(data, ensure_ascii=False)).replace("/*THREE*/", three)

ALLOWED_URLS = {"http://www.w3.org/1999/xhtml"}
urls = re.findall(r"""(?i)\b(?:https?|ftp|wss?)://[^\s"'`)<>]*""", out_s)
bad_urls = sorted(set(u for u in urls if u not in ALLOWED_URLS))
assert not bad_urls, f"不能有网址：{bad_urls}"
bad = re.findall(r"(?i)<link\b|\bsrc\s*=\s*[\"']|@import|\bfetch\(|XMLHttpRequest|\bimport\(|WebSocket|EventSource|sendBeacon|\bwww\.(?!w3\.org/1999/xhtml)", out_s)
bad += re.findall(r"(?<![A-Za-z])url\(", out_s)           # CSS 的 url(…)（区分大小写，three.js 里的 toDataURL( 不算）
assert not bad, f"不能有外部资源：{sorted(set(bad))}"
OUT.write_text(out_s, encoding="utf-8")
print(OUT, f"{OUT.stat().st_size:,} bytes；网址字符串只有 {sorted(set(urls))}（命名空间，不联网）；没有外部资源")
