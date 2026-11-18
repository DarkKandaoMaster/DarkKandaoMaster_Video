// 数据结构面板：递归栈（StackView）、数组（ArrayView，visited 用）、序列行（SeqRow）、队列（QueueView，给 BFS 留的）。
// 都是绝对定位的 HTML，状态从 traverse.ts 来，或者由调用方直接给。
import React from "react";
import { mix, progress, EASE_OUT } from "../base/anim";
import { FONT, mixColor } from "../base/theme";
import { Pill, VName } from "./Kit";
import { G, deep, tint } from "./theme";
import { stackDepth, stackTop, type Cell, type SeqIt, type StackIt } from "./traverse";

// ---------------------------------------------------------------- 栈
export type StackViewProps = {
  x: number;
  /** 槽底的 y */
  yBottom: number;
  w?: number;
  /** 每格高 */
  h?: number;
  gap?: number;
  /** 槽能放几格（决定槽高） */
  cap?: number;
  items: StackIt[];
  color: string;
  opacity?: number;
  label?: string;
  /** 栈顶描边强调（0→1），例如撞南墙描红 */
  topFlash?: { k: number; color: string };
  /** 栈顶标记“栈顶 ▸”的透明度 */
  topMark?: number;
  /** 栈顶格额外的高亮（0→1→0） */
  topPulse?: number;
};

export const StackView: React.FC<StackViewProps> = ({
  x,
  yBottom,
  w = 200,
  h = 62,
  gap = 4,
  cap = 6,
  items,
  color,
  opacity = 1,
  label = "递归栈",
  topFlash,
  topMark = 1,
  topPulse = 0,
}) => {
  const step = h + gap;
  const wellTop = yBottom - cap * step - 10;
  const top = stackTop(items);
  const depth = stackDepth(items);
  const markY = yBottom - 6 - (depth - 0.5) * step;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity, pointerEvents: "none" }}>
      {/* 槽：开口朝上 */}
      <svg style={{ position: "absolute", left: x - 16, top: wellTop }} width={w + 32} height={yBottom - wellTop + 16}>
        <path
          d={`M 6 0 L 6 ${yBottom - wellTop + 4} Q 6 ${yBottom - wellTop + 10} 12 ${yBottom - wellTop + 10} L ${w + 20} ${yBottom - wellTop + 10} Q ${w + 26} ${yBottom - wellTop + 10} ${w + 26} ${yBottom - wellTop + 4} L ${w + 26} 0`}
          fill="rgba(255,255,255,0.55)"
          stroke={G.ink2}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </svg>
      {items.map((it, i) => {
        if (it.inK <= 0.001 || it.outK >= 0.999) return null;
        const y = yBottom - 6 - (it.depth + 1) * step + gap;
        const dy = -(1 - it.inK) * 46 - it.outK * 80;
        const a = Math.min(it.inK, 1 - it.outK);
        const isTop = top === it;
        const fl = isTop && topFlash ? topFlash.k : 0;
        const pl = isTop ? topPulse : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y + dy,
              width: w,
              height: h,
              borderRadius: 12,
              background: mixColor("#FFFFFF", tint(color, 0.3), pl),
              boxShadow: `inset 0 0 0 ${2.5 + 2 * fl + 1.5 * pl}px ${mixColor(tint(color, 0.7), topFlash?.color ?? color, Math.max(fl, pl))}, 0 4px 10px ${G.shadow}`,
              opacity: a,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <div style={{ width: 12, alignSelf: "stretch", background: color }} />
            <div style={{ flex: 1, textAlign: "center", fontSize: 34, color: deep(color, 0.15), fontFamily: FONT.sans }}>
              <VName v={it.v} />
            </div>
          </div>
        );
      })}
      {/* 栈顶标记 */}
      {depth > 0.3 ? (
        <div
          style={{
            position: "absolute",
            left: x - 92,
            top: markY - 17,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 700,
            color: G.ink2,
            opacity: topMark * Math.min(1, depth),
            whiteSpace: "nowrap",
          }}
        >
          栈顶 ▸
        </div>
      ) : null}
      <div style={{ position: "absolute", left: x - 40, width: w + 80, top: yBottom + 14, textAlign: "center", fontFamily: FONT.sans, fontSize: 26, fontWeight: 700, color: G.ink2 }}>
        {label}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 数组（visited）
export type ArrayViewProps = {
  x: number;
  y: number;
  n: number;
  cell?: number;
  gap?: number;
  cells: Record<number, Cell>;
  color: string;
  opacity?: number;
  title?: string;
  /** 每格上方的名字（默认 v_i） */
  names?: (i: number) => React.ReactNode;
  /** 关的值 / 开的值 */
  off?: string;
  on?: string;
  /** 每格单独的颜色（非连通图几次调用颜色不同时用） */
  colorOf?: (i: number) => string;
  /** 循环指针：指着第几格（1 起，可以是小数，平滑移动） */
  cursor?: { i: number; vis: number; label?: string };
};

export const ArrayView: React.FC<ArrayViewProps> = ({
  x,
  y,
  n,
  cell = 84,
  gap = 6,
  cells,
  color,
  opacity = 1,
  title = "visited",
  names,
  off = "F",
  on = "T",
  colorOf,
  cursor,
}) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity, pointerEvents: "none" }}>
    {title ? (
      <div style={{ position: "absolute", left: x, top: y - 92, fontFamily: FONT.mono, fontSize: 30, fontWeight: 700, color: G.ink2 }}>{title}</div>
    ) : null}
    {Array.from({ length: n }, (_, k) => {
      const i = k + 1;
      const c = cells[i] ?? { on: 0, flash: 0 };
      const col = colorOf ? colorOf(i) : color;
      const cx = x + k * (cell + gap);
      return (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: cx, width: cell, top: y - 48, textAlign: "center", fontSize: 26, color: G.ink2, fontFamily: FONT.sans }}>
            {names ? names(i) : <VName v={i} />}
          </div>
          <div
            style={{
              position: "absolute",
              left: cx,
              top: y,
              width: cell,
              height: cell,
              borderRadius: 12,
              background: mixColor("#FFFFFF", tint(col, 0.24), c.on),
              boxShadow: `inset 0 0 0 ${2.5 + 3 * c.flash}px ${mixColor(mixColor(G.cardLine, col, c.on), deep(col, 0.1), c.flash)}`,
              transform: `scale(${1 + 0.05 * c.flash})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT.mono,
              fontWeight: 700,
              fontSize: cell * 0.46,
            }}
          >
            <span style={{ position: "absolute", color: G.ink3, opacity: 1 - c.on }}>{off}</span>
            <span style={{ position: "absolute", color: deep(col, 0.12), opacity: c.on }}>{on}</span>
          </div>
        </React.Fragment>
      );
    })}
    {cursor && cursor.vis > 0.001 ? (
      <div
        style={{
          position: "absolute",
          left: x + (cursor.i - 1) * (cell + gap) - 3,
          top: y - 3,
          width: cell + 6,
          height: cell + 6,
          borderRadius: 14,
          boxShadow: `0 0 0 3.5px ${G.ink}`,
          opacity: cursor.vis,
        }}
      >
        {cursor.label ? (
          <div style={{ position: "absolute", top: cell + 16, left: -40, width: cell + 88, textAlign: "center", fontFamily: FONT.mono, fontSize: 24, fontWeight: 700, color: G.ink }}>
            ▲ {cursor.label}
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
);

// ---------------------------------------------------------------- 序列行
export type SeqRowProps = {
  x: number;
  y: number;
  items: SeqIt[];
  color: string;
  f: number;
  size?: number;
  gap?: number;
  label?: React.ReactNode;
  opacity?: number;
  /** 第 i 个药丸额外的放大闪动（0→1→0） */
  pulse?: (i: number) => number;
  /** 第 i 个药丸改成别的颜色（例如限时题标红） */
  colorAt?: (i: number) => string | undefined;
  /** 从这一帧起整行显示（忽略 items 的 at） */
  allAt?: number;
};

export const SeqRow: React.FC<SeqRowProps> = ({ x, y, items, color, f, size = 50, gap = 6, label, opacity = 1, pulse, colorAt, allAt }) => (
  <div style={{ position: "absolute", left: x, top: y, opacity }}>
    {label ? <div style={{ position: "absolute", top: -34, left: 0, fontFamily: FONT.sans, fontSize: 22, fontWeight: 700, color: deep(color, 0.12), whiteSpace: "nowrap" }}>{label}</div> : null}
    <div style={{ display: "flex", gap }}>
      {items.map((it, i) => {
        const k = progress(f, allAt ?? it.at, 10, EASE_OUT);
        const pl = pulse ? pulse(i) : 0;
        return <Pill key={i} v={it.v} color={colorAt?.(i) ?? color} size={size} scale={mix(0.4, 1, k) * (1 + 0.16 * pl)} opacity={k} />;
      })}
    </div>
  </div>
);

// ---------------------------------------------------------------- 队列（BFS 用；DFS 这条没用到）
export type QueueIt = { v: number; inAt: number; outAt?: number };

/** 水平队列：左边是队头（出队往左飞出），右边是队尾（入队从右边落进来）；剩下的元素平滑左移补位 */
export const QueueView: React.FC<{
  x: number;
  y: number;
  f: number;
  items: QueueIt[];
  color: string;
  cell?: number;
  gap?: number;
  cap?: number;
  opacity?: number;
  label?: string;
}> = ({ x, y, f, items, color, cell = 70, gap = 8, cap = 8, opacity = 1, label = "队列" }) => {
  const step = cell + gap;
  const w = cap * step + gap;
  // 每个元素的位置 = 它前面还在队里（未出队）的元素个数，出队动画期间连续变化
  const outK = (it: QueueIt) => (it.outAt === undefined ? 0 : progress(f, it.outAt, 12));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x - 8,
          top: y - 8,
          width: w + 8,
          height: cell + 16,
          borderTop: `4px solid ${G.ink2}`,
          borderBottom: `4px solid ${G.ink2}`,
          background: "rgba(255,255,255,0.55)",
        }}
      />
      <div style={{ position: "absolute", left: x - 70, top: y + cell / 2 - 16, fontFamily: FONT.sans, fontSize: 22, fontWeight: 700, color: G.ink2 }}>队头</div>
      <div style={{ position: "absolute", left: x + w + 10, top: y + cell / 2 - 16, fontFamily: FONT.sans, fontSize: 22, fontWeight: 700, color: G.ink2 }}>队尾</div>
      {items.map((it, i) => {
        const kin = progress(f, it.inAt, 12, EASE_OUT);
        if (kin <= 0) return null;
        const ko = outK(it);
        if (ko >= 1) return null;
        let slot = 0;
        for (let j = 0; j < i; j++) slot += progress(f, items[j].inAt, 1) * (1 - outK(items[j]));
        const left = x + gap / 2 + slot * step - ko * 60;
        return (
          <div key={i} style={{ position: "absolute", left, top: y - (1 - kin) * 40, opacity: Math.min(kin, 1 - ko) }}>
            <Pill v={it.v} color={color} size={cell} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: x, width: w, top: y + cell + 18, textAlign: "center", fontFamily: FONT.sans, fontSize: 26, fontWeight: 700, color: G.ink2 }}>{label}</div>
    </div>
  );
};
