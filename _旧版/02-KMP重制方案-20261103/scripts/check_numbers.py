"""暴力核对新版《KMP：next 与 nextval》（2026-11-03，黑板 + 尺子版）脚本.md 里出现的所有数字。

用法（在工程目录 _旧版\02-KMP重制方案-20261103 里）：
    $env:PYTHONIOENCODING="utf-8"
    & D:\\Programs\\DevEnvironments\\Anaconda\\anaconda3\\envs\\myenv\\python.exe scripts\\check_numbers.py

记号按严蔚敏《数据结构（C 语言版）》4.3：串下标从 1 起，next[1] = 0。
在旧版 02-KMP/scripts/check_numbers.py 基础上改：
  - 新增"复印件右滑"逐格过程（第 2、4 镜画面照抄：每挪一格，重合部分每格是 ✓ 还是 ×）；
  - 新增钩子用的"朴素回退后重复比较已见过的格子"计数；
  - nextval 演示换成教材例子：模式 aaaab、主串 aaabaaaab；
  - 旁白字数 / 时长估计移到 scripts/check_script.py。
"""
from __future__ import annotations

import itertools

PATTERN = "abaabcac"          # 教材例子
MAIN = "acabaabaabcacaabc"    # 教材主串
NV_PAT = "aaaab"              # 教材 nextval 例子
NV_MAIN = "aaabaaaab"
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
def next_brute(p: str) -> list:
    """next[j] = max{k | 1 < k < j 且 p1…p(k−1) = p(j−k+1)…p(j−1)}；j = 1 为 0；集合空为 1。返回 1 基（下标 0 占位）"""
    m = len(p)
    nxt = [None, 0]
    for j in range(2, m + 1):
        best = 1
        for k in range(2, j):
            if all(ch(p, t) == ch(p, j - k + t) for t in range(1, k)):
                best = max(best, k)
        nxt.append(best)
    return nxt


def nextval_brute(p: str) -> list:
    """不用递推：候选 k = 所有"p1…p(k−1) 是 p1…p(j−1) 的后缀"的 k（含 k = 1），
    挑其中 p_k ≠ p_j 的最大者；都等于 p_j 就是 0。"""
    m = len(p)
    nv = [None, 0]
    for j in range(2, m + 1):
        cands = [k for k in range(1, j) if all(ch(p, t) == ch(p, j - k + t) for t in range(1, k))]
        good = [k for k in cands if ch(p, k) != ch(p, j)]
        nv.append(max(good) if good else 0)
    return nv


# ---------- 2. 教材递推算法（算法 4.7 / 4.8）----------
def get_next(p: str) -> list:
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


def get_nextval(p: str) -> list:
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


def nextval_from_next(p: str, nxt: list) -> list:
    """画面里手推的做法：从左往右，p_j ≠ p_next[j] 抄 next[j]，相等抄 nextval[next[j]]"""
    nv = [None, 0]
    for j in range(2, len(p) + 1):
        k = nxt[j]
        nv.append(k if ch(p, j) != ch(p, k) else nv[k])
    return nv


def next_by_sliding(p: str) -> list:
    """第 4 镜的做法：复印件从挪 1 格开始往右挪，第一次重合部分全对上就停，next = 重合格数 + 1；
    挪出去都没对上 → 重合 0 → 1"""
    nxt = [None, 0]
    for j in range(2, len(p) + 1):
        seg = p[: j - 1]
        L = 0
        for shift in range(1, len(seg) + 1):
            ov = len(seg) - shift
            if seg[shift:] == seg[:ov]:
                L = ov
                break
        nxt.append(L + 1)
    return nxt


def slide_story(p: str, j: int) -> list:
    """复印件对着 p1…p(j−1) 往右挪，返回每一挪的 (shift, 原件重合段, 复印件重合段, 逐格 ✓×, 是否全对)，到第一次全对为止"""
    seg = p[: j - 1]
    out = []
    for shift in range(1, len(seg) + 1):
        ov = len(seg) - shift
        orig = seg[shift:]
        cop = seg[:ov]
        marks = "".join("✓" if a == b else "×" for a, b in zip(orig, cop))
        ok = orig == cop
        out.append((shift, orig, cop, marks, ok))
        if ok:
            break
    return out


# ---------- 3. 匹配模拟 ----------
def naive_trace(s: str, t: str):
    """教材 Index（pos = 1）：相等 i++ j++；否则 i = i − j + 2，j = 1"""
    steps = []
    i, j = 1, 1
    while i <= len(s) and j <= len(t):
        eq = ch(s, i) == ch(t, j)
        steps.append((i, j, ch(s, i), ch(t, j), eq, i - j + 1))
        if eq:
            i += 1
            j += 1
        else:
            i = i - j + 2
            j = 1
    pos = i - len(t) if j > len(t) else 0
    return steps, pos


def kmp_trace(s: str, t: str, tbl: list):
    """教材 Index_KMP：j == 0 或相等 → i++ j++；否则 j = tbl[j]。j = 0 的步骤单独记"""
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


def print_trace(steps, tbl_name=None, tbl=None) -> None:
    n = 0
    for (i, j, a, b, eq, start) in steps:
        if j == 0:
            print(f"        j = 0 → i、j 各加 1（i: {i} → {i + 1}，j → 1）")
            continue
        n += 1
        tail = ""
        if not eq and tbl is not None:
            tail = f"   失配 → j = {tbl_name}[{j}] = {tbl[j]}，i 不动"
        print(f"   #{n:2d}  i = {i:2d}  j = {j}   s{i} = {a}  vs  p{j} = {b}   {'=' if eq else '≠'}   （尺子头对 s{start}）{tail}")


def comparisons(steps) -> int:
    return sum(1 for st in steps if st[1] != 0)


def table(lst) -> str:
    return " ".join(map(str, lst[1:]))


# ======================================================================
def main() -> None:
    print("=" * 70)
    print(f"1. 模式 {PATTERN}（m = {len(PATTERN)}）：next / nextval")
    print("=" * 70)
    nb = next_brute(PATTERN)
    vb = nextval_brute(PATTERN)
    print("   j      :", " ".join(str(j) for j in range(1, len(PATTERN) + 1)))
    print("   p_j    :", " ".join(PATTERN))
    print("   next   :", table(nb))
    print("   nextval:", table(vb))
    check("next 暴力 == 递推", nb, get_next(PATTERN))
    check("next 暴力 == 复印件右滑法", nb, next_by_sliding(PATTERN))
    check("nextval 暴力 == 递推", vb, get_nextval(PATTERN))
    check("nextval 暴力 == 由 next 手推法", vb, nextval_from_next(PATTERN, nb))
    check("next == 0 1 1 2 2 3 1 2", nb[1:], [0, 1, 1, 2, 2, 3, 1, 2])
    check("nextval == 0 1 0 2 1 3 0 2", vb[1:], [0, 1, 0, 2, 1, 3, 0, 2])

    print()
    print("2. 复印件右滑：每一位 j 的逐格过程（第 2、4 镜画面照抄；原件 = p1…p(j−1) 不动，复印件往右挪）")
    for j in range(1, len(PATTERN) + 1):
        if j == 1:
            print("   j = 1：前面没有字符，规定 next[1] = 0")
            continue
        seg = PATTERN[: j - 1]
        story = slide_story(PATTERN, j)
        parts = []
        for shift, orig, cop, marks, ok in story:
            if not orig:
                parts.append(f"挪{shift}格=整段滑出去，重合 0 格")
            else:
                parts.append(f"挪{shift}格[原件{orig} / 复印件{cop} → {marks}]{'停' if ok else ''}")
        last = story[-1] if story else None
        L = len(last[1]) if (last and last[4]) else 0
        print(f"   j = {j}：看 {seg:<8s} " + "；".join(parts) + f"  → 重合 {L} 格 → next[{j}] = {L + 1}")
        assert L + 1 == nb[j]

    print()
    print("3. 手推 nextval 的逐位过程（第 7 镜照抄）")
    same_js = []
    for j in range(1, len(PATTERN) + 1):
        if j == 1:
            print("   j = 1：nextval[1] = 0")
            continue
        k = nb[j]
        same = ch(PATTERN, j) == ch(PATTERN, k)
        if same:
            same_js.append(j)
        how = f"相同 → 抄 nextval[{k}] = {vb[k]}" if same else f"不同 → 照抄 next[{j}] = {k}"
        print(f"   j = {j}：p{j} = {ch(PATTERN, j)}，next[{j}] = {k}，p{k} = {ch(PATTERN, k)}，{how}   → nextval[{j}] = {vb[j]}")
    check("字母相同的位置", same_js, [3, 5, 7])

    print()
    print("4. 穷举核对：字母表 {a,b,c}，长度 1..9 的全部模式串")
    bad_n = bad_s = bad_v = bad_h = total = 0
    for L in range(1, 10):
        for tup in itertools.product("abc", repeat=L):
            p = "".join(tup)
            total += 1
            n1 = next_brute(p)
            bad_n += n1 != get_next(p)
            bad_s += n1 != next_by_sliding(p)
            v1 = nextval_brute(p)
            bad_v += v1 != get_nextval(p)
            bad_h += v1 != nextval_from_next(p, n1)
    print(f"   共 {total} 个串")
    check("next 暴力 vs 递推 不一致个数", bad_n, 0)
    check("next 暴力 vs 复印件右滑法 不一致个数", bad_s, 0)
    check("nextval 暴力 vs 递推 不一致个数", bad_v, 0)
    check("nextval 暴力 vs 手推法 不一致个数", bad_h, 0)

    print()
    print("4b. 穷举核对：朴素 / KMP(next) / KMP(nextval) 找到的位置 == str.find + 1（主串 {a,b} 长 ≤ 10，模式长 ≤ 4）")
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
    print(f"5. 朴素匹配：主串 {MAIN}（n = {len(MAIN)}），模式 {PATTERN}（第 1 镜钩子）")
    print("=" * 70)
    print("   主串下标：", " ".join(f"{k:>2d}" for k in range(1, len(MAIN) + 1)))
    print("   主串字符：", " ".join(f"{c:>2s}" for c in MAIN))
    steps, pos = naive_trace(MAIN, PATTERN)
    print_trace(steps)
    nc = comparisons(steps)
    print(f"   朴素：共 {nc} 次字符比较，找到位置 {pos}")
    check("朴素找到位置", pos, MAIN.find(PATTERN) + 1)
    starts = []
    for st in steps:
        if not starts or starts[-1][0] != st[5]:
            starts.append([st[5], 0])
        starts[-1][1] += 1
    print("   每趟（尺子头位置: 本趟比较次数）：", "  ".join(f"{a}:{b}" for a, b in starts))
    third = [st for st in steps if st[5] == 3]
    fi, fj = third[-1][0], third[-1][1]
    print(f"   第三趟（尺子头对 s3）：比较 {len(third)} 次，前 {sum(st[4] for st in third)} 个相等，"
          f"失配在 i = {fi}, j = {fj}（s{fi} = {ch(MAIN, fi)} vs p{fj} = {ch(PATTERN, fj)}）；朴素随后 i = i − j + 2 = {fi - fj + 2}，j = 1")
    back = sum(1 for a, b in zip(steps, steps[1:]) if b[0] < a[0])
    print(f"   i 往回退的次数：{back}")
    # 钩子：第三趟失配之后，i 退回去重新比"已经见过的格子"的那些比较
    idx = steps.index(third[-1])
    seen_max = max(st[0] for st in steps[: idx + 1])
    redo = []
    for st in steps[idx + 1:]:
        if st[0] > seen_max:
            break
        if st[0] < seen_max:   # 主串第 4..7 位：上一趟刚比过、结果已知
            redo.append(st)
    print(f"   第三趟失配后、i 再次走到 s{seen_max} 之前，在 s4…s{seen_max - 1} 上的比较：")
    for st in redo:
        print(f"      尺子头对 s{st[5]}：s{st[0]} = {st[2]} vs p{st[1]} = {st[3]}  {'=' if st[4] else '≠'}")
    print(f"   共 {len(redo)} 次（钩子里用黄圈圈出来的'白比'）")
    check("钩子白比次数", len(redo), 5)
    # 各趟头位置
    heads_after = [a for a, _ in starts if a > 3]
    print(f"   失配后朴素依次把尺子头放在：{heads_after}")
    # 回退后到再次走到 s8 时累计比较数
    k = idx + 1
    while steps[k][0] != seen_max:
        k += 1
    print(f"   失配后 i 退回 s4，第 {k + 1} 次比较时才重新走到 s{seen_max}（失配那次是第 {idx + 1} 次）")

    print()
    print("=" * 70)
    print("6. KMP 匹配（用 next）")
    print("=" * 70)
    ks, kpos = kmp_trace(MAIN, PATTERN, nb)
    print_trace(ks, "next", nb)
    kc = comparisons(ks)
    print(f"   KMP(next)：共 {kc} 次字符比较，找到位置 {kpos}；i 从不后退：{all(b[0] >= a[0] for a, b in zip(ks, ks[1:]))}")
    check("KMP(next) 找到位置", kpos, pos)
    check("朴素 / KMP 比较次数", (nc, kc), (20, 15))
    naive_minus_redo = [st[:5] for st in steps if st not in redo]
    kmp_real = [st[:5] for st in ks if st[1] != 0]
    check("朴素去掉钩子那5次白比 == KMP 的15次（逐次 i、j、字符都相同）", naive_minus_redo == kmp_real, True)
    jumps = [(st[0], st[1], nb[st[1]]) for st in ks if st[1] != 0 and st[4] is False]
    print(f"   失配查表（i, j, next[j]）：{jumps}")
    vs, vpos = kmp_trace(MAIN, PATTERN, vb)
    print(f"   同一主串用 nextval：{comparisons(vs)} 次，位置 {vpos}")

    print()
    print("=" * 70)
    print(f"7. nextval 动机（第 6 镜）：模式 {NV_PAT}，主串 {NV_MAIN}（教材例子）")
    print("=" * 70)
    qn = next_brute(NV_PAT)
    qv = nextval_brute(NV_PAT)
    check(f"{NV_PAT} next 暴力 == 递推", qn, get_next(NV_PAT))
    check(f"{NV_PAT} nextval 暴力 == 递推", qv, get_nextval(NV_PAT))
    print(f"   next   : {table(qn)}")
    print(f"   nextval: {table(qv)}")
    for j in range(2, len(NV_PAT) + 1):
        k = qn[j]
        print(f"   j = {j}：p{j} = {ch(NV_PAT, j)}，next = {k}，p{k} = {ch(NV_PAT, k)}，{'相同 → 抄 nextval[%d] = %d' % (k, qv[k]) if ch(NV_PAT, j) == ch(NV_PAT, k) else '不同 → 照抄 %d' % k}")
    print("   朴素：")
    s0, p0 = naive_trace(NV_MAIN, NV_PAT)
    print(f"      共 {comparisons(s0)} 次，位置 {p0}")
    print("   用 next：")
    s1, p1 = kmp_trace(NV_MAIN, NV_PAT, qn)
    print_trace(s1, "next", qn)
    print("   用 nextval：")
    s2, p2 = kmp_trace(NV_MAIN, NV_PAT, qv)
    print_trace(s2, "nextval", qv)
    c1, c2 = comparisons(s1), comparisons(s2)
    print(f"   next {c1} 次 / nextval {c2} 次，位置 {p1} / {p2}")
    at4 = [st for st in s1 if st[0] == 4 and st[1] != 0]
    print(f"   用 next 时，在主串第 4 位（b）上比了 {len(at4)} 次：" + "，".join(f"p{st[1]}={st[3]}" for st in at4))
    check("next 在 s4 上比较次数", len(at4), 4)
    check("其中失配后白比次数（第 1 次失配之后又比的）", len(at4) - 1, 3)
    check("nextval 少比的次数", c1 - c2, 3)

    print()
    print("=" * 70)
    print(f"8. 结尾小题：模式 {QUIZ}")
    print("=" * 70)
    zn = next_brute(QUIZ)
    zv = nextval_brute(QUIZ)
    check("小题 next 暴力 == 递推", zn, get_next(QUIZ))
    check("小题 nextval 暴力 == 递推", zv, get_nextval(QUIZ))
    check("小题 next == 0 1 1 2 3 4", zn[1:], [0, 1, 1, 2, 3, 4])
    print("   next   :", table(zn))
    print("   nextval:", table(zv))
    for j in range(2, len(QUIZ) + 1):
        story = slide_story(QUIZ, j)
        last = story[-1] if story else None
        L = len(last[1]) if (last and last[4]) else 0
        print(f"   j = {j}：看 {QUIZ[: j - 1]:<6s} 第一次全对上是挪 {last[0] if (last and last[4]) else '—'} 格，重合 {L} 格 → {L + 1}")

    print()
    print("全部 OK" if not FAILS else f"有 {len(FAILS)} 处不一致：{FAILS}")


if __name__ == "__main__":
    main()
