// 第 1–5 镜：口诀开场 → 在 G4 上走第一遍（橙）→ 先挑大的再走一遍（蓝）→ 邻接表上走（绿）。
// 同一张图贯穿这五镜，只换布局；栈、visited、序列行都读 traverseAt 的状态。
import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_OUT, fadeIn, mix, progress } from "../base/anim";
import { FONT } from "../base/theme";
import { AdjListView, type NodeMark } from "../graph/AdjListView";
import { GraphView } from "../graph/GraphView";
import { Tag, Txt, VName, bump } from "../graph/Kit";
import { ArrayView, SeqRow, StackView } from "../graph/Structures";
import { G, RUN, applyXf, mixXf, tint } from "../graph/theme";
import { stackTop, traverseAt } from "../graph/traverse";
import { G4_LAYOUT, PANEL, XF_LIST, XF_MAIN } from "./layout";
import { K, LIST_STEP, OV_ASC, SCENE, T_ASC, T_DESC, T_LIST } from "./timeline";
import { ADJLIST, ALL_DFS_COUNT, G4, RUN_ASC, RUN_DESC, RUN_LIST } from "./trace.generated";

/** 左上角的常驻标签（第 1 镜口诀缩上去变成它） */
export const HEADER = { x: 60, y: 40 };

const Intro: React.FC<{ f: number }> = ({ f }) => {
  const tIn = fadeIn(f, 4, 18);
  const tOut = progress(f, K.titleOut, 14);
  const m = progress(f, K.motto, 10, EASE_OUT);
  const up = progress(f, K.mottoUp, 24, EASE_CAMERA);
  const size = mix(124, 40, up);
  // 口诀从画面中间缩到左上角标签里“DFS”后面
  const left = mix(960 - (7 * 124) / 2, HEADER.x + 112, up);
  const top = mix(400, HEADER.y + 2, up);
  const m2 = progress(f, K.motto2, 12) * (1 - progress(f, K.mottoUp, 10));
  return (
    <>
      {tOut < 1 ? (
        <>
          <Txt cx={960} y={360} size={104} weight={800} opacity={tIn * (1 - tOut)} dy={mix(20, 0, tIn) - tOut * 30}>
            图的深度优先遍历
          </Txt>
          <Txt cx={960} y={505} size={40} weight={500} color={G.ink2} opacity={tIn * (1 - tOut)} dy={-tOut * 30} font={FONT.sans}>
            Depth-First Search · DFS
          </Txt>
        </>
      ) : null}
      {m > 0 ? (
        <div
          style={{
            position: "absolute",
            left,
            top,
            fontFamily: FONT.sans,
            fontSize: size,
            fontWeight: 800,
            color: G.ink,
            whiteSpace: "nowrap",
            lineHeight: 1.2,
            opacity: m,
            transform: `scale(${mix(1.25, 1, m)})`,
            transformOrigin: "left center",
          }}
        >
          不撞南墙不回头
          <div style={{ height: mix(10, 4, up), marginTop: mix(6, 2, up), borderRadius: 6, background: RUN.orange, width: `${100 * progress(f, K.motto + 6, 14)}%` }} />
        </div>
      ) : null}
      <Txt cx={960} y={610} size={58} weight={600} color={G.ink2} opacity={m2} dy={mix(14, 0, progress(f, K.motto2, 14))}>
        一条道走到黑
      </Txt>
    </>
  );
};

/** 左上角“DFS”胶囊（口诀本体在 Intro 里，缩上来后紧挨着它） */
export const HeaderPill: React.FC<{ f: number; opacity?: number }> = ({ f, opacity = 1 }) => {
  const k = progress(f, K.mottoUp + 8, 14);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: HEADER.x, top: HEADER.y + 4, opacity: k * opacity }}>
      <Tag color={RUN.orange} solid size={30}>
        DFS
      </Tag>
    </div>
  );
};

/** 第 6 镜以后左上角的标签（口诀那几个字换成静态的） */
export const HeaderStatic: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div style={{ position: "absolute", left: 0, top: 0, opacity }}>
    <div style={{ position: "absolute", left: HEADER.x, top: HEADER.y + 4 }}>
      <Tag color={RUN.orange} solid size={30}>
        DFS
      </Tag>
    </div>
    <div style={{ position: "absolute", left: HEADER.x + 112, top: HEADER.y + 2, fontFamily: FONT.sans, fontSize: 40, fontWeight: 800, color: G.ink, lineHeight: 1.2, whiteSpace: "nowrap" }}>
      不撞南墙不回头
      <div style={{ height: 4, marginTop: 2, borderRadius: 6, background: RUN.orange }} />
    </div>
  </div>
);

export const MainStage: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= SCENE.s6 + 16) return null;
  const out = 1 - progress(f, SCENE.s6, 14);

  // 三遍遍历的状态
  const stA = traverseAt(f, RUN_ASC, T_ASC, { color: RUN.orange, overrides: OV_ASC, showPointerAt: K.ptrShow, resetAt: K.reset1 });
  const stB = traverseAt(f, RUN_DESC, T_DESC, { color: RUN.blue, move: 9, back: 9, resetAt: K.toList });
  const stC = traverseAt(f, RUN_LIST, T_LIST, { color: RUN.green, move: LIST_STEP, back: LIST_STEP, probe: LIST_STEP });
  const runB = f >= K.reset1 + 20;
  const runC = f >= K.toList;
  const active = runC ? stC : runB ? stB : stA;

  // 布局：第 5 镜图缩到左边
  const toL = progress(f, K.toList, 26, EASE_CAMERA);
  const xf = mixXf(XF_MAIN, XF_LIST, toL);

  // 候选边、撞南墙、栈顶 = 现在的位置
  const cand = progress(f, K.cand, 10) * (1 - progress(f, K.candEnd, 10));
  const rowV2 = progress(f, K.rowV2, 10) * (1 - progress(f, K.rowV2End, 10));
  const glow = [
    { a: 1, b: 2, color: tint(RUN.orange, 0.55), k: cand, width: 18 },
    { a: 1, b: 3, color: tint(RUN.orange, 0.55), k: cand, width: 18 },
    { a: 2, b: 1, color: tint(RUN.green, 0.6), k: rowV2, width: 18 },
    { a: 2, b: 4, color: tint(RUN.green, 0.6), k: rowV2, width: 18 },
    { a: 2, b: 5, color: tint(RUN.green, 0.6), k: rowV2, width: 18 },
  ];
  const rings = [
    { v: 5, color: G.bad, k: progress(f, K.wall, 34) },
    { v: 5, color: G.bad, k: progress(f, K.wall + 10, 34) },
    { v: 5, color: G.bad, k: progress(f, K.wall + 20, 34) },
  ];
  const wallK = progress(f, K.wall, 6) * (1 - progress(f, T_ASC[10] as number, 10));
  const link = progress(f, K.topLink, 12) * (1 - progress(f, K.topLinkEnd, 10));
  const linkPulse = bump(f, K.topLink, 30) + bump(f, K.popMeansBack, 30);
  const backArrow = progress(f, K.popMeansBack + 4, 14) * (1 - progress(f, T_ASC[11] as number, 6));

  const flash: Record<number, number> = {};
  for (let v = 1; v <= 8; v++) flash[v] = bump(f, K.flashAll + (v - 1) * 5, 16);
  flash[8] = Math.max(flash[8], link > 0 ? linkPulse : 0);

  // 面板
  const visIn = progress(f, K.visitedIn, 16, EASE_OUT);
  const stackIn = progress(f, K.stackIn, 16, EASE_OUT);
  const vp = PANEL.visited;
  const vl = PANEL.visitedList;
  const vx = mix(vp.x, vl.x, toL) + (1 - visIn) * 60;
  const vy = mix(vp.y, vl.y, toL);
  const vcell = mix(vp.cell, vl.cell, toL);
  const vgap = mix(vp.gap, vl.gap, toL);
  const st = PANEL.stack;
  const stackOpacity = stackIn * (1 - progress(f, K.toList, 12));

  // 栈顶 ↔ 图上顶点的虚线（第 3 镜 s3h）
  const top = stackTop(stA.stack);
  const topY = top ? st.yBottom - 6 - (top.depth + 1) * (st.h + st.gap) + st.gap + st.h / 2 : 0;
  const v8 = applyXf(G4_LAYOUT[8], xf);

  // 序列行
  const sq = PANEL.seq;
  const seqTitle = progress(f, K.stackIn + 10, 14);
  const rowLabel = (i: number) => progress(f, i === 0 ? (T_ASC[0] as number) : i === 1 ? K.reset1 + 10 : K.toList + 20, 12);
  const ok = progress(f, K.bothOk, 10);
  const same = progress(f, K.same, 10);
  const samePulse = (i: number) => bump(f, K.same + i * 2, 18);
  const row2Pulse = (i: number) => bump(f, K.revRow2 + 10 + i * 2, 18);
  const s3mPulse = (i: number) => bump(f, K.seqPulse[i], 14);
  const count8 = progress(f, K.count8, 12) * (1 - progress(f, K.toList, 10));

  // 邻接表：扫描标记、扫描框、当前行
  const marks: Record<string, NodeMark> = {};
  let cursor: { u: number; k: number; vis: number } | null = null;
  let curRow = 0;
  const marksFade = 1 - progress(f, K.revOn, 8);
  RUN_LIST.forEach((ev, i) => {
    const T = T_LIST[i] as number;
    if (f < T) return;
    if ((ev.t === "visit" || ev.t === "check") && ev.from !== null && ev.arc !== null) {
      marks[`${ev.from}-${ev.arc}`] = { type: ev.t === "visit" ? "go" : "skip", k: progress(f, T, 5) * marksFade };
      cursor = { u: ev.from, k: ev.arc, vis: 1 - progress(f, T + LIST_STEP * 2, 5) };
    }
    curRow = ev.stack.length ? ev.stack[ev.stack.length - 1] : 0;
  });
  const lastT = T_LIST[T_LIST.length - 1] as number;
  const rowHi: Record<number, number> = {};
  if (curRow && f < lastT + 8) rowHi[curRow] = 0.55;
  rowHi[2] = Math.max(rowHi[2] ?? 0, rowV2);
  const rev = progress(f, K.revOn + 8, 20, EASE_CAMERA) * (1 - progress(f, K.revOff, 20, EASE_CAMERA));
  const adjIn = progress(f, K.toList + 6, 16);
  const tagK = progress(f, K.revOff + 10, 14);
  const examPulse = bump(f, K.exam, 20);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <Intro f={f} />
      <HeaderPill f={f} />
      {f >= K.graphIn ? (
        <GraphView
          f={f}
          layout={G4_LAYOUT}
          edges={G4.edges}
          xf={xf}
          drawAt={K.graphIn}
          states={[stA, stB, stC]}
          flash={flash}
          glow={glow}
          rings={rings}
          arrows={[{ a: 8, b: 4, color: G.ink2, k: backArrow, dashed: true }]}
        />
      ) : null}
      {/* 图注 */}
      <Txt x={590} y={790} size={24} color={G.ink3} opacity={progress(f, K.caption, 14) * (1 - toL)}>
        教材图7.13 · 无向图<VName v={4} letter="G" />
      </Txt>
      {/* 栈顶 ↔ 现在所在顶点 */}
      {link > 0.001 && top ? (
        <svg style={{ position: "absolute", left: 0, top: 0, opacity: link }} width={1920} height={1080}>
          <line x1={st.x - 100} y1={topY} x2={v8.x + 56} y2={v8.y - 8} stroke={G.ink2} strokeWidth={3.5} strokeDasharray="12 10" strokeLinecap="round" />
        </svg>
      ) : null}
      {/* visited */}
      <ArrayView x={vx} y={vy} n={8} cell={vcell} gap={vgap} cells={active.cells} color={active.color} opacity={visIn} />
      {/* 递归栈 */}
      {stackOpacity > 0.001 ? (
        <StackView
          x={st.x}
          yBottom={st.yBottom}
          w={st.w}
          h={st.h}
          gap={st.gap}
          cap={st.cap}
          items={(runB ? stB : stA).stack}
          color={runB ? RUN.blue : RUN.orange}
          opacity={stackOpacity}
          topFlash={{ k: wallK, color: G.bad }}
          topPulse={link > 0 ? linkPulse : 0}
        />
      ) : null}
      {/* 访问序列 */}
      <Txt x={sq.x} y={sq.titleY} size={28} weight={700} color={G.ink2} opacity={seqTitle}>
        访问序列
      </Txt>
      <SeqRow
        f={f}
        x={sq.x}
        y={sq.rowY}
        items={stA.seq}
        color={RUN.orange}
        label={
          <span style={{ opacity: rowLabel(0) }}>
            ① 先挑编号小的 <span style={{ color: G.good, opacity: ok }}>✓</span>
          </span>
        }
        pulse={(i) => Math.max(s3mPulse(i), samePulse(i))}
      />
      <SeqRow
        f={f}
        x={sq.x}
        y={sq.rowY + sq.rowStep}
        items={stB.seq}
        color={RUN.blue}
        label={
          <span style={{ opacity: rowLabel(1) }}>
            ② 先挑编号大的 <span style={{ color: G.good, opacity: ok }}>✓</span>
          </span>
        }
        pulse={row2Pulse}
      />
      <SeqRow
        f={f}
        x={sq.x}
        y={sq.rowY + 2 * sq.rowStep}
        items={stC.seq}
        color={RUN.green}
        label={
          <span style={{ opacity: rowLabel(2) }}>
            ③ 按邻接表 <span style={{ opacity: same }}>＝ ①</span>
          </span>
        }
        pulse={samePulse}
      />
      <div style={{ position: "absolute", left: sq.x, top: sq.rowY + 2 * sq.rowStep - 30, opacity: count8 }}>
        <Tag color={RUN.blue} size={26}>
          从<VName v={1} />出发，DFS序列共{ALL_DFS_COUNT}种
        </Tag>
      </div>
      {/* 邻接表 */}
      {adjIn > 0.001 ? (
        <AdjListView
          f={f}
          x={PANEL.adj.x}
          y={PANEL.adj.y}
          rowH={PANEL.adj.rowH}
          cellH={PANEL.adj.cellH}
          lists={ADJLIST}
          color={RUN.green}
          opacity={adjIn}
          buildAt={K.listBuild}
          marks={marks}
          cursor={cursor}
          rowHi={rowHi}
          subLabels={progress(f, K.rowV2 + 8, 12)}
          rev={rev}
          frame={{ k: tagK, color: RUN.green }}
        />
      ) : null}
      <div style={{ position: "absolute", left: sq.x, top: 214, opacity: tagK, transform: `scale(${1 + 0.08 * examPulse})`, transformOrigin: "left center" }}>
        <Tag color={RUN.green} solid size={30}>
          邻接表给定 → 序列唯一
        </Tag>
      </div>
    </div>
  );
};
