// 匹配场景（第 1、2、3、5、6 镜）共用的小件与"按步推进"的计算：
// runSteps 把 data.ts 的逐步比较记录 + 每步的时间表，换算成某一帧的小 i 位置、模式头位置 h、比较竖线、格子状态、计数。
// 全部是 frame 的纯函数（progress / mix / hopLift），不用 CSS transition。
import React from "react";
import { EASE_BACK, EASE_IN, EASE_OUT, hopLift, mix, progress } from "../base/anim";
import { L } from "../base/paper";
import { FONT, hexA } from "../base/theme";
import { Compare, type CmpState } from "./Compare";
import type { Step } from "./data";
import { KC, M, mainCX } from "./layout";
import type { CellWeights } from "./StringRow";

// ───────────────────────── 时间小工具 ─────────────────────────
/** [start, end) 可见：start 起 inDur 帧淡入，end 前 outDur 帧淡出 */
export const win = (f: number, start: number, end: number, inDur = 12, outDur = 10): number =>
  Math.min(progress(f, start, inDur), 1 - progress(f, end - outDur, outDur, EASE_IN));

/** 0 → 1 → 0 的正弦拱（闪一下） */
export const pulse = (f: number, start: number, dur = 14): number => {
  const t = progress(f, start, dur, (x) => x);
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
};

/** 一镜的整体透明度：开头 inDur 帧淡入、结尾 outDur 帧淡出（0 = 不做） */
export const sceneAlpha = (f: number, s: { from: number; dur: number }, inDur: number, outDur: number): number => {
  const a = inDur > 0 ? progress(f, s.from, inDur) : 1;
  // 最后一帧（from + dur − 1）恰好为 0
  const b = outDur > 0 ? 1 - progress(f, s.from + s.dur - 1 - outDur, outDur, EASE_IN) : 1;
  return Math.min(a, b);
};

// ───────────────────────── 分段移动（带跳起高度）─────────────────────────
export type Move = { at: number; to: number; dur?: number; ease?: (t: number) => number; lift?: number };

/** 从 init 出发依次走到每个 key；返回当前值、跳起高度（px）、落地挤压量（0..1） */
export const follow = (f: number, init: number, keys: ReadonlyArray<Move>, defDur = 12, defEase: (t: number) => number = EASE_BACK) => {
  let v = init;
  let lift = 0;
  let land = 0;
  const ks = [...keys].sort((a, b) => a.at - b.at);
  for (const k of ks) {
    if (f < k.at) break;
    const dur = k.dur ?? defDur;
    const from = v;
    v = mix(v, k.to, progress(f, k.at, dur, k.ease ?? defEase));
    const height = k.lift ?? Math.min(80, 12 + 12 * Math.abs(k.to - from));
    lift += hopLift(f, k.at, dur, height);
    land = Math.max(land, pulse(f, k.at + dur - 3, 9));
  }
  return { v, lift, land };
};

// ───────────────────────── 按步推进 ─────────────────────────
/**
 * 每一步的时间：t = 竖线开始画，m = 出结果（tick / ×），mvI / mvH = 之后小 i / 模式头开始移动。
 * 默认 m = t + 6，mvI = mvH = m + 6。tripEnd = 这一趟的竖线和淡绿何时淡掉（默认 = 本趟模式头离开的时刻）。
 * lookAt = 失配后 next 格亮起的时刻（默认 m + 3）。
 */
export type Sched = {
  t: number;
  m?: number;
  mvI?: number;
  mvH?: number;
  iDur?: number;
  iEase?: (t: number) => number;
  iLift?: number;
  hDur?: number;
  hEase?: (t: number) => number;
  tripEnd?: number;
  lookAt?: number;
};

export type CmpView = { key: string; cx: number; state: CmpState; draw: number; mark: number; opacity: number };

const NEVER = 1e9;

export const runSteps = (
  f: number,
  steps: ReadonlyArray<Step>,
  sched: ReadonlyArray<Sched>,
  init: { i: number; h: number },
  extra?: { i?: ReadonlyArray<Move>; h?: ReadonlyArray<Move> },
) => {
  const it = sched.map((s, k) => {
    const st = steps[k];
    const m = s.m ?? s.t + 6;
    return { st, s, t: s.t, m, mvI: s.mvI ?? m + 6, mvH: s.mvH ?? m + 6 };
  });
  const tripEnd = it.map((x, k) => {
    if (x.s.tripEnd !== undefined) return x.s.tripEnd;
    for (let q = k; q < it.length; q++) if (it[q].st.headAfter !== it[q].st.head) return it[q].mvH;
    return NEVER;
  });
  const iKeys: Move[] = [
    ...(extra?.i ?? []),
    ...it.filter((x) => x.st.nextI !== x.st.i).map((x) => ({ at: x.mvI, to: x.st.nextI, dur: x.s.iDur ?? 10, ease: x.s.iEase, lift: x.s.iLift })),
  ];
  const hKeys: Move[] = [
    ...(extra?.h ?? []),
    ...it.filter((x) => x.st.headAfter !== x.st.head).map((x) => ({ at: x.mvH, to: x.st.headAfter, dur: x.s.hDur ?? 16, ease: x.s.hEase })),
  ];
  const I = follow(f, init.i, iKeys);
  // 进度线用不过冲的版本（只增不减）
  const iLine = follow(f, init.i, iKeys.map((k) => ({ ...k, ease: EASE_OUT }))).v;
  const H = follow(f, init.h, hKeys, 16);

  const cmps: CmpView[] = [];
  it.forEach((x, k) => {
    if (x.st.n === null || f < x.t) return;
    cmps.push({
      key: `c${k}`,
      cx: mainCX(x.st.i),
      state: f < x.m ? "pending" : x.st.eq ? "eq" : "ne",
      draw: progress(f, x.t, 6),
      mark: progress(f, x.m, 10),
      opacity: 1 - progress(f, tripEnd[k], 8, EASE_IN),
    });
  });

  const matchedOf = (pick: (st: Step) => number, idx: number): number => {
    let w = 0;
    it.forEach((x, k) => {
      if (x.st.eq && pick(x.st) === idx) w = Math.max(w, progress(f, x.m, 8) * (1 - progress(f, tripEnd[k], 8)));
    });
    return w;
  };
  /** 当前正在比的模式格（竖线已画、结果还没出、或刚出结果不到 mv）→ 珊瑚橙描边权重 */
  const focusOfPat = (j: number): number => {
    let w = 0;
    it.forEach((x, k) => {
      if (x.st.n === null || x.st.j !== j) return;
      const end = Math.min(tripEnd[k], x.st.eq ? x.m + 4 : x.mvH);
      w = Math.max(w, progress(f, x.t, 5) * (1 - progress(f, end, 6)));
    });
    return w;
  };
  /** 失配后查 next：第 j 格亮（0..1），以及要显示的跳转目标 */
  const lookOf = (j: number): number => {
    let w = 0;
    it.forEach((x) => {
      if (x.st.eq !== false || x.st.j !== j) return;
      const at = x.s.lookAt ?? x.m + 3;
      w = Math.max(w, progress(f, at, 8) * (1 - progress(f, Math.max(at, x.mvH) + 22, 10)));
    });
    return w;
  };
  const marks = it.filter((x) => x.st.n !== null && f >= x.m);
  const count = marks.length;
  const lastMark = marks.length ? marks[marks.length - 1].m : -NEVER;
  return {
    i: I.v,
    iLift: I.lift,
    iLand: I.land,
    iLine,
    h: H.v,
    cmps,
    mainMatched: (k: number) => matchedOf((st) => st.i, k),
    patMatched: (j: number) => matchedOf((st) => st.j, j),
    focusOfPat,
    lookOf,
    count,
    bump: pulse(f, lastMark, 10),
    items: it,
    tripEnd,
  };
};

/** 多组权重合并：数值取最大，dy 相加 */
export const lk = (...ws: Array<CellWeights | undefined>): CellWeights => {
  const out: CellWeights = {};
  for (const w of ws) {
    if (!w) continue;
    for (const key of ["matched", "focus", "dim", "yellow", "dashed"] as const) {
      const v = w[key];
      if (v !== undefined) out[key] = Math.max(out[key] ?? 0, v);
    }
    if (w.show !== undefined) out.show = Math.min(out.show ?? 1, w.show);
    if (w.dy !== undefined) out.dy = (out.dy ?? 0) + w.dy;
  }
  return out;
};

// ───────────────────────── 小件 ─────────────────────────
export const CmpList: React.FC<{ list: ReadonlyArray<CmpView>; opacity?: number; y1?: number; y2?: number }> = ({ list, opacity = 1, y1, y2 }) => (
  <>
    {list.map((c) => (
      <Compare key={c.key} cx={c.cx} y1={y1} y2={y2} state={c.state} draw={c.draw} mark={c.mark} opacity={c.opacity * opacity} />
    ))}
  </>
);

/** 左上小标题：flipAt 起从 from 翻成 to（上下翻牌） */
export const TopChip: React.FC<{
  f: number;
  from: string;
  to?: string;
  flipAt?: number;
  opacity?: number;
  x?: number;
  y?: number;
}> = ({ f, from, to, flipAt, opacity = 1, x = M.chipX, y = 84 }) => {
  if (opacity <= 0.001) return null;
  const t = to !== undefined && flipAt !== undefined ? progress(f, flipAt, 16, (v) => v) : 0;
  const second = t >= 0.5;
  const sy = second ? (t - 0.5) * 2 : 1 - t * 2;
  const text = second ? to : from;
  const isKmp = text === "KMP";
  const ease = second ? EASE_BACK(Math.min(1, sy)) : sy;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        transform: `scaleY(${Math.max(0.02, ease)})`,
        transformOrigin: "50% 50%",
        padding: "6px 26px 8px",
        borderRadius: 999,
        background: isKmp ? L.blueSoft : "#ECE8E0",
        boxShadow: `inset 0 0 0 2px ${isKmp ? "#9DBBE6" : "#D6D0C4"}`,
        color: isKmp ? L.blue : L.ink2,
        fontFamily: FONT.sans,
        fontWeight: 800,
        fontSize: 44,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        letterSpacing: isKmp ? "0.06em" : 0,
      }}
    >
      {text}
    </div>
  );
};

/** 比较次数计数器（右上）：right = 右边界 x */
export const Counter: React.FC<{
  right: number;
  y?: number;
  label: string;
  value: React.ReactNode;
  opacity?: number;
  bump?: number;
  muted?: boolean;
  minW?: number;
}> = ({ right, y = 80, label, value, opacity = 1, bump = 0, muted = false, minW = 0 }) => {
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 1920 - right,
        top: y,
        opacity,
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "8px 24px 10px",
        minWidth: minW,
        justifyContent: "center",
        borderRadius: 18,
        background: muted ? "#F1EEE8" : L.card,
        boxShadow: `inset 0 0 0 2px ${muted ? KC.dimEdge : L.cardLine}, 0 6px 16px ${L.shadow}`,
        fontFamily: FONT.sans,
        whiteSpace: "nowrap",
        transform: `scale(${1 + 0.12 * bump})`,
        transformOrigin: "100% 50%",
      }}
    >
      <span style={{ fontSize: 32, fontWeight: 600, color: muted ? KC.dimInk : L.ink2 }}>{label}</span>
      <span style={{ fontSize: 34, fontWeight: 500, color: muted ? KC.dimInk : L.ink2 }}>×</span>
      <span style={{ fontSize: 52, fontWeight: 800, color: muted ? KC.dimInk : L.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</span>
    </div>
  );
};

/** 行首标签（右对齐到 xRight），可放大一下 */
export const SideLabel: React.FC<{ xRight: number; y: number; h: number; text: string; size: number; color?: string; scale?: number; opacity?: number }> = ({
  xRight,
  y,
  h,
  text,
  size,
  color = L.ink2,
  scale = 1,
  opacity = 1,
}) =>
  opacity <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: xRight - 300,
        width: 300,
        top: y,
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: size,
        color,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "100% 50%",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );

/** 图钉（钉住小 i）：针尖在 (x, y)，p 0..1 从上方扎下来 */
export const Pin: React.FC<{ x: number; y: number; p: number; opacity?: number }> = ({ x, y, p, opacity = 1 }) => {
  if (p <= 0.001 || opacity <= 0.001) return null;
  const dy = (1 - Math.min(1, p)) * -40;
  return (
    <svg width={80} height={80} style={{ position: "absolute", left: x - 10, top: y - 52 + dy, overflow: "visible", opacity: Math.min(1, p * 2) * opacity, zIndex: 55 }}>
      <g transform="rotate(28 10 52)">
        <line x1={10} y1={52} x2={10} y2={22} stroke="#7A8090" strokeWidth={3.2} strokeLinecap="round" />
        <path d="M 1 24 L 19 24 L 15 14 L 5 14 Z" fill={L.blue} />
        <rect x={3} y={2} width={14} height={13} rx={4} fill={L.blue} />
        <rect x={6} y={4} width={4} height={8} rx={2} fill={hexA("#FFFFFF", 0.55)} />
      </g>
    </svg>
  );
};

/** 绳子：从 (x1, y1) 拉到 (x2, y2)，slack = 下垂量 px；末端套一个圈（套住小 i） */
export const Rope: React.FC<{ x1: number; y1: number; x2: number; y2: number; draw: number; slack: number; opacity?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  draw,
  slack,
  opacity = 1,
}) => {
  if (draw <= 0.001 || opacity <= 0.001) return null;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + slack;
  const len = Math.hypot(x2 - x1, y2 - y1) * 1.2 + Math.abs(slack);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity, zIndex: 52 }}>
      <path
        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke="#9A6B3C"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
      />
      <path
        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke="#C79A63"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="6 8"
        strokeDashoffset={0}
        opacity={draw >= 1 ? 1 : 0}
      />
      {draw >= 0.95 ? <ellipse cx={x2 + 4} cy={y2} rx={27} ry={9} fill="none" stroke="#9A6B3C" strokeWidth={5} /> : null}
    </svg>
  );
};

/** 头上冒三个点（委屈） */
export const SadDots: React.FC<{ cx: number; y: number; f: number; start: number; opacity?: number }> = ({ cx, y, f, start, opacity = 1 }) => {
  if (opacity <= 0.001 || f < start) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity, zIndex: 56 }}>
      {[0, 1, 2].map((k) => {
        const p = progress(f, start + k * 6, 10, EASE_BACK);
        return p <= 0.001 ? null : (
          <div
            key={k}
            style={{
              position: "absolute",
              left: cx - 26 + k * 20 - 5,
              top: y - k * 7,
              width: 10,
              height: 10,
              borderRadius: 10,
              background: L.ink3,
              transform: `scale(${p})`,
            }}
          />
        );
      })}
    </div>
  );
};

/** 头顶转圈的小星星（摔晕） */
export const Stars: React.FC<{ cx: number; cy: number; t: number; opacity?: number }> = ({ cx, cy, t, opacity = 1 }) => {
  if (opacity <= 0.001) return null;
  const star = (sx: number, sy: number, r: number) => {
    const pts: string[] = [];
    for (let k = 0; k < 10; k++) {
      const a = (Math.PI / 5) * k - Math.PI / 2;
      const rr = k % 2 === 0 ? r : r * 0.45;
      pts.push(`${sx + Math.cos(a) * rr},${sy + Math.sin(a) * rr}`);
    }
    return pts.join(" ");
  };
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity, zIndex: 57 }}>
      {[0, 1, 2].map((k) => {
        const a = t * Math.PI * 2 + (k * Math.PI * 2) / 3;
        const sx = cx + Math.cos(a) * 46;
        const sy = cy + Math.sin(a) * 12;
        return <polygon key={k} points={star(sx, sy, 11)} fill="#F2B83B" stroke="#C98A12" strokeWidth={1.5} />;
      })}
    </svg>
  );
};

/** 小旗：旗杆底在 (x, yBase)，高 hgt，旗面写 text；p 0..1 插下来 */
export const Flag: React.FC<{ x: number; yBase: number; hgt?: number; p: number; text: string }> = ({ x, yBase, hgt = 110, p, text }) => {
  if (p <= 0.001) return null;
  const dy = (1 - Math.min(1, p)) * -30;
  return (
    <div style={{ position: "absolute", left: x, top: yBase - hgt + dy, opacity: Math.min(1, p * 2), zIndex: 45 }}>
      <div style={{ position: "absolute", left: -2, top: 0, width: 5, height: hgt, borderRadius: 3, background: L.ink2 }} />
      <div
        style={{
          position: "absolute",
          left: 3,
          top: 0,
          padding: "4px 16px 6px 14px",
          background: KC.ok,
          color: "#FFFFFF",
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 34,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          borderRadius: "0 10px 10px 0",
          transform: `scaleX(${Math.min(1, p * 1.2)})`,
          transformOrigin: "0 50%",
          boxShadow: `0 4px 10px ${L.shadow}`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** 圆角框（套住一个格子 / 一整排）：draw 0..1 */
export const Ring: React.FC<{ x: number; y: number; w: number; h: number; draw: number; color?: string; stroke?: number; r?: number; dashed?: boolean }> = ({
  x,
  y,
  w,
  h,
  draw,
  color = L.accent,
  stroke = 5,
  r = 18,
  dashed = false,
}) => {
  if (draw <= 0.001) return null;
  const s = 0.85 + 0.15 * Math.min(1, draw);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        border: `${stroke}px ${dashed ? "dashed" : "solid"} ${color}`,
        boxSizing: "border-box",
        opacity: Math.min(1, draw * 1.6),
        transform: `scale(${s})`,
        zIndex: 30,
      }}
    />
  );
};

/** 下垂的虚线弧（连接两处），中间写 label */
export const DashArc: React.FC<{
  x1: number;
  x2: number;
  y: number;
  depth: number;
  draw: number;
  color?: string;
  label?: React.ReactNode;
  labelSize?: number;
  labelColor?: string;
}> = ({ x1, x2, y, depth, draw, color = L.ink2, label, labelSize = 40, labelColor }) => {
  if (draw <= 0.001) return null;
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y} Q ${mx} ${y + depth * 2} ${x2} ${y}`;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, zIndex: 25 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: Math.min(1, draw * 2) }}>
        <path d={d} fill="none" stroke={color} strokeWidth={4} strokeDasharray="10 9" strokeLinecap="round" />
        <circle cx={x1} cy={y} r={5} fill={color} />
        <circle cx={x2} cy={y} r={5} fill={color} />
      </svg>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: mx - 300,
            width: 600,
            top: y + depth - labelSize * 0.6,
            display: "flex",
            justifyContent: "center",
            opacity: Math.max(0, Math.min(1, (draw - 0.4) / 0.6)),
          }}
        >
          <span
            style={{
              padding: "2px 16px 4px",
              borderRadius: 999,
              background: L.paper,
              fontFamily: FONT.sans,
              fontWeight: 700,
              fontSize: labelSize,
              lineHeight: 1.2,
              color: labelColor ?? color,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
      ) : null}
    </div>
  );
};

/** 查表跳转的小标注："j → 3"（挂在 next 格下方） */
export const JumpTag: React.FC<{ cx: number; y: number; p: number; text: React.ReactNode; size?: number }> = ({ cx, y, p, text, size = 40 }) => {
  if (p <= 0.001) return null;
  const s = 0.6 + 0.4 * Math.min(1, p) + 0.12 * Math.sin(Math.min(1, p) * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - 200,
        width: 400,
        top: y,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, p * 2),
        transform: `scale(${s})`,
        transformOrigin: "50% 0",
        zIndex: 35,
      }}
    >
      <span
        style={{
          padding: "2px 16px 4px",
          borderRadius: 12,
          background: L.accentSoft,
          color: L.accentDeep,
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          boxShadow: `0 4px 10px ${L.shadow}`,
        }}
      >
        {text}
      </span>
    </div>
  );
};

/** 小 i 脚下只增不减的珊瑚橙进度线 */
export const ProgressLine: React.FC<{ x1: number; x2: number; y: number; opacity?: number }> = ({ x1, x2, y, opacity = 1 }) =>
  opacity <= 0.001 || x2 <= x1 ? null : (
    <div
      style={{
        position: "absolute",
        left: x1,
        top: y - 3,
        width: x2 - x1,
        height: 6,
        borderRadius: 3,
        background: `linear-gradient(90deg, ${hexA(L.accent, 0.15)}, ${L.accent})`,
        opacity,
        zIndex: 4,
      }}
    />
  );
