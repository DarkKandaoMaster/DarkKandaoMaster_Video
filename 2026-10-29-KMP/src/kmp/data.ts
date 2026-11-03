// 片中所有字符串、next / nextval、逐步比较记录。记号按严蔚敏 4.3：串下标从 1 起，next[1] = 0。
// 做法：下面先用教材算法（与 scripts/check_numbers.py 同一写法）现算一遍，再和从 check_numbers.py 输出照抄的
// EXPECT_* 字面量逐项比对，不一致直接 throw（Studio / 渲染会报错，不会带着错数字出片）。
// 另有 scripts/check_data.py：用 node 载入本文件，把 DUMP 和 check_numbers.py 的函数结果再对一遍。
// 本文件只用"可擦除"的 TS 语法（不用 enum 等），node 24 能直接载入。

export const MAIN = "acabaabaabcacaabc"; // 教材主串（n = 17）
export const PAT = "abaabcac"; // 教材模式（m = 8）
export const NV_MAIN = "abaaabaabcac"; // 第 6 镜自造主串（n = 12）：前 4 位对上，s5 = a ≠ p5 = b
export const QUIZ = "ababaa"; // 第 8 镜小题

/** 1 基取字符：ch(s, 1) = 第 1 位 */
export const ch = (s: string, k: number): string => s[k - 1];

// ───────────────────────── 算法（教材 4.7 / 4.8）─────────────────────────
/** 返回 1 基数组，下标 0 占位（-1） */
const getNext1 = (p: string): number[] => {
  const m = p.length;
  const nx = new Array<number>(m + 1).fill(-1);
  let i = 1;
  let j = 0;
  nx[1] = 0;
  while (i < m) {
    if (j === 0 || ch(p, i) === ch(p, j)) {
      i++;
      j++;
      nx[i] = j;
    } else j = nx[j];
  }
  return nx;
};

const getNextval1 = (p: string): number[] => {
  const m = p.length;
  const nv = new Array<number>(m + 1).fill(-1);
  let i = 1;
  let j = 0;
  nv[1] = 0;
  while (i < m) {
    if (j === 0 || ch(p, i) === ch(p, j)) {
      i++;
      j++;
      nv[i] = ch(p, i) !== ch(p, j) ? j : nv[j];
    } else j = nv[j];
  }
  return nv;
};

/** p1…p(j−1) 的最长相等真前后缀（暴力，从长往短试） */
export const border = (p: string, j: number): string => {
  const s = p.slice(0, j - 1);
  for (let len = s.length - 1; len > 0; len--) if (s.slice(0, len) === s.slice(s.length - len)) return s.slice(0, len);
  return "";
};

// ───────────────────────── next / nextval（显示用 0 基存放：NEXT[j − 1] = next[j]）─────────────────────────
export const NEXT: number[] = getNext1(PAT).slice(1);
export const NEXTVAL: number[] = getNextval1(PAT).slice(1);
export const QUIZ_NEXT: number[] = getNext1(QUIZ).slice(1);
export const QUIZ_NEXTVAL: number[] = getNextval1(QUIZ).slice(1);
/** 1 基查表 */
export const nextOf = (j: number): number => NEXT[j - 1];
export const nextvalOf = (j: number): number => NEXTVAL[j - 1];

/** 第 4 镜手推 next：每一位看 p1…p(j−1)，最长相等前后缀，长度 + 1（j = 1 规定为 0） */
export const NEXT_STEPS = Array.from({ length: PAT.length }, (_, k) => {
  const j = k + 1;
  const b = j === 1 ? "" : border(PAT, j);
  return { j, look: PAT.slice(0, j - 1), border: b, value: j === 1 ? 0 : b.length + 1 };
});

/** 第 7 镜手推 nextval：p_j 与 p_next[j] 比，相同抄 nextval[next[j]]，不同抄 next[j]（j = 1 为 0） */
export const NEXTVAL_STEPS = Array.from({ length: PAT.length }, (_, k) => {
  const j = k + 1;
  if (j === 1) return { j, k: 0, pj: ch(PAT, 1), pk: "", same: false, value: 0 };
  const kk = nextOf(j);
  const same = ch(PAT, j) === ch(PAT, kk);
  return { j, k: kk, pj: ch(PAT, j), pk: ch(PAT, kk), same, value: same ? nextvalOf(kk) : kk };
});

/** 第 8 镜小题的前后缀（j = 2..6） */
export const QUIZ_STEPS = Array.from({ length: QUIZ.length }, (_, k) => {
  const j = k + 1;
  const b = j === 1 ? "" : border(QUIZ, j);
  return { j, look: QUIZ.slice(0, j - 1), border: b, value: j === 1 ? 0 : b.length + 1 };
});

// ───────────────────────── 逐步比较记录 ─────────────────────────
/**
 * 一步：
 * - 字符比较：n = 第几次比较（1 起），s / t = 主串 / 模式字符，eq = 是否相等；
 * - KMP 里 j = 0 的那一步（不比较，i、j 各加 1）：n = null，j = 0，eq = null。
 * head = 这一步时模式第 1 位对着主串第几位（j = 0 那步记 i + 1：模式整体挪到 i 后面）；
 * nextI / nextJ = 这一步之后的 i、j；headAfter = 之后的模式头位置（动画里模式要滑到的 h）。
 */
export type Step = {
  n: number | null;
  i: number;
  j: number;
  s: string | null;
  t: string | null;
  eq: boolean | null;
  head: number;
  nextI: number;
  nextJ: number;
  headAfter: number;
};

const mk = (n: number | null, i: number, j: number, s: string, t: string, eq: boolean | null, nextI: number, nextJ: number): Step => ({
  n,
  i,
  j,
  s: j === 0 ? null : ch(s, i),
  t: j === 0 ? null : ch(t, j),
  eq,
  head: j === 0 ? i + 1 : i - j + 1,
  nextI,
  nextJ,
  headAfter: nextI - nextJ + 1,
});

/** 教材 Index（pos = 1）：相等 i++ j++；否则 i = i − j + 2，j = 1 */
const naiveTrace = (s: string, t: string): { steps: Step[]; pos: number } => {
  const steps: Step[] = [];
  let i = 1;
  let j = 1;
  let n = 0;
  while (i <= s.length && j <= t.length) {
    const eq = ch(s, i) === ch(t, j);
    const ni = eq ? i + 1 : i - j + 2;
    const nj = eq ? j + 1 : 1;
    steps.push(mk(++n, i, j, s, t, eq, ni, nj));
    i = ni;
    j = nj;
  }
  return { steps, pos: j > t.length ? i - t.length : 0 };
};

/** 教材 Index_KMP：j == 0 或相等 → i++ j++；否则 j = tbl[j]（tbl 为 1 基数组） */
const kmpTrace = (s: string, t: string, tbl: number[]): { steps: Step[]; pos: number } => {
  const steps: Step[] = [];
  let i = 1;
  let j = 1;
  let n = 0;
  while (i <= s.length && j <= t.length) {
    if (j === 0) {
      steps.push(mk(null, i, 0, s, t, null, i + 1, 1));
      i++;
      j++;
      continue;
    }
    const eq = ch(s, i) === ch(t, j);
    const ni = eq ? i + 1 : i;
    const nj = eq ? j + 1 : tbl[j];
    steps.push(mk(++n, i, j, s, t, eq, ni, nj));
    i = ni;
    j = nj;
  }
  return { steps, pos: j > t.length ? i - t.length : 0 };
};

const naive = naiveTrace(MAIN, PAT);
const kmp = kmpTrace(MAIN, PAT, getNext1(PAT));
const nvNext = kmpTrace(NV_MAIN, PAT, getNext1(PAT));
const nvNextval = kmpTrace(NV_MAIN, PAT, getNextval1(PAT));

/** 第 1 镜（朴素，教材主串）：20 次比较 */
export const NAIVE: Step[] = naive.steps;
/** 第 5 镜（KMP + next，教材主串）：15 次比较 + 1 个 j = 0 步 */
export const KMP_STEPS: Step[] = kmp.steps;
/** 第 6 镜（自造主串）：用 next 14 次 / 用 nextval 13 次 */
export const NV_BY_NEXT: Step[] = nvNext.steps;
export const NV_BY_NEXTVAL: Step[] = nvNextval.steps;

const cmpCount = (st: Step[]) => st.filter((x) => x.n !== null).length;
export const COUNT = {
  naive: cmpCount(NAIVE),
  kmp: cmpCount(KMP_STEPS),
  nvNext: cmpCount(NV_BY_NEXT),
  nvNextval: cmpCount(NV_BY_NEXTVAL),
};
export const FOUND = { main: naive.pos, kmp: kmp.pos, nvNext: nvNext.pos, nvNextval: nvNextval.pos };

/** 朴素匹配的各趟：模式头位置 → 本趟比较次数（1:2 2:1 3:6 4:1 5:2 6:8） */
export const NAIVE_TRIPS: Array<{ head: number; count: number; from: number }> = [];
NAIVE.forEach((st, k) => {
  const last = NAIVE_TRIPS[NAIVE_TRIPS.length - 1];
  if (last && last.head === st.head) last.count++;
  else NAIVE_TRIPS.push({ head: st.head, count: 1, from: k });
});

// ───────────────────────── 照抄 check_numbers.py 的输出，和上面现算的比对 ─────────────────────────
// 每步 [i, j, eq(1/0；j = 0 那步为 null), nextI, nextJ]
const EXPECT = {
  next: [0, 1, 1, 2, 2, 3, 1, 2],
  nextval: [0, 1, 0, 2, 1, 3, 0, 2],
  quizNext: [0, 1, 1, 2, 3, 4],
  quizNextval: [0, 1, 0, 1, 0, 4],
  borders: ["", "", "a", "a", "ab", "", "a"], // j = 2..8
  quizBorders: ["", "", "a", "ab", "aba"], // j = 2..6
  count: { naive: 20, kmp: 15, nvNext: 14, nvNextval: 13 },
  found: { main: 6, kmp: 6, nvNext: 5, nvNextval: 5 },
  trips: [[1, 2], [2, 1], [3, 6], [4, 1], [5, 2], [6, 8]],
  naive: [[1, 1, 1, 2, 2], [2, 2, 0, 2, 1], [2, 1, 0, 3, 1], [3, 1, 1, 4, 2], [4, 2, 1, 5, 3], [5, 3, 1, 6, 4], [6, 4, 1, 7, 5], [7, 5, 1, 8, 6], [8, 6, 0, 4, 1], [4, 1, 0, 5, 1], [5, 1, 1, 6, 2], [6, 2, 0, 6, 1], [6, 1, 1, 7, 2], [7, 2, 1, 8, 3], [8, 3, 1, 9, 4], [9, 4, 1, 10, 5], [10, 5, 1, 11, 6], [11, 6, 1, 12, 7], [12, 7, 1, 13, 8], [13, 8, 1, 14, 9]],
  kmp: [[1, 1, 1, 2, 2], [2, 2, 0, 2, 1], [2, 1, 0, 2, 0], [2, 0, null, 3, 1], [3, 1, 1, 4, 2], [4, 2, 1, 5, 3], [5, 3, 1, 6, 4], [6, 4, 1, 7, 5], [7, 5, 1, 8, 6], [8, 6, 0, 8, 3], [8, 3, 1, 9, 4], [9, 4, 1, 10, 5], [10, 5, 1, 11, 6], [11, 6, 1, 12, 7], [12, 7, 1, 13, 8], [13, 8, 1, 14, 9]],
  nvNext: [[1, 1, 1, 2, 2], [2, 2, 1, 3, 3], [3, 3, 1, 4, 4], [4, 4, 1, 5, 5], [5, 5, 0, 5, 2], [5, 2, 0, 5, 1], [5, 1, 1, 6, 2], [6, 2, 1, 7, 3], [7, 3, 1, 8, 4], [8, 4, 1, 9, 5], [9, 5, 1, 10, 6], [10, 6, 1, 11, 7], [11, 7, 1, 12, 8], [12, 8, 1, 13, 9]],
  nvNextval: [[1, 1, 1, 2, 2], [2, 2, 1, 3, 3], [3, 3, 1, 4, 4], [4, 4, 1, 5, 5], [5, 5, 0, 5, 1], [5, 1, 1, 6, 2], [6, 2, 1, 7, 3], [7, 3, 1, 8, 4], [8, 4, 1, 9, 5], [9, 5, 1, 10, 6], [10, 6, 1, 11, 7], [11, 7, 1, 12, 8], [12, 8, 1, 13, 9]],
};

const enc = (st: Step[]) => st.map((x) => [x.i, x.j, x.eq === null ? null : x.eq ? 1 : 0, x.nextI, x.nextJ]);

/** 现算结果的完整快照（scripts/check_data.py 读它） */
export const DUMP = {
  strings: { MAIN, PAT, NV_MAIN, QUIZ },
  next: NEXT,
  nextval: NEXTVAL,
  quizNext: QUIZ_NEXT,
  quizNextval: QUIZ_NEXTVAL,
  borders: NEXT_STEPS.slice(1).map((x) => x.border),
  quizBorders: QUIZ_STEPS.slice(1).map((x) => x.border),
  nextvalSame: NEXTVAL_STEPS.filter((x) => x.same).map((x) => x.j),
  count: COUNT,
  found: FOUND,
  trips: NAIVE_TRIPS.map((x) => [x.head, x.count]),
  naive: enc(NAIVE),
  kmp: enc(KMP_STEPS),
  nvNext: enc(NV_BY_NEXT),
  nvNextval: enc(NV_BY_NEXTVAL),
};

for (const key of Object.keys(EXPECT) as Array<keyof typeof EXPECT>) {
  if (JSON.stringify(DUMP[key]) !== JSON.stringify(EXPECT[key])) {
    throw new Error(`data.ts：现算的 ${key} 与 check_numbers.py 抄来的不一致：${JSON.stringify(DUMP[key])}`);
  }
}
