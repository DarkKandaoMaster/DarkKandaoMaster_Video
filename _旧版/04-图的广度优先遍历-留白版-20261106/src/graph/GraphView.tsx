// 图：顶点（白圆墨边 / 在栈里实心彩色 / 出栈后浅色）、边（灰 / 走过描色 / 退回后变浅）、
// 探邻居的虚线、指针（停在顶点上是圆环，沿边走时缩成圆点）、脉冲圈、访问顺序小圆牌。
// 状态来自 traverse.ts 的 traverseAt（可以同时传几遍，例如非连通图的几次调用）。
import React from "react";
import { mix, progress, EASE_OUT } from "../base/anim";
import { FONT, mixColor } from "../base/theme";
import { SvgVName } from "./Kit";
import { G, XF0, applyXf, deep, tint, type Layout, type Pos, type Xf } from "./theme";
import type { TState } from "./traverse";

export type GlowEdge = { a: number; b: number; color: string; k: number; dashed?: boolean; width?: number };
export type Ring = { v: number; color: string; k: number };
export type Arrow = { a: number; b: number; color: string; k: number; dashed?: boolean };

export type GraphViewProps = {
  layout: Layout;
  edges: [number, number][];
  xf?: Xf;
  opacity?: number;
  states?: TState[];
  r?: number;
  /** 出场：从这一帧开始顶点逐个弹出、边逐条画出；不给 = 一开始就在 */
  drawAt?: number;
  f: number;
  /** 每个顶点额外闪一下（0→1→0） */
  flash?: Record<number, number>;
  glow?: GlowEdge[];
  rings?: Ring[];
  arrows?: Arrow[];
  showOrder?: boolean;
  /** 只画这些顶点（默认全部） */
  only?: number[];
  /** 顶点名的字母（默认 v） */
  letter?: string;
  /** 每个顶点的透明度系数（不给 = 1）；边取两端的较小值。留白版“雾”效果用 */
  dim?: Record<number, number>;
};

const shorten = (A: Pos, B: Pos, ra: number, rb: number): [Pos, Pos] => {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const L = Math.hypot(dx, dy) || 1;
  return [
    { x: A.x + (dx / L) * ra, y: A.y + (dy / L) * ra },
    { x: B.x - (dx / L) * rb, y: B.y - (dy / L) * rb },
  ];
};

export const GraphView: React.FC<GraphViewProps> = ({
  layout,
  edges,
  xf = XF0,
  opacity = 1,
  states = [],
  r: r0 = 40,
  drawAt,
  f,
  flash = {},
  glow = [],
  rings = [],
  arrows = [],
  showOrder = true,
  only,
  letter = "v",
  dim = {},
}) => {
  const r = r0 * xf.s;
  const dv = (v: number) => dim[v] ?? 1;
  const de = (a: number, b: number) => Math.min(dv(a), dv(b));
  const P = (v: number) => applyXf(layout[v], xf);
  const ids = only ?? Object.keys(layout).map(Number);
  const order = [...ids].sort((a, b) => a - b);
  const vAppear = (v: number) => (drawAt === undefined ? 1 : progress(f, drawAt + order.indexOf(v) * 5, 14, EASE_OUT));
  const eAppear = (i: number) => (drawAt === undefined ? 1 : progress(f, drawAt + 10 + i * 4, 14));

  // 每个顶点取最后一个“点亮过它”的状态
  const vstate: Record<number, { lit: number; done: number; order: number; color: string }> = {};
  for (const s of states) {
    for (const [k, vs] of Object.entries(s.v)) {
      if (vs.lit > 0.001) vstate[Number(k)] = { lit: vs.lit, done: vs.done, order: vs.order, color: s.color };
    }
  }
  const ew = 6 * xf.s;

  return (
    <svg style={{ position: "absolute", left: 0, top: 0, opacity }} width={1920} height={1080}>
      {/* 底层边 */}
      {edges.map(([a, b], i) => {
        const k = eAppear(i);
        if (k <= 0) return null;
        const [A, B] = shorten(P(a), P(b), r * 0.9, r * 0.9);
        return <line key={`e${i}`} x1={A.x} y1={A.y} x2={mix(A.x, B.x, k)} y2={mix(A.y, B.y, k)} stroke={G.edge} strokeWidth={ew} strokeLinecap="round" opacity={de(a, b)} />;
      })}
      {/* 发光 / 候选边 */}
      {glow.map((g, i) => {
        if (g.k <= 0.001) return null;
        const [A, B] = shorten(P(g.a), P(g.b), r * 0.9, r * 0.9);
        return (
          <line
            key={`g${i}`}
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={g.color}
            strokeOpacity={g.k * de(g.a, g.b)}
            strokeWidth={(g.width ?? 10) * xf.s}
            strokeLinecap="round"
            strokeDasharray={g.dashed ? `${14 * xf.s} ${12 * xf.s}` : undefined}
          />
        );
      })}
      {/* 走过的边 */}
      {states.map((s, si) =>
        s.e.map((ed, i) => {
          if (ed.grow <= 0.001) return null;
          const [A, B] = shorten(P(ed.a), P(ed.b), r * 0.9, r * 0.9);
          const col = mixColor(s.color, "#FFFFFF", 0.55 * ed.done);
          return (
            <line
              key={`t${si}-${i}`}
              x1={A.x}
              y1={A.y}
              x2={mix(A.x, B.x, ed.grow)}
              y2={mix(A.y, B.y, ed.grow)}
              stroke={col}
              strokeWidth={ew * mix(1.5, 1.25, ed.done)}
              strokeLinecap="round"
              opacity={de(ed.a, ed.b)}
            />
          );
        }),
      )}
      {/* 探邻居：墨色小圆点沿边跑过去，碰到对方顶点的边缘就弹回来，身后拖一条墨色虚线。
          用墨色而不是遍历色：那条边就算已经描了色（来时的边），也看得出来。 */}
      {states.map((s, si) =>
        s.probes.map((pr, i) => {
          const [A, B] = shorten(P(pr.a), P(pr.b), r + 4 * xf.s, r + 9 * xf.s);
          const k = pr.k;
          const tx = mix(A.x, B.x, k);
          const ty = mix(A.y, B.y, k);
          const a = Math.min(1, pr.k * 3) * de(pr.a, pr.b);
          return (
            <g key={`p${si}-${i}`} opacity={a}>
              <line x1={A.x} y1={A.y} x2={tx} y2={ty} stroke="#FFFFFF" strokeWidth={ew * 0.95} strokeLinecap="round" opacity={0.85} />
              <line
                x1={A.x}
                y1={A.y}
                x2={tx}
                y2={ty}
                stroke={G.ink}
                strokeWidth={ew * 0.55}
                strokeLinecap="round"
                strokeDasharray={`${8 * xf.s} ${7 * xf.s}`}
              />
              <circle cx={tx} cy={ty} r={9 * xf.s} fill={G.ink} stroke="#FFFFFF" strokeWidth={2.5 * xf.s} />
            </g>
          );
        }),
      )}
      {/* 箭头（例如“出栈 = 往回退”的示意） */}
      {arrows.map((ar, i) => {
        if (ar.k <= 0.001) return null;
        const [A, B0] = shorten(P(ar.a), P(ar.b), r * 1.35, r * 1.35);
        const B = { x: mix(A.x, B0.x, ar.k), y: mix(A.y, B0.y, ar.k) };
        const ang = Math.atan2(B.y - A.y, B.x - A.x);
        const h = 18 * xf.s;
        return (
          <g key={`a${i}`} opacity={Math.min(1, ar.k * 1.5)}>
            <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={ar.color} strokeWidth={5 * xf.s} strokeLinecap="round" strokeDasharray={ar.dashed ? `${10 * xf.s} ${9 * xf.s}` : undefined} />
            <path
              d={`M ${B.x} ${B.y} L ${B.x - h * Math.cos(ang - 0.45)} ${B.y - h * Math.sin(ang - 0.45)} L ${B.x - h * Math.cos(ang + 0.45)} ${B.y - h * Math.sin(ang + 0.45)} Z`}
              fill={ar.color}
            />
          </g>
        );
      })}
      {/* 顶点 */}
      {ids.map((v) => {
        const k = vAppear(v);
        if (k <= 0) return null;
        const { x, y } = P(v);
        const s = vstate[v];
        const lit = s?.lit ?? 0;
        const done = s?.done ?? 0;
        const col = s?.color ?? G.vStroke;
        const strong = lit * (1 - done);
        const fill = mixColor(mixColor(G.vFill, tint(col, 0.2), lit * done), col, strong);
        const stroke = mixColor(G.vStroke, col, lit);
        // 字色在底色深浅过半时快速翻转（不跟着底色慢慢过渡），出栈变浅的那几帧也看得清
        const labelStrong = Math.min(1, Math.max(0, (strong - 0.42) / 0.16));
        const label = mixColor(mixColor(G.ink, deep(col, 0.12), lit * done), "#FFFFFF", labelStrong);
        const fl = flash[v] ?? 0;
        const sc = mix(0.55, 1, k) * (1 + 0.12 * fl);
        return (
          <g key={`v${v}`} transform={`translate(${x} ${y}) scale(${sc})`} opacity={k * dv(v)}>
            {fl > 0.01 ? <circle r={r + 14 * xf.s} fill={tint(G.ink, 0.1)} opacity={fl} /> : null}
            <circle r={r} fill={fill} stroke={stroke} strokeWidth={(3.5 + 1.5 * lit) * xf.s} />
            <SvgVName x={0} y={0} v={v} size={34 * xf.s} color={label} letter={letter} />
          </g>
        );
      })}
      {/* 脉冲圈 */}
      {rings.map((rg, i) => {
        if (rg.k <= 0 || rg.k >= 1) return null;
        const { x, y } = P(rg.v);
        return <circle key={`r${i}`} cx={x} cy={y} r={r + (8 + 34 * rg.k) * xf.s} fill="none" stroke={rg.color} strokeWidth={(7 - 4 * rg.k) * xf.s} opacity={(1 - rg.k) * dv(rg.v)} />;
      })}
      {/* 指针 */}
      {states.map((s, si) => {
        const pt = s.ptr;
        if (!pt || pt.vis <= 0.001) return null;
        // 停着：顶点外一圈墨色圆环（不压顶点里的字）。
        // 走着：起点圆环淡出、终点圆环淡入，中间一个实心小圆点只在两个顶点圆之间的那段边上走，永远不盖住标签。
        const A = P(pt.a);
        const B = P(pt.b);
        const R0 = r + 12 * xf.s;
        const sw = 5 * xf.s;
        if (pt.a === pt.b || pt.t >= 1) {
          const C = pt.t >= 1 ? B : A;
          return (
            <g key={`ptr${si}`} opacity={pt.vis}>
              <circle cx={C.x} cy={C.y} r={R0} fill="none" stroke={G.ink} strokeWidth={sw} />
            </g>
          );
        }
        const t = pt.t;
        const [A1, B1] = shorten(A, B, R0, R0);
        const bx = mix(A1.x, B1.x, t);
        const by = mix(A1.y, B1.y, t);
        const ringA = 1 - Math.min(1, t / 0.35);
        const ringB = Math.max(0, (t - 0.65) / 0.35);
        return (
          <g key={`ptr${si}`} opacity={pt.vis}>
            {ringA > 0 ? <circle cx={A.x} cy={A.y} r={R0} fill="none" stroke={G.ink} strokeWidth={sw} opacity={ringA} /> : null}
            {ringB > 0 ? <circle cx={B.x} cy={B.y} r={R0} fill="none" stroke={G.ink} strokeWidth={sw} opacity={ringB} /> : null}
            <circle cx={bx} cy={by} r={12 * xf.s} fill={G.ink} stroke="#FFFFFF" strokeWidth={2.5 * xf.s} />
          </g>
        );
      })}
      {/* 访问顺序小圆牌（画在指针上面，不被圆环挡住） */}
      {showOrder
        ? ids.map((v) => {
            const s = vstate[v];
            if (!s || s.lit < 0.01) return null;
            const { x, y } = P(v);
            const bx = x + r * 0.95;
            const by = y - r * 0.95;
            const br = 15 * xf.s;
            return (
              <g key={`o${v}`} transform={`translate(${bx} ${by}) scale(${s.lit})`}>
                <circle r={br} fill="#FFFFFF" stroke={s.color} strokeWidth={2.5 * xf.s} />
                <text y={1} textAnchor="middle" dominantBaseline="central" fill={deep(s.color, 0.1)} style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 19 * xf.s }}>
                  {s.order}
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
};
