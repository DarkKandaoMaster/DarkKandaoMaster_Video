// 第 6–9 镜：非连通图、复杂度、限时题、结尾。
import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE_OUT, mix, progress } from "../base/anim";
import { FONT, mixColor } from "../base/theme";
import { AdjListView, type NodeMark } from "../graph/AdjListView";
import { GraphView } from "../graph/GraphView";
import { Card, Countdown, Tag, Txt, VName, bump } from "../graph/Kit";
import { ArrayView, SeqRow } from "../graph/Structures";
import { G, RUN, RUN_ORDER, applyXf, deep, tint } from "../graph/theme";
import { pathState, traverseAt, type Cell, type SeqIt } from "../graph/traverse";
import { G4_LAYOUT, G6_BLOBS, G6_LAYOUT, XF_QUIZ } from "./layout";
import { AT, K, SCENE, T_G6, G6_LOOP, TL } from "./timeline";
import { ADJLIST, G4, G6, G6_CALLS, QUIZ, QUIZ_ANSWER } from "./trace.generated";

const sceneAlpha = (f: number, from: number, to: number) => Math.min(progress(f, from, 14), 1 - progress(f, to, 14));

// ---------------------------------------------------------------- 第 6 镜：非连通图
export const S6Disconnected: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s6 || f > SCENE.s7 + 16) return null;
  const a = sceneAlpha(f, SCENE.s6, SCENE.s7);
  const states = G6_CALLS.map((evs, i) => traverseAt(f, evs, T_G6[i], { color: RUN_ORDER[i], move: 8, back: 8, probe: 8 }));
  // visited：每格用它所在那次调用的颜色
  const cells: Record<number, Cell> = {};
  const callOf: Record<number, number> = {};
  states.forEach((s, i) => {
    for (const [v, c] of Object.entries(s.cells)) {
      cells[Number(v)] = c;
      callOf[Number(v)] = i;
    }
  });
  // 循环指针：依次停在 v1…v6
  const cs = G6_LOOP.cursor;
  let ci = 1;
  cs.forEach((t, i) => {
    if (i > 0) ci = mix(ci, i + 1, progress(f, t, 6));
  });
  const curVis = progress(f, cs[0] - 6, 8) * (1 - progress(f, K.g6Comp + 10, 10));
  const calls = T_G6.map((ts) => ts[0] as number);
  const nCalls = calls.filter((t) => f >= t).length;
  const callPulse = calls.reduce((m, t) => Math.max(m, bump(f, t, 18)), 0);
  const codeHi = progress(f, K.g6Code, 10);
  const comp = progress(f, K.g6Comp, 16, EASE_OUT);
  const three = progress(f, K.g6Three, 12);
  const seqs: SeqIt[][] = states.map((s) => s.seq);
  const seqX = [1100, 1100 + 3 * 56 + 40, 1100 + 5 * 56 + 80];

  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Txt x={96} y={150} size={30} weight={700} color={G.ink2}>
        非连通图：6个顶点，3块
      </Txt>
      {/* 连通分量外框 */}
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
      <GraphView f={f} layout={G6_LAYOUT} edges={G6.edges} states={states} drawAt={SCENE.s6 + 4} />
      {/* 代码卡 */}
      <Card x={1060} y={140} w={790} h={196}>
        <div style={{ position: "absolute", left: 28, top: 16, fontFamily: FONT.mono, fontSize: 22, color: G.ink3 }}>DFSTraverse(G)</div>
        <div style={{ position: "absolute", left: 28, top: 58, fontFamily: FONT.mono, fontSize: 31, color: G.ink, lineHeight: 1.6, whiteSpace: "pre" }}>
          {"for (v = 0; v < G.vexnum; ++v)\n"}
          <span
            style={{
              background: mixColor("#FFFFFF", tint(RUN.orange, 0.35), Math.max(codeHi * 0.6, callPulse)),
              borderRadius: 6,
              padding: "2px 6px",
              marginLeft: -6,
            }}
          >
            {"    if (!visited[v]) DFS(G, v);"}
          </span>
        </div>
      </Card>
      <ArrayView
        x={1100}
        y={474}
        n={6}
        cell={84}
        gap={8}
        cells={cells}
        color={RUN.orange}
        colorOf={(i) => RUN_ORDER[callOf[i] ?? 0]}
        cursor={{ i: ci, vis: curVis }}
      />
      {/* 调用次数 */}
      <div style={{ position: "absolute", left: 1100, top: 612, fontFamily: FONT.sans, fontSize: 38, fontWeight: 700, color: G.ink, whiteSpace: "nowrap" }}>
        调用DFS：
        <span style={{ display: "inline-block", minWidth: 40, textAlign: "center", color: RUN_ORDER[Math.max(0, nCalls - 1)], transform: `scale(${1 + 0.3 * callPulse})` }}>{nCalls}</span>
        次
        <span style={{ opacity: three, marginLeft: 18 }}>
          <Tag color={G.good} solid size={32}>
            ＝ 3个连通分量
          </Tag>
        </span>
      </div>
      {/* 每次调用访问到的顶点 */}
      <Txt x={1100} y={706} size={24} weight={700} color={G.ink2} opacity={progress(f, calls[0], 10)}>
        每次调用访问到
      </Txt>
      {seqs.map((items, i) => (
        <SeqRow key={i} f={f} x={seqX[i]} y={750} items={items} color={RUN_ORDER[i]} size={50} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- 第 7 镜：复杂度
const MATRIX = (() => {
  const m: number[][] = Array.from({ length: G4.n }, () => Array(G4.n).fill(0));
  for (const [a, b] of G4.edges) {
    m[a - 1][b - 1] = 1;
    m[b - 1][a - 1] = 1;
  }
  return m;
})();

export const S7Complexity: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s7 || f > SCENE.s8 + 16) return null;
  const a = sceneAlpha(f, SCENE.s7, SCENE.s8);
  const cardIn = progress(f, SCENE.s7 + 6, 16, EASE_OUT);
  const cell = 44;
  const gap = 4;
  const mx = 120 + (780 - (8 * (cell + gap) - gap)) / 2 + 14;
  const my = 236;
  const rowStep = 7;
  const curRow = Math.floor((f - K.matScan) / rowStep);
  const leftF = progress(f, K.matScan + 8 * rowStep, 12);
  const rightF = progress(f, K.listScan + 18 * 3 + 6, 12);
  // 邻接表 18 个边结点依次点亮（每个 3 帧）
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
      {/* 矩阵 */}
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
      {/* 邻接表 */}
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

// ---------------------------------------------------------------- 第 8 镜：限时题
export const S8Quiz: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s8 || f > SCENE.s9 + 16) return null;
  const a = sceneAlpha(f, SCENE.s8, SCENE.s9);
  const n = K.countSec * 30;
  const ck = progress(f, K.countFrom, n, (t) => t);
  const cVis = progress(f, K.countFrom - 8, 8) * (1 - progress(f, K.reveal + 4, 10));
  const rv = progress(f, K.reveal, 10, EASE_OUT);
  const why = pathState(f, [1, 2, 4], K.why, 12, RUN.orange);
  const no = progress(f, K.whyNo, 12);
  const P4 = applyXf(G4_LAYOUT[4], XF_QUIZ);
  const P5 = applyXf(G4_LAYOUT[5], XF_QUIZ);
  const ansIdx = QUIZ.findIndex((q) => q.label === QUIZ_ANSWER);
  const qTitle = progress(f, AT.s8a, 12);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <div style={{ position: "absolute", left: 96, top: 150, opacity: qTitle, fontFamily: FONT.sans, fontSize: 46, fontWeight: 800, color: G.ink, whiteSpace: "nowrap" }}>
        限时题：下面哪个<span style={{ color: G.bad }}>不是</span>从<VName v={1} />出发的DFS序列？
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
        showOrder={false}
        drawAt={SCENE.s8 + 4}
        glow={[
          { a: 4, b: 8, color: tint(G.good, 0.7), k: no, width: 18 },
          { a: 4, b: 5, color: G.bad, k: no, width: 6, dashed: true },
        ]}
      />
      {no > 0.01 ? (
        <div
          style={{
            position: "absolute",
            left: (P4.x + P5.x) / 2 - 22,
            top: (P4.y + P5.y) / 2 - 60,
            fontFamily: FONT.sans,
            fontSize: 44,
            fontWeight: 900,
            color: G.bad,
            opacity: no,
            transform: `scale(${mix(1.6, 1, no)})`,
          }}
        >
          ✗
        </div>
      ) : null}
      {QUIZ.map((q, i) => {
        const k = progress(f, K.quizOpts + i * 6, 12, EASE_OUT);
        const y = 300 + i * 136;
        const isAns = i === ansIdx;
        const border = isAns ? mixColor(G.cardLine, G.bad, rv) : mixColor(G.cardLine, tint(G.good, 0.6), rv);
        const items = q.seq.map((v) => ({ v, at: 0 }));
        return (
          <React.Fragment key={q.label}>
            <Card x={700} y={y} w={830} h={112} opacity={k * (isAns ? 1 : 1 - 0.35 * rv)} dy={(1 - k) * 16} border={border} style={{ boxShadow: `inset 0 0 0 ${isAns ? 2 + 3 * rv : 2}px ${border}, 0 8px 22px ${G.shadow}` }}>
              <div
                style={{
                  position: "absolute",
                  left: 22,
                  top: 26,
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  background: isAns ? mixColor(G.ink, G.bad, rv) : G.ink,
                  color: "#FFFFFF",
                  fontFamily: FONT.sans,
                  fontWeight: 800,
                  fontSize: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
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
              opacity={k * (isAns ? 1 : 1 - 0.35 * rv)}
              colorAt={(j) => (isAns && rv > 0.5 ? (j === 3 ? G.bad : j === 2 ? RUN.orange : undefined) : undefined)}
              pulse={(j) => (isAns && j === 3 ? bump(f, K.whyNo, 20) : 0)}
            />
            <div
              style={{
                position: "absolute",
                left: 1560,
                top: y + 18,
                fontFamily: FONT.sans,
                fontSize: 60,
                fontWeight: 900,
                color: isAns ? G.bad : G.good,
                opacity: progress(f, K.reveal + (isAns ? 0 : 8 + i * 3), 10),
              }}
            >
              {isAns ? "✗" : "✓"}
            </div>
          </React.Fragment>
        );
      })}
      <Countdown cx={1770} cy={166} k={ck} n={K.countSec} opacity={cVis} />
      <div style={{ position: "absolute", left: 700, top: 852, opacity: progress(f, K.why, 12), fontFamily: FONT.sans, fontSize: 30, fontWeight: 600, color: G.ink2, whiteSpace: "nowrap" }}>
        C错在：到<VName v={4} />时<VName v={8} />还没访问，下一步只能是<VName v={8} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 第 9 镜：结尾
export const S9Outro: React.FC = () => {
  const f = useCurrentFrame();
  if (f < SCENE.s9) return null;
  const a = progress(f, SCENE.s9, 14);
  const m = progress(f, SCENE.s9 + 8, 16, EASE_OUT);
  const l2 = progress(f, AT.s9a + 4, 14);
  const nx = progress(f, K.outro2, 14, EASE_OUT);
  const tail = 1 - progress(f, TL.total - 20, 20);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a * tail }}>
      <Txt cx={960} y={330} size={120} weight={800} opacity={m} dy={(1 - m) * 20}>
        不撞南墙不回头
      </Txt>
      <div style={{ position: "absolute", left: 960 - 420, top: 490, width: 840 * progress(f, SCENE.s9 + 18, 18), height: 10, borderRadius: 6, background: RUN.orange, opacity: m }} />
      <Txt cx={960} y={540} size={48} weight={600} color={G.ink2} opacity={l2} dy={(1 - l2) * 14}>
        一条道走到黑，走不通就退一步
      </Txt>
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, display: "flex", justifyContent: "center", opacity: nx, transform: `translateY(${(1 - nx) * 16}px)` }}>
        <Tag color={RUN.blue} size={36}>
          下期 · BFS：层层扩散
        </Tag>
      </div>
    </div>
  );
};
