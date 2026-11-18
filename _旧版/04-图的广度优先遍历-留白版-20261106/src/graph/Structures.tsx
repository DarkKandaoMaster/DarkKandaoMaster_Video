// 数据结构面板：递归栈（StackView）、数组（ArrayView，visited 用）、序列行（SeqRow）、队列（QueueView，BFS 用）。
// 都是绝对定位的 HTML，状态从 traverse.ts 来，或者由调用方直接给。
import React from "react";
import { mix, progress, EASE_CAMERA, EASE_OUT } from "../base/anim";
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

// ---------------------------------------------------------------- 队列（BFS 用）
/** ghost = 假设的元素（例如“出队才标记”时多进的一个），红色虚线，outAt 时原地淡掉 */
export type QueueIt = { v: number; inAt: number; outAt?: number; ghost?: boolean };

export type QueueViewProps = {
  /** 队列管左端（队头）的 x */
  x: number;
  /** 元素顶边的 y */
  y: number;
  f: number;
  items: QueueIt[];
  color: string;
  cell?: number;
  gap?: number;
  cap?: number;
  opacity?: number;
  /** “出队”格的 x：出队的元素滑到这里停着，下一个出队时淡掉；不给 = 往左飞出淡掉 */
  curX?: number;
  /** 最后一个停在“出队”格里的元素从这一帧起淡掉 */
  clearAt?: number;
  /** 管下面的“队头 / 队尾 / 出队”字样透明度 */
  labels?: number;
  /** 管本身的透明度（由别的形状变过来时用） */
  tube?: number;
  /** 给连续几格套一个灰框（例如“现在队里正好是第 2 层”） */
  hi?: { from: number; n: number; k: number; label?: React.ReactNode };
  /** 第 i 个元素额外闪一下（0→1→0） */
  pulse?: (i: number) => number;
};

/** 水平队列：左边是队头，右边是队尾（入队从上方落进最后一格）；出队的元素滑进左边的“出队”格，剩下的平滑左移补位 */
export const QueueView: React.FC<QueueViewProps> = ({
  x,
  y,
  f,
  items,
  color,
  cell = 70,
  gap = 8,
  cap = 6,
  opacity = 1,
  curX,
  clearAt,
  labels = 1,
  tube = 1,
  hi,
  pulse,
}) => {
  const step = cell + gap;
  const w = cap * step + gap;
  const fs = Math.max(16, cell * 0.32);
  const outK = (it: QueueIt) => (it.outAt === undefined ? 0 : progress(f, it.outAt, 12, EASE_CAMERA));
  const outs = items.filter((it) => !it.ghost && it.outAt !== undefined).map((it) => it.outAt as number).sort((a, b) => a - b);
  const leaveAt = (t: number) => {
    const nx = outs.find((o) => o > t);
    return nx ?? clearAt ?? Infinity;
  };
  const lbl = (left: number, text: string, width = 120) => (
    <div style={{ position: "absolute", left: left - width / 2, width, top: y + cell + 14, textAlign: "center", fontFamily: FONT.sans, fontSize: fs * 0.88, fontWeight: 500, color: G.ink3, opacity: labels }}>
      {text}
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity, pointerEvents: "none" }}>
      {/* 管：上下两条边，两头开口 */}
      <div
        style={{
          position: "absolute",
          left: x - 6,
          top: y - 8,
          width: w + 6,
          height: cell + 16,
          boxSizing: "border-box",
          borderTop: `4px solid ${G.ink2}`,
          borderBottom: `4px solid ${G.ink2}`,
          background: "rgba(255,255,255,0.6)",
          opacity: tube,
        }}
      />
      {curX !== undefined ? (
        <>
          <div
            style={{
              position: "absolute",
              left: curX - 6,
              top: y - 6,
              width: cell + 12,
              height: cell + 12,
              boxSizing: "border-box",
              borderRadius: cell * 0.32,
              border: `3px dashed ${G.ink3}`,
              opacity: tube * labels,
            }}
          />
          <svg style={{ position: "absolute", left: 0, top: 0, opacity: tube * labels }} width={1920} height={1080}>
            <line x1={x - 14} y1={y + cell / 2} x2={curX + cell + 18} y2={y + cell / 2} stroke={G.ink3} strokeWidth={3} />
            <path d={`M ${curX + cell + 12} ${y + cell / 2} l 10 -7 l 0 14 Z`} fill={G.ink3} />
          </svg>
          {lbl(curX + cell / 2, "出队")}
        </>
      ) : null}
      {lbl(x + gap / 2 + cell / 2, "队头")}
      {lbl(x + w - gap / 2 - cell / 2, "队尾")}
      {hi && hi.k > 0.001 ? (
        <div style={{ position: "absolute", left: x + gap / 2 + hi.from * step - 9, top: y - 13, width: hi.n * step - gap + 18, height: cell + 26, boxSizing: "border-box", borderRadius: 14, border: `3.5px solid ${G.ink2}`, background: "rgba(85, 91, 107, 0.07)", opacity: hi.k }}>
          {hi.label ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: -40, textAlign: "center", fontFamily: FONT.sans, fontSize: 24, fontWeight: 700, color: G.ink2, whiteSpace: "nowrap" }}>{hi.label}</div>
          ) : null}
        </div>
      ) : null}
      {items.map((it, i) => {
        const kin = progress(f, it.inAt, 12, EASE_OUT);
        if (kin <= 0) return null;
        const ko = outK(it);
        let slot = 0;
        for (let j = 0; j < i; j++) if (f >= items[j].inAt) slot += 1 - outK(items[j]);
        const qx = x + gap / 2 + slot * step;
        const pl = pulse ? pulse(i) : 0;
        if (it.ghost) {
          const a = Math.min(kin, 1 - ko);
          if (a <= 0.001) return null;
          return (
            <div key={i} style={{ position: "absolute", left: qx, top: y - (1 - kin) * 40, opacity: a }}>
              <Pill v={it.v} color={G.bad} size={cell} ghost style={{ boxShadow: `inset 0 0 0 3px ${G.bad}`, outline: `3px dashed ${G.bad}`, outlineOffset: 2 }} />
              <svg style={{ position: "absolute", left: 0, top: 0 }} width={cell} height={cell}>
                <line x1={cell * 0.12} y1={cell * 0.88} x2={cell * 0.88} y2={cell * 0.12} stroke={G.bad} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
              </svg>
            </div>
          );
        }
        let left: number;
        let a = kin;
        if (curX !== undefined) {
          left = qx + (curX - qx) * ko;
          if (it.outAt !== undefined) a *= 1 - progress(f, leaveAt(it.outAt), 10);
        } else {
          left = qx - ko * 60;
          a = Math.min(kin, 1 - ko);
        }
        if (a <= 0.001) return null;
        const dropOut = curX !== undefined && it.outAt !== undefined ? progress(f, leaveAt(it.outAt), 10) * 30 : 0;
        return (
          <div key={i} style={{ position: "absolute", left, top: y - (1 - kin) * 40 + dropOut, opacity: a }}>
            <Pill v={it.v} color={color} size={cell} ghost={curX !== undefined && ko > 0.5} scale={1 + 0.14 * pl} />
          </div>
        );
      })}
    </div>
  );
};
