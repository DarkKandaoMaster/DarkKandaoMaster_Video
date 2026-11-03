// 第 1 镜：钩子：小 i 被拽回去。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[0].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_1（绝对帧），由 KMP.tsx 汇总。
//
// 数据：朴素匹配 NAIVE（data.ts）。前两趟（#1～#3）快放，第三趟（模式头对 s3）#4～#8 五格变绿、#9 s8≠p6 失配；
// 小 i 被绳子拽回 s4（朴素 i = i − j + 2），模式右移一格头对 s4，#10 s4≠p1。s1c：小 i 一步弹回 s8，Chip 翻成 KMP。
// 结束态（= 第 2 镜开始）：小 i 在 s8 得意脸，模式头在 4，s3～s7 灰，#10 红 ×，计数 10，Chip "KMP"。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_IN, EASE_OUT, progress, springy } from "../base/anim";
import { L } from "../base/paper";
import { Brace } from "../components/Marks";
import type { Sfx } from "../components/Narration";
import { Txt } from "../components/PaperKit";
import { Compare } from "./Compare";
import { MAIN, NAIVE, NAIVE_TRIPS, PAT } from "./data";
import { LittleI, type Face } from "./LittleI";
import { M, mainCX, mainX } from "./layout";
import { CmpList, Counter, lk, pulse, Rope, runSteps, SadDots, type Sched, TopChip } from "./matchKit";
import { StringRow } from "./StringRow";
import { SCENES, p } from "./timeline";

const S = SCENES[0];

// ───────────────────────── 数据 ─────────────────────────
/** 第三趟：前 5 个相等、第 6 个失配的那一趟（模式头对 s3） */
const TRIP = NAIVE_TRIPS.find((t) => t.count > 2)!;
const MISS_K = TRIP.from + TRIP.count - 1; // #9 在 NAIVE 里的下标
const MISS = NAIVE[MISS_K]; // i = 8, j = 6
const AGAIN = NAIVE[MISS_K + 1]; // #10：i = 4, j = 1
const STEPS = NAIVE.slice(0, MISS_K + 2);

// ───────────────────────── 关键时刻 ─────────────────────────
const K = {
  hunt: p("s1a"),
  five: p("s1a", "前五个"),
  sixth: p("s1a", "第六个"),
  miss: p("s1a", "错了"),
  naive: p("s1b"),
  yank: p("s1b", "小 i 被一把拽"),
  again: p("s1b", "从头再来"),
  checked: p("s1c"),
  why: p("s1c", "凭什么重来"),
  kmp: p("s1c", "KMP"),
  noBack: p("s1c", "i 一步都不退"),
};

const PAT_IN = 12; // 模式串从左侧滑入
const I_DROP = 30; // 小 i 落到 s1
const FAST0 = 44; // 前两趟快放起点
const FAST_STEP = 19;
const PULL = K.yank + 8; // 绳子拉紧、开始拽
const PULL_DUR = 16;
const SHIFT = PULL + PULL_DUR + 14; // 模式右移一格（头对 s4）

const SCHED: Sched[] = STEPS.map((st, k): Sched => {
  if (k < TRIP.from) return { t: FAST0 + k * FAST_STEP, m: FAST0 + k * FAST_STEP + 5 };
  if (k < MISS_K) {
    const t = K.five + (k - TRIP.from) * 8;
    return { t, m: t + 5, mvI: t + 6, iDur: 8 };
  }
  if (k === MISS_K) return { t: K.sixth + 3, m: K.miss, mvI: PULL, iDur: PULL_DUR, iEase: EASE_OUT, iLift: 26, mvH: SHIFT, hDur: 14 };
  // #10 之后朴素会再挪（i = 5），本镜到此定格，不再移动
  return { t: K.again + 2, m: K.again + 12, mvI: 1e9, mvH: 1e9 };
});

// ───────────────────────── 音效 ─────────────────────────
const marks = SCHED.map((s, k) => ({ st: STEPS[k], m: s.m ?? s.t + 6 }));
export const SFX_1: Sfx[] = [
  ...Array.from({ length: MAIN.length }, (_, k) => ({ at: 2 + Math.round(k * 1.6), src: "tick", vol: 0.04 })),
  { at: PAT_IN, src: "whoosh", vol: 0.12 },
  { at: I_DROP + 10, src: "pop", vol: 0.12 },
  ...marks
    .filter((_, k) => k !== MISS_K)
    .map((x) =>
      x.st.eq
        ? { at: x.m, src: "tick", vol: x.st.head === TRIP.head ? 0.1 + 0.025 * (x.st.j - 1) : 0.09 }
        : { at: x.m, src: "snap", vol: 0.1 },
    ),
  ...SCHED.filter((s, k) => STEPS[k].headAfter !== STEPS[k].head && k < TRIP.from).map((s) => ({ at: (s.m ?? s.t + 6) + 6, src: "whoosh", vol: 0.07 })),
  { at: K.miss, src: "stamp", vol: 0.3 },
  { at: PULL, src: "whoosh", vol: 0.26 },
  { at: SHIFT, src: "snap", vol: 0.18 },
  { at: K.checked + 6, src: "pop", vol: 0.12 },
  { at: K.kmp, src: "ding", vol: 0.14 },
  { at: K.noBack + 2, src: "pop", vol: 0.2 },
];

// ───────────────────────── 画面 ─────────────────────────
export const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= S.from + S.dur) return null;

  const run = runSteps(f, STEPS, SCHED, { i: 1, h: -9 }, {
    h: [{ at: PAT_IN, to: 1, dur: 24, ease: EASE_OUT }],
    i: [{ at: K.noBack + 2, to: MISS.i, dur: 18, lift: 72 }],
  });

  // 被拽回后：第三趟已绿的格子变灰（主串那 5 格一直灰到镜头结束；模式那 5 格挪走后复原）
  const grey = progress(f, PULL + PULL_DUR - 4, 10);
  const patGrey = grey * (1 - progress(f, SHIFT, 8));
  const tripMain = (k: number) => k >= TRIP.head && k < MISS.i;
  const tripPat = (j: number) => j < MISS.j;

  const mainLook = (k: number) =>
    lk({ show: springy(f, 2 + (k - 1) * 1.6, 10) }, { matched: run.mainMatched(k) }, tripMain(k) ? { dim: grey } : undefined);
  const patLook = (j: number) => lk({ matched: run.patMatched(j), focus: run.focusOfPat(j) }, tripPat(j) ? { dim: patGrey } : undefined);

  // 小 i
  const drop = springy(f, I_DROP, 14);
  const ix = mainCX(run.i);
  const shake = Math.sin((f - K.miss) * 1.6) * 9 * pulse(f, K.miss, 16);
  const tilt = -20 * pulse(f, PULL, PULL_DUR + 8);
  const face: Face = f >= K.noBack + 6 ? "happy" : f >= PULL + 4 ? "sad" : "normal";
  const iy = M.littleIY - (1 - drop) * 220 - run.iLift;

  // 绳子：从画面左外拉住小 i
  const ropeDraw = progress(f, K.yank - 6, 10);
  const ropeSlack = 46 * (1 - progress(f, PULL - 2, 5));
  const ropeOut = 1 - progress(f, PULL + PULL_DUR + 2, 10, EASE_IN);

  // 大 ×
  const big = progress(f, K.miss, 9);
  const bigOut = 1 - progress(f, K.naive, 14, EASE_IN);

  // s1c "都比过了"
  const braceIn = progress(f, K.checked + 4, 14);
  const braceOut = 1 - progress(f, K.noBack + 8, 12, EASE_IN);
  const bx1 = mainX(AGAIN.i);
  const bx2 = mainX(MISS.i - 1) + M.cell;

  return (
    <AbsoluteFill>
      <TopChip f={f} from="朴素匹配" to="KMP" flipAt={K.kmp} opacity={progress(f, 18, 12)} />
      <Counter right={M.counterRight} label="比较" value={run.count} opacity={progress(f, 28, 12)} bump={run.bump} />

      <StringRow text={MAIN} kind="main" y={M.mainY} looks={mainLook} label="S" index={{ y: M.idxY }} opacity={progress(f, 0, 6)} />
      <StringRow text={PAT} kind="pattern" y={M.patY} h={run.h} looks={patLook} label="T" opacity={progress(f, PAT_IN, 8)} />

      <CmpList list={run.cmps} />
      <Compare cx={mainCX(MISS.i)} state="ne" big={big} draw={1} mark={0} opacity={bigOut * (f >= K.miss ? 1 : 0)} />

      {/* 都比过了 */}
      <div style={{ opacity: braceIn * braceOut }}>
        <Brace x={bx1} y={164} w={bx2 - bx1} h={20} dir="down" draw={braceIn} color={L.ink2} stroke={3.5} />
        <Txt cx={(bx1 + bx2) / 2} y={100} size={44} weight={700} color={L.ink2} width={500} style={{ transform: `scale(${1 + 0.14 * pulse(f, K.why, 16)})` }}>
          都比过了
        </Txt>
      </div>

      <Rope x1={-30} y1={170} x2={ix - 4} y2={iy + 54} draw={ropeDraw} slack={ropeSlack} opacity={ropeOut} />
      <LittleI
        x={ix}
        y={iy}
        face={face}
        opacity={progress(f, I_DROP, 5)}
        rotate={shake + tilt}
        squash={run.iLand * 0.7 + pulse(f, I_DROP + 10, 10) * 0.8}
        lookY={f < K.yank ? 1 : 0}
        lookX={f >= PULL && f < PULL + PULL_DUR ? 1 : 0}
      />
      <SadDots cx={ix + 34} y={iy - 6} f={f} start={PULL + PULL_DUR + 2} opacity={1 - progress(f, K.noBack, 6)} />
    </AbsoluteFill>
  );
};

// 供第 2 镜接续用的结束态
export const S1_END = { headAfter: MISS.headAfter, count: AGAIN.n ?? 0, miss: MISS, again: AGAIN, trip: TRIP };
