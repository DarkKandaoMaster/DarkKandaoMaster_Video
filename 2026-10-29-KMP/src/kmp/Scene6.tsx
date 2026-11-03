// 第 6 镜：next 的小漏洞 → nextval。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[5].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_6（绝对帧），由 KMP.tsx 汇总。
//
// 开始态 = 第 5 镜结束态。s6a：第 5 镜的对比条 / 旗 / 绿框淡掉，next 排晃一下；换主串 NV_MAIN（旧串上移淡出、新串从下推入），
// 小 i 跳出去再落到新 s1，模式滑回头对 s1；NV_BY_NEXT #1～#4 变绿，#5 s5 a ≠ p5 b。
// s6b：next[5] = 2 → 模式滑 3 格，p2 对 s5；p5、p2 两个 b 套橙圈 + 虚线"同一个字母"；#6 s5 ≠ p2 又一个 ×，小 i 摔晕，计数旁"+1 白比"。
// s6c：回放：模式回到头对 s1 的失配现场，nextval 排出现（第 5 格写 nextval[5] = 1），模式一次滑到头对 s5，p1 = s5 变绿；规则卡 + 右上 Chip 14 vs 13。
// 结束态（= 第 7 镜开始）：主串 NV_MAIN、模式头 5、next / nextval 两排（nextval 只有第 5 格 1）、小 i 在 s5；卡片 / Chip 末 10 帧淡掉。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_IN, progress, springy } from "../base/anim";
import { L } from "../base/paper";
import { FONT } from "../base/theme";
import { V } from "../components/Math";
import type { Sfx } from "../components/Narration";
import { Badge, Card, Chip } from "../components/PaperKit";
import { ch, COUNT, FOUND, KMP_STEPS, MAIN, NEXT, nextvalOf, NV_BY_NEXT, NV_BY_NEXTVAL, NV_MAIN, PAT } from "./data";
import { LittleI, type Face } from "./LittleI";
import { Compare } from "./Compare";
import { KC, M, cellCX, cellX, mainCX, mainX } from "./layout";
import { CmpList, Counter, DashArc, Flag, JumpTag, lk, ProgressLine, pulse, Ring, runSteps, sceneAlpha, type Sched, Stars, TopChip } from "./matchKit";
import { S5_END, S5Bottom } from "./Scene5";
import { type CellLook, StringRow } from "./StringRow";
import { SCENES, p } from "./timeline";

const S = SCENES[5];

// ───────────────────────── 数据 ─────────────────────────
const A_MISS = NV_BY_NEXT.findIndex((st) => st.eq === false); // #5：i = 5, j = 5 → next[5] = 2
const A_AGAIN = A_MISS + 1; // #6：i = 5, j = 2，又失配
const MJ = NV_BY_NEXT[A_MISS].j; // 5
const JJ = NV_BY_NEXT[A_MISS].nextJ; // next[5] = 2
const A_STEPS = NV_BY_NEXT.slice(0, A_AGAIN + 1);
const B_MISS = NV_BY_NEXTVAL.findIndex((st) => st.eq === false); // #5：→ nextval[5] = 1
const B_STEPS = NV_BY_NEXTVAL.slice(0, B_MISS + 2);
const NV_J = nextvalOf(MJ); // 1
if (ch(PAT, MJ) !== ch(PAT, JJ)) throw new Error("Scene6：p5 与 p_next[5] 应当相同");

// ───────────────────────── 关键时刻 ─────────────────────────
const K = {
  flaw: p("s6a"),
  swap: p("s6a", "换段主串"),
  fifth: p("s6a", "第五位失配"),
  sa: p("s6a", "主串 a"),
  pb: p("s6a", "模式 b"),
  jump: p("s6b"),
  also: p("s6b", "可第二位也是 b"),
  pit: p("s6b", "在同一个坑"),
  trip: p("s6b", "又摔一次"),
  so: p("s6c"),
  keep: p("s6c", "就接着跳"),
  isNv: p("s6c", "这就是"),
};
const SW = K.swap - 16; // 换主串
const NEVER = 1e9;
const CARD_AT = K.isNv + 8;

const A_SCHED: Sched[] = A_STEPS.map((st, k): Sched => {
  if (k < A_MISS) {
    const t = SW + 28 + k * 5;
    return { t, m: t + 4, mvI: t + 5, iDur: 7 };
  }
  if (k === A_MISS) return { t: K.fifth - 10, m: K.fifth, lookAt: K.jump, mvH: K.jump + 10, hDur: 22 };
  return { t: K.pit + 4, m: K.trip, lookAt: NEVER, mvH: NEVER, mvI: NEVER, tripEnd: K.so };
});
const B_SCHED: Sched[] = B_STEPS.map((st, k): Sched => {
  if (k < B_MISS) {
    const t = K.so + 8 + k * 2;
    return { t, m: t + 2, mvI: -NEVER };
  }
  if (k === B_MISS) return { t: K.so + 16, m: K.so + 20, lookAt: NEVER, mvH: K.keep + 12, hDur: 24 };
  // 相等后 i 本该 +1；本镜到此为止，小 i 停在 s5（第 7 镜从 i = 5 接着变形）
  return { t: K.isNv - 8, m: K.isNv - 1, mvI: NEVER, mvH: NEVER };
});
const A_AFTER_H = NV_BY_NEXT[A_MISS].headAfter; // 4
/** 第 5 镜最后一趟（找到的那一趟）留下的绿竖线，开头淡掉 */
const S5_LAST_TRIP = KMP_STEPS.filter((st) => st.n !== null && st.eq && st.head === S5_END.h);

// ───────────────────────── 音效 ─────────────────────────
const am = (k: number) => A_SCHED[k].m ?? A_SCHED[k].t + 6;
export const SFX_6: Sfx[] = [
  { at: K.flaw + 12, src: "pop", vol: 0.12 },
  { at: SW, src: "whoosh", vol: 0.22 },
  { at: SW + 26, src: "pop", vol: 0.1 },
  ...A_STEPS.slice(0, A_MISS).map((_, k) => ({ at: am(k), src: "tick", vol: 0.1 })),
  { at: K.fifth, src: "stamp", vol: 0.2 },
  { at: K.jump + 2, src: "pop", vol: 0.12 },
  { at: K.jump + 10, src: "whoosh", vol: 0.18 },
  { at: K.also + 2, src: "pop", vol: 0.16 },
  { at: K.trip, src: "stamp", vol: 0.14 },
  { at: K.trip + 2, src: "snap", vol: 0.18 },
  { at: K.so, src: "whoosh", vol: 0.16 },
  { at: K.so + 12, src: "pop", vol: 0.1 },
  { at: K.keep, src: "pop", vol: 0.18 },
  { at: K.keep + 12, src: "whoosh", vol: 0.2 },
  { at: K.isNv - 1, src: "ding", vol: 0.2 },
  { at: CARD_AT, src: "stamp", vol: 0.2 },
];

// ───────────────────────── 小件 ─────────────────────────
const Sb: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: "0.62em", position: "relative", top: "0.32em", marginLeft: "0.04em", whiteSpace: "nowrap" }}>{children}</span>
);
const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>{children}</span>;
const Arr: React.FC<{ name: string; idx: React.ReactNode }> = ({ name, idx }) => (
  <span style={{ whiteSpace: "nowrap" }}>
    <Mono>{name}</Mono>[{idx}]
  </span>
);
const J = () => <V>j</V>;

// ───────────────────────── 画面 ─────────────────────────
export const Scene6: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= S.from + S.dur) return null;
  const endA = sceneAlpha(f, S, 0, 10);

  // 第 5 镜留下的东西淡掉
  const old5 = 1 - progress(f, K.flaw, 14, EASE_IN);
  const swapOut = progress(f, SW, 10, EASE_IN);
  const swapIn = progress(f, SW + 10, 14);

  const A = runSteps(f, A_STEPS, A_SCHED, { i: 1, h: S5_END.h }, { h: [{ at: SW, to: 1, dur: 20, ease: EASE_CAMERA }] });
  const B = runSteps(f, B_STEPS, B_SCHED, { i: NV_BY_NEXT[A_AGAIN].i, h: A_AFTER_H }, { h: [{ at: K.so, to: 1, dur: 18, ease: EASE_CAMERA }] });
  const replay = f >= K.so;
  const R = replay ? B : A;

  // 主串：旧串（第 5 镜）上的淡绿与"找到"在 K.flaw 淡掉，SW 起上移淡出；新串从下推入
  const oldMainLook = (k: number) => (k >= FOUND.kmp && k < FOUND.kmp + PAT.length ? { matched: old5 } : undefined);
  const nvMainLook = (k: number) =>
    lk(
      { matched: Math.max(A.mainMatched(k), B.mainMatched(k) * endA) },
      k === NV_BY_NEXT[A_MISS].i ? { focus: progress(f, K.sa, 8) * (1 - progress(f, K.jump, 10)) } : undefined,
    );
  const patLook = (j: number) =>
    lk(
      { matched: f < SW ? old5 : 0 },
      {
        matched: replay ? B.patMatched(j) * endA : A.patMatched(j),
        // 回放时 #1～#4 是"一下子摆回来"的，不给焦点；只给失配的 p5 和最后相等的 p1
        focus: (replay ? (j === MJ || j === B_STEPS[B_STEPS.length - 1].j ? B.focusOfPat(j) : 0) : A.focusOfPat(j) * (j === MJ ? 1 - progress(f, K.jump, 8) : 1)) * endA,
      },
      j === MJ ? { focus: progress(f, K.pb, 8) * (1 - progress(f, K.jump, 10)) } : undefined,
    );

  // next / nextval 两排
  const wob = (k: number) => -6 * Math.sin((f - K.flaw - 12 - k * 2) * 0.9) * pulse(f, K.flaw + 12 + k * 2, 22);
  const nextLooks: CellLook[] = NEXT.map((_, k) => ({ focus: A.lookOf(k + 1) * (replay ? 0 : 1) + (k + 1 === MJ ? progress(f, K.so + 26, 8) * (1 - progress(f, K.keep + 4, 8)) : 0), dy: wob(k) }));
  const nvVals = PAT.split("").map((_, k) => (k + 1 === MJ && f >= K.keep ? NV_J : null));
  const nvLooks: CellLook[] = PAT.split("").map((_, k) =>
    k + 1 === MJ && f >= K.keep ? { show: springy(f, K.keep, 12), focus: progress(f, K.keep, 6) * (1 - progress(f, K.isNv + 10, 12)) } : { dim: 0.55 },
  );
  const nvRow = progress(f, K.so + 10, 12);

  // 两个 b 套圈 + 虚线
  const ringA = progress(f, K.also, 10) * (1 - progress(f, K.so, 8, EASE_IN));
  const ringB = progress(f, K.so + 26, 10) * (1 - progress(f, K.keep + 8, 10, EASE_IN));
  const ring = Math.max(ringA, ringB);
  const rh = R.h;

  // 小 i
  const outP = progress(f, SW, 10, EASE_IN);
  const inP = springy(f, SW + 12, 14);
  const onNew = f >= SW + 11;
  const ix = onNew ? mainCX(R.i) : mainCX(S5_END.i);
  const iy = M.littleIY - (onNew ? (1 - inP) * 160 : outP * 160) - (onNew ? A.iLift : 0);
  const iOp = onNew ? progress(f, SW + 12, 5) : 1 - outP;
  const dizzy = f >= K.trip && f < K.so;
  const face: Face = dizzy ? "dizzy" : f >= S.from + S.dur - 12 ? "normal" : f >= K.isNv ? "happy" : f < K.flaw + 6 ? "happy" : "normal";
  const fall = dizzy ? -24 * progress(f, K.trip, 6) + 10 * pulse(f, K.trip + 6, 16) : 0;
  const starsA = progress(f, K.trip + 2, 6) * (1 - progress(f, K.so - 4, 8, EASE_IN));

  // 计数
  const ctrA = 1 - progress(f, SW, 10, EASE_IN);
  const ctrNew = progress(f, SW + 18, 10) * (1 - progress(f, K.so, 10, EASE_IN));
  const plusOne = progress(f, K.trip + 4, 10) * (1 - progress(f, K.so, 10, EASE_IN));

  // 规则卡、Chip
  const card = progress(f, CARD_AT, 10);
  const cardS = 1 + 0.25 * (1 - progress(f, CARD_AT, 10)) ** 2;

  return (
    <AbsoluteFill>
      <TopChip f={f} from="KMP" opacity={endA} />
      {/* 第 5 镜的两个计数器 → 新主串的计数器 */}
      <Counter right={M.counterRight} label="朴素" value={COUNT.naive} muted opacity={ctrA} minW={230} />
      <Counter right={M.counterRight - 254} label="KMP 比较" value={COUNT.kmp} opacity={ctrA} />
      <Counter right={M.counterRight} label="比较" value={A.count} opacity={ctrNew} bump={A.bump} />
      <div style={{ position: "absolute", right: 1920 - M.counterRight, top: 172, opacity: plusOne, transform: `scale(${0.7 + 0.3 * springy(f, K.trip + 4, 12)})`, transformOrigin: "100% 0" }}>
        <Chip color={KC.bad} bg={KC.badSoft} size={34}>
          +1 白比
        </Chip>
      </div>

      {/* 主串：旧 → 新 */}
      {swapOut < 0.999 ? (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-60 * swapOut}px)` }}>
          <StringRow text={MAIN} kind="main" y={M.mainY} looks={oldMainLook} label="S" index={{ y: M.idxY }} opacity={1 - swapOut} />
        </div>
      ) : null}
      {swapIn > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${60 * (1 - swapIn)}px)` }}>
          <StringRow text={NV_MAIN} kind="main" y={M.mainY} looks={nvMainLook} label="S" index={{ y: M.idxY }} opacity={swapIn} />
        </div>
      ) : null}
      <ProgressLine x1={mainX(1)} x2={mainCX(S5_END.i)} y={M.idxY - 6} opacity={old5} />
      <div style={{ position: "absolute", inset: 0, opacity: old5 }}>
        <Flag x={mainX(FOUND.kmp) + 8} yBase={M.idxY - 10} hgt={92} p={1} text={`位置 ${FOUND.kmp}`} />
      </div>

      <StringRow
        text={PAT}
        kind="pattern"
        y={M.patY}
        h={R.h}
        looks={patLook}
        label="T"
        rows={[
          { label: "next", values: NEXT, y: M.nextY, height: M.nextH, looks: nextLooks },
          { label: "nextval", values: nvVals, y: M.nextvalY, height: M.nextH, looks: nvLooks, opacity: nvRow },
        ]}
      />
      <Badge cx={cellX(R.h, 1) - 112} cy={M.nextY + M.nextH / 2} n="?" p={progress(f, K.flaw + 12, 10) * (1 - progress(f, SW, 8))} color={L.accent} size={38} />
      <Ring x={cellX(S5_END.h, 1) - 9} y={M.patY - 9} w={PAT.length * M.step - M.gap + 18} h={M.cell + 18} draw={old5} color={KC.ok} stroke={5} r={20} />

      {S5_LAST_TRIP.map((st) => (
        <Compare key={`s5${st.n}`} cx={mainCX(st.i)} state="eq" opacity={old5} />
      ))}
      <CmpList list={A.cmps} />
      <CmpList list={B.cmps} opacity={endA} />
      <JumpTag cx={cellCX(R.h, MJ)} y={M.nextY + M.nextH + 8} p={A.lookOf(MJ) * (replay ? 0 : 1)} text={`j → ${JJ}`} />

      {/* 同一个字母 */}
      <Ring x={cellX(rh, MJ) - 8} y={M.patY - 8} w={M.cell + 16} h={M.cell + 16} draw={ring} color={L.accent} stroke={5} r={20} />
      <Ring x={cellX(rh, JJ) - 8} y={M.patY - 8} w={M.cell + 16} h={M.cell + 16} draw={ring} color={L.accent} stroke={5} r={20} />
      <div style={{ position: "absolute", inset: 0, opacity: ringA }}>
        <DashArc x1={cellCX(rh, JJ)} x2={cellCX(rh, MJ)} y={M.nextY + M.nextH + 8} depth={30} draw={progress(f, K.also + 4, 12)} color={L.accentDeep} label="同一个字母" labelSize={40} />
      </div>
      <JumpTag cx={cellCX(R.h, MJ)} y={M.nextvalY + M.nextH + 8} p={progress(f, K.keep + 2, 8) * (1 - progress(f, CARD_AT - 6, 8))} text={`直接跳到 ${NV_J}`} size={36} />

      <LittleI x={ix} y={iy} face={face} opacity={iOp} rotate={fall} squash={A.iLand * 0.6 + pulse(f, K.trip, 12) * 0.9 + (onNew ? 0.6 * pulse(f, SW + 24, 9) : 0)} lookY={onNew && !dizzy ? 0.8 : 0} />
      <Stars cx={ix} cy={M.littleIY - 6} t={(f - K.trip) / 22} opacity={starsA} />

      <S5Bottom f={f} opacity={old5} />

      {/* 规则卡 */}
      <Card x={250} y={708} w={1420} h={170} opacity={card * endA} style={{ transform: `scale(${cardS})` }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            fontFamily: FONT.sans,
            fontSize: 44,
            fontWeight: 600,
            color: L.ink,
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          <div>
            若 <V>p</V>
            <Sb>
              <J />
            </Sb>{" "}
            = <V>p</V>
            <Sb>
              <Arr name="next" idx={<J />} />
            </Sb>
            ：<span style={{ color: L.accentDeep }}>
              <Arr name="nextval" idx={<J />} /> = <Arr name="nextval" idx={<Arr name="next" idx={<J />} />} />
            </span>
          </div>
          <div style={{ color: L.ink2 }}>
            否则：<Arr name="nextval" idx={<J />} /> = <Arr name="next" idx={<J />} />
          </div>
        </div>
      </Card>
      <div style={{ position: "absolute", right: 1920 - M.counterRight, top: 96, opacity: progress(f, CARD_AT + 10, 12) * endA }}>
        <Chip color={L.ink2} bg="#F1EEE8" size={30}>
          这段主串：next 比 {COUNT.nvNext} 次，nextval {COUNT.nvNextval} 次
        </Chip>
      </div>
    </AbsoluteFill>
  );
};

