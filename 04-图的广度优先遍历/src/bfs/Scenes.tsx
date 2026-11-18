// 第 6–10 镜：层号 = 最短边数、非连通图、复杂度、限时题、结尾（DFS / BFS 并排）。
import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE_OUT, mix, progress } from "../base/anim";
import { FONT, mixColor } from "../base/theme";
import { AdjListView, type NodeMark } from "../graph/AdjListView";
import { bfsAt, litState } from "../graph/bfs";
import { GraphView } from "../graph/GraphView";
import { Card, Countdown, Pill, Tag, Txt, VName, bump } from "../graph/Kit";
import { ArrayView, SeqRow } from "../graph/Structures";
import { G, RUN, RUN_ORDER, XF0, deep, tint } from "../graph/theme";
import type { Cell, SeqIt } from "../graph/traverse";
import { G4_LAYOUT, G6_BLOBS, G6_LAYOUT, XF_QUIZ } from "./layout";
import { LayerBands } from "./MainStage";
import { AT, G6_LOOP, G6_STEP, K, SCENE, T_G6, TL } from "./timeline";
import { ADJLIST, G4, G6, G6_CALLS, LAYERS, PARENT_ASC, PATH_V8, QUIZ, QUIZ_ANSWER, SEQ_ASC, SHORTEST } from "./trace.generated";

const sceneAlpha = (f: number, from: number, to: number) => Math.min(progress(f, from, 14), 1 - progress(f, to, 14));

// ---------------------------------------------------------------- 第 6 镜：层号 = 最短边数
export const S6ShortPath: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s6 || f > SCENE.s7 + 16) return null;
  const a = sceneAlpha(f, SCENE.s6, SCENE.s7);
  // BFS 生成树：全部点亮后变浅（只当底子）
  const tree = litState(
    f,
    SEQ_ASC.map((v, i) => ({ v, at: SCENE.s6 + 4 + i * 3, from: PARENT_ASC[v] })),
    RUN.orange,
    { move: 8, doneAt: SCENE.s6 + 30 },
  );
  // v1 → v2 → v4 → v8：三条边依次发亮
  const pathK = [0, 1, 2].map((i) => progress(f, K.spPath + 6 + i * 14, 10));
  const glow = [0, 1, 2].map((i) => ({ a: PATH_V8[i], b: PATH_V8[i + 1], color: RUN.orange, k: pathK[i], width: 16 }));
  const bandsK = [0, 1, 2, 3].map((i) => progress(f, SCENE.s6 + 8 + i * 4, 12, EASE_OUT));
  const rowK = (i: number) => progress(f, K.spTable + i * 8, 12, EASE_OUT);
  const rowHi = (i: number) => (i === 3 ? progress(f, K.spPath, 10) : 0);
  const count = progress(f, K.spCount, 12, EASE_OUT);
  const use = progress(f, K.spUse, 12, EASE_OUT);
  const rings = [{ v: 8, color: RUN.orange, k: progress(f, K.spPath + 34, 30) }];
  const flash: Record<number, number> = { 8: bump(f, K.spPath + 34, 20) };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <LayerBands xf={XF0} k={bandsK} hi={[0, 0, 0, rowHi(3) * 0.6]} />
      <GraphView f={f} layout={G4_LAYOUT} edges={G4.edges} states={[tree]} showOrder={false} glow={glow} rings={rings} flash={flash} />
      {/* 边上的 ①②③ */}
      {glow.map((g, i) => {
        const A = G4_LAYOUT[g.a];
        const B = G4_LAYOUT[g.b];
        const dx = B.y - A.y;
        const dy = -(B.x - A.x);
        const L = Math.hypot(dx, dy) || 1;
        // 标在边的左侧（沿 A→B 方向看）
        const cx = (A.x + B.x) / 2 - (dx * 34) / L;
        const cy = (A.y + B.y) / 2 - (dy * 34) / L;
        return (
          <div key={i} style={{ position: "absolute", left: cx - 19, top: cy - 19, width: 38, height: 38, borderRadius: 19, background: RUN.orange, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, opacity: pathK[i], transform: `scale(${mix(0.5, 1, pathK[i])})` }}>
            {i + 1}
          </div>
        );
      })}
      {/* 右边：层号 ＝ 最少几条边 */}
      <div style={{ position: "absolute", left: 1100, top: 150, opacity: progress(f, AT.s6a + 10, 12), fontFamily: FONT.sans, fontSize: 40, fontWeight: 800, color: G.ink, whiteSpace: "nowrap" }}>
        层号 ＝ 离<VName v={1} />最少几条边
      </div>
      {LAYERS.map((L, i) => {
        const k = rowK(i);
        const y = 252 + i * 92;
        const hi = rowHi(i);
        return (
          <div key={i} style={{ position: "absolute", left: 1100, top: y + (1 - k) * 14, opacity: k, width: 720, height: 76, borderRadius: 14, background: mixColor("#FFFFFF", tint(RUN.orange, 0.22), hi), boxShadow: `inset 0 0 0 2px ${mixColor(G.cardLine, RUN.orange, hi)}` }}>
            <div style={{ position: "absolute", left: 20, top: 18, fontFamily: FONT.sans, fontSize: 28, fontWeight: 700, color: G.ink2 }}>第{i}层</div>
            <div style={{ position: "absolute", left: 130, top: 10, display: "flex", gap: 6 }}>
              {L.map((v) => (
                <Pill key={v} v={v} color={RUN.orange} size={56} ghost />
              ))}
            </div>
            <div style={{ position: "absolute", right: 24, top: 16, fontFamily: FONT.sans, fontSize: 30, fontWeight: 800, color: deep(RUN.orange, 0.15), whiteSpace: "nowrap" }}>
              {SHORTEST[L[0]]}条边
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1100, top: 640, opacity: count, transform: `translateY(${(1 - count) * 12}px)`, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.sans, fontSize: 30, color: G.ink3 }}>
        {PATH_V8.map((v, i) => (
          <React.Fragment key={v}>
            {i > 0 ? <span>→</span> : null}
            <Pill v={v} color={RUN.orange} size={58} />
          </React.Fragment>
        ))}
        <span style={{ marginLeft: 14 }}>
          <Tag color={RUN.orange} solid size={30}>
            {PATH_V8.length - 1}条边
          </Tag>
        </span>
      </div>
      <div style={{ position: "absolute", left: 1100, top: 740, opacity: use, transform: `translateY(${(1 - use) * 12}px)` }}>
        <Tag color={G.good} size={30}>
          无权图的最短路径：BFS一层层找
        </Tag>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 第 7 镜：非连通图
export const S7Disconnected: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s7 || f > SCENE.s8 + 16) return null;
  const a = sceneAlpha(f, SCENE.s7, SCENE.s8);
  const states = G6_CALLS.map((evs, i) => bfsAt(f, evs, T_G6[i], { color: RUN_ORDER[i], move: G6_STEP, probe: G6_STEP + 2 }));
  const cells: Record<number, Cell> = {};
  const callOf: Record<number, number> = {};
  states.forEach((s, i) => {
    for (const [v, c] of Object.entries(s.cells)) {
      cells[Number(v)] = c;
      callOf[Number(v)] = i;
    }
  });
  const cs = G6_LOOP.cursor;
  let ci = 1;
  cs.forEach((t, i) => {
    if (i > 0) ci = mix(ci, i + 1, progress(f, t, 6));
  });
  const curVis = progress(f, cs[0] - 6, 8) * (1 - progress(f, K.g6Three + 20, 10));
  const calls = T_G6.map((ts) => ts[0] as number);
  const nCalls = calls.filter((t) => f >= t).length;
  const callPulse = calls.reduce((m, t) => Math.max(m, bump(f, t, 18)), 0);
  const codeHi = progress(f, K.g6Code, 10);
  const comp = progress(f, K.g6Three, 16, EASE_OUT);
  const three = progress(f, K.g6Three, 12);
  const seqs: SeqIt[][] = states.map((s) => s.seq);
  const seqX = [1100, 1100 + 3 * 56 + 40, 1100 + 5 * 56 + 80];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Txt x={96} y={150} size={30} weight={700} color={G.ink2}>
        非连通图：6个顶点，3块
      </Txt>
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={1920} height={1080}>
        {G6_BLOBS.map(([x, y, w, h], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={48}
            fill={tint(RUN_ORDER[i], 0.1)}
            stroke={tint(RUN_ORDER[i], 0.65)}
            strokeWidth={3.5}
            strokeDasharray="14 10"
            opacity={comp}
            transform={`translate(${x + w / 2} ${y + h / 2}) scale(${mix(0.85, 1, comp)}) translate(${-(x + w / 2)} ${-(y + h / 2)})`}
          />
        ))}
      </svg>
      {G6_BLOBS.map(([x, y, w, h], i) => (
        <Txt key={i} cx={x + w / 2} y={y + h + 12} size={24} weight={700} color={deep(RUN_ORDER[i], 0.1)} opacity={comp}>
          连通分量{i + 1}
        </Txt>
      ))}
      <GraphView f={f} layout={G6_LAYOUT} edges={G6.edges} states={states} drawAt={SCENE.s7 + 4} />
      <Card x={1060} y={140} w={790} h={196}>
        <div style={{ position: "absolute", left: 28, top: 16, fontFamily: FONT.mono, fontSize: 22, color: G.ink3 }}>BFSTraverse(G)</div>
        <div style={{ position: "absolute", left: 28, top: 58, fontFamily: FONT.mono, fontSize: 31, color: G.ink, lineHeight: 1.6, whiteSpace: "pre" }}>
          {"for (v = 0; v < G.vexnum; ++v)\n"}
          <span style={{ background: mixColor("#FFFFFF", tint(RUN.orange, 0.35), Math.max(codeHi * 0.6, callPulse)), borderRadius: 6, padding: "2px 6px", marginLeft: -6 }}>
            {"    if (!visited[v]) BFS(G, v);"}
          </span>
        </div>
      </Card>
      <ArrayView x={1100} y={474} n={6} cell={84} gap={8} cells={cells} color={RUN.orange} colorOf={(i) => RUN_ORDER[callOf[i] ?? 0]} cursor={{ i: ci, vis: curVis }} />
      <div style={{ position: "absolute", left: 1100, top: 612, fontFamily: FONT.sans, fontSize: 38, fontWeight: 700, color: G.ink, whiteSpace: "nowrap" }}>
        调用BFS：
        <span style={{ display: "inline-block", minWidth: 40, textAlign: "center", color: RUN_ORDER[Math.max(0, nCalls - 1)], transform: `scale(${1 + 0.3 * callPulse})` }}>{nCalls}</span>
        次
        <span style={{ opacity: three, marginLeft: 18 }}>
          <Tag color={G.good} solid size={32}>
            ＝ 3个连通分量
          </Tag>
        </span>
      </div>
      <Txt x={1100} y={706} size={24} weight={700} color={G.ink2} opacity={progress(f, calls[0], 10)}>
        每次调用访问到
      </Txt>
      {seqs.map((items, i) => (
        <SeqRow key={i} f={f} x={seqX[i]} y={750} items={items} color={RUN_ORDER[i]} size={50} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- 第 8 镜：复杂度
const MATRIX = (() => {
  const m: number[][] = Array.from({ length: G4.n }, () => Array(G4.n).fill(0));
  for (const [x, y] of G4.edges) {
    m[x - 1][y - 1] = 1;
    m[y - 1][x - 1] = 1;
  }
  return m;
})();

export const S8Complexity: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s8 || f > SCENE.s9 + 16) return null;
  const a = sceneAlpha(f, SCENE.s8, SCENE.s9);
  const cardIn = progress(f, SCENE.s8 + 6, 16, EASE_OUT);
  const cell = 44;
  const gap = 4;
  const mx = 120 + (780 - (8 * (cell + gap) - gap)) / 2 + 14;
  const my = 236;
  const rowStep = 6;
  const curRow = Math.floor((f - K.matScan) / rowStep);
  const leftF = progress(f, K.matScan + 8 * rowStep, 12);
  const rightF = progress(f, K.listScan + 18 * 3 + 6, 12);
  const marks: Record<string, NodeMark> = {};
  let idx = 0;
  ADJLIST.forEach((list, u) =>
    list.forEach((_, k) => {
      marks[`${u + 1}-${k}`] = { type: "go", k: progress(f, K.listScan + idx * 3, 5) };
      idx++;
    }),
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Card x={110} y={130} w={800} h={720} opacity={cardIn} dy={(1 - cardIn) * 20}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 22, textAlign: "center", fontFamily: FONT.sans, fontSize: 36, fontWeight: 800, color: G.ink }}>邻接矩阵</div>
      </Card>
      <Card x={1010} y={130} w={800} h={720} opacity={cardIn} dy={(1 - cardIn) * 20}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 22, textAlign: "center", fontFamily: FONT.sans, fontSize: 36, fontWeight: 800, color: G.ink }}>邻接表</div>
      </Card>
      <div style={{ position: "absolute", left: 0, top: 0, opacity: cardIn }}>
        {MATRIX.map((row, i) => {
          const scanned = f >= K.matScan + i * rowStep;
          const isCur = i === curRow && f < K.matScan + 8 * rowStep + 10;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: mx - 46, top: my + i * (cell + gap) + 6, width: 38, textAlign: "right", fontSize: 22, color: G.ink2, fontFamily: FONT.sans }}>
                <VName v={i + 1} />
              </div>
              {row.map((x, j) => (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: mx + j * (cell + gap),
                    top: my + i * (cell + gap),
                    width: cell,
                    height: cell,
                    borderRadius: 6,
                    background: isCur ? tint(RUN.orange, 0.38) : scanned ? tint(RUN.orange, 0.13) : "#FFFFFF",
                    boxShadow: `inset 0 0 0 1.5px ${isCur ? RUN.orange : G.cardLine}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.mono,
                    fontWeight: 700,
                    fontSize: 22,
                    color: x ? G.ink : G.ink3,
                  }}
                >
                  {x}
                </div>
              ))}
            </React.Fragment>
          );
        })}
        {MATRIX.map((_, j) => (
          <div key={j} style={{ position: "absolute", left: mx + j * (cell + gap), width: cell, top: my - 34, textAlign: "center", fontSize: 22, color: G.ink2, fontFamily: FONT.sans }}>
            <VName v={j + 1} />
          </div>
        ))}
      </div>
      <Txt cx={510} y={714} size={66} weight={800} color={RUN.orange} font={FONT.sans} opacity={leftF}>
        O(n²)
      </Txt>
      <Txt cx={510} y={804} size={26} color={G.ink2} opacity={leftF}>
        每个顶点扫一整行：<VName v={4} letter="G" />里扫8×8＝64格
      </Txt>
      <AdjListView f={f} x={1090} y={258} rowH={56} cellH={42} lists={ADJLIST} color={RUN.green} opacity={cardIn} marks={marks} headers={0.8} />
      <Txt cx={1410} y={714} size={66} weight={800} color={RUN.green} font={FONT.sans} opacity={rightF}>
        O(n+e)
      </Txt>
      <Txt cx={1410} y={804} size={26} color={G.ink2} opacity={rightF}>
        顶点各1次＋边结点各1次：8＋18＝26个
      </Txt>
    </div>
  );
};

// ---------------------------------------------------------------- 第 9 镜：限时题
export const S9Quiz: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s9 || f > SCENE.s10 + 16) return null;
  const a = sceneAlpha(f, SCENE.s9, SCENE.s10);
  const n = K.countSec * 30;
  const ck = progress(f, K.countFrom, n, (t) => t);
  const cVis = progress(f, K.countFrom - 8, 8) * (1 - progress(f, K.reveal + 4, 10));
  const rv = progress(f, K.reveal, 10, EASE_OUT);
  // v3 先出队：图上 v1、v3、v2 依次点亮（1、2、3 号）
  const why = litState(
    f,
    [
      { v: 1, at: K.why - 8 },
      { v: 3, at: K.why - 4, from: 1 },
      { v: 2, at: K.why + 6, from: 1 },
    ],
    RUN.orange,
    { move: 8 },
  );
  const kids = progress(f, K.whyKids, 12);
  const ansIdx = QUIZ.findIndex((q) => q.label === QUIZ_ANSWER);
  const qTitle = progress(f, AT.s9a, 12);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <div style={{ position: "absolute", left: 96, top: 150, opacity: qTitle, fontFamily: FONT.sans, fontSize: 46, fontWeight: 800, color: G.ink, whiteSpace: "nowrap" }}>
        限时题：下面哪个<span style={{ color: G.bad }}>不是</span>从<VName v={1} />出发的BFS序列？
      </div>
      <Txt x={100} y={232} size={26} color={G.ink3} opacity={qTitle}>
        图还是<VName v={4} letter="G" />
      </Txt>
      <GraphView
        f={f}
        layout={G4_LAYOUT}
        edges={G4.edges}
        xf={XF_QUIZ}
        states={[why]}
        drawAt={SCENE.s9 + 4}
        rings={[{ v: 3, color: RUN.orange, k: progress(f, K.why + 10, 30) }]}
        glow={[
          { a: 3, b: 6, color: tint(G.good, 0.75), k: kids, width: 18 },
          { a: 3, b: 7, color: tint(G.good, 0.75), k: kids, width: 18 },
          { a: 2, b: 4, color: tint(G.bad, 0.55), k: kids, width: 8, dashed: true },
          { a: 2, b: 5, color: tint(G.bad, 0.55), k: kids, width: 8, dashed: true },
        ]}
      />
      {QUIZ.map((q, i) => {
        const k = progress(f, K.quizOpts + i * 6, 12, EASE_OUT);
        const y = 300 + i * 136;
        const isAns = i === ansIdx;
        const border = isAns ? mixColor(G.cardLine, G.bad, rv) : mixColor(G.cardLine, tint(G.good, 0.6), rv);
        const items = q.seq.map((v) => ({ v, at: 0 }));
        const dim = isAns ? 1 : 1 - 0.35 * rv;
        return (
          <React.Fragment key={q.label}>
            <Card x={700} y={y} w={830} h={112} opacity={k * dim} dy={(1 - k) * 16} border={border} style={{ boxShadow: `inset 0 0 0 ${isAns ? 2 + 3 * rv : 2}px ${border}, 0 8px 22px ${G.shadow}` }}>
              <div style={{ position: "absolute", left: 22, top: 26, width: 60, height: 60, borderRadius: 30, background: isAns ? mixColor(G.ink, G.bad, rv) : G.ink, color: "#FFFFFF", fontFamily: FONT.sans, fontWeight: 800, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {q.label}
              </div>
            </Card>
            <SeqRow
              f={f}
              x={806}
              y={y + 26 + (1 - k) * 16}
              items={items}
              color={RUN.blue}
              size={60}
              gap={8}
              allAt={K.quizOpts + i * 6}
              opacity={k * dim}
              colorAt={(j) => {
                if (!isAns || kids < 0.5) return undefined;
                const v = q.seq[j];
                return v === 4 || v === 5 ? G.bad : v === 6 || v === 7 ? G.good : v === 3 ? RUN.orange : undefined;
              }}
              pulse={(j) => (isAns && [4, 5, 6, 7].includes(q.seq[j]) ? bump(f, K.whyKids, 20) : 0)}
            />
            <div style={{ position: "absolute", left: 1560, top: y + 18, fontFamily: FONT.sans, fontSize: 60, fontWeight: 900, color: isAns ? G.bad : G.good, opacity: progress(f, K.reveal + (isAns ? 0 : 8 + i * 3), 10) }}>
              {isAns ? "✗" : "✓"}
            </div>
          </React.Fragment>
        );
      })}
      <Countdown cx={1770} cy={166} k={ck} n={K.countSec} opacity={cVis} />
      <div style={{ position: "absolute", left: 700, top: 852, opacity: progress(f, K.why, 12), fontFamily: FONT.sans, fontSize: 30, fontWeight: 600, color: G.ink2, whiteSpace: "nowrap" }}>
        B分层没错，错在层里的顺序：<VName v={3} />先出队，<VName v={6} />、<VName v={7} />该在<VName v={4} />、<VName v={5} />前面
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 第 10 镜：结尾（DFS 用栈 / BFS 用队列）
const OutroCard: React.FC<{ x: number; color: string; title: string; motto: string; sub: string; k: number; hi: number; children: React.ReactNode }> = ({ x, color, title, motto, sub, k, hi, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 200 + (1 - k) * 20,
      width: 680,
      height: 600,
      opacity: k,
      background: G.card,
      borderRadius: 24,
      boxShadow: `inset 0 0 0 ${2 + 3 * hi}px ${mixColor(G.cardLine, color, hi)}, 0 10px 26px ${G.shadow}`,
      transform: `scale(${1 + 0.02 * hi})`,
    }}
  >
    <div style={{ position: "absolute", left: 0, right: 0, top: 34, display: "flex", justifyContent: "center" }}>
      <Tag color={color} solid size={38}>
        {title}
      </Tag>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 120, height: 250 }}>{children}</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: FONT.sans, fontSize: 58, fontWeight: 800, color: G.ink }}>{motto}</div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 486, textAlign: "center", fontFamily: FONT.sans, fontSize: 34, fontWeight: 600, color: G.ink2 }}>{sub}</div>
  </div>
);

export const S10Outro: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s10) return null;
  const a = progress(f, SCENE.s10, 14);
  const tail = 1 - progress(f, TL.total - 20, 20);
  const kL = progress(f, SCENE.s10 + 6, 16, EASE_OUT);
  const kR = progress(f, SCENE.s10 + 14, 16, EASE_OUT);
  const hiL = progress(f, K.outroDfs, 10) * (1 - progress(f, K.outroBfs, 10));
  const hiR = progress(f, K.outroBfs, 10);
  const stackV = [4, 2, 1];
  const queueV = [4, 5, 6, 7];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a * tail }}>
      <OutroCard x={220} color={RUN.orange} title="DFS · 栈" motto="不撞南墙不回头" sub="一条道走到黑" k={kL} hi={hiL}>
        {/* 小栈：开口朝上 */}
        <div style={{ position: "absolute", left: 240, top: 0, width: 200, height: 236, borderLeft: `4px solid ${G.ink2}`, borderRight: `4px solid ${G.ink2}`, borderBottom: `4px solid ${G.ink2}`, borderRadius: "0 0 12px 12px", boxSizing: "border-box" }}>
          {stackV.map((v, i) => (
            <div key={v} style={{ position: "absolute", left: 14, top: 22 + i * 68, width: 164, height: 60, borderRadius: 12, background: "#FFFFFF", boxShadow: `inset 0 0 0 2.5px ${tint(RUN.orange, 0.7)}`, display: "flex", alignItems: "center", overflow: "hidden" }}>
              <div style={{ width: 12, alignSelf: "stretch", background: RUN.orange }} />
              <div style={{ flex: 1, textAlign: "center", fontSize: 32, color: deep(RUN.orange, 0.15), fontFamily: FONT.sans }}>
                <VName v={v} />
              </div>
            </div>
          ))}
        </div>
      </OutroCard>
      <OutroCard x={1020} color={RUN.blue} title="BFS · 队列" motto="层层扩散" sub="一圈一圈往外" k={kR} hi={hiR}>
        <div style={{ position: "absolute", left: 60, top: 80, width: 560, height: 96, borderTop: `4px solid ${G.ink2}`, borderBottom: `4px solid ${G.ink2}`, boxSizing: "border-box" }}>
          {queueV.map((v, i) => (
            <div key={v} style={{ position: "absolute", left: 30 + i * 84, top: 9 }}>
              <Pill v={v} color={RUN.blue} size={70} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 60, top: 186, fontFamily: FONT.sans, fontSize: 24, fontWeight: 700, color: G.ink2 }}>队头</div>
        <div style={{ position: "absolute", right: 60, top: 186, fontFamily: FONT.sans, fontSize: 24, fontWeight: 700, color: G.ink2 }}>队尾</div>
      </OutroCard>
    </div>
  );
};
