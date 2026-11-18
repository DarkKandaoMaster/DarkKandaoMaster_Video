"""对照：src/kmp/data.ts 里现算的数据（node 载入后的 DUMP）== scripts/check_numbers.py 的算法结果。

用法（在工程目录 02-KMP 里）：
    $env:PYTHONIOENCODING="utf-8"
    & D:\\Programs\\DevEnvironments\\Anaconda\\anaconda3\\envs\\myenv\\python.exe scripts\\check_data.py

data.ts 自己在载入时也会把现算结果和照抄的 EXPECT 比一遍（不一致就 throw）；这里是第二道：
换一种语言（Python）、直接调用 check_numbers.py 的函数，再逐项比对。需要 node ≥ 22.6（能直接载入 .ts）。
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import check_numbers as C  # noqa: E402


def load_dump() -> dict:
    js = "import('./src/kmp/data.ts').then(m => process.stdout.write(JSON.stringify(m.DUMP)))"
    r = subprocess.run(["node", "--no-warnings", "--input-type=module", "-e", js], cwd=ROOT,
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        print(r.stderr)
        sys.exit(2)
    return json.loads(r.stdout)


def enc_naive(steps):
    return [[i, j, 1 if eq else 0, i + 1 if eq else i - j + 2, j + 1 if eq else 1] for (i, j, a, b, eq, st) in steps]


def enc_kmp(steps, tbl):
    out = []
    for (i, j, a, b, eq, st) in steps:
        if j == 0:
            out.append([i, 0, None, i + 1, 1])
        else:
            out.append([i, j, 1 if eq else 0, i + 1 if eq else i, j + 1 if eq else tbl[j]])
    return out


def main() -> None:
    d = load_dump()
    nb = C.next_brute(C.PATTERN)
    vb = C.nextval_brute(C.PATTERN)
    qn = C.next_brute(C.QUIZ)
    qv = C.nextval_brute(C.QUIZ)
    ns, npos = C.naive_trace(C.MAIN, C.PATTERN)
    ks, kpos = C.kmp_trace(C.MAIN, C.PATTERN, nb)
    s1, p1 = C.kmp_trace(C.NV_MAIN, C.PATTERN, nb)
    s2, p2 = C.kmp_trace(C.NV_MAIN, C.PATTERN, vb)
    trips = []
    for st in ns:
        if not trips or trips[-1][0] != st[5]:
            trips.append([st[5], 0])
        trips[-1][1] += 1
    want = {
        "strings": {"MAIN": C.MAIN, "PAT": C.PATTERN, "NV_MAIN": C.NV_MAIN, "QUIZ": C.QUIZ},
        "next": nb[1:],
        "nextval": vb[1:],
        "quizNext": qn[1:],
        "quizNextval": qv[1:],
        "borders": [C.border(C.PATTERN, j) for j in range(2, len(C.PATTERN) + 1)],
        "quizBorders": [C.border(C.QUIZ, j) for j in range(2, len(C.QUIZ) + 1)],
        "nextvalSame": [j for j in range(2, len(C.PATTERN) + 1) if C.ch(C.PATTERN, j) == C.ch(C.PATTERN, nb[j])],
        "count": {"naive": C.comparisons(ns), "kmp": C.comparisons(ks), "nvNext": C.comparisons(s1), "nvNextval": C.comparisons(s2)},
        "found": {"main": npos, "kmp": kpos, "nvNext": p1, "nvNextval": p2},
        "trips": trips,
        "naive": enc_naive(ns),
        "kmp": enc_kmp(ks, nb),
        "nvNext": enc_kmp(s1, nb),
        "nvNextval": enc_kmp(s2, vb),
    }
    bad = 0
    for k, v in want.items():
        ok = d.get(k) == v
        bad += not ok
        short = json.dumps(v, ensure_ascii=False)
        print(f"  [{'OK' if ok else '!!'}] {k}: {short[:90]}{'…' if len(short) > 90 else ''}")
        if not ok:
            print(f"        data.ts: {json.dumps(d.get(k), ensure_ascii=False)}")
    extra = set(d) - set(want)
    if extra:
        print(f"  （DUMP 里没核对的键：{sorted(extra)}）")
    print("全部 OK" if bad == 0 else f"有 {bad} 处不一致")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
