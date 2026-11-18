// 第 1–5 镜：口诀开场 → 一层层出来（套框分层）→ 框变成队列，从头走一遍（橙）→ 先挑大的再走一遍（蓝）→ 邻接表上走（绿）。
// 同一张 G4 贯穿这五镜，只换布局；队列、visited、序列行都读 bfsAt 的状态。
import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_OUT, fadeIn, mix, progress } from "../base/anim";
import { FONT } from "../base/theme";
import { AdjListView, type NodeMark } from "../graph/AdjListView";
import { bfsAt, litState } from "../graph/bfs";
import { GraphView } from "../graph/GraphView";
import { Pill, Tag, Txt, VName, bump } from "../graph/Kit";
import { ArrayView, QueueView, SeqRow, type QueueIt } from "../graph/Structures";
import { G, RUN, applyXf, deep, mixXf, tint, type Xf } from "../graph/theme";
import { BANDS, G4_LAYOUT, PANEL, XF_LIST, XF_MAIN, layerRowX } from "./layout";
import { DESC_MOVE, K, LAYER_BOX, LAYER_ITEMS, LIST_START, LIST_STEP, OV_ASC, SCENE, T_ASC, T_DESC, T_LIST } from "./timeline";
import { ADJLIST, ALL_BFS_COUNT, G4, LAYERS, RUN_ASC, RUN_DESC, RUN_LIST } from "./trace.generated";

/** 左上角的常驻标签（第 1 镜口诀缩上去变成它） */
export const HEADER = { x: 60, y: 40 };
const BRAND = RUN.blue;

const Intro: React.FC<{ f: number }> = ({ f }) => {
  const tIn = fadeIn(f, 4, 18);
  const tOut = progress(f, K.titleOut, 14);
  const m = progress(f, K.motto, 10, EASE_OUT);
  const up = progress(f, K.mottoUp, 24, EASE_CAMERA);
  const size = mix(124, 40, up);
  const left = mix(960 - (4 * 124) / 2, HEADER.x + 112, up);
  const top = mix(400, HEADER.y + 2, up);
  return (
    <>
      {tOut < 1 ? (
        <>
          <Txt cx={960} y={360} size={104} weight={800} opacity={tIn * (1 - tOut)} dy={mix(20, 0, tIn) - tOut * 30}>
            图的广度优先遍历
          </Txt>
          <Txt cx={960} y={505} size={40} weight={500} color={G.ink2} opacity={tIn * (1 - tOut)} dy={-tOut * 30} font={FONT.sans}>
            Breadth-First Search · BFS
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
          层层扩散
          <div style={{ height: mix(10, 4, up), marginTop: mix(6, 2, up), borderRadius: 6, background: BRAND, width: `${100 * progress(f, K.motto + 6, 14)}%` }} />
        </div>
      ) : null}
    </>
  );
};

/** 左上角“BFS”胶囊（口诀本体在 Intro 里，缩上来后紧挨着它） */
const HeaderPill: React.FC<{ f: number }> = ({ f }) => {
  const k = progress(f, K.mottoUp + 8, 14);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: HEADER.x, top: HEADER.y + 4, opacity: k }}>
      <Tag color={BRAND} solid size={30}>
        BFS
      </Tag>
    </div>
  );
};

/** 第 6 镜以后左上角的标签（口诀那几个字换成静态的） */
export const HeaderStatic: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div style={{ position: "absolute", left: 0, top: 0, opacity }}>
    <div style={{ position: "absolute", left: HEADER.x, top: HEADER.y + 4 }}>
      <Tag color={BRAND} solid size={30}>
        BFS
      </Tag>
    </div>
    <div style={{ position: "absolute", left: HEADER.x + 112, top: HEADER.y + 2, fontFamily: FONT.sans, fontSize: 40, fontWeight: 800, color: G.ink, lineHeight: 1.2, whiteSpace: "nowrap" }}>
      层层扩散
      <div style={{ height: 4, marginTop: 2, borderRadius: 6, background: BRAND }} />
    </div>
  </div>
);

/** 图背后的层带：k[i] = 第 i 层带的透明度，hi[i] = 额外加深（0..1） */
export const LayerBands: React.FC<{ xf: Xf; k: number[]; hi?: number[]; labels?: number }> = ({ xf, k, hi = [], labels = 1 }) => (
  <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
    {BANDS.ys.map((y, i) => {
      const a = k[i] ?? 0;
      if (a <= 0.001) return null;
      const h = hi[i] ?? 0;
      const A = applyXf({ x: BANDS.x0, y: y - BANDS.h / 2 }, xf);
      const B = applyXf({ x: BANDS.x1, y: y + BANDS.h / 2 }, xf);
      const L = applyXf({ x: BANDS.labelX, y }, xf);
      return (
        <g key={i} opacity={a}>
          <rect
            x={A.x}
            y={A.y}
            width={B.x - A.x}
            height={B.y - A.y}
            rx={(BANDS.h / 2) * xf.s}
            fill={`rgba(85, 91, 107, ${0.055 + 0.08 * h})`}
            stroke={`rgba(85, 91, 107, ${0.3 + 0.45 * h})`}
            strokeWidth={2.5 + 2 * h}
            strokeDasharray="12 9"
            transform={`translate(${(A.x + B.x) / 2} ${(A.y + B.y) / 2}) scale(${mix(0.96, 1, a)}) translate(${-(A.x + B.x) / 2} ${-(A.y + B.y) / 2})`}
          />
          <text x={L.x} y={L.y} dominantBaseline="central" fill={G.ink2} opacity={labels} style={{ fontFamily: FONT.sans, fontSize: 26 * Math.max(xf.s, 0.85), fontWeight: 700 }}>
            第{i}层
          </text>
        </g>
      );
    })}
  </svg>
);

/** 序列行下面按组画的括号 + 小字 */
const Brackets: React.FC<{ x: number; y: number; size: number; gap: number; groups: { from: number; n: number; label: React.ReactNode; color: string; k: number }[] }> = ({ x, y, size, gap, groups }) => (
  <div style={{ position: "absolute", left: 0, top: 0 }}>
    {groups.map((g, i) => {
      if (g.k <= 0.001) return null;
      const left = x + g.from * (size + gap) + 3;
      const w = g.n * (size + gap) - gap - 6;
      return (
        <div key={i} style={{ position: "absolute", left, top: y, width: w, opacity: g.k }}>
          <div style={{ height: 10, borderLeft: `3px solid ${g.color}`, borderRight: `3px solid ${g.color}`, borderBottom: `3px solid ${g.color}`, borderRadius: "0 0 6px 6px" }} />
          <div style={{ textAlign: "center", fontFamily: FONT.sans, fontSize: 22, fontWeight: 700, color: deep(g.color, 0.1), whiteSpace: "nowrap", marginTop: 3 }}>{g.label}</div>
        </div>
      );
    })}
  </div>
);

export const MainStage: React.FC = () => {
  const f = useCurrentFrame();
  if (f >= SCENE.s6 + 16) return null;
  const out = 1 - progress(f, SCENE.s6, 14);

  // 四遍状态：分层（只点亮）、先挑小的、先挑大的、按邻接表
  const stL = litState(f, LAYER_ITEMS, RUN.orange, { fadeAt: K.reset0 });
  const stA = bfsAt(f, RUN_ASC, T_ASC, { color: RUN.orange, overrides: OV_ASC, resetAt: K.reset1 });
  const stB = bfsAt(f, RUN_DESC, T_DESC, { color: RUN.blue, move: DESC_MOVE, resetAt: K.toList });
  const stC = bfsAt(f, RUN_LIST, T_LIST, { color: RUN.green, move: LIST_STEP, probe: LIST_STEP + 2 });
  const runB = f >= K.reset1 + 20;
  const runC = f >= K.toList;
  const active = runC ? stC : runB ? stB : stA;

  // 布局：第 5 镜图缩到左边
  const toL = progress(f, K.toList, 26, EASE_CAMERA);
  const xf = mixXf(XF_MAIN, XF_LIST, toL);

  // ---------------- 层带（第 2 镜；第 3 镜“正好是第 2 层”时闪一下）
  const bandsOff = 1 - progress(f, K.reset0, 16);
  const qL2 = progress(f, K.qLayer2, 10) * (1 - progress(f, K.qLayer2End, 12));
  const bandK = LAYER_BOX.map((t, i) => Math.max(progress(f, t, 12, EASE_OUT) * bandsOff, i === 2 ? qL2 : 0));
  const allPulse = bump(f, K.allLayers, 22);
  const bandHi = [0, 1, 2, 3].map((i) => Math.max(allPulse, bump(f, LAYER_BOX[i], 20), i === 2 ? qL2 : 0));

  // ---------------- 第 1 镜：石子 + 水波
  const P1 = applyXf(G4_LAYOUT[1], xf);
  const stoneK = progress(f, K.stone, 10, (t) => t * t);
  const stoneVis = f >= K.stone && f < K.stone + 12 ? 1 : 0;
  const ripples = [0, 14, 28].map((d) => progress(f, K.ripple + d, 56, (t) => 1 - (1 - t) * (1 - t)));

  // ---------------- 第 2 镜：分层行（散字 → 套框），第 3 镜框变成队列管
  const groups = LAYERS.map((L) => L.length);
  const rowX = layerRowX(groups);
  const lr = PANEL.layerRow;
  const q = PANEL.queue;
  const morph = progress(f, K.morph, 26, EASE_CAMERA);
  const pillsOut = progress(f, K.morph, 12);
  const tubeRect = { x: q.x - 6, y: q.y - 8, w: q.cap * (q.cell + q.gap) + q.gap + 6, h: q.cell + 16 };
  const flat = LAYERS.flat();
  let gi0 = 0;
  const boxes = LAYERS.map((L, g) => {
    const a = rowX[gi0];
    const bx = rowX[gi0 + L.length - 1] + lr.cell;
    gi0 += L.length;
    return { g, x: a - 10, w: bx - a + 20, k: progress(f, LAYER_BOX[g], 10, EASE_OUT) };
  });
  const rowVis = f < K.morph + 30;

  // ---------------- 面板
  const panelIn = progress(f, K.panelIn, 16, EASE_OUT);
  const vp = PANEL.visited;
  const visOpacity = panelIn * (1 - progress(f, K.toList, 12));
  const sq = PANEL.seq;
  const seqX = mix(sq.x, PANEL.seqList.x, toL);
  const rowLabel = (i: number) => progress(f, i === 0 ? K.panelIn + 6 : i === 1 ? K.reset1 + 10 : K.toList + 20, 12);
  const ok = progress(f, K.bothOk, 10);
  const same = progress(f, K.same, 10);
  const samePulse = (i: number) => bump(f, K.same + i * 2, 18);
  const row2Pulse = (i: number) => bump(f, K.revRow2 + 10 + i * 2, 18);
  const count8 = progress(f, K.count8, 12) * (1 - progress(f, K.toList, 10));
  const seqLayerK = (i: number) => progress(f, K.seqLayers[i], 10) * (1 - progress(f, K.reset1, 10));
  const seqLayerPulse = (i: number) => {
    // 第 i 个药丸属于第几层
    const L = LAYERS.findIndex((Ls) => Ls.includes(stA.seq[i]?.v ?? -1));
    return L >= 0 ? bump(f, K.seqLayers[L], 16) : 0;
  };
  const brK = progress(f, K.bracket, 12) * (1 - progress(f, K.bracketEnd, 12));
  const bracketPulse = (i: number) => (i === 1 ? bump(f, K.bracket + 4, 22) : i === 2 ? bump(f, K.bracket + 24, 22) : 0) + (i >= 3 && i <= 6 ? bump(f, K.nextFollows, 20) : 0);

  // 队列：第 3–4 镜在右侧中间，第 5 镜缩到右下
  const ql = PANEL.queueList;
  const qState = runC ? stC : runB ? stB : stA;
  const qx = mix(q.x, ql.x, toL);
  const qy = mix(q.y, ql.y, toL);
  const qcell = mix(q.cell, ql.cell, toL);
  const qgap = mix(q.gap, ql.gap, toL);
  const qcur = mix(q.curX, ql.curX, toL);
  const qcap = toL > 0.5 ? ql.cap : q.cap;
  const tubeIn = progress(f, K.morph + 20, 8);
  const qLabels = progress(f, K.qLabels, 12);
  const qItems: QueueIt[] = [...qState.queue];
  if (qState === stA) qItems.push({ v: 8, inAt: K.ghostIn, outAt: K.ghostOut, ghost: true });
  const lastDeqA = T_ASC[T_ASC.length - 1] as number;
  const lastDeqB = T_DESC[T_DESC.length - 1] as number;
  const lastDeqC = T_LIST[T_LIST.length - 1] as number;
  const clearAt = runC ? lastDeqC : runB ? lastDeqB : lastDeqA;
  const v8Hold = progress(f, K.markedEarly, 8) * (1 - progress(f, K.wrongIf, 10));
  const v8Pulse = Math.max(bump(f, K.markedEarly, 26), 0.75 * v8Hold);
  const qPulse = (i: number) => (qState === stA && qItems[i]?.v === 8 && !qItems[i]?.ghost ? v8Pulse : 0);

  // 规则卡
  const rule = PANEL.rule;
  const ruleIn = progress(f, K.rule, 14, EASE_OUT) * (1 - progress(f, K.toList, 10));
  const ruleA = bump(f, K.ruleA, 24);
  const ruleB = bump(f, K.ruleB, 30);
  const early = progress(f, K.markedEarly, 10, EASE_OUT);
  const earlyPulse = bump(f, K.markedEarly, 24);
  const wrong = progress(f, K.wrongIf, 10, EASE_OUT) * (1 - progress(f, K.ghostOut, 12));

  // visited：v8 在“入队时就标记了”时描红闪
  const cells = { ...active.cells };
  if (active === stA && cells[8]) cells[8] = { ...cells[8], flash: Math.max(cells[8].flash, v8Pulse) };

  // 图上：v8 外圈脉冲、反例的红色虚线
  const rings = [
    { v: 8, color: RUN.orange, k: progress(f, K.v8Ring, 30) },
    { v: 8, color: G.good, k: progress(f, K.markedEarly, 30) },
    { v: 8, color: G.good, k: progress(f, K.markedEarly + 10, 30) },
  ];
  const ghostEdge = progress(f, K.ghostIn, 10) * (1 - progress(f, K.ghostOut, 12));
  const P5 = applyXf(G4_LAYOUT[5], xf);
  const P8 = applyXf(G4_LAYOUT[8], xf);

  // ---------------- 邻接表：扫描标记、扫描框、当前行
  const marks: Record<string, NodeMark> = {};
  let cursor: { u: number; k: number; vis: number } | null = null;
  let curRow = 0;
  const marksFade = 1 - progress(f, K.revOn, 8);
  RUN_LIST.forEach((ev, i) => {
    const T = T_LIST[i] as number;
    if (f < T) return;
    if ((ev.t === "enq" || ev.t === "check") && ev.from !== null && ev.arc !== null) {
      marks[`${ev.from}-${ev.arc}`] = { type: ev.t === "enq" ? "go" : "skip", k: progress(f, T, 5) * marksFade };
      cursor = { u: ev.from, k: ev.arc, vis: 1 - progress(f, T + LIST_STEP * 2, 5) };
    }
    if (ev.t === "deq") curRow = ev.v;
    if (ev.t === "done") curRow = 0;
  });
  const rowHi: Record<number, number> = {};
  if (curRow) rowHi[curRow] = 0.55;
  const rev = progress(f, K.revOn + 8, 20, EASE_CAMERA) * (1 - progress(f, K.revOff, 20, EASE_CAMERA));
  const adjIn = progress(f, K.toList + 6, 16);
  const tagK = progress(f, K.revOff + 10, 14);
  const examPulse = bump(f, K.exam, 20);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <Intro f={f} />
      <HeaderPill f={f} />
      <LayerBands xf={xf} k={bandK} hi={bandHi} />
      {f >= K.graphIn ? (
        <GraphView
          f={f}
          layout={G4_LAYOUT}
          edges={G4.edges}
          xf={xf}
          drawAt={K.graphIn}
          states={[stL, stA, stB, stC]}
          showOrder={f >= K.reset0}
          rings={rings}
          flash={{ 1: bump(f, K.stone + 10, 18) }}
          glow={[{ a: 5, b: 8, color: G.bad, k: ghostEdge, width: 7, dashed: true }]}
        />
      ) : null}
      {/* 石子和水波 */}
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {stoneVis ? <circle cx={P1.x} cy={mix(P1.y - 150, P1.y, stoneK)} r={12} fill={G.ink} /> : null}
        {ripples.map((k, i) =>
          k > 0 && k < 1 ? <circle key={i} cx={P1.x} cy={P1.y} r={52 + 720 * k} fill="none" stroke={BRAND} strokeWidth={6 - 4 * k} opacity={0.55 * (1 - k)} /> : null,
        )}
      </svg>
      {ghostEdge > 0.01 ? (
        <div style={{ position: "absolute", left: (P5.x + P8.x) / 2 + 12, top: (P5.y + P8.y) / 2 - 34, fontFamily: FONT.sans, fontSize: 40, fontWeight: 900, color: G.bad, opacity: ghostEdge }}>✗</div>
      ) : null}
      {/* 图注 */}
      <Txt x={600} y={866} size={22} color={G.ink3} opacity={progress(f, K.caption, 14) * (1 - toL)}>
        教材图7.13 · 无向图<VName v={4} letter="G" />
      </Txt>

      {/* 第 2 镜：分层行 */}
      {rowVis ? (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Txt x={1110} y={500} size={28} weight={700} color={G.ink2} opacity={progress(f, LAYER_BOX[0], 12) * (1 - pillsOut)}>
            按层读出来
          </Txt>
          {boxes.map((bx) => {
            if (bx.k <= 0.001) return null;
            const x = mix(bx.x, tubeRect.x, morph);
            const y = mix(lr.y - 10, tubeRect.y, morph);
            const w = mix(bx.w, tubeRect.w, morph);
            const h = mix(lr.cell + 20, tubeRect.h, morph);
            const a = bx.k * (1 - progress(f, K.morph + 22, 8));
            const pl = Math.max(allPulse, bump(f, LAYER_BOX[bx.g], 20));
            const early = 1 - progress(f, K.morph, 8);
            const bw = mix(3.5 + 1.5 * pl, 4, morph);
            const side = 1 - progress(f, K.morph, 12);
            const sideCol = `rgba(85, 91, 107, ${side})`;
            return (
              <div
                key={bx.g}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  opacity: a,
                  boxSizing: "border-box",
                  borderRadius: mix(14, 0, morph),
                  borderTop: `${bw}px solid ${G.ink2}`,
                  borderBottom: `${bw}px solid ${G.ink2}`,
                  borderLeft: `${bw * side}px solid ${sideCol}`,
                  borderRight: `${bw * side}px solid ${sideCol}`,
                  background: `rgba(85, 91, 107, ${(0.07 + 0.06 * pl) * early})`,
                }}
              >
                <div style={{ position: "absolute", left: -20, right: -20, top: -40, textAlign: "center", fontFamily: FONT.sans, fontSize: 24, fontWeight: 700, color: G.ink2, opacity: early, whiteSpace: "nowrap" }}>第{bx.g}层</div>
              </div>
            );
          })}
          {flat.map((v, i) => {
            const it = LAYER_ITEMS.find((x) => x.v === v)!;
            const at = (it.from === undefined ? it.at : it.at + 10) - 2;
            const k = progress(f, at, 10, EASE_OUT);
            if (k <= 0) return null;
            return (
              <div key={v} style={{ position: "absolute", left: rowX[i], top: lr.y - (1 - k) * 20, opacity: k * (1 - pillsOut) }}>
                <Pill v={v} color={RUN.orange} size={lr.cell} />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 队列 */}
      {f >= K.morph + 18 ? (
        <QueueView
          x={qx}
          y={qy}
          f={f}
          items={qItems}
          color={qState.color}
          cell={qcell}
          gap={qgap}
          cap={qcap}
          curX={qcur}
          clearAt={clearAt}
          tube={tubeIn}
          opacity={runC ? Math.max(1 - progress(f, K.toList, 10), progress(f, LIST_START - 14, 10) * (1 - progress(f, lastDeqC + 18, 14))) : 1}
          labels={qLabels}
          hi={{ from: 0, n: 4, k: qL2, label: "第2层" }}
          pulse={qPulse}
        />
      ) : null}

      {/* 规则卡 */}
      {ruleIn > 0.001 ? (
        <div style={{ position: "absolute", left: rule.x, top: rule.y + (1 - ruleIn) * 16, width: rule.w, height: mix(64, 112, early), opacity: ruleIn, background: G.card, borderRadius: 16, boxShadow: `inset 0 0 0 2px ${G.cardLine}, 0 8px 22px ${G.shadow}` }}>
          <div style={{ position: "absolute", left: 24, top: 14, fontFamily: FONT.sans, fontSize: 28, fontWeight: 700, color: G.ink, whiteSpace: "nowrap" }}>
            <span style={{ color: G.ink2 }}>规则：</span>
            <span style={{ background: tint(RUN.orange, 0.3 * ruleA), borderRadius: 6, padding: "0 4px" }}>出队一个</span>
            <span style={{ color: G.ink3 }}> → </span>
            <span style={{ background: tint(RUN.orange, 0.3 * ruleB), borderRadius: 6, padding: "0 4px" }}>没来过的邻居全部入队</span>
          </div>
          <div style={{ position: "absolute", left: 24, top: 62, display: "flex", gap: 14, alignItems: "center", opacity: early }}>
            <span style={{ opacity: early, transform: `scale(${1 + 0.1 * earlyPulse})`, transformOrigin: "left center", display: "inline-block" }}>
              <Tag color={G.good} solid={earlyPulse > 0.3} size={24}>
                ✓ 入队时就标记
              </Tag>
            </span>
            <span style={{ opacity: wrong }}>
              <Tag color={G.bad} size={24}>
                ✗ 出队才标记：<VName v={8} />会入队两次
              </Tag>
            </span>
          </div>
        </div>
      ) : null}

      {/* visited */}
      {visOpacity > 0.001 ? <ArrayView x={vp.x + (1 - panelIn) * 60} y={vp.y} n={8} cell={vp.cell} gap={vp.gap} cells={cells} color={active.color} opacity={visOpacity} /> : null}

      {/* 访问序列 */}
      <Txt x={seqX} y={sq.titleY} size={28} weight={700} color={G.ink2} opacity={panelIn}>
        访问序列
      </Txt>
      <SeqRow
        f={f}
        x={seqX}
        y={sq.rowY}
        items={stA.seq}
        color={RUN.orange}
        label={
          <span style={{ opacity: rowLabel(0) }}>
            ① 先挑编号小的 <span style={{ color: G.good, opacity: ok }}>✓</span>
          </span>
        }
        pulse={(i) => Math.max(samePulse(i), seqLayerPulse(i))}
      />
      <Brackets
        x={seqX}
        y={sq.rowY + 54}
        size={50}
        gap={6}
        groups={LAYERS.map((L, g) => ({ from: LAYERS.slice(0, g).reduce((s, x) => s + x.length, 0), n: L.length, label: `第${g}层`, color: G.ink2, k: seqLayerK(g) }))}
      />
      <SeqRow
        f={f}
        x={seqX}
        y={sq.rowY + sq.rowStep}
        items={stB.seq}
        color={RUN.blue}
        label={
          <span style={{ opacity: rowLabel(1) }}>
            ② 先挑编号大的 <span style={{ color: G.good, opacity: ok }}>✓</span>
          </span>
        }
        pulse={(i) => Math.max(row2Pulse(i), bracketPulse(i))}
      />
      <Brackets
        x={seqX}
        y={sq.rowY + sq.rowStep + 54}
        size={50}
        gap={6}
        groups={[
          { from: 3, n: 2, label: <><VName v={3} />的邻居</>, color: RUN.blue, k: brK },
          { from: 5, n: 2, label: <><VName v={2} />的邻居</>, color: G.ink2, k: progress(f, K.bracket + 20, 12) * (1 - progress(f, K.bracketEnd, 12)) },
        ]}
      />
      <SeqRow
        f={f}
        x={seqX}
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
      <div style={{ position: "absolute", left: seqX, top: sq.rowY + 2 * sq.rowStep - 30, opacity: count8 }}>
        <Tag color={RUN.blue} size={26}>
          从<VName v={1} />出发，BFS序列共{ALL_BFS_COUNT}种
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
          subLabels={progress(f, K.listBuild + 30, 12)}
          rev={rev}
          frame={{ k: tagK, color: RUN.green }}
        />
      ) : null}
      <div style={{ position: "absolute", left: PANEL.seqList.x, top: 214, opacity: tagK, transform: `scale(${1 + 0.08 * examPulse})`, transformOrigin: "left center" }}>
        <Tag color={RUN.green} solid size={30}>
          邻接表给定 → 序列唯一
        </Tag>
      </div>
    </div>
  );
};
