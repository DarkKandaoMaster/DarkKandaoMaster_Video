"""暴力核对《对称矩阵压缩存储》分镜里出现的所有数字 + 旁白时长估计。

用法（在工程目录里）：
    $env:PYTHONIOENCODING="utf-8"
    & D:\\Programs\\DevEnvironments\\Anaconda\\anaconda3\\envs\\myenv\\python.exe scripts\\check_numbers.py

记号按严蔚敏：i、j 从 1 开始，k 从 0 开始。
做法：真的把矩阵一格一格按行塞进一维数组，记下每个 a_ij 落在哪个下标，再和公式、画面上的数字逐一比对。
"""
from __future__ import annotations

import re

N = 5  # 片中用的矩阵阶数

# ---------- 画面上的 5×5 对称矩阵（只写下三角，上三角镜像）----------
LOWER_VALUES = [
    [2],
    [7, 1],
    [8, 2, 8],
    [1, 8, 2, 8],
    [4, 5, 9, 0, 4],
]


def full_matrix(n: int = N) -> list[list[int]]:
    m = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            m[i][j] = m[j][i] = LOWER_VALUES[i][j]
    return m


# ---------- 暴力：按行存 ----------
def store_lower(n: int) -> dict[tuple[int, int], int]:
    """按行存下三角（i ≥ j），返回 (i, j) → k（1 基 i、j，0 基 k）"""
    pos, k = {}, 0
    for i in range(1, n + 1):
        for j in range(1, i + 1):
            pos[(i, j)] = k
            k += 1
    return pos


def store_upper(n: int) -> dict[tuple[int, int], int]:
    """按行存上三角（i ≤ j）"""
    pos, k = {}, 0
    for i in range(1, n + 1):
        for j in range(i, n + 1):
            pos[(i, j)] = k
            k += 1
    return pos


# ---------- 公式 ----------
def k_lower(i: int, j: int) -> int:
    if i < j:
        i, j = j, i
    return i * (i - 1) // 2 + (j - 1)


def k_upper(i: int, j: int, n: int) -> int:
    if i > j:
        i, j = j, i
    return (i - 1) * (2 * n - i + 2) // 2 + (j - i)


def lookup(pos: dict[tuple[int, int], int], i: int, j: int, lower: bool) -> int:
    """对称矩阵取 a_ij：不在存的那一半就交换"""
    if lower and i < j or (not lower) and i > j:
        i, j = j, i
    return pos[(i, j)]


ok_all = True


def check(name: str, got, want) -> None:
    global ok_all
    flag = "OK " if got == want else "ERR"
    if got != want:
        ok_all = False
    print(f"  [{flag}] {name}: {got}" + ("" if got == want else f"  (应为 {want})"))


print("=== 1. 公式 vs 暴力，n = 1..12 全部 i、j ===")
bad = 0
for n in range(1, 13):
    lo, up = store_lower(n), store_upper(n)
    assert len(lo) == len(up) == n * (n + 1) // 2
    for i in range(1, n + 1):
        for j in range(1, n + 1):
            bad += lookup(lo, i, j, True) != k_lower(i, j)
            bad += lookup(up, i, j, False) != k_upper(i, j, n)
check("不一致个数", bad, 0)
if bad:
    ok_all = False

print("\n=== 2. 片中矩阵（n = 5）===")
m = full_matrix()
check("矩阵对称", all(m[i][j] == m[j][i] for i in range(N) for j in range(N)), True)
for row in m:
    print("   ", " ".join(str(x) for x in row))
check("存的元素个数 n(n+1)/2", N * (N + 1) // 2, 15)
check("数组下标范围 0..", max(store_lower(N).values()), 14)

print("\n=== 3. 下三角：a43（钩子题）===")
lo = store_lower(N)
rows_above = [len([1 for (r, c) in lo if r == rr]) for rr in range(1, 4)]
check("上面三行各几个", rows_above, [1, 2, 3])
check("上面三行共几个", sum(rows_above), 6)
check("第 4 行在 a43 左边的个数", sum(1 for (r, c) in lo if r == 4 and c < 3), 2)
check("a43 的 k（暴力）", lo[(4, 3)], 8)
check("a43 的 k（公式 i(i-1)/2 + (j-1)）", k_lower(4, 3), 8)
check("前面元素个数 = k（a43 前面的格子数）", sum(1 for v in lo.values() if v < lo[(4, 3)]), 8)

print("\n=== 4. 台阶拼长方形（下三角）===")
for i in range(2, 13):
    stair = list(range(1, i))  # 第 1..i-1 行的长度
    paired = [a + b for a, b in zip(stair, reversed(stair))]  # 两个台阶一正一反拼起来，每行都是 i
    assert all(p == i for p in paired), (i, paired)
    assert sum(stair) * 2 == (i - 1) * i
check("拼起来每行长 i、共 i-1 行（i = 2..12 都成立）", True, True)
check("i = 4 时：1+2+3", 1 + 2 + 3, 4 * 3 // 2)

print("\n=== 5. i < j 交换：a34 ===")
check("a34 不在下三角里", (3, 4) in lo, False)
check("a34 == a43（矩阵值）", m[2][3] == m[3][2], True)
check("a34 的 k（下三角，交换后）", k_lower(3, 4), 8)

print("\n=== 6. 上三角（n = 5）===")
up = store_upper(N)
row_len = [sum(1 for (r, c) in up if r == rr) for rr in range(1, N + 1)]
check("每行个数 n, n-1, …", row_len, [5, 4, 3, 2, 1])
check("a34 上面两行 5+4", row_len[0] + row_len[1], 9)
check("第 3 行在 a34 左边的个数（从 a33 起存）", sum(1 for (r, c) in up if r == 3 and c < 4), 1)
check("a34 的 k（暴力）", up[(3, 4)], 10)
check("a34 的 k（公式 (i-1)(2n-i+2)/2 + (j-i)）", k_upper(3, 4, N), 10)
check("a43 存上三角时交换后的 k", k_upper(4, 3, N), 10)
# 第 i-1 行的个数 = n-(i-2) = n-i+2
for n in range(2, 13):
    rl = [n - r + 1 for r in range(1, n + 1)]
    for i in range(2, n + 1):
        assert rl[i - 2] == n - (i - 2) == n - i + 2
        assert sum(rl[: i - 1]) * 2 == (i - 1) * (n + (n - i + 2)) == (i - 1) * (2 * n - i + 2)
        # 第 i 行从对角线 a_ii 开始存，a_ij 左边 j-i 个
        for j in range(i, n + 1):
            assert sum(1 for c in range(i, n + 1) if c < j) == j - i
check("第 i-1 行个数 = n-(i-2) = n-i+2；两台阶拼成宽 2n-i+2、高 i-1；本行左边 j-i（n ≤ 12 全成立）", True, True)
check("i = 3、n = 5：最后那行 n-i+2", N - 3 + 2, 4)
check("i = 3、n = 5：长方形宽 2n-i+2", 2 * N - 3 + 2, 9)
check("i = 3、n = 5：(i-1)(2n-i+2)/2", (3 - 1) * (2 * N - 3 + 2) // 2, 9)

print("\n=== 7. 结尾小题：按行存上三角 a52（第 7 镜，接着 i > j 交换问）===")
check("a52 不在上三角里", (5, 2) in up, False)
check("a52 == a25（矩阵值）", m[4][1] == m[1][4], True)
check("交换成 a25 后上面 1 行共几个", sum(1 for (r, c) in up if r == 1), 5)
check("第 2 行在 a25 左边的个数（a22、a23、a24）", sum(1 for (r, c) in up if r == 2 and c < 5), 3)
check("a52 的 k（暴力，交换成 a25）", lookup(up, 5, 2, False), 8)
check("a25 的 k（暴力）", up[(2, 5)], 8)
check("a52 的 k（公式 (i-1)(2n-i+2)/2 + (j-i)，交换后 i=2, j=5）", k_upper(5, 2, N), 8)
check("拆开：(i-1)(2n-i+2)/2 = 5，j-i = 3", ((2 - 1) * (2 * N - 2 + 2) // 2, 5 - 2), (5, 3))
check("误用 j-1 会得 9（≠ 8）", (2 - 1) * (2 * N - 2 + 2) // 2 + (5 - 1), 9)
inv_up7 = {v: k for k, v in up.items()}
check("数组下标 0..4 是第 1 行", [inv_up7[k] for k in range(5)], [(1, c) for c in range(1, 6)])
check("数组下标 5..7 是 a22、a23、a24", [inv_up7[k] for k in range(5, 8)], [(2, 2), (2, 3), (2, 4)])
check("数组下标 8 是 a25", inv_up7[8], (2, 5))
# 旧版小题（v3 及以前：下三角 a25 → 11），留着备查
check("（旧版）下三角 a25 的 k", k_lower(2, 5), 11)

print("\n=== 8. 画面里数组 15 格的标签（下三角 / 上三角）===")
inv_lo = {v: k for k, v in lo.items()}
inv_up = {v: k for k, v in up.items()}
print("   k : 下三角 | 上三角")
for k in range(15):
    print(f"   {k:2d}: a{inv_lo[k][0]}{inv_lo[k][1]} | a{inv_up[k][0]}{inv_up[k][1]}")

# ---------- 旁白时长估计 ----------
# 与 脚本.md 分镜表的 speak 列保持一致（阶段 B 会落到 src/<slug>/narration.json）
LINES = [
    ("s1a", "先考你一题，对称矩阵按行存下三角，a 四 三 的下标 k 是几？"),
    ("s2a", "沿对角线一折，两边一样，只存下三角就够了，一行接一行排进数组。"),
    ("s3a", "k 就是它前面有几个元素。"),
    ("s3b", "上面三行一共六个，本行左边两个，所以 k 等于八。"),
    ("s4a", "换成 a i j，上面有 i 减 1 行，长度从一涨到 i 减 1。"),
    ("s4b", "两个台阶拼成长方形，再砍一半，就是 i 乘 i 减 1 除以 2。"),
    ("s4c", "再加上左边的 j 减 1 个，公式就齐了。"),
    ("s5a", "那 a 三 四 呢？它在上三角，根本没存。"),
    ("s5b", "可它就等于 a 四 三，所以 i 小于 j 时，交换 i、j 再代公式。"),
    ("s6a", "改成按行存上三角，第一行 n 个，往下每行少一个。"),
    ("s6b", "a 三 四 上面五加四是九个，左边一个，k 等于十。"),
    ("s6c", "上面 i 减 1 行，最后那行少了 i 减 2 个，剩 n 减 i 加 2 个。"),
    ("s6d", "照样两个台阶拼长方形，再砍一半。"),
    ("s6e", "本行从对角线开始存，左边只有 j 减 i 个。i 大于 j 照样交换。"),
    ("s7a", "那按行存上三角，a 五 二 的 k 是几？"),
    ("s7b", "先换成 a 二 五，上面一行五个，左边三个，k 等于八。"),
]
# 非旁白的停顿（秒）：片头留白、条与条之间、结尾小题倒计时、片尾
GAP_EACH = 0.3
EXTRA = {"片头": 0.5, "小题倒计时": 2.0, "片尾": 2.0}
RATE_MEASURED = 3.86  # 上一条视频 MiniMax speech-2.8-hd、speed=1.0 的实测（字/秒，英文字母和数字各算一个）


def units(s: str) -> int:
    return len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]|[0-9]", s))


print("\n=== 9. 旁白时长估计 ===")
total_u = 0
for lid, s in LINES:
    u = units(s)
    total_u += u
    print(f"   {lid}: {u:3d} 字  ≈ {u / RATE_MEASURED:4.1f} s（实测语速） / {u / 4.75:4.1f} s（4.75 字/秒）")
pad = GAP_EACH * (len(LINES) - 1) + sum(EXTRA.values())
for label, rate in [("实测 3.86 字/秒（speed 1.0）", RATE_MEASURED), ("speed 1.1 ≈ 4.25 字/秒", RATE_MEASURED * 1.1), ("按 4.75 字/秒", 4.75)]:
    sp = total_u / rate
    print(f"   {label}: 旁白 {sp:5.1f} s + 停顿 {pad:.1f} s = 全片约 {sp + pad:5.1f} s")
print(f"   总字数 {total_u}")

print("\n全部核对通过" if ok_all else "\n有不一致，见上面 ERR")
