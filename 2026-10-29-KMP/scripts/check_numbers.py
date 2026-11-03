"""暴力核对《KMP：next 与 nextval》分镜里出现的所有数字 + 旁白时长估计。

用法（在工程目录 2026-10-29-KMP 里）：
    $env:PYTHONIOENCODING="utf-8"
    & D:\\Programs\\DevEnvironments\\Anaconda\\anaconda3\\envs\\myenv\\python.exe scripts\\check_numbers.py

记号按严蔚敏《数据结构（C 语言版）》4.3：串下标从 1 起，next[1] = 0。
做法：
  1. next / nextval 先"按定义暴力枚举 k、逐字比较前后缀"算一遍，再用教材的递推算法（get_next / get_nextval）算一遍，
     两者在给定模式 + 字母表 {a,b,c} 上长度 1..9 的全部串上逐一比对；
  2. 真的模拟朴素匹配（教材 Index）和 KMP 匹配（教材 Index_KMP），打印每一次字符比较的 i、j，分镜照抄；
  3. 脚本.md 里的 speak 列直接读出来数字数，估时长（脚本.md 改了重跑即可）。
"""
from __future__ import annotations

import itertools
import re
from pathlib import Path

PATTERN = "abaabcac"          # 教材例子
MAIN = "acabaabaabcacaabc"    # 教材主串
NV_MAIN = "abaaabaabcac"      # 第 6 镜"白比一次"演示用的主串（自造：前 4 位对上，第 5 位是 a ≠ p5 = b）
QUIZ = "ababaa"               # 结尾小题

FAILS: list[str] = []


def check(name: str, got, want) -> None:
    ok = got == want
    if not ok:
        FAILS.append(name)
    print(f"  [{'OK' if ok else '!!'}] {name}: {got}" + ("" if ok else f"   ← 期望 {want}"))


def ch(s: str, k: int) -> str:
    """1 基取字符"""
    return s[k - 1]


# ---------- 1. 按定义暴力 ----------
def next_brute(p: str) -> list[int]:
    """next[j] = max{k | 1 < k < j 且 p1…p(k−1) = p(j−k+1)…p(j−1)}；j = 1 为 0；集合空为 1。返回 1 基（下标 0 占位）"""
    m = len(p)
    nxt = [None, 0]
    for j in range(2, m + 1):
        best = 1
        for k in range(2, j):  # 1 < k < j
            if all(ch(p, t) == ch(p, j - k + t) for t in range(1, k)):  # p_t 对 p_(j−k+t)，t = 1..k−1
                best = max(best, k)
        nxt.append(best)
    return nxt


def nextval_brute(p: str) -> list[int]:
    """不用递推：候选 k = 所有"p1…p(k−1) 是 p1…p(j−1) 的后缀"的 k（含 k = 1），
    挑其中 p_k ≠ p_j 的最大者；都等于 p_j 就是 0（失配字符和谁都注定不等，只能 i 前进）。"""
    m = len(p)
    nv = [None, 0]
    for j in range(2, m + 1):
        cands = [k for k in range(1, j) if all(ch(p, t) == ch(p, j - k + t) for t in range(1, k))]
        good = [k for k in cands if ch(p, k) != ch(p, j)]
        nv.append(max(good) if good else 0)
    return nv


# ---------- 2. 教材递推算法（算法 4.7 / 4.8 的 Python 版）----------
def get_next(p: str) -> list[int]:
    m = len(p)
    nxt = [None] * (m + 1)
    i, j = 1, 0
    nxt[1] = 0
    while i < m:
        if j == 0 or ch(p, i) == ch(p, j):
            i += 1
            j += 1
            nxt[i] = j
        else:
            j = nxt[j]
    return nxt


def get_nextval(p: str) -> list[int]:
    m = len(p)
    nv = [None] * (m + 1)
    i, j = 1, 0
    nv[1] = 0
    while i < m:
        if j == 0 or ch(p, i) == ch(p, j):
            i += 1
            j += 1
            nv[i] = j if ch(p, i) != ch(p, j) else nv[j]
        else:
            j = nv[j]
    return nv


def nextval_from_next(p: str, nxt: list[int]) -> list[int]:
    """分镜里手推的做法：从左往右，p_j ≠ p_next[j] 抄 next[j]，相等抄 nextval[next[j]]"""
    m = len(p)
    nv = [None, 0]
    for j in range(2, m + 1):
        k = nxt[j]
        nv.append(k if ch(p, j) != ch(p, k) else nv[k])
    return nv


def border(p: str, j: int) -> str:
    """p1…p(j−1) 的最长相等真前后缀（暴力）"""
    s = p[: j - 1]
    for L in range(len(s) - 1, 0, -1):
        if s[:L] == s[-L:]:
            return s[:L]
    return ""


# ---------- 3. 匹配模拟 ----------
def naive_trace(s: str, t: str):
    """教材 Index（pos = 1）：相等 i++ j++；否则 i = i − j + 2，j = 1"""
    steps = []
    i, j = 1, 1
    while i <= len(s) and j <= len(t):
        eq = ch(s, i) == ch(t, j)
        steps.append((i, j, ch(s, i), ch(t, j), eq, i - j + 1))  # 最后一列：模式串第 1 位此刻对着主串第几位
        if eq:
            i += 1
            j += 1
        else:
            i = i - j + 2
            j = 1
    pos = i - len(t) if j > len(t) else 0
    return steps, pos


def kmp_trace(s: str, t: str, tbl: list[int]):
    """教材 Index_KMP：j == 0 或相等 → i++ j++；否则 j = tbl[j]。只记录真正的字符比较；j = 0 的步骤单独记"""
    steps = []
    i, j = 1, 1
    while i <= len(s) and j <= len(t):
        if j == 0:
            steps.append((i, 0, None, None, None, i))
            i += 1
            j += 1
            continue
        eq = ch(s, i) == ch(t, j)
        steps.append((i, j, ch(s, i), ch(t, j), eq, i - j + 1))
        if eq:
            i += 1
            j += 1
        else:
            j = tbl[j]
    pos = i - len(t) if j > len(t) else 0
    return steps, pos


def print_trace(steps, tbl_name: str | None = None, tbl=None) -> None:
    n = 0
    for (i, j, a, b, eq, start) in steps:
        if j == 0:
            print(f"        j = 0 → i、j 各加 1（i: {i} → {i + 1}，j → 1）")
            continue
        n += 1
        tail = ""
        if not eq and tbl is not None:
            tail = f"   失配 → j = {tbl_name}[{j}] = {tbl[j]}，i 不动"
        print(f"   #{n:2d}  i = {i:2d}  j = {j}   s{i} = {a}  vs  p{j} = {b}   {'=' if eq else '≠'}   （模式头对着主串第 {start} 位）{tail}")


def comparisons(steps) -> int:
    return sum(1 for st in steps if st[1] != 0)


# ======================================================================
def main() -> None:
    print("=" * 70)
    print(f"1. 模式 {PATTERN}（m = {len(PATTERN)}）：next / nextval")
    print("=" * 70)
    nb = next_brute(PATTERN)
    nr = get_next(PATTERN)
    vb = nextval_brute(PATTERN)
    vr = get_nextval(PATTERN)
    vh = nextval_from_next(PATTERN, nb)
    print("   j      :", " ".join(str(j) for j in range(1, len(PATTERN) + 1)))
    print("   p_j    :", " ".join(PATTERN))
    print("   next   :", " ".join(map(str, nb[1:])), "  （定义暴力）")
    print("   nextval:", " ".join(map(str, vb[1:])), "  （定义暴力）")
    check("next 暴力 == 递推", nb, nr)
    check("nextval 暴力 == 递推", vb, vr)
    check("nextval 暴力 == 由 next 手推法", vb, vh)
    check("next == 教材 0 1 1 2 2 3 1 2", nb[1:], [0, 1, 1, 2, 2, 3, 1, 2])
    print(f"   注意：任务说明里写的 nextval = 0 1 0 2 1 3 0 1，脚本算出最后一位是 {vb[8]}，以脚本为准。")
    print(f"         j = 8：p8 = {ch(PATTERN, 8)}，next[8] = {nb[8]}，p{nb[8]} = {ch(PATTERN, nb[8])}，不相等 → 照抄 next[8] = {nb[8]}")

    print()
    print("2. 手推 next 的逐位过程（第 4 镜照抄）")
    for j in range(1, len(PATTERN) + 1):
        if j == 1:
            print("   j = 1：规定 next[1] = 0")
            continue
        pre = PATTERN[: j - 1]
        b = border(PATTERN, j)
        print(f"   j = {j}：看 p1…p{j - 1} = {pre:<8s} 最长相等前后缀 = {b if b else '（无）':<6s} 长度 {len(b)} → next[{j}] = {len(b) + 1}")
        assert len(b) + 1 == nb[j]

    print()
    print("3. 手推 nextval 的逐位过程（第 7 镜照抄）")
    for j in range(1, len(PATTERN) + 1):
        if j == 1:
            print("   j = 1：nextval[1] = 0")
            continue
        k = nb[j]
        same = ch(PATTERN, j) == ch(PATTERN, k)
        how = f"相同 → 抄 nextval[{k}] = {vb[k]}" if same else f"不同 → 照抄 next[{j}] = {k}"
        print(f"   j = {j}：p{j} = {ch(PATTERN, j)}，next[{j}] = {k}，p{k} = {ch(PATTERN, k)}，{how}   → nextval[{j}] = {vb[j]}")

    print()
    print("4. 穷举核对：字母表 {a,b,c}，长度 1..9 的全部模式串")
    bad_n = bad_v = bad_h = total = 0
    for L in range(1, 10):
        for tup in itertools.product("abc", repeat=L):
            p = "".join(tup)
            total += 1
            n1 = next_brute(p)
            bad_n += n1 != get_next(p)
            v1 = nextval_brute(p)
            bad_v += v1 != get_nextval(p)
            bad_h += v1 != nextval_from_next(p, n1)
    print(f"   共 {total} 个串")
    check("next 暴力 vs 递推 不一致个数", bad_n, 0)
    check("nextval 暴力 vs 递推 不一致个数", bad_v, 0)
    check("nextval 暴力 vs 手推法 不一致个数", bad_h, 0)

    print()
    print("4b. 穷举核对：KMP（next / nextval）找到的位置 == 朴素 == Python str.find + 1（主串 {a,b} 长 ≤ 10，模式长 ≤ 4）")
    bad = cnt = 0
    for Ls in range(1, 11):
        for s in map("".join, itertools.product("ab", repeat=Ls)):
            for Lt in range(1, 5):
                for t in map("".join, itertools.product("ab", repeat=Lt)):
                    want = s.find(t) + 1
                    cnt += 1
                    r1 = naive_trace(s, t)[1]
                    r2 = kmp_trace(s, t, get_next(t))[1]
                    r3 = kmp_trace(s, t, get_nextval(t))[1]
                    bad += not (r1 == r2 == r3 == want)
    print(f"   共 {cnt} 组")
    check("匹配位置不一致组数", bad, 0)

    print()
    print("=" * 70)
    print(f"5. 朴素匹配：主串 {MAIN}（n = {len(MAIN)}），模式 {PATTERN}")
    print("=" * 70)
    print("   主串下标：", " ".join(f"{k:>2d}" for k in range(1, len(MAIN) + 1)))
    print("   主串字符：", " ".join(f"{c:>2s}" for c in MAIN))
    steps, pos = naive_trace(MAIN, PATTERN)
    print_trace(steps)
    nc = comparisons(steps)
    print(f"   朴素：共 {nc} 次字符比较，找到位置 {pos}")
    check("朴素找到位置", pos, MAIN.find(PATTERN) + 1)
    # 第 1 镜：第三趟（模式头对着 s3）
    third = [st for st in steps if st[5] == 3]
    print(f"   第 1 镜用的第三趟（模式头对 s3）：比较 {len(third)} 次，前 {sum(st[4] for st in third)} 个相等，"
          f"失配在 i = {third[-1][0]}, j = {third[-1][1]}；朴素随后 i = i − j + 2 = {third[-1][0] - third[-1][1] + 2}，j = 1")
    starts = []
    for st in steps:
        if not starts or starts[-1][0] != st[5]:
            starts.append([st[5], 0])
        starts[-1][1] += 1
    print("   每趟（模式头位置: 本趟比较次数）：", "  ".join(f"{a}:{b}" for a, b in starts))
    back = sum(1 for a, b in zip(steps, steps[1:]) if b[0] < a[0])
    print(f"   i 往回退的次数：{back}")

    print()
    print("=" * 70)
    print("6. KMP 匹配（用 next）")
    print("=" * 70)
    ks, kpos = kmp_trace(MAIN, PATTERN, nb)
    print_trace(ks, "next", nb)
    kc = comparisons(ks)
    print(f"   KMP(next)：共 {kc} 次字符比较，找到位置 {kpos}；i 从不后退：{all(b[0] >= a[0] for a, b in zip(ks, ks[1:]))}")
    check("KMP(next) 找到位置", kpos, pos)
    vs, vpos = kmp_trace(MAIN, PATTERN, vb)
    print(f"   KMP(nextval) 在同一主串上：共 {comparisons(vs)} 次字符比较，位置 {vpos}（这条主串上 nextval 省不了）")
    print(f"   对比：朴素 {nc} 次 vs KMP {kc} 次")

    print()
    print("=" * 70)
    print(f"7. 第 6 镜'白比一次'：主串 {NV_MAIN}，模式 {PATTERN}")
    print("=" * 70)
    print("   用 next：")
    s1, p1 = kmp_trace(NV_MAIN, PATTERN, nb)
    print_trace(s1, "next", nb)
    print("   用 nextval：")
    s2, p2 = kmp_trace(NV_MAIN, PATTERN, vb)
    print_trace(s2, "nextval", vb)
    print(f"   next {comparisons(s1)} 次 / nextval {comparisons(s2)} 次，位置都是 {p1} / {p2}")
    check("nextval 少比的次数", comparisons(s1) - comparisons(s2), 1)
    check("p5 == p_next[5]", (ch(PATTERN, 5), ch(PATTERN, nb[5])), ("b", "b"))

    print()
    print("=" * 70)
    print(f"8. 结尾小题：模式 {QUIZ}")
    print("=" * 70)
    qn = next_brute(QUIZ)
    qv = nextval_brute(QUIZ)
    check("小题 next 暴力 == 递推", qn, get_next(QUIZ))
    check("小题 nextval 暴力 == 递推", qv, get_nextval(QUIZ))
    print("   next   :", " ".join(map(str, qn[1:])))
    print("   nextval:", " ".join(map(str, qv[1:])))
    for j in range(2, len(QUIZ) + 1):
        b = border(QUIZ, j)
        print(f"   j = {j}：p1…p{j - 1} = {QUIZ[: j - 1]:<6s} 最长相等前后缀 {b if b else '（无）':<5s} → {len(b) + 1}")

    print()
    print("=" * 70)
    print("9. 旁白字数与时长估计（读 脚本.md 里各镜表格的 speak 列）")
    print("=" * 70)
    md = Path(__file__).resolve().parent.parent / "脚本.md"
    if not md.exists():
        print("   （脚本.md 不存在，跳过）")
    else:
        rows = []
        for line in md.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\|\s*(s\d+[a-z])\s*\|\s*(.*?)\s*\|", line)
            if m:
                rows.append((m.group(1), m.group(2)))

        def units(x: str) -> int:
            return len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]|[0-9]", x))

        total_u = 0
        RATE_11 = 3.86 * 1.1  # 上一条实测 speed 1.0 = 3.86 字/秒；speed 1.1 ≈ 4.25
        t = 0.5  # 片头 0.5 s
        for lid, sp in rows:
            u = units(sp)
            total_u += u
            d = u / RATE_11
            print(f"   {lid}: {u:3d} 字 ≈ {d:4.1f} s   （speed 1.1 下约 {int(t // 60)}:{t % 60:04.1f} 开始）")
            t += d + 0.3
            if lid == "s8a":
                t += 3.0  # 小题倒计时
        t += 2.5 - 0.3  # 片尾
        print(f"   片尾结束 ≈ {int(t // 60)}:{t % 60:04.1f}")
        gaps = 0.5 + 0.3 * (len(rows) - 1)
        extra = gaps + 3.0 + 2.5  # 片头 0.5 + 条间 0.3 + 小题倒计时 3 s + 片尾 2.5 s
        print(f"   共 {len(rows)} 条，{total_u} 字；停顿合计 {extra:.1f} s（片头 0.5、条间各 0.3、小题倒计时 3、片尾 2.5）")
        for label, rate in [("speed 1.0（3.86 字/秒）", 3.86), ("speed 1.1（≈4.25 字/秒）", RATE_11), ("speed 1.2（≈4.63 字/秒）", 3.86 * 1.2)]:
            t = total_u / rate + extra
            print(f"   {label}：旁白 {total_u / rate:5.1f} s，全片 ≈ {t:5.1f} s（{int(t // 60)}:{t % 60:04.1f}）")

    print()
    print("全部 OK" if not FAILS else f"有 {len(FAILS)} 处不一致：{FAILS}")


if __name__ == "__main__":
    main()
