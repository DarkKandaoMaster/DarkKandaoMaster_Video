// 第 2 镜：i 不动，模式滑过去。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[1].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_2（绝对帧），由 KMP.tsx 汇总。
//
// 开始态 = 第 1 镜结束态。s2a 倒带回失配那一刻（KMP_STEPS #4～#9，模式头对 s3）；"abaab" 复制成一条小条落到下方；
// s2b 小条上画前缀蓝括号、后缀橙括号、"=" 虚线；s2c 小 i 钉住，模式 + 空 next 排右滑到头对 s6，p1p2 落在 s6s7 上闪绿，p3 待比；
// s2d 小条收成口诀卡。结束态（= 第 3 镜开始）：模式头 6，p3 珊瑚橙 + s8 待比竖线，s6s7 / p1p2 淡绿，口诀卡在 y 700–880。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_BACK, EASE_CAMERA, EASE_IN, progress, rise, springy } from "../base/anim";
import { L } from "../base/paper";
import { FONT } from "../base/theme";
import { Brace } from "../components/Marks";
import type { Sfx } from "../components/Narration";
import { Card, Chip } from "../components/PaperKit";
import { Compare } from "./Compare";
import { border, KMP_STEPS, MAIN, PAT } from "./data";
import { LittleI, type Face } from "./LittleI";
import { M, cellX, mainCX } from "./layout";
import { CmpList, Counter, DashArc, lk, Pin, pulse, runSteps, type Sched, TopChip } from "./matchKit";
import { S1_END } from "./Scene1";
import { StringRow } from "./StringRow";
import { SCENES, p } from "./timeline";

const S = SCENES[1];

// ───────────────────────── 数据 ─────────────────────────
/** KMP 里第一次"查表跳得比 1 远"的失配：#9（i = 8, j = 6 → next[6] = 3） */
export const MISS_K = KMP_STEPS.findIndex((st) => st.eq === false && st.nextJ > 1);
const MISS = KMP_STEPS[MISS_K];
const TRIP_FROM = KMP_STEPS.findIndex((st) => st.n !== null && st.head === MISS.head);
const RESUME = KMP_STEPS[MISS_K + 1]; // #10：i = 8, j = 3
const STEPS = KMP_STEPS.slice(TRIP_FROM, MISS_K + 2);
/** 已匹配那段 = p1…p(j−1)；最长相等前后缀 */
export const KNOWN = PAT.slice(0, MISS.j - 1);
export const BORDER = border(PAT, MISS.j);
const NB = BORDER.length;
const NK = KNOWN.length;

// ───────────────────────── 关键时刻 ─────────────────────────
const K = {
  rw: S.from + 2,
  known: p("s2a", "主串这五位"),
  same: p("s2a", "就是模式"),
  strip: p("s2a", "a b a a b"),
  head: p("s2b"),
  tail: p("s2b", "和结尾"),
  eq: p("s2b", "一模一样"),
  pin: p("s2c"),
  slide: p("s2c", "模式右滑"),
  align: p("s2c", "让开头"),
  third: p("s2c", "接着比第三位"),
  card: p("s2d"),
  key: p("s2d", "只看已匹配"),
};
const NEVER = 1e9;

const SCHED: Sched[] = STEPS.map((st, k): Sched => {
  if (st === MISS) return { t: K.rw + 22, m: K.rw + 26, mvH: K.slide, hDur: 26, hEase: EASE_BACK, lookAt: NEVER };
  if (st === RESUME) return { t: K.third, m: NEVER, mvI: NEVER };
  const t = K.rw + 8 + k * 3;
  return { t, m: t + 2, mvI: -NEVER };
});

const STRIP_Y = M.cardY; // 小条 y 700–784
const STRIP_H = MISS.head; // 小条与倒带后的模式（头对 s3）上下对齐
const BR_Y = STRIP_Y + M.cell + 8;
const stripCell = (j: number) => cellX(STRIP_H, j);

// ───────────────────────── 音效 ─────────────────────────
export const SFX_2: Sfx[] = [
  { at: K.rw, src: "whoosh", vol: 0.14 },
  ...SCHED.filter((_, k) => STEPS[k].eq === true && STEPS[k] !== RESUME).map((s) => ({ at: s.m ?? s.t, src: "tick", vol: 0.05 })),
  { at: K.rw + 26, src: "snap", vol: 0.08 },
  { at: K.same, src: "pop", vol: 0.1 },
  { at: K.strip, src: "pop", vol: 0.18 },
  { at: K.head + 6, src: "pop", vol: 0.14 },
  { at: K.tail + 4, src: "pop", vol: 0.14 },
  { at: K.eq, src: "ding", vol: 0.18 },
  { at: K.pin + 4, src: "snap", vol: 0.2 },
  { at: K.slide, src: "whoosh", vol: 0.22 },
  { at: K.align, src: "ding", vol: 0.18 },
  { at: K.third, src: "tick", vol: 0.1 },
  { at: K.card + 4, src: "pop", vol: 0.14 },
];

// ───────────────────────── 画面 ─────────────────────────
export const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= S.from + S.dur) return null;

  const run = runSteps(f, STEPS, SCHED, { i: MISS.i, h: S1_END.headAfter }, { h: [{ at: K.rw, to: MISS.head, dur: 22, ease: EASE_CAMERA }] });

  // 第 1 镜留下的灰格，倒带时复原
  const ungrey = 1 - progress(f, K.rw, 14);
  // s2a 指认"主串这五位"、"模式前五位"
  const knownMain = (k: number) => k >= MISS.head && k < MISS.i;
  const markMain = progress(f, K.known, 8) * (1 - progress(f, K.strip + 12, 12));
  const markPat = progress(f, K.same, 8) * (1 - progress(f, K.strip + 12, 12));
  // s2c 落位后：p1…pNB 与主串 s(i−NB)…s(i−1) 闪绿并保持
  const landed = progress(f, K.align, 8);
  const landMain = (k: number) => k >= MISS.i - NB && k < MISS.i;

  const mainLook = (k: number) =>
    lk(
      { matched: run.mainMatched(k) },
      knownMain(k) ? { dim: ungrey, focus: markMain * 0.8, dy: -10 * pulse(f, K.same + (k - MISS.head) * 2, 14) } : undefined,
      landMain(k) ? { matched: landed, dy: -8 * pulse(f, K.align + (k - MISS.i + NB) * 3, 14) } : undefined,
    );
  const patLook = (j: number) =>
    lk(
      { matched: run.patMatched(j), focus: run.focusOfPat(j) * (j === MISS.j ? 1 - progress(f, K.known, 10) : 1) },
      j < MISS.j ? { focus: markPat * 0.8, dy: -10 * pulse(f, K.same + (j - 1) * 2, 14) } : undefined,
      j <= NB ? { matched: landed, dy: -8 * pulse(f, K.align + (j - 1) * 3, 14) } : undefined,
    );

  // 小条：从模式前五格复制下来
  const stripOut = 1 - progress(f, K.card, 12, EASE_IN);
  const stripLook = (j: number) => {
    const t0 = K.strip + (j - 1) * 3;
    return { show: springy(f, t0, 12), dy: (M.patY - STRIP_Y) * (1 - progress(f, t0, 14)) };
  };
  const bBlue = progress(f, K.head + 4, 14);
  const bOrange = progress(f, K.tail + 2, 14);
  const bEq = progress(f, K.eq, 16);
  const blueX1 = stripCell(1);
  const blueX2 = stripCell(NB) + M.cell;
  const orX1 = stripCell(NK - NB + 1);
  const orX2 = stripCell(NK) + M.cell;

  // 小 i
  const face: Face = f >= K.pin ? "happy" : f >= K.known ? "normal" : "happy";
  const ix = mainCX(run.i);

  // 口诀卡
  const cardIn = progress(f, K.card + 2, 14);
  const keyHi = progress(f, K.key, 10);

  return (
    <AbsoluteFill>
      <TopChip f={f} from="KMP" />
      <Counter right={M.counterRight} label="比较" value={S1_END.count} opacity={1 - progress(f, K.rw, 10, EASE_IN)} />

      <StringRow text={MAIN} kind="main" y={M.mainY} looks={mainLook} label="S" index={{ y: M.idxY }} />
      <StringRow
        text={PAT}
        kind="pattern"
        y={M.patY}
        h={run.h}
        looks={patLook}
        label="T"
        rows={[{ label: "next", values: PAT.split("").map(() => null), y: M.nextY, height: M.nextH, opacity: progress(f, K.rw + 12, 14) }]}
      />
      <CmpList list={run.cmps} />
      {/* 第 1 镜留下的 #10 红 ×，倒带时淡掉 */}
      <Compare cx={mainCX(S1_END.again.i)} state="ne" opacity={1 - progress(f, K.rw, 8, EASE_IN)} />

      {/* 已知的那一段：小条 + 前后缀括号 */}
      <div style={{ position: "absolute", inset: 0, opacity: stripOut }}>
        <StringRow text={KNOWN} kind="copy" y={STRIP_Y} h={STRIP_H} looks={stripLook} />
        <Brace x={blueX1 + 4} y={BR_Y} w={blueX2 - blueX1 - 8} h={20} dir="down" draw={bBlue} color={L.blue} stroke={4} />
        <Brace x={orX1 + 4} y={BR_Y} w={orX2 - orX1 - 8} h={20} dir="down" draw={bOrange} color={L.accent} stroke={4} />
        <DashArc x1={(blueX1 + blueX2) / 2} x2={(orX1 + orX2) / 2} y={BR_Y + 26} depth={30} draw={bEq} color={L.ink2} label="=" labelSize={44} labelColor={L.ink} />
      </div>

      <Pin x={ix + 18} y={M.littleIY + 80} p={springy(f, K.pin, 12)} />
      <LittleI x={ix} y={M.littleIY - run.iLift} face={face} lookY={f >= K.known && f < K.pin ? 1 : 0} squash={0.6 * pulse(f, K.pin + 4, 10)} />

      {/* 口诀卡 */}
      <Card x={300} y={M.cardY} w={1320} h={M.cardH} opacity={cardIn} dy={rise(f, K.card + 2, 18, 20)}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 26,
            fontFamily: FONT.sans,
            fontSize: 52,
            fontWeight: 700,
            color: L.ink,
            whiteSpace: "nowrap",
          }}
        >
          能滑多远 = 已匹配那段的
          <span
            style={{
              marginLeft: 10,
              padding: "0 10px 4px",
              borderRadius: 10,
              color: keyHi > 0.5 ? L.accentDeep : L.ink,
              background: `rgba(253, 228, 217, ${keyHi})`,
              fontWeight: 800,
            }}
          >
            最长相等前后缀
          </span>
        </div>
        <div style={{ position: "absolute", right: 26, bottom: 18, opacity: progress(f, K.key + 16, 12) }}>
          <Chip color={L.ink2} bg="#F1EEE8" size={28}>
            前后缀都不含整段本身
          </Chip>
        </div>
      </Card>
    </AbsoluteFill>
  );
};

/** 第 3 镜接续用 */
export const S2_END = { miss: MISS, resume: RESUME, nb: NB, cardX: 300, cardW: 1320 };
