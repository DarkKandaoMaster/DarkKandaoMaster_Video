"""打印时间线（与 src/base/timeline.ts 同一算法），给抽帧挑时刻用。
    & $PY ../_tools/print_timeline.py                                    # 在视频工程目录里跑
    & $PY _tools/print_timeline.py --project 2026-10-28-上下三角矩阵        # 在根目录跑
读 <工程>/src/<slug>/narration.generated.ts 与 <工程>/src/<slug>/timeline.ts 的 PLAN / tail。"""
import argparse, json, math, re, sys

from project import ProjectError, add_project_arg, find_slug, project_dir

ap = argparse.ArgumentParser(); add_project_arg(ap, slug=True); a = ap.parse_args()
try:
    ROOT = project_dir(a.project)
    slug = find_slug(ROOT, a.slug)
except ProjectError as e:
    print(f"错误：{e}", file=sys.stderr); sys.exit(2)
gen = (ROOT / "src" / slug / "narration.generated.ts").read_text(encoding="utf-8")
clips = {}
for m in re.finditer(r'\{ id: "([^"]+)".*?frames: (\d+), onset: ([\d.]+), end: ([\d.]+), segs: (\[.*?\]), subs', gen):
    clips[m.group(1)] = dict(frames=int(m.group(2)), onset=float(m.group(3)), end=float(m.group(4)), segs=json.loads(m.group(5)))
tl = (ROOT / "src" / slug / "timeline.ts").read_text(encoding="utf-8")
plan = [(i, int(g)) for i, g in re.findall(r'\["(\w+)", (\d+)\]', tl)]
tail = int(re.search(r"buildTimeline\(CLIPS, PLAN, (\d+)\)", tl).group(1))
cur = 0
print(f"工程 {ROOT.name}，slug {slug}")
for cid, gap in plan:
    c = clips[cid]
    at = cur + gap
    segs = "  ".join(f"{at + round(s['t'] * 30)}:{s['text'][:8]}" for s in c["segs"])
    print(f"{cid:<5} at {at:>5} ({at/30:6.2f}s) end {at + math.ceil(c['end']*30):>5}  | {segs}")
    cur = at + c["frames"]
print(f"TOTAL {cur + tail} frames = {(cur + tail)/30:.2f}s")
