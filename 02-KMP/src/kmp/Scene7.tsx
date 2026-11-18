// 第 7 镜：手推 nextval。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[6].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_7（绝对帧），由 KMP.tsx 汇总。
//
// 画面：从第 6 镜的匹配双排布局过渡（主串淡出、模式串放大上移，next / nextval 两排跟着变大），小 i 回左上角托腮。
// nextval[1] 先写 0；每一位 j 的固定动作：从 p_j 画弧线指向 p_next[j]，
//   不同 → 弧线变蓝（≠），next[j] 的数往下抄进 nextval[j]（snap）；
//   相同 → 弧线变橙（=），两字母一起闪 + "撞"一下，从被指那位的 nextval 格抄过来（pop）。
// 顺序：s7a 用 j = 2 演示"不同"（j = 5 要抄 nextval[2]，所以 j = 2 必须先填）；s7b 三个"相同"（3、5、7）；
// s7c 其余 4、6、8 快放，p8 多停半拍（小字"不同 → 照抄 2"）；整排闪 + 印章"nextval ✓"。第 8 镜接着把两排缩到右上角存档。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_IN, hopLift, mix, progress, springy } from "../base/anim";
import { L } from "../base/paper";
import { FONT, mixColor } from "../base/theme";
import type { Sfx } from "../components/Narration";
import { Card, Stamp } from "../components/PaperKit";
import { NEXT, NEXTVAL_STEPS, NV_MAIN, PAT } from "./data";
import { Burst, FROM_6, HandI, NoteChip, NumCell, PERCH, PointArc, RowLabel, colCX, colX, geoMix, pulse, win } from "./HandKit";
import { StringRow, type CellWeights } from "./StringRow";
import { H, M, littleIPos } from "./layout";
import { SCENES, p } from "./timeline";

const S = SCENES[6];
const END = S.from + S.dur;
const MORPH = 30;

// ───────────────────────── 时间点 ─────────────────────────
const T = {
  in: S.from,
  v1: S.from + MORPH + 4, // nextval[1] = 0
  diff: p("s7a", "不同抄 next"),
  same: p("s7a", "相同抄那位的"),
  rest: p("s7c", "其余照抄"),
  read: p("s7c", "零一零二一三零二"),
};

type Ev = { j: number; arc: number; decide: number; copy: number };
const ARC_DRAW = 14;
const COPY_DUR = 14;

/** 每一位：arc = 开始画弧线，decide = 判定（变色 + 标记），copy = 数字开始飞 */
const EVENTS: Ev[] = [
  { j: 2, arc: T.v1 + 14, decide: T.diff, copy: T.diff + 8 },
  { j: 3, arc: p("s7b", "第三位 a 撞上") + 2, decide: p("s7b", "第三位 a 撞上") + 26, copy: p("s7b", "抄零；") },
  { j: 5, arc: p("s7b", "第五位 b 撞上") + 2, decide: p("s7b", "第五位 b 撞上") + 24, copy: p("s7b", "抄一") },
  { j: 7, arc: p("s7b", "第七位 a 撞上") + 2, decide: p("s7b", "第七位 a 撞上") + 26, copy: p("s7b", "抄零。") },
  { j: 4, arc: T.rest, decide: T.rest + 8, copy: T.rest + 12 },
  { j: 6, arc: T.rest + 14, decide: T.rest + 22, copy: T.rest + 26 },
  { j: 8, arc: T.rest + 28, decide: T.rest + 38, copy: T.rest + 44 }, // p8 多停半拍
];
// 依赖检查：相同时要抄的 nextval[k] 必须已经写好
for (const e of EVENTS) {
  const st = NEXTVAL_STEPS[e.j - 1];
  if (st.same) {
    const src = st.k === 1 ? T.v1 : EVENTS.find((x) => x.j === st.k)!.copy + COPY_DUR;
    if (src > e.copy) throw new Error(`Scene7：j = ${e.j} 要抄 nextval[${st.k}]，但它还没写好`);
  }
}
const evOf = (j: number) => EVENTS.find((e) => e.j === j);
/** 每个事件可见到下一个事件开始（按时间排序） */
const SORTED = [...EVENTS].sort((a, b) => a.arc - b.arc);
const evEnd = (e: Ev): number => {
  const k = SORTED.indexOf(e);
  return k + 1 < SORTED.length ? SORTED[k + 1].arc + 2 : T.read - 4;
};
const landAt = (j: number): number => (j === 1 ? T.v1 : evOf(j)!.copy + COPY_DUR);

const E8 = evOf(8)!;
const NOTE8 = { from: E8.decide + 4, to: T.read - 2 };
const SEAL = T.read + PAT.length * 6 + 6;
/** 印章时刻（小 i 从这一帧起鼓掌；第 8 镜开头接着拍，节奏对齐） */
export const S7_SEAL = SEAL;

// ───────────────────────── 音效 ─────────────────────────
export const SFX_7: Sfx[] = [
  { at: T.in + 2, src: "whoosh", vol: 0.2 },
  { at: T.v1, src: "pop", vol: 0.16 },
  ...EVENTS.map((e) =>
    NEXTVAL_STEPS[e.j - 1].same ? { at: e.copy + COPY_DUR, src: "pop", vol: 0.2 } : { at: e.copy + COPY_DUR, src: "snap", vol: 0.18 },
  ),
  // "撞"一下
  ...EVENTS.filter((e) => NEXTVAL_STEPS[e.j - 1].same).map((e) => ({ at: e.decide, src: "tick", vol: 0.2 })),
  { at: SEAL, src: "stamp", vol: 0.26 },
];

// ───────────────────────── 画面 ─────────────────────────
const ARC_Y = H.jLabelY - 18; // 弧线两端：j 号上方

export const Scene7: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= END) return null;

  const mt = progress(f, T.in, MORPH, EASE_CAMERA);
  const g = geoMix(FROM_6.h, mt);
  const patY = mix(M.patY, H.patY, mt);
  const nextY = mix(M.nextY, H.nextY, mt);
  const nvY = mix(M.nextvalY, H.nextvalY, mt);
  const rowH = mix(M.nextH, H.nextH, mt);
  const numSize = mix(M.numSize, H.numSize, mt);
  const letter = mix(M.letterSize, H.letterSize, mt);
  const mainA = 1 - progress(f, T.in, 14); // 先快后慢：模式串上移时主串已基本淡掉
  const labelGap = mix(18, 26, mt);

  // 当前事件
  let cur: Ev | undefined;
  for (const e of SORTED) if (f >= e.arc) cur = e;
  if (cur && f >= evEnd(cur)) cur = undefined;

  // 模式串外观：当前 p_j 焦点；相同时被指那位一起闪
  const lookOf = (j: number): CellWeights => {
    let focus = 0;
    let dy = 0;
    for (const e of EVENTS) {
      const st = NEXTVAL_STEPS[e.j - 1];
      const w = win(f, e.arc, evEnd(e), 6, 8);
      if (w <= 0.001) continue;
      if (j === e.j) focus = Math.max(focus, w);
      if (st.same && (j === e.j || j === st.k)) {
        focus = Math.max(focus, w * pulse(f, e.decide, 20));
        dy -= hopLift(f, e.decide, 12, 14);
      }
    }
    return { focus, dy };
  };

  // 小 i
  const from = littleIPos(FROM_6.i);
  const fly = progress(f, T.in + 4, 26, EASE_CAMERA);
  const ix = mix(from.x, PERCH.x, fly);
  const iy = mix(from.y, PERCH.y, fly) - hopLift(f, T.in + 4, 26, 60);
  const isc = mix(1, PERCH.scale, fly);
  const curCX = cur ? colCX(g, cur.j) : colCX(g, 4);
  const lookX = Math.max(-1, Math.min(1, (curCX - ix) / 700));
  const done = f >= SEAL;

  // 卡片：规则两行
  const cardA = progress(f, T.diff - 6, 12);
  const curSame = cur ? NEXTVAL_STEPS[cur.j - 1].same : false;
  // s7a：先亮"不同"，念到"相同"时亮第二行；之后跟着当前这位是哪种情况走；最后两行都亮
  const inEv = cur !== undefined && cur.j !== 2;
  const line1On = f < T.same ? 1 : inEv ? (curSame ? 0 : 1) : f >= T.read - 4 ? 1 : 0;
  const line2On = inEv ? (curSame ? 1 : 0) : 1;

  return (
    <AbsoluteFill>
      {/* 第 6 镜留下的主串：淡出上移 */}
      {mainA > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${mix(0, -40, 1 - mainA)}px)` }}>
          <StringRow text={NV_MAIN} kind="main" y={M.mainY} label="S" index={{ y: M.idxY }} opacity={mainA} />
        </div>
      ) : null}

      {/* j 号 */}
      {Array.from({ length: PAT.length }, (_, k) => {
        const j = k + 1;
        const on = cur?.j === j ? win(f, cur.arc, evEnd(cur), 6, 6) : 0;
        return (
          <div
            key={`j${j}`}
            style={{
              position: "absolute",
              left: colX(g, j),
              width: g.cell,
              top: H.jLabelY - 6,
              textAlign: "center",
              fontFamily: FONT.sans,
              fontSize: 32 + 6 * on,
              fontWeight: on > 0.5 ? 700 : 500,
              color: mixColor(L.ink3, L.accent, on),
              opacity: progress(f, T.in + 18, 12),
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {j}
          </div>
        );
      })}

      <StringRow text={PAT} kind="pattern" y={patY} geo={g} looks={lookOf} letterSize={letter} label="T" labelGap={labelGap} />

      {/* next 一排（已填好） */}
      <RowLabel right={colX(g, 1) - labelGap} y={nextY} hgt={rowH} size={Math.round(numSize * 0.78)}>
        next
      </RowLabel>
      {NEXT.map((v, k) => {
        const j = k + 1;
        const e = evOf(j);
        const st = NEXTVAL_STEPS[k];
        // 当前这位：next[j] 指向谁（弧线期间描边）；不同时它的数往下抄
        const focus = e ? win(f, e.arc, e.copy + COPY_DUR + 6, 6, 8) * (st.same ? 0.55 : 1) : 0;
        return <NumCell key={`n${j}`} x={colX(g, j)} y={nextY} w={g.cell} hgt={rowH} v={v} size={numSize} look={{ focus }} />;
      })}

      {/* nextval 一排 */}
      <RowLabel right={colX(g, 1) - labelGap} y={nvY} hgt={rowH} size={Math.round(numSize * 0.78)}>
        nextval
      </RowLabel>
      {NEXTVAL_STEPS.map((st, k) => {
        const j = k + 1;
        const land = landAt(j);
        const e = evOf(j);
        const has = f >= land;
        let focus = e ? win(f, e.arc, Math.min(evEnd(e), land + 16), 6, 8) : 0;
        // 相同时：被指那位的 nextval 格亮一下（数从这里抄过去）
        for (const q of EVENTS) {
          const sq = NEXTVAL_STEPS[q.j - 1];
          if (sq.same && sq.k === j) focus = Math.max(focus, win(f, q.decide, Math.min(q.copy + COPY_DUR + 4, evEnd(q)), 6, 6));
        }
        const rf = pulse(f, T.read + k * 6, 16);
        // 第 6 镜留下的 nextval[5]（如果有）淡掉
        const ghost = j === 5 && !has ? 1 - progress(f, T.in, 12, EASE_IN) : 0;
        const v: React.ReactNode | null = has ? st.value : ghost > 0.01 ? <span style={{ opacity: ghost }}>{NEXTVAL_STEPS[4].value}</span> : null;
        return (
          <NumCell
            key={`v${j}`}
            x={colX(g, j)}
            y={nvY}
            w={g.cell}
            hgt={rowH}
            v={v}
            size={numSize}
            look={has ? { focus, matched: rf * 0.85 } : { dim: ghost > 0.01 ? 0 : 0.55, focus }}
            stamp={has ? springy(f, land, 10) : 1}
            ink={has ? mixColor(L.accentDeep, L.ink, progress(f, land + 24, 16)) : undefined}
          />
        );
      })}

      {/* 弧线：p_j → p_next[j] */}
      {EVENTS.map((e) => {
        const st = NEXTVAL_STEPS[e.j - 1];
        const a = win(f, e.arc, evEnd(e), 4, 10);
        if (a <= 0.001) return null;
        const dec = progress(f, e.decide, 8);
        const col = mixColor(L.ink3, st.same ? L.accent : L.blue, dec);
        return (
          <React.Fragment key={`a${e.j}`}>
            <PointArc
              x1={colCX(g, e.j)}
              x2={colCX(g, st.k)}
              y={ARC_Y}
              draw={progress(f, e.arc, ARC_DRAW)}
              color={col}
              opacity={a}
              mark={progress(f, e.decide, 10)}
              markKind={st.same ? "eq" : "ne"}
            />
            {st.same ? (
              <>
                <Burst cx={colCX(g, e.j)} cy={patY + 10} p={progress(f, e.decide, 16, (x) => x)} />
                <Burst cx={colCX(g, st.k)} cy={patY + 10} p={progress(f, e.decide, 16, (x) => x)} />
              </>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* 飞行的数字：不同 → 从 next[j] 往下；相同 → 从 nextval[k] 横着抄过来 */}
      {EVENTS.map((e) => {
        const st = NEXTVAL_STEPS[e.j - 1];
        const t = progress(f, e.copy, COPY_DUR, EASE_CAMERA);
        if (f < e.copy || t >= 1) return null;
        const x1 = colCX(g, st.same ? st.k : e.j);
        const y1 = (st.same ? nvY : nextY) + rowH / 2;
        const x2 = colCX(g, e.j);
        const y2 = nvY + rowH / 2;
        const x = mix(x1, x2, t);
        const y = mix(y1, y2, t) + (st.same ? Math.sin(Math.PI * t) * 62 : 0);
        return (
          <div
            key={`fly${e.j}`}
            style={{
              position: "absolute",
              left: x - 40,
              top: y - 34,
              width: 80,
              height: 68,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT.sans,
              fontWeight: 800,
              fontSize: numSize * 1.1,
              color: st.same ? L.accentDeep : L.blue,
              textShadow: "0 2px 0 #FFFFFF, 0 0 10px #FFFFFF",
              zIndex: 55,
            }}
          >
            {st.value}
          </div>
        );
      })}

      {/* p8：多停半拍 */}
      <NoteChip x={colX(g, PAT.length) + g.cell + 22} y={H.nextvalY + 14} p={win(f, NOTE8.from, NOTE8.to, 10, 10)} size={44} color={L.blue}>
        不同 → 照抄 {NEXT[PAT.length - 1]}
      </NoteChip>

      {/* 规则卡 */}
      <RuleCard opacity={cardA} dy={mix(16, 0, cardA)} line1On={line1On} line2On={line2On} line2Appear={progress(f, T.same - 4, 10)} />

      {/* 印章 */}
      <NvSeal p={progress(f, SEAL, 10)} />

      <HandI
        x={ix}
        y={iy}
        scale={isc}
        face={done ? "happy" : "normal"}
        pose={fly < 1 ? "none" : done ? "clap" : "chin"}
        beat={done ? (f - SEAL) / 8 : 0}
        rotate={fly < 1 || done ? 0 : 7}
        lookX={fly < 1 || done ? 0 : lookX}
        lookY={fly < 1 || done ? 0 : 0.8}
        squash={0.5 * pulse(f, T.in + 28, 8)}
      />
    </AbsoluteFill>
  );
};

/** 规则卡（两行） */
const RuleCard: React.FC<{ opacity: number; dy?: number; line1On: number; line2On: number; line2Appear: number }> = ({ opacity, dy = 0, line1On, line2On, line2Appear }) =>
  opacity <= 0.001 ? null : (
    <Card x={210} y={668} w={1500} h={232} opacity={opacity} dy={dy}>
      <RuleLine top={20} on={line1On} tag="不同" tagColor={L.blue} appear={1}>
        nextval[j] = next[j]
      </RuleLine>
      <RuleLine top={118} on={line2On} tag="相同" tagColor={L.accent} appear={line2Appear}>
        nextval[j] = nextval[next[j]]
      </RuleLine>
    </Card>
  );

/** 印章"nextval ✓"（缩 0.8，放在 nextval 排右边） */
const NvSeal: React.FC<{ p: number; opacity?: number }> = ({ p: pp, opacity = 1 }) =>
  pp <= 0.001 || opacity <= 0.001 ? null : (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "1690px 575px", transform: "scale(0.8)", zIndex: 30, opacity }}>
      <Stamp cx={1690} cy={575} p={pp}>
        <span style={{ whiteSpace: "nowrap" }}>nextval ✓</span>
      </Stamp>
    </div>
  );

/** 第 7 镜结束时留在画面上的规则卡 + 印章：第 8 镜开头用它淡出（避免硬切） */
export const S7Leftover: React.FC<{ opacity: number }> = ({ opacity }) => (
  <>
    <RuleCard opacity={opacity} line1On={1} line2On={1} line2Appear={1} />
    <NvSeal p={1} opacity={opacity} />
  </>
);

/** 规则卡的一行：左边色块标签 + 公式；on 0..1 = 是否当前这条 */
const RuleLine: React.FC<{ top: number; on: number; tag: string; tagColor: string; appear: number; children: React.ReactNode }> = ({
  top,
  on,
  tag,
  tagColor,
  appear,
  children,
}) =>
  appear <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: 40,
        top,
        height: 96,
        display: "flex",
        alignItems: "center",
        gap: 28,
        opacity: appear * (0.4 + 0.6 * on),
        transform: `translateX(${mix(-20, 0, appear)}px)`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-block",
          padding: "4px 18px 6px",
          borderRadius: 14,
          background: tagColor,
          color: "#FFFFFF",
          fontFamily: FONT.sans,
          fontWeight: 700,
          fontSize: 48,
          lineHeight: 1.2,
        }}
      >
        {tag}
      </span>
      <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 72, color: L.ink, lineHeight: 1.2 }}>{children}</span>
    </div>
  );
