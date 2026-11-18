# 用本机已有的 esbuild（05-最短路径\3D小样-绳结 工程里装的 0.28.1）把 vendor/three-entry.js 打包成
# vendor/three.iife.min.js（IIFE，全局变量 THREE，只含页面用到的类，已压缩）。不联网、不装新东西。
# three.js 版本 0.187.0（同一个工程的 node_modules\three），MIT 许可：许可全文复制到 vendor/three-LICENSE.txt，
# 产物开头再加一段许可说明（build.py 内联时原样保留）。
# 用法：python -I bundle_three.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import os
import shutil
import subprocess
from pathlib import Path

DEV = Path(__file__).resolve().parents[1]
VIDEO = DEV.parents[2]                                    # d:\Release\DarkKandaoMaster_Video
NM = VIDEO / "05-最短路径" / "3D小样-绳结" / "node_modules"
ESBUILD = NM / ".pnpm" / "@esbuild+win32-x64@0.28.1" / "node_modules" / "@esbuild" / "win32-x64" / "esbuild.exe"
THREE = NM / "three"
VENDOR = DEV / "vendor"
OUT = VENDOR / "three.iife.min.js"

assert ESBUILD.exists(), ESBUILD
ver = __import__("json").loads((THREE / "package.json").read_text(encoding="utf-8"))["version"]
assert ver == "0.187.0", ver
shutil.copyfile(THREE / "LICENSE", VENDOR / "three-LICENSE.txt")

env = dict(os.environ, NODE_PATH=str(NM))
r = subprocess.run([str(ESBUILD), str(VENDOR / "three-entry.js"), "--bundle", "--format=iife", "--global-name=THREE",
                    "--minify", "--legal-comments=none", "--target=es2019"],
                   env=env, capture_output=True, text=True, encoding="utf-8")
print(r.stderr)
assert r.returncode == 0 and r.stdout
lic = (VENDOR / "three-LICENSE.txt").read_text(encoding="utf-8").strip()
head = ("/*!\n * three.js r187 (0.187.0), 只打包了本页用到的部分。\n * @license\n * Copyright 2010-2026 Three.js Authors\n"
        " * SPDX-License-Identifier: MIT\n *\n" + "\n".join(" * " + ln if ln else " *" for ln in lic.splitlines()) + "\n */\n")
OUT.write_text(head + r.stdout, encoding="utf-8")
print(OUT, OUT.stat().st_size, "bytes")
