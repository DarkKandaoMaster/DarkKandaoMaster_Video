// 第 5 镜：拿着 next 走一遍。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[4].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_5（绝对帧），由 KMP.tsx 汇总。
//
// 开始态 = 第 4 镜结束态（手推布局：模式串 + 填满的 next 排、j 号排，小 i 在左上角 PERCH）。开头 26 帧：模式串缩回匹配布局、头对 s1，
// 主串从上方淡入，小 i 从左上角跳到 s1。之后照 KMP_STEPS 走完 15 次比较：失配时 next 格亮 + "j → x"，模式按 headAfter 滑；
// 小 i 只往前走，脚下拖一条只增不减的珊瑚橙进度线。#15 后整条模式外框变绿、s6 插旗"位置 6"。
// s5c：计数器停在 15，"朴素 ×?" 揭开成 20；下方 20 格 vs 15 格对比条 + "朴素最坏 O(n·m)，KMP O(n + m)" 卡。
// 结束态（= 第 6 镜开始）：上述全部留在画面上。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_IN, hopLift, mix, progress, springy } from "../base/anim";
import { L } from "../base/paper";
import { FONT, mixColor } from "../base/theme";
import { V } from "../components/Math";
import type { Sfx } from "../components/Narration";
import { Card } from "../components/PaperKit";
import { COUNT, FOUND, KMP_STEPS, MAIN, NEXT, PAT } from "./data";
import { geoMix, PERCH } from "./HandKit";
import { LittleI, type Face } from "./LittleI";
import { H, KC, M, M_GEO, cellCX, cellX, mainCX, mainX } from "./layout";
import { CmpList, Counter, Flag, JumpTag, lk, ProgressLine, pulse, Ring, runSteps, type Sched, TopChip } from "./matchKit";
import { StringRow } from "./StringRow";
import { SCENES, p } from "./timeline";

const S = SCENES[4];

// ───────────────────────── 关键时刻 ─────────────────────────
const K = {
  go: p("s5a"),
  lookup: p("s5a", "失配就查表跳 j"),
  only: p("s5a", "小 i 只往前走"),
  six: p("s5b"),
  three: p("s5b", "查表是三"),
  slide: p("s5b", "滑过去接着比"),
  found: p("s5b", "在第六位找到了"),
  naive: p("s5c"),
  kmp: p("s5c", "KMP 十五次"),
  longer: p("s5c", "串越长"),
};
const MORPH = 26;
const I_HOP = S.from + 16; // 小 i 从左上角跳到 s1
const I_HOP_DUR = 22;

// ───────────────────────── 时间表（KMP_STEPS 下标）─────────────────────────
/** 第一次"查表跳得比 1 远"的失配（#9） */
const BIG = KMP_STEPS.findIndex((st) => st.eq === false && st.nextJ > 1);
/** 第一次失配（#2，j 跳到 1）、第 1 位失配（#3，j = 0）和随后的 j = 0 步 */
const MISS1 = KMP_STEPS.findIndex((st) => st.eq === false);
const ZERO = KMP_STEPS.findIndex((st) => st.eq === false && st.nextJ === 0);
const J0 = ZERO + 1;
const NEVER = 1e9;

const SCHED: Sched[] = KMP_STEPS.map((st, k): Sched => {
  if (k < MISS1) return { t: K.go + 40 + k * 14, m: K.go + 45 + k * 14 };
  if (k === MISS1) return { t: K.go + 54, m: K.go + 60, mvH: K.lookup + 4, hDur: 14 };
  if (k === ZERO) return { t: K.lookup + 14, m: K.lookup + 20, mvH: K.lookup + 36, hDur: 14 };
  if (k === J0) return { t: K.lookup + 36, mvI: K.lookup + 36, iDur: 12 };
  if (k < BIG) {
    const t = K.only + 6 + (k - J0 - 1) * 12;
    return { t, m: t + 5 };
  }
  if (k === BIG) return { t: K.six - 12, m: K.six, lookAt: K.three, mvH: K.three + 14, hDur: 22 };
  const t = K.slide + (k - BIG - 1) * 7;
  return { t, m: t + 4, mvI: t + 5, iDur: 7 };
});

const LAST = KMP_STEPS[KMP_STEPS.length - 1];
/** 第 6 镜接续用 */
export const S5_END = { i: LAST.nextI, h: LAST.headAfter, found: FOUND.kmp };

// ───────────────────────── 音效 ─────────────────────────
const at = (k: number) => SCHED[k].m ?? SCHED[k].t + 6;
export const SFX_5: Sfx[] = [
  { at: S.from + 2, src: "whoosh", vol: 0.16 },
  { at: I_HOP + I_HOP_DUR - 2, src: "pop", vol: 0.12 },
  ...KMP_STEPS.map((st, k) =>
    st.n === null
      ? null
      : st.eq
        ? { at: at(k), src: "tick", vol: k > BIG ? 0.1 + 0.025 * (k - BIG) : 0.1 }
        : { at: at(k), src: k === BIG ? "stamp" : "snap", vol: k === BIG ? 0.18 : 0.1 },
  ).filter((x): x is Sfx => x !== null),
  { at: at(MISS1) + 3, src: "pop", vol: 0.1 },
  { at: SCHED[MISS1].mvH!, src: "whoosh", vol: 0.1 },
  { at: at(ZERO) + 3, src: "pop", vol: 0.1 },
  { at: SCHED[ZERO].mvH!, src: "pop", vol: 0.16 },
  { at: K.three, src: "pop", vol: 0.14 },
  { at: SCHED[BIG].mvH!, src: "whoosh", vol: 0.2 },
  { at: K.found, src: "ding_hi", vol: 0.24 },
  { at: K.naive + 2, src: "pop", vol: 0.18 },
  { at: K.kmp + 2, src: "pop", vol: 0.14 },
  { at: K.longer + 4, src: "snap", vol: 0.12 },
];

// ───────────────────────── 小件 ─────────────────────────
const SQ = 30;
const SQ_STEP = 38;
const BAR_X = 330;
const Bar: React.FC<{ f: number; y: number; label: string; n: number; start: number; color: string; edge: string; extraFrom?: number; extra?: number }> = ({
  f,
  y,
  label,
  n,
  start,
  color,
  edge,
  extraFrom = Infinity,
  extra = 0,
}) => {
  const a = progress(f, start, 8);
  if (a <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: a }}>
      <div
        style={{
          position: "absolute",
          left: BAR_X - 320,
          width: 300,
          top: y - 6,
          height: SQ + 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          fontFamily: FONT.sans,
          fontWeight: 700,
          fontSize: 44,
          color: L.ink2,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      {Array.from({ length: n }, (_, k) => {
        const s = springy(f, start + k * 1.5, 8);
        const isExtra = k + 1 >= extraFrom;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: BAR_X + k * SQ_STEP,
              top: y,
              width: SQ,
              height: SQ,
              borderRadius: 7,
              background: isExtra ? mixColor(color, KC.badSoft, extra) : color,
              boxShadow: `inset 0 0 0 2px ${isExtra && extra > 0.5 ? KC.bad : edge}`,
              transform: `scale(${s})`,
              opacity: Math.min(1, s * 1.5),
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: BAR_X + n * SQ_STEP + 10,
          top: y - 6,
          height: SQ + 12,
          display: "flex",
          alignItems: "center",
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 44,
          color: L.ink,
          whiteSpace: "nowrap",
          opacity: progress(f, start + n * 1.5, 8),
        }}
      >
        {n} 次
      </div>
    </div>
  );
};

// ───────────────────────── 画面 ─────────────────────────
export const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= S.from + S.dur) return null;

  // 手推布局 → 匹配布局（模式头对 s1）
  const mt = progress(f, S.from, MORPH, EASE_CAMERA);
  const g = mt < 1 ? geoMix(1, 1 - mt) : M_GEO;
  const patY = mix(H.patY, M.patY, mt);
  const nextY = mix(H.nextY, M.nextY, mt);
  const nextH = mix(H.nextH, M.nextH, mt);
  const letter = mix(H.letterSize, M.letterSize, mt);
  const numSize = mix(H.numSize, M.numSize, mt);
  const jRow = 1 - progress(f, S.from, 10, EASE_IN);
  const mainA = progress(f, S.from + 8, 16);

  const run = runSteps(f, KMP_STEPS, SCHED, { i: 1, h: 1 });

  // 找到了
  const found = progress(f, K.found, 12);
  // #9 滑过去落位后：p1…p(next−1) 与主串对应几格已知相等（和第 2 镜同一个画面），淡绿保留到找到
  const big = KMP_STEPS[BIG];
  const known = progress(f, SCHED[BIG].mvH! + 20, 8);
  const knownPat = (j: number) => j < big.nextJ;
  const knownMain = (k: number) => k >= big.i - big.nextJ + 1 && k < big.i;
  const patLook = (j: number) =>
    lk({ matched: run.patMatched(j), focus: run.focusOfPat(j) }, knownPat(j) ? { matched: known } : undefined, { dy: -8 * pulse(f, K.found + (j - 1) * 2, 14) });
  const mainLook = (k: number) =>
    lk(
      { matched: run.mainMatched(k) },
      knownMain(k) ? { matched: known } : undefined,
      k >= FOUND.kmp && k < FOUND.kmp + PAT.length ? { dy: -8 * pulse(f, K.found + (k - FOUND.kmp) * 2, 14) } : undefined,
    );
  const numLooks = NEXT.map((_, k) => ({ focus: run.lookOf(k + 1) }));

  // 小 i：左上角 → s1，然后只往前
  const hop = progress(f, I_HOP, I_HOP_DUR, EASE_CAMERA);
  const ix = hop < 1 ? mix(PERCH.x, mainCX(1), hop) : mainCX(run.i);
  const iy = (hop < 1 ? mix(PERCH.y, M.littleIY, hop) - hopLift(f, I_HOP, I_HOP_DUR, 70) : M.littleIY) - run.iLift;
  const iScale = mix(PERCH.scale, 1, hop);
  const face: Face = f >= K.found ? "happy" : f < I_HOP + 6 ? "happy" : "normal";

  // 计数器
  const ctrA = progress(f, S.from + 16, 12);
  const reveal = f >= K.naive + 2;

  return (
    <AbsoluteFill>
      <TopChip f={f} from="KMP" opacity={progress(f, I_HOP + 10, 12)} />
      <Counter right={M.counterRight} label="朴素" value={reveal ? COUNT.naive : "?"} muted opacity={ctrA} bump={pulse(f, K.naive + 2, 12)} minW={230} />
      <Counter right={M.counterRight - 254} label="KMP 比较" value={run.count} opacity={ctrA} bump={Math.max(run.bump, pulse(f, K.kmp + 2, 12))} />

      {/* 第 4 镜留下的 j 号排淡掉 */}
      {jRow > 0.001
        ? PAT.split("").map((_, k) => (
            <div
              key={`j${k}`}
              style={{
                position: "absolute",
                left: g.x0 + k * g.step,
                width: g.cell,
                top: H.jLabelY - 6,
                textAlign: "center",
                fontFamily: FONT.sans,
                fontSize: 32,
                color: L.ink3,
                opacity: jRow,
                lineHeight: 1,
              }}
            >
              {k + 1}
            </div>
          ))
        : null}

      <div style={{ position: "absolute", inset: 0, transform: `translateY(${mix(-40, 0, mainA)}px)` }}>
        <StringRow text={MAIN} kind="main" y={M.mainY} looks={mainLook} label="S" index={{ y: M.idxY }} opacity={mainA} />
      </div>
      <ProgressLine x1={mainX(1)} x2={mainCX(run.iLine)} y={M.idxY - 6} opacity={progress(f, SCHED[0].t, 10)} />
      <StringRow
        text={PAT}
        kind="pattern"
        y={patY}
        h={run.h}
        geo={g}
        looks={patLook}
        letterSize={letter}
        label="T"
        labelGap={mix(26, 18, mt)}
        rows={[{ label: "next", values: NEXT, y: nextY, height: nextH, size: numSize, looks: numLooks }]}
      />
      <CmpList list={run.cmps} />
      {KMP_STEPS.map((st, k) =>
        st.eq === false ? (
          <JumpTag key={`jt${k}`} cx={cellCX(run.h, st.j)} y={M.nextY + M.nextH + 8} p={run.lookOf(st.j) * (f >= (SCHED[k].lookAt ?? at(k) + 3) && f < (SCHED[k].mvH ?? NEVER) + 32 ? 1 : 0)} text={`j → ${st.nextJ}`} />
        ) : null,
      )}

      {/* 找到了：外框变绿 + 插旗 */}
      <Ring x={cellX(FOUND.kmp, 1) - 9} y={M.patY - 9} w={PAT.length * M.step - M.gap + 18} h={M.cell + 18} draw={found} color={KC.ok} stroke={5} r={20} />
      <Flag x={mainX(FOUND.kmp) + 8} yBase={M.idxY - 10} hgt={92} p={springy(f, K.found + 4, 14)} text={`位置 ${FOUND.kmp}`} />

      <LittleI x={ix} y={iy} scale={iScale} face={face} squash={run.iLand * 0.6 + 0.6 * pulse(f, I_HOP + I_HOP_DUR - 3, 9)} lookY={f > SCHED[0].t && f < K.found ? 0.8 : 0} />

      <S5Bottom f={f} />
    </AbsoluteFill>
  );
};

/** s5c 下方的对比条 + 复杂度卡（第 6 镜开头也画它，淡出用 opacity） */
export const S5Bottom: React.FC<{ f: number; opacity?: number }> = ({ f, opacity = 1 }) =>
  opacity <= 0.001 ? null : (
    <div style={{ position: "absolute", inset: 0, opacity }}>
        {/* s5c：比较次数对比 */}
        <Bar f={f} y={724} label="朴素" n={COUNT.naive} start={K.naive + 4} color="#E9E5DD" edge={KC.dimEdge} extraFrom={COUNT.kmp + 1} extra={progress(f, K.longer, 12)} />
        <Bar f={f} y={800} label="KMP" n={COUNT.kmp} start={K.kmp + 4} color={L.blueSoft} edge="#9DBBE6" />
        <Card x={1290} y={700} w={530} h={170} opacity={progress(f, K.longer + 4, 12)} dy={(1 - progress(f, K.longer + 4, 16)) * 16}>
          <div style={{ position: "absolute", left: 34, top: 22, fontFamily: FONT.sans, fontSize: 44, fontWeight: 700, color: L.ink2, whiteSpace: "nowrap", lineHeight: 1.5 }}>
            <div>
              朴素最坏 O(<V>n</V>·<V>m</V>)
            </div>
            <div style={{ color: L.ink }}>
              KMP{"　"}O(<V>n</V> + <V>m</V>)
            </div>
          </div>
        </Card>
    </div>
  );
