// 第 3 镜：定义 next。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[2].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_3（绝对帧），由 KMP.tsx 汇总。
//
// 开始态 = 第 2 镜结束态（模式头 6、p3 待比、口诀卡）。s3a：next 排先写进第 6 格的 3（stamp）+ 注"第 6 位失配 → j 换成 3"，
// 其余格 "?"，行首 next 放大一下。s3b：口诀卡改写成 next[j] = 最长相等前后缀长度 + 1（"ab：2 + 1 = 3" 一闪），下面展开教材原定义；
// "第一位就失配记零"：next 第 1 格写 0，右下小窗演示 KMP #3（s2 ≠ p1 → j = 0 → i、j 各加 1，模式从头比）。右上 Chip 提醒 0 起下标。
// 镜头末 10 帧只淡掉卡片、小窗、Chip；主串 / 模式串 / next 排（0、3、?）/ 小 i（s8）留给第 4 镜（它从这个状态变形到手推布局）。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_IN, mix, progress, springy } from "../base/anim";
import { L } from "../base/paper";
import { FONT } from "../base/theme";
import { N, Op, Sub, V } from "../components/Math";
import type { Sfx } from "../components/Narration";
import { Card, Chip, VBrace } from "../components/PaperKit";
import { Compare } from "./Compare";
import { KMP_STEPS, MAIN, nextOf, PAT } from "./data";
import { LittleI } from "./LittleI";
import { M, cellCX, cellX, mainCX, type RowGeo } from "./layout";
import { follow, JumpTag, lk, Pin, pulse, sceneAlpha, SideLabel, TopChip } from "./matchKit";
import { BORDER, MISS_K } from "./Scene2";
import { type CellLook, StringRow } from "./StringRow";
import { SCENES, p } from "./timeline";

const S = SCENES[2];

// ───────────────────────── 数据 ─────────────────────────
const MISS = KMP_STEPS[MISS_K]; // #9：i = 8, j = 6
const H = MISS.headAfter; // 模式头 6
const NB = BORDER.length;
const MISS_NEXT = nextOf(MISS.j); // 3
/** 第 1 位就失配的那一步（KMP #3：i = 2, j = 1），之后的 j = 0 步、再之后从头比的那一步（#4：i = 3, j = 1） */
const ZK = KMP_STEPS.findIndex((st) => st.n !== null && st.j === 1 && st.eq === false);
const Z = KMP_STEPS[ZK];
const Z0 = KMP_STEPS[ZK + 1];
const ZR = KMP_STEPS[ZK + 2];

// ───────────────────────── 关键时刻 ─────────────────────────
const K = {
  a: p("s3a"),
  ahead: p("s3a", "提前算好"),
  isNext: p("s3a", "就是 next"),
  rule: p("s3b"),
  plus: p("s3b", "最长相等前后缀长"),
  zero: p("s3b", "第一位就失配记零"),
  step: p("s3b", "i 前进一格"),
  fresh: p("s3b", "模式从头比"),
};
const T3 = K.a + 14; // 第 6 格写 3
const qAt = (j: number) => K.ahead + (j - 1) * 4; // 其余格依次出 "?"
const DEF_AT = K.plus + 30;

// 小窗
const IN = { x: 1340, y: 640, w: 480, h: 265 };
const MG: RowGeo = { x0: IN.x + 62, cell: 56, step: 68 };
const MINI_N = 5; // 主串前 5 位
const MINI_MAIN_Y = IN.y + 112;
const MINI_PAT_Y = MINI_MAIN_Y + 56 + 30;

// ───────────────────────── 音效 ─────────────────────────
export const SFX_3: Sfx[] = [
  { at: K.a + 4, src: "tick", vol: 0.08 },
  { at: T3, src: "stamp", vol: 0.22 },
  { at: T3 + 8, src: "pop", vol: 0.1 },
  ...PAT.split("")
    .map((_, k) => k + 1)
    .filter((j) => j !== MISS.j)
    .map((j) => ({ at: qAt(j), src: "tick", vol: 0.06 })),
  { at: K.isNext, src: "pop", vol: 0.14 },
  { at: K.rule, src: "whoosh", vol: 0.1 },
  { at: K.plus + 10, src: "tick", vol: 0.12 },
  { at: DEF_AT, src: "pop", vol: 0.08 },
  { at: K.zero + 2, src: "pop", vol: 0.18 },
  { at: K.zero + 22, src: "snap", vol: 0.08 },
  { at: K.step + 2, src: "pop", vol: 0.16 },
  { at: K.fresh + 8, src: "tick", vol: 0.12 },
];

// ───────────────────────── 小件 ─────────────────────────
const Pp: React.FC<{ sub: string }> = ({ sub }) => (
  <span style={{ whiteSpace: "nowrap" }}>
    <V style={{ padding: 0 }}>p</V>
    <Sub>{sub}</Sub>
  </span>
);
const Q: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: FONT.sans }}>‘</span>
    {children}
    <span style={{ fontFamily: FONT.sans }}>’</span>
  </span>
);
const NextJ: React.FC = () => (
  <span style={{ whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>next</span>
    <span style={{ fontFamily: FONT.sans }}>[</span>
    <V>j</V>
    <span style={{ fontFamily: FONT.sans }}>]</span>
  </span>
);

// ───────────────────────── 画面 ─────────────────────────
export const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= S.from + S.dur) return null;
  // 镜头末：只淡掉卡片 / 小窗 / Chip；主串、模式串、next 排、小 i 原样留给第 4 镜接着变形
  const alpha = sceneAlpha(f, S, 0, 10);

  // 舞台：第 2 镜留下的 p3 焦点与待比竖线在 s3a 一开头淡掉；淡绿保留到 s3b
  const pend = 1 - progress(f, K.a + 2, 10, EASE_IN);
  const green = 1 - progress(f, K.rule, 14);
  const mainLook = (k: number) => (k >= MISS.i - NB && k < MISS.i ? { matched: green } : undefined);
  const patLook = (j: number) => lk(j <= NB ? { matched: green } : undefined, j === MISS_NEXT ? { focus: pend } : undefined);

  // next 排
  const values: Array<number | string | null> = [];
  const looks: CellLook[] = [];
  for (let j = 1; j <= PAT.length; j++) {
    if (j === MISS.j) {
      const on = f >= T3;
      values.push(on ? MISS_NEXT : null);
      looks.push(on ? { show: springy(f, T3, 12), focus: progress(f, T3, 6) * (1 - progress(f, K.ahead, 12)) } : { dim: 0.55 });
    } else if (j === 1 && f >= K.zero) {
      values.push(nextOf(1));
      looks.push({ show: springy(f, K.zero, 12), focus: progress(f, K.zero, 6) * (1 - progress(f, K.step + 10, 12)) });
    } else if (f >= qAt(j)) {
      values.push("?");
      looks.push({ show: springy(f, qAt(j), 10), dim: 0.3 });
    } else {
      values.push(null);
      looks.push({ dim: 0.55 });
    }
  }
  const x1 = cellX(H, 1);
  const labelPulse = pulse(f, K.isNext, 20);

  // 卡片：s3b 从 (300, 700, 1320×180) 长成 (100, 640, 1150×265)
  const g = progress(f, K.rule, 18, EASE_CAMERA);
  const card = { x: mix(300, 80, g), y: mix(M.cardY, 640, g), w: mix(1320, 1240, g), h: mix(M.cardH, 265, g) };
  const oldText = 1 - progress(f, K.rule, 8, EASE_IN);
  const ruleIn = progress(f, K.rule + 10, 12);
  const flash = progress(f, K.plus + 10, 8) * (1 - progress(f, K.plus + 64, 12, EASE_IN));
  const def = (k: number) => progress(f, DEF_AT + k * 5, 12);

  // 注释"第 6 位失配 → j 换成 3"
  const note = progress(f, T3 + 8, 10) * (1 - progress(f, K.rule, 10, EASE_IN));

  // 小窗：KMP #3 → j = 0 → i、j 各加 1 → #4 从头比
  const inset = progress(f, K.zero + 4, 12);
  const mi = follow(f, Z.i, [{ at: K.step + 2, to: Z0.nextI, dur: 14, lift: 30 }]);
  const mh = follow(f, Z.head, [{ at: K.step + 2, to: Z0.headAfter, dur: 14 }]).v;
  const miniMain = MAIN.slice(0, MINI_N);
  const zx = cellCX(1, Z.i, MG);
  const rx = cellCX(1, ZR.i, MG);
  const zState = f >= K.zero + 22 ? "ne" : "pending";
  const rState = f >= K.fresh + 8 ? "eq" : "pending";

  return (
    <AbsoluteFill>
      <TopChip f={f} from="KMP" opacity={alpha} />
      <div style={{ position: "absolute", right: 1920 - M.counterRight, top: 96, opacity: progress(f, DEF_AT + 10, 12) * alpha }}>
        <Chip color={L.ink2} bg="#F1EEE8" size={28}>
          有的书下标从 0 起，next 整体减 1；本片按严蔚敏
        </Chip>
      </div>

      <StringRow text={MAIN} kind="main" y={M.mainY} looks={mainLook} label="S" index={{ y: M.idxY }} />
      <StringRow text={PAT} kind="pattern" y={M.patY} h={H} looks={patLook} label="T" rows={[{ values, looks, y: M.nextY, height: M.nextH }]} />
      <SideLabel xRight={x1 - 18} y={M.nextY} h={M.nextH} text="next" size={28} scale={1 + 0.75 * labelPulse} color={labelPulse > 0.3 ? L.accentDeep : L.ink2} />
      <Compare cx={mainCX(MISS.i)} state="pending" opacity={pend} />
      <JumpTag cx={cellCX(H, MISS.j)} y={M.nextY + M.nextH + 10} p={note} text={`↑ 第 ${MISS.j} 位失配 → j 换成 ${MISS_NEXT}`} size={36} />

      <Pin x={mainCX(MISS.i) + 18} y={M.littleIY + 80} p={1} opacity={1 - progress(f, K.a + 4, 12, EASE_IN)} />
      <LittleI x={mainCX(MISS.i)} y={M.littleIY} face={f >= S.from + S.dur - 12 ? "normal" : "happy"} />

      {/* 口诀卡 → 规则 + 教材定义 */}
      <Card x={card.x} y={card.y} w={card.w} h={card.h} opacity={alpha}>
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
            opacity: oldText,
          }}
        >
          能滑多远 = 已匹配那段的
          <span style={{ marginLeft: 10, padding: "0 10px 4px", borderRadius: 10, color: L.accentDeep, background: L.accentSoft, fontWeight: 800 }}>最长相等前后缀</span>
        </div>
        <div style={{ position: "absolute", right: 26, bottom: 18, opacity: oldText }}>
          <Chip color={L.ink2} bg="#F1EEE8" size={28}>
            前后缀都不含整段本身
          </Chip>
        </div>
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 16,
            display: "flex",
            alignItems: "baseline",
            gap: 28,
            fontFamily: FONT.sans,
            fontSize: 48,
            fontWeight: 700,
            color: L.ink,
            whiteSpace: "nowrap",
            opacity: ruleIn,
          }}
        >
          <span>
            <NextJ /> <Op>=</Op> <span style={{ color: L.accentDeep }}>最长相等前后缀长度</span> <Op>+</Op> <N>1</N>
          </span>
          <span style={{ fontSize: 34, fontWeight: 700, color: L.accentDeep, opacity: flash, transform: `scale(${1 + 0.1 * pulse(f, K.plus + 10, 14)})` }}>
            （{BORDER}：{NB} + 1 = {NB + 1}）
          </span>
        </div>
        <div style={{ position: "absolute", left: 30, right: 30, top: 88, height: 2, background: L.cardLine, opacity: def(0) }} />
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 104,
            display: "flex",
            alignItems: "center",
            fontFamily: FONT.sans,
            fontSize: 36,
            fontWeight: 500,
            color: L.ink2,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ opacity: def(0) }}>
            <NextJ /> <Op>=</Op>
          </span>
          <div style={{ position: "relative", width: 34, height: 150, opacity: def(0) }}>
            <VBrace x={8} y={0} h={150} side="left" w={22} color={L.ink2} stroke={3} draw={def(0)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", columnGap: 18, rowGap: 2, lineHeight: 1.3 }}>
            <span style={{ opacity: def(1) }}>
              <N>0</N>，
            </span>
            <span style={{ opacity: def(1) }}>
              <V>j</V> <Op>=</Op> <N>1</N> 时
            </span>
            <span style={{ opacity: def(2) }}>
              max{"{"}
              <V>k</V>
              <Op tight> | </Op>
              <N>1</N>
              <Op tight>{"<"}</Op>
              <V>k</V>
              <Op tight>{"<"}</Op>
              <V>j</V>
              <span style={{ margin: "0 0.25em" }}>且</span>
              <Q>
                <Pp sub="1" />…<Pp sub="k−1" />
              </Q>
              <Op tight>=</Op>
              <Q>
                <Pp sub="j−k+1" />…<Pp sub="j−1" />
              </Q>
              {"}"}，
            </span>
            <span style={{ opacity: def(2) }}>集合不空时</span>
            <span style={{ opacity: def(3) }}>
              <N>1</N>，
            </span>
            <span style={{ opacity: def(3) }}>其他情况</span>
          </div>
        </div>
      </Card>

      {/* 小窗：第 1 位就失配 */}
      <Card x={IN.x} y={IN.y} w={IN.w} h={IN.h} opacity={inset * alpha} dy={(1 - inset) * 20}>
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 14,
            fontFamily: FONT.sans,
            fontSize: 32,
            fontWeight: 700,
            color: L.ink2,
            whiteSpace: "nowrap",
          }}
        >
          {f < K.step ? (
            <>
              第 1 位就失配：<span style={{ color: L.accentDeep }}>j = 0</span>
            </>
          ) : (
            <>i、j 各加 1，模式从头比</>
          )}
        </div>
      </Card>
      <div style={{ position: "absolute", inset: 0, opacity: inset * alpha }}>
        <StringRow text={miniMain} kind="main" y={MINI_MAIN_Y} geo={MG} letterSize={34} label="S" labelSize={28} labelGap={12} />
        <StringRow
          text={PAT.slice(0, 3)}
          kind="pattern"
          y={MINI_PAT_Y}
          h={mh}
          geo={MG}
          letterSize={34}
          looks={(j) => (j === 1 ? { focus: 0.8 } : undefined)}
          label="T"
          labelSize={28}
          labelGap={12}
        />
        <Compare cx={zx} y1={MINI_MAIN_Y + 56} y2={MINI_PAT_Y} state={zState} draw={progress(f, K.zero + 12, 6)} mark={progress(f, K.zero + 22, 10)} opacity={1 - progress(f, K.step, 8)} />
        <Compare cx={rx} y1={MINI_MAIN_Y + 56} y2={MINI_PAT_Y} state={rState} draw={progress(f, K.fresh, 6)} mark={progress(f, K.fresh + 8, 10)} />
        <LittleI x={cellCX(1, mi.v, MG)} y={MINI_MAIN_Y - 6 - 85 - mi.lift} scale={0.6} face={f >= K.step + 10 ? "happy" : "normal"} squash={mi.land * 0.6} />
      </div>
    </AbsoluteFill>
  );
};
