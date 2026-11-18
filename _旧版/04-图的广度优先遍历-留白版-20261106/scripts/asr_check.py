"""TTS 读音核对：funasr 加载本地 MOSS-Transcribe-Diarize，把每条旁白 mp3 转写出来，和 speak 并排打印。

    $env:PYTHONIOENCODING="utf-8"
    & $PY scripts\\asr_check.py [--only s2b,s3a]

只读 public/bfs/audio/*.mp3 和 src/bfs/narration.json，不改任何文件。
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = r"C:\Users\Kandao\.cache\modelscope\models\openmoss--MOSS-Transcribe-Diarize\snapshots\master"
HOT = "热词：V一、V二、V三、V四、V五、V六、V七、V八、visited、DFS、BFS、邻接表、邻接矩阵、队列、出队、入队、第零层、连通分量、O n平方、O n加e。"

ap = argparse.ArgumentParser()
ap.add_argument("--only", default="")
a = ap.parse_args()
only = {x for x in a.only.split(",") if x}

from funasr import AutoModel  # noqa: E402

model = AutoModel(model="MOSS-Transcribe-Diarize", model_path=MODEL_PATH, device="cuda:0", dtype="bf16", disable_update=True)
nar = json.loads((ROOT / "src" / "bfs" / "narration.json").read_text(encoding="utf-8"))
for c in nar:
    if only and c["id"] not in only:
        continue
    mp3 = ROOT / "public" / "bfs" / "audio" / f"{c['id']}.mp3"
    res = model.generate(input=str(mp3))
    txt = res[0].get("text", "") if res else ""
    txt = re.sub(r"\[[\d.]+\]|\[S\d+\]", "", txt).strip()
    print(f"{c['id']}  稿：{c['speak']}")
    print(f"{' ' * len(c['id'])}  听：{txt}")
