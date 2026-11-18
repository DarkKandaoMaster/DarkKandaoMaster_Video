// 留白版第 1–3 镜：同一张 G4 贯穿，靠“镜头”（整张图平移 + 缩放）和“雾”（不相关的顶点淡掉）引导视线。
// 同一时刻屏幕上最多两块东西：图 + 右边一栏（标题 / 按层排好的一排 / 队列，轮流出现）。
import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_OUT, mix, progress } from "../base/anim";
import { FONT } from "../base/theme";
import { bfsAt, litState } from "../graph/bfs";
import { GraphView } from "../graph/GraphView";
import { Pill, Txt, VName, bump } from "../graph/Kit";
import { QueueView, type QueueIt } from "../graph/Structures";
import { G, RUN, applyXf, deep, mixXf, tint, type Xf } from "../graph/theme";
import type { TState } from "../graph/traverse";
import { BANDS, COL_X, G4_LAYOUT, QUEUE, ROW, qSlotX, rowX } from "./layout";
import { CAM, CAM_KEYS, K, LAYER_BOX, LAYER_ITEMS, MOVE, T_ASC } from "./timeline";
import { G4, LAYERS, RUN_ASC } from "./trace.generated";

const ORANGE = RUN.orange;
const R0 = 40; // 画布里的顶点半径（GraphView 默认）

/** 某一帧的镜头：依次朝每个关键位置缓动过去 */
const camAt = (f: number): Xf => {
  let xf = CAM.full;
  for (const k of CAM_KEYS) {
    if (f < k.from) break;
    xf = mixXf(xf, k.to, progress(f, k.from, k.dur, EASE_CAMERA));
  }
  return xf;
};

/** 只有指针圆环的状态（开场“从 v1 出发”、第 3 镜“站在一个顶点上”） */
const ptrOnly = (v: number, vis: number): TState => ({
  color: ORANGE,
  v: {},
  e: [],
  probes: [],
  ptr: vis > 0.001 ? { a: v, b: v, t: 1, vis } : null,
  stack: [],
  cells: {},
  seq: [],
  fade: 0,
  at: v,
});

/** 图背后的层带：很淡的横条 + 左边“第k层” */
const Bands: React.FC<{ xf: Xf; k: number[]; hi: number[] }> = ({ xf, k, hi }) => (
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
          <rect x={A.x} y={A.y} width={B.x - A.x} height={B.y - A.y} rx={(BANDS.h / 2) * xf.s} fill={`rgba(85, 91, 107, ${0.045 + 0.06 * h})`} />
          <text x={L.x} y={L.y} dominantBaseline="central" fill={G.ink2} opacity={0.75 + 0.25 * h} style={{ fontFamily: FONT.sans, fontSize: 27 * Math.max(xf.s, 0.92), fontWeight: 600 }}>
            第{i}层
          </text>
        </g>
      );
    })}
  </svg>
);

/** 队列上方的括号 + 小字（第 k 层） */
const Bracket: React.FC<{ from: number; n: number; label: React.ReactNode; k: number; pulse?: number }> = ({ from, n, label, k, pulse = 0 }) => {
  if (k <= 0.001) return null;
  const step = QUEUE.cell + QUEUE.gap;
  const left = qSlotX(from) - 4;
  const w = n * step - QUEUE.gap + 8;
  const col = mixColorSafe(G.ink3, G.ink, pulse);
  return (
    <div style={{ position: "absolute", left, top: QUEUE.y - 30 - (1 - k) * 10, width: w, opacity: k }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: -42, textAlign: "center", fontFamily: FONT.sans, fontSize: 26, fontWeight: 700, color: col, whiteSpace: "nowrap", transform: `scale(${1 + 0.12 * pulse})` }}>
        {label}
      </div>
      <div style={{ height: 14, borderTop: `3px solid ${col}`, borderLeft: `3px solid ${col}`, borderRight: `3px solid ${col}`, borderRadius: "8px 8px 0 0" }} />
    </div>
  );
};
const mixColorSafe = (a: string, b: string, t: number) => (t <= 0.001 ? a : t >= 0.999 ? b : mixHex(a, b, t));
const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * t));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

export const AiryStage: React.FC = () => {
  const f = useCurrentFrame();
  const xf = camAt(f);
  const r = R0 * xf.s;
  const P = (v: number) => applyXf(G4_LAYOUT[v], xf);

  // ---------------- 两遍状态：第 2 镜只点亮（按层），第 3 镜队列走一遍
  const stL = litState(f, LAYER_ITEMS, ORANGE, { fadeAt: K.reset0 });
  const stA = bfsAt(f, RUN_ASC, T_ASC, { color: ORANGE, move: MOVE });
  const ptrVis = Math.max(progress(f, K.ringV1, 10) * (1 - progress(f, K.ringV1Off, 10)), progress(f, K.fogA, 10) * (1 - progress(f, K.morph, 12)));
  const stP = ptrOnly(1, ptrVis);

  // ---------------- 雾：第 2 镜还没点亮的顶点半透明；第 3 镜“只看得到邻居”、推近 v5 v8 时其余淡掉
  const s2 = progress(f, LAYER_ITEMS[0].at - 20, 16) * (1 - progress(f, LAYER_BOX[3] + 16, 16));
  const fogA = progress(f, K.fogA, 14) * (1 - progress(f, K.fogAOff, 16));
  const fogM = progress(f, K.fogM, 16) * (1 - progress(f, K.fogMOff, 16));
  const dim: Record<number, number> = {};
  for (let v = 1; v <= 8; v++) {
    const lit = stL.v[v]?.lit ?? 0;
    let d = 1 - 0.65 * s2 * (1 - lit);
    if (![1, 2, 3].includes(v)) d *= 1 - 0.84 * fogA;
    if (![2, 5, 8].includes(v)) d *= 1 - 0.88 * fogM;
    dim[v] = d;
  }

  // ---------------- 层带
  const bandsOff = 1 - progress(f, K.reset0, 16);
  const layer2 = progress(f, K.layer2, 10) * (1 - progress(f, K.layer2Off, 14));
  const finalBands = 0.85 * progress(f, K.finalRow + 16, 18);
  const bandK = LAYER_BOX.map((t, i) => Math.max(progress(f, t, 14, EASE_OUT) * bandsOff, i === 2 ? layer2 : 0, finalBands));
  const bandHi = LAYER_BOX.map((t, i) => Math.max(bump(f, t, 24), i === 2 ? 0.6 * layer2 : 0));

  // ---------------- 图上的提示线、脉冲圈
  const hint1 = 0.85 * progress(f, K.hint1, 12) * (1 - progress(f, K.hint1Off, 8));
  const look = 0.85 * progress(f, K.look, 10) * (1 - progress(f, K.fogAOff, 12));
  const e58 = progress(f, K.edge58, 10) * (1 - progress(f, K.wrongIf, 10));
  const ghostEdge = progress(f, K.ghostIn - 8, 10) * (1 - progress(f, K.ghostOut, 12));
  const glow = [
    { a: 1, b: 2, color: G.ink2, k: hint1, width: 5, dashed: true },
    { a: 1, b: 3, color: G.ink2, k: hint1, width: 5, dashed: true },
    { a: 1, b: 2, color: G.ink2, k: look, width: 5, dashed: true },
    { a: 1, b: 3, color: G.ink2, k: look, width: 5, dashed: true },
    { a: 5, b: 8, color: G.ink2, k: e58, width: 6, dashed: true },
    { a: 5, b: 8, color: G.bad, k: ghostEdge, width: 7, dashed: true },
  ];
  const rings = [
    { v: 8, color: ORANGE, k: progress(f, K.v8Wait, 30) },
    { v: 8, color: G.good, k: progress(f, K.marked, 30) },
    { v: 8, color: G.good, k: progress(f, K.marked + 12, 30) },
  ];

  // ---------------- 水波
  const P1 = P(1);
  const ripples = [0, 14, 28].map((d) => progress(f, K.ripple + d, 62, (t) => 1 - (1 - t) * (1 - t)));

  // ---------------- 标题（第 2 镜末尾，右边一栏）
  const titleK = progress(f, K.title, 16) * (1 - progress(f, K.titleOut, 12));
  const bfsK = progress(f, K.titleBfs, 14) * (1 - progress(f, K.titleOut, 12));

  // ---------------- 按层排好的一排：药丸从图上的顶点飞过去 → 四个框 → 第 3 镜框变成队列管
  const groups = LAYERS.map((L) => L.length);
  const xs = rowX(groups);
  const flat = LAYERS.flat();
  const layerOf = (i: number) => {
    let acc = 0;
    for (let g = 0; g < groups.length; g++) {
      if (i < acc + groups[g]) return { g, j: i - acc };
      acc += groups[g];
    }
    return { g: 0, j: 0 };
  };
  const step = QUEUE.cell + QUEUE.gap;
  const tube = { x: QUEUE.x - 6, y: QUEUE.y - 8, w: QUEUE.cap * step + QUEUE.gap + 6, h: QUEUE.cell + 16 };
  const morph = progress(f, K.morph, 26, EASE_CAMERA);
  const pillsOut = progress(f, K.morph, 12);
  const rowDim = 1 - 0.6 * progress(f, K.reset0 + 6, 16) * (1 - progress(f, K.ask, 12));
  const askPulse = bump(f, K.ask + 2, 26);
  const rowVis = f >= K.rowFly && f < K.morph + 32;
  let gi0 = 0;
  const boxes = LAYERS.map((L, g) => {
    const a = xs[gi0];
    const b = xs[gi0 + L.length - 1] + ROW.cell;
    gi0 += L.length;
    return { g, x: a - 12, w: b - a + 24, k: progress(f, K.rowBoxes + g * 6, 12, EASE_OUT) };
  });

  // ---------------- 队列
  const qItems: QueueIt[] = [...stA.queue, { v: 8, inAt: K.ghostIn, outAt: K.ghostOut, ghost: true }];
  const pulseV = (it: QueueIt): number => {
    if (it.ghost) return 0;
    if (it.v === 3) return Math.max(bump(f, K.qPulse[0], 20), bump(f, K.v3First, 28));
    if (it.v === 4) return bump(f, K.qPulse[1], 20);
    if (it.v === 5) return bump(f, K.qPulse[2], 20);
    if (it.v === 8) return Math.max(bump(f, K.v8Wait, 26), bump(f, K.marked, 28));
    return 0;
  };
  const qVis = f >= K.morph + 18 && f < K.finalRow + 20;
  const qOpacity = 1 - progress(f, K.qOut, 12);
  const tubeIn = progress(f, K.morph + 20, 8);
  const qLabels = progress(f, K.qLabels, 14);
  const cy = QUEUE.y + QUEUE.cell / 2;
  const tubeR = tube.x + tube.w;

  // 规则（只在讲它的时候在）
  const ruleK = progress(f, K.rule, 12) * (1 - progress(f, K.ruleOff, 12));
  const ruleB = progress(f, K.ruleB, 12);
  // “下一个出队的是谁？”
  const askQ = progress(f, K.qAsk, 10) * (1 - progress(f, K.qAskOff, 10));
  // 括号：第 1 层 / 第 2 层
  const br1 = progress(f, K.br1, 12) * (1 - progress(f, K.brOff, 8));
  const br2 = progress(f, K.br2, 12) * (1 - progress(f, K.brOff, 8));
  // “要不要再放一次？”：队尾一个虚线空格
  const slotAsk = progress(f, K.slotAsk, 10) * (1 - progress(f, K.slotAskOff, 10));
  // “出队才标记”
  const wrongK = progress(f, K.wrongIf, 12) * (1 - progress(f, K.ghostOut, 12));
  // “入队就标记”
  const enqK = progress(f, K.markEnq, 12, EASE_OUT) * (1 - progress(f, K.qOut, 12));
  const enqPulse = bump(f, K.markEnq, 24);
  // v8 旁边的 visited 小牌
  const markedK = progress(f, K.marked, 12, EASE_OUT) * (1 - progress(f, K.markedOff, 12));
  const P8 = P(8);

  // ---------------- 片尾：访问顺序一排 + 层框
  const finK = f >= K.finalRow - 2;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Bands xf={xf} k={bandK} hi={bandHi} />
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {ripples.map((k, i) =>
          k > 0 && k < 1 ? <circle key={i} cx={P1.x} cy={P1.y} r={r + 10 + 760 * k} fill="none" stroke={ORANGE} strokeWidth={5 - 3 * k} opacity={0.42 * (1 - k)} /> : null,
        )}
      </svg>
      <GraphView f={f} layout={G4_LAYOUT} edges={G4.edges} xf={xf} drawAt={K.graphIn} states={[stL, stP, stA]} showOrder={false} rings={rings} glow={glow} dim={dim} />

      {/* v8 旁边：visited 已经是 TRUE */}
      {markedK > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: P8.x + r + 22,
            top: P8.y - 24 + (1 - markedK) * 10,
            opacity: markedK,
            padding: "4px 14px 6px",
            borderRadius: 12,
            background: tint(G.good, 0.12),
            boxShadow: `inset 0 0 0 2px ${tint(G.good, 0.5)}`,
            fontFamily: FONT.mono,
            fontSize: 30,
            fontWeight: 700,
            color: deep(G.good, 0.1),
            whiteSpace: "nowrap",
          }}
        >
          visited[<VName v={8} style={{ fontSize: 30 }} />] = TRUE
        </div>
      ) : null}

      {/* 标题 */}
      {titleK > 0.001 ? (
        <>
          <Txt cx={COL_X} y={340} size={84} weight={800} opacity={titleK} dy={(1 - titleK) * 16}>
            广度优先遍历
          </Txt>
          <Txt cx={COL_X} y={462} size={34} weight={600} color={G.ink3} opacity={bfsK} dy={(1 - bfsK) * 10}>
            Breadth-First Search · BFS
          </Txt>
        </>
      ) : null}

      {/* 按层排好的一排（第 2 镜末尾）→ 第 3 镜四个框合成队列管 */}
      {rowVis ? (
        <div style={{ position: "absolute", left: 0, top: 0, opacity: rowDim }}>
          {boxes.map((bx) => {
            if (bx.k <= 0.001) return null;
            const x = mix(bx.x, tube.x, morph);
            const y = mix(ROW.y - 12, tube.y, morph);
            const w = mix(bx.w, tube.w, morph);
            const h = mix(ROW.cell + 24, tube.h, morph);
            const a = bx.k * (1 - progress(f, K.morph + 22, 8));
            const side = 1 - progress(f, K.morph, 12);
            const bw = mix(3 + 1.5 * askPulse, 4, morph);
            const lineCol = mixHex(G.ink3, G.ink2, morph);
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
                  borderRadius: mix(16, 0, morph),
                  borderTop: `${bw}px solid ${lineCol}`,
                  borderBottom: `${bw}px solid ${lineCol}`,
                  borderLeft: `${bw * side}px solid rgba(149, 154, 166, ${side})`,
                  borderRight: `${bw * side}px solid rgba(149, 154, 166, ${side})`,
                  background: `rgba(85, 91, 107, ${(0.045 + 0.05 * askPulse) * side})`,
                }}
              >
                <div style={{ position: "absolute", left: -30, right: -30, top: -44, textAlign: "center", fontFamily: FONT.sans, fontSize: 26, fontWeight: 600, color: G.ink2, opacity: side, whiteSpace: "nowrap" }}>
                  第{bx.g}层
                </div>
              </div>
            );
          })}
          {flat.map((v, i) => {
            const { g, j } = layerOf(i);
            const t0 = K.rowFly + g * 12 + j * 4;
            const fly = progress(f, t0, 26, EASE_CAMERA);
            const show = progress(f, t0, 4);
            if (show <= 0) return null;
            const from = P(v);
            const sz = mix(2 * r, ROW.cell, fly);
            const left = mix(from.x - r, xs[i], fly);
            const top = mix(from.y - r, ROW.y, fly);
            return (
              <div key={v} style={{ position: "absolute", left, top, opacity: show * (1 - pillsOut) }}>
                <Pill v={v} color={ORANGE} size={sz} style={{ borderRadius: mix(sz / 2, sz * 0.28, fly) }} />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 队列 */}
      {qVis ? (
        <div style={{ position: "absolute", left: 0, top: 0, opacity: qOpacity }}>
          <svg style={{ position: "absolute", left: 0, top: 0, opacity: qLabels * 0.85 }} width={1920} height={1080}>
            {/* 出队：从队头往左出去；入队：从右边进队尾 */}
            <line x1={tube.x - 16} y1={cy} x2={tube.x - 70} y2={cy} stroke={G.ink3} strokeWidth={4} strokeLinecap="round" />
            <path d={`M ${tube.x - 82} ${cy} l 14 -9 l 0 18 Z`} fill={G.ink3} />
            <line x1={tubeR + 74} y1={cy} x2={tubeR + 26} y2={cy} stroke={G.ink3} strokeWidth={4} strokeLinecap="round" />
            <path d={`M ${tubeR + 14} ${cy} l 14 -9 l 0 18 Z`} fill={G.ink3} />
          </svg>
          <QueueView x={QUEUE.x} y={QUEUE.y} f={f} items={qItems} color={ORANGE} cell={QUEUE.cell} gap={QUEUE.gap} cap={QUEUE.cap} tube={tubeIn} labels={qLabels} pulse={(i) => pulseV(qItems[i])} />
          {/* 下一个出队的是谁？ */}
          {askQ > 0.001 ? (
            <Txt cx={tube.x - 44} y={QUEUE.y - 92} size={64} weight={800} color={G.ink2} opacity={askQ} dy={(1 - askQ) * 10}>
              ?
            </Txt>
          ) : null}
          <Bracket from={0} n={1} label="第1层" k={br1} pulse={bump(f, K.br1Pulse, 26)} />
          <Bracket from={1} n={2} label="第2层" k={br2} />
          <Bracket from={0} n={4} label="第2层" k={layer2} />
          {/* 要不要再放一次？ */}
          {slotAsk > 0.001 ? (
            <div
              style={{
                position: "absolute",
                left: qSlotX(3),
                top: QUEUE.y,
                width: QUEUE.cell,
                height: QUEUE.cell,
                boxSizing: "border-box",
                borderRadius: QUEUE.cell * 0.28,
                border: `3px dashed ${G.ink3}`,
                opacity: slotAsk,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT.sans,
                fontSize: 48,
                fontWeight: 800,
                color: G.ink3,
              }}
            >
              ?
            </div>
          ) : null}
          {wrongK > 0.001 ? (
            <Txt cx={qSlotX(3) + QUEUE.cell / 2} y={QUEUE.y - 66} size={28} weight={700} color={G.bad} opacity={wrongK}>
              出队才标记
            </Txt>
          ) : null}
          {/* 规则 */}
          {ruleK > 0.001 ? (
            <Txt cx={COL_X} y={QUEUE.y + QUEUE.cell + 76} size={32} weight={600} color={G.ink2} opacity={ruleK}>
              出队一个顶点
              <span style={{ color: G.ink3 }}> → </span>
              <span style={{ opacity: ruleB }}>没来过的邻居涂色，放进队尾</span>
            </Txt>
          ) : null}
          {enqK > 0.001 ? (
            <div style={{ position: "absolute", left: COL_X - 300, width: 600, top: QUEUE.y + QUEUE.cell + 70, textAlign: "center", opacity: enqK }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 22px 8px",
                  borderRadius: 26,
                  background: tint(G.good, 0.12 + 0.2 * enqPulse),
                  boxShadow: `inset 0 0 0 2px ${tint(G.good, 0.55)}`,
                  fontFamily: FONT.sans,
                  fontSize: 32,
                  fontWeight: 700,
                  color: deep(G.good, 0.12),
                  transform: `scale(${1 + 0.06 * enqPulse})`,
                }}
              >
                入队时就标记
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 片尾：访问顺序 */}
      {finK ? (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          {LAYERS.map((L, g) => {
            const i0 = LAYERS.slice(0, g).reduce((s, x) => s + x.length, 0);
            const a = xs[i0];
            const b = xs[i0 + L.length - 1] + ROW.cell;
            const k = progress(f, K.finalBoxes + g * 5, 12, EASE_OUT);
            if (k <= 0.001) return null;
            return (
              <div
                key={g}
                style={{
                  position: "absolute",
                  left: a - 12,
                  top: ROW.y - 12,
                  width: b - a + 24,
                  height: ROW.cell + 24,
                  boxSizing: "border-box",
                  borderRadius: 16,
                  border: `3px solid ${G.ink3}`,
                  background: "rgba(85, 91, 107, 0.045)",
                  opacity: k,
                  transform: `scale(${mix(1.06, 1, k)})`,
                }}
              >
                <div style={{ position: "absolute", left: -30, right: -30, top: -44, textAlign: "center", fontFamily: FONT.sans, fontSize: 26, fontWeight: 600, color: G.ink2, whiteSpace: "nowrap" }}>第{g}层</div>
              </div>
            );
          })}
          {stA.seq.map((it, i) => {
            const k = progress(f, K.finalRow + i * 4, 12, EASE_OUT);
            if (k <= 0) return null;
            return (
              <div key={i} style={{ position: "absolute", left: xs[i], top: ROW.y - (1 - k) * 18, opacity: k }}>
                <Pill v={it.v} color={ORANGE} size={ROW.cell} />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
