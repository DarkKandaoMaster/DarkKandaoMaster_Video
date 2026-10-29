"""_tools 里各脚本共用：定位"某一条视频的工程目录"和它的 slug。

工程目录 = 根目录下的一条视频（如 2026-10-28-上下三角矩阵）或 _template，里面有 package.json、src/、public/、scripts/。
slug = src/ 下放这条视频代码的子目录名（如 tri-matrix），也是 public/<slug>/audio/ 的目录名；
src/ 下只有一个子目录带 narration.json 时自动识别，否则用 --slug 指定。
"""
from __future__ import annotations

import argparse
from pathlib import Path


class ProjectError(Exception):
    pass


def add_project_arg(ap: argparse.ArgumentParser, slug: bool = False) -> None:
    ap.add_argument("--project", default=".", help="视频工程目录（默认 = 当前目录），如 2026-10-28-上下三角矩阵")
    if slug:
        ap.add_argument("--slug", default=None, help="src/ 下的视频子目录名；只有一个时可省略")


def project_dir(arg: str) -> Path:
    p = Path(arg).resolve()
    if not (p / "package.json").exists() or not (p / "src").is_dir():
        raise ProjectError(f"{p} 不像一个视频工程（缺 package.json 或 src/）")
    return p


def find_slug(project: Path, slug: str | None) -> str:
    if slug:
        if not (project / "src" / slug).is_dir():
            raise ProjectError(f"找不到 {project / 'src' / slug}")
        return slug
    found = sorted(d.name for d in (project / "src").iterdir() if (d / "narration.json").exists())
    if len(found) != 1:
        raise ProjectError(f"src/ 下带 narration.json 的子目录有 {found or '0 个'}，请用 --slug 指定")
    return found[0]
