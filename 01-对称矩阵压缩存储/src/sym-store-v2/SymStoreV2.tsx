// 对称矩阵压缩存储 · 留白版（旁白 = 字幕-v6.md，约 2 分钟）。
// 纯暖白底；同屏最多两块主体（矩阵 + 右栏 / 数组）+ 字幕；格子细线空心，只给焦点格（珊瑚橙）和正在数的格（蓝）上色。
// 矩阵用"镜头"推拉：四种机位 intro / left / count / array，见 CAM。所有时刻在 timeline.ts 的 K 里，由旁白分句推出。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_IN, EASE_OUT, keyframes, mix, progress } from "../base/anim";
import { FONT, mixColor } from "../base/theme";
import { A, Frac, N, Op, P, V } from "../components/Math";
import { BgmTrack, NarrationTrack, SfxTrack, type Sfx } from "../components/Narration";
import { K, TL } from "./timeline";

export const TOTAL = TL.total;

// ───────────────────────── 配色 ─────────────────────────
const COL = {
  bg: "#FAF7F0",
  ink: "#1E2738",
  ink2: "#5A6274",
  ink3: "#959BA6",
  line: "#BDB6A8", // 已存的格
  faint: "#E8E3D8", // 没存的那一半
  coral: "#E5582F",
  coralDeep: "#B8401A",
  blue: "#2F6FCC",
  blueSoft: "#DCE8FA",
};
const SUB_PALETTE = { bg: "transparent", line: "none", zh: "#2A2F3B", en: "#80869A", shadow: "transparent" };

// ───────────────────────── 几何 ─────────────────────────
const NN = 5;
const CELL = 80;
const GAP = 8;
const STEP = CELL + GAP;
const MW = NN * STEP - GAP; // 432
const x0 = (c: number) => (c - 1) * STEP; // 格子左上角（矩阵局部坐标）
const ctr = (c: number) => (c - 1) * STEP + CELL / 2; // 格子中心

type Cam = { cx: number; cy: number; s: number };
/** 矩阵的四种机位（屏幕上矩阵中心 + 缩放） */
const CAM: Record<string, Cam> = {
  intro: { cx: 960, cy: 452, s: 1.22 }, // 只有矩阵，居中
  left: { cx: 620, cy: 452, s: 1.05 }, // 矩阵靠左，右栏放公式
  count: { cx: 760, cy: 458, s: 1.28 }, // 推近数格子，右边留一栏写算式
  array: { cx: 960, cy: 318, s: 0.86 }, // 拉远，下面露出一维数组
};
const CAM_KEYS = [
  { to: CAM.left, at: K.symEq - 4, dur: 24 },
  { to: CAM.array, at: K.toArray, dur: 22 },
  { to: CAM.count, at: K.push, dur: 24 },
  { to: CAM.array, at: K.pull8, dur: 22 },
  { to: CAM.left, at: K.gen, dur: 24 },
  { to: CAM.count, at: K.upper, dur: 24 },
  { to: CAM.array, at: K.pull10, dur: 22 },
  { to: CAM.left, at: K.genU, dur: 24 },
].map((k) => ({ ...k.to, fromFrame: k.at, toFrame: k.at + k.dur }));
const camAt = (f: number): Cam => keyframes(f, CAM.intro, CAM_KEYS);
/** 矩阵局部坐标 → 屏幕坐标 */
const toScreen = (cam: Cam, x: number, y: number) => ({ x: cam.cx + (x - MW / 2) * cam.s, y: cam.cy + (y - MW / 2) * cam.s });

// 一维数组：15 格
const AC = 56;
const AG = 6;
const AW = 15 * (AC + AG) - AG; // 924
const AX = 960 - AW / 2;
const AY = 626;
const slotCx = (k: number) => AX + k * (AC + AG) + AC / 2;
const FLY = 14; // 第 3 镜：一个值从矩阵飞到数组用的帧数

// 存放顺序（i、j 从 1，k 从 0；scripts/check_numbers.py 核对过）
const LOWER: Array<[number, number]> = [];
for (let r = 1; r <= NN; r++) for (let c = 1; c <= r; c++) LOWER.push([r, c]);
// 片中矩阵的值（对称）
const LOWER_VALUES = [[2], [7, 1], [8, 2, 8], [1, 8, 2, 8], [4, 5, 9, 0, 4]];
const val = (r: number, c: number) => (r >= c ? LOWER_VALUES[r - 1][c - 1] : LOWER_VALUES[c - 1][r - 1]);

// ───────────────────────── 小工具 ─────────────────────────
const win = (f: number, from: number, to: number, inDur = 10, outDur = 10) =>
  Math.min(progress(f, from, inDur), 1 - progress(f, to - outDur, outDur, EASE_IN));
const row = (r: number, c1: number, c2: number): Array<[number, number]> =>
  Array.from({ length: c2 - c1 + 1 }, (_, k) => [r, c1 + k] as [number, number]);
const END_ALL = TOTAL + 10;

// 已存 / 没存：下三角从 K.flip 起变成没存；上三角在 K.half 变淡、K.flip 起变成已存
const lowerStored = (f: number) => 1 - progress(f, K.flip, 24);
const upperStored = (f: number) => Math.min(1, 1 - progress(f, K.half, 20) + progress(f, K.flip, 24));
const stored = (f: number, r: number, c: number) => (r === c ? 1 : r > c ? lowerStored(f) : upperStored(f));

// ───────────────────────── 格子上的标记 ─────────────────────────
/** 蓝：正在数的格（淡蓝底 + 蓝边） */
type Blue = { cells: Array<[number, number]>; from: number; to: number; stagger?: number };
const BLUE: Blue[] = [
  // 2 两边一样：三对镜像格依次亮
  { cells: [[2, 1], [1, 2]], from: K.pairs, to: K.pairsOff },
  { cells: [[4, 2], [2, 4]], from: K.pairs + 12, to: K.pairsOff },
  { cells: [[5, 3], [3, 5]], from: K.pairs + 24, to: K.pairsOff },
  // 3 主对角线和它下面的元素：按行扫一遍（每格在它的值飞走后退色）
  ...LOWER.map(([r, c], i) => ({ cells: [[r, c]] as Array<[number, number]>, from: K.sweep + i * 3, to: K.fly + i * 4 + 16 })),
  // 4 数 a43 前面
  { cells: row(1, 1, 1), from: K.row1, to: K.gen },
  { cells: row(2, 1, 2), from: K.row2, to: K.gen },
  { cells: row(3, 1, 3), from: K.row3, to: K.gen },
  { cells: [[4, 1]], from: K.a41, to: K.gen },
  { cells: [[4, 2]], from: K.a42, to: K.gen },
  // 5 一般的 aij（下三角）
  { cells: [...row(1, 1, 1), ...row(2, 1, 2), ...row(3, 1, 3)], from: K.rowsL, to: K.only, stagger: 3 },
  { cells: row(4, 1, 2), from: K.leftL, to: K.only, stagger: 5 },
  // 7 上三角第一行 n 个
  { cells: row(1, 1, 5), from: K.rowN, to: K.rowsLess + 14, stagger: 2 },
  // 8 数 a34 前面
  { cells: row(1, 1, 5), from: K.up5, to: K.genU, stagger: 2 },
  { cells: row(2, 2, 5), from: K.up4, to: K.genU, stagger: 2 },
  { cells: [[3, 3]], from: K.left1, to: K.genU },
  // 9 一般的 aij（上三角）
  { cells: [...row(1, 1, 5), ...row(2, 2, 5)], from: K.rowsU, to: K.quiz, stagger: 2 },
  { cells: [[3, 3]], from: K.leftU, to: K.quiz },
  // 11 答案：换成 a25 后数
  { cells: row(1, 1, 5), from: K.up5b, to: END_ALL, stagger: 2 },
  { cells: row(2, 2, 4), from: K.left3, to: END_ALL, stagger: 4 },
];

/** 珊瑚橙：焦点格。ghost = 没存的那一格（橙色虚线）；labels = [下标, 起始帧]（换标签时交叉淡化）；solid = 填实心的区间 */
type Focus = {
  r: number;
  c: number;
  from: number;
  to: number;
  ghost?: boolean;
  labels: Array<[string, number]>;
  solid?: [number, number];
  dimFrom?: number;
};
const FOCUS: Focus[] = [
  { r: 4, c: 3, from: K.ask43, to: K.only, labels: [["43", K.ask43], ["ij", K.genLabel]], solid: [K.k8, K.gen] },
  { r: 3, c: 4, from: K.ghost34, to: K.upper, ghost: true, labels: [["34", K.ghost34]] },
  { r: 4, c: 3, from: K.arc34 + 14, to: K.upper, labels: [["43", K.arc34 + 14]] },
  { r: 3, c: 4, from: K.ask34, to: K.quiz, labels: [["34", K.ask34], ["ij", K.genULabel]], solid: [K.k10, K.genU] },
  { r: 4, c: 3, from: K.gtj + 4, to: K.quiz, ghost: true, labels: [] },
  { r: 5, c: 2, from: K.ask52, to: END_ALL, ghost: true, labels: [["52", K.ask52]], dimFrom: K.a25 + 6 },
  { r: 2, c: 5, from: K.a25, to: END_ALL, labels: [["25", K.a25]], solid: [K.a25, END_ALL] },
];

/** 蓝色小标签写在格子里（本行左边的 a41、a42、a33） */
const BLUE_LABELS: Array<{ r: number; c: number; sub: string; from: number; to: number }> = [
  { r: 4, c: 1, sub: "41", from: K.a41, to: K.gen },
  { r: 4, c: 2, sub: "42", from: K.a42, to: K.gen },
  { r: 3, c: 3, sub: "33", from: K.a33, to: K.genU },
];

/** 行号 / 列号换成 i、j（珊瑚橙） */
const AXIS: Array<{ axis: "row" | "col"; idx: number; text: string; from: number; to: number }> = [
  { axis: "row", idx: 4, text: "i", from: K.genLabel, to: K.only },
  { axis: "col", idx: 3, text: "j", from: K.genLabel, to: K.only },
  { axis: "row", idx: 3, text: "i", from: K.genULabel, to: K.quiz },
  { axis: "col", idx: 4, text: "j", from: K.genULabel, to: K.quiz },
];

/** 每行个数（蓝字，矩阵局部坐标）。上三角、下三角都写在矩阵外面：第 5 列右侧一列、和各行对齐、左对齐（不写进未存的格子里，免得被当成元素值） */
const nMinus = (k: number) => (
  <>
    <V>n</V>
    <Op tight>−</Op>
    <N>{k}</N>
  </>
);
const RIGHT_X = MW + 30; // 矩阵右边的计数：左对齐
const NOTES: Array<{ x: number; y: number; from: number; to: number; node: React.ReactNode }> = [
  // 4 下三角上面三行 1、2、3
  { x: RIGHT_X, y: ctr(1), from: K.row1, to: K.pull8, node: <N>1</N> },
  { x: RIGHT_X, y: ctr(2), from: K.row2, to: K.pull8, node: <N>2</N> },
  { x: RIGHT_X, y: ctr(3), from: K.row3, to: K.pull8, node: <N>3</N> },
  // 5 一般式：1、2、…、i−1
  { x: RIGHT_X, y: ctr(1), from: K.rowsL + 4, to: K.only, node: <N>1</N> },
  { x: RIGHT_X, y: ctr(2), from: K.rowsL + 8, to: K.only, node: <N>2</N> },
  {
    x: RIGHT_X,
    y: ctr(3),
    from: K.rowsL + 12,
    to: K.only,
    node: (
      <>
        <V>i</V>
        <Op tight>−</Op>
        <N>1</N>
      </>
    ),
  },
  // 7 上三角：n、n−1、…
  { x: RIGHT_X, y: ctr(1), from: K.rowN, to: K.ex34, node: <V>n</V> },
  ...[1, 2, 3, 4].map((k) => ({ x: RIGHT_X, y: ctr(k + 1), from: K.rowsLess + (k - 1) * 6, to: K.ex34, node: nMinus(k) })),
  // 8 a34：上面 5 个、4 个
  { x: RIGHT_X, y: ctr(1), from: K.up5, to: K.pull10, node: <N>5</N> },
  { x: RIGHT_X, y: ctr(2), from: K.up4, to: K.pull10, node: <N>4</N> },
  // 9 一般式：n、n−i+2
  { x: RIGHT_X, y: ctr(1), from: K.cntN, to: K.quiz, node: <V>n</V> },
  {
    x: RIGHT_X,
    y: ctr(2),
    from: K.cntN2,
    to: K.quiz,
    node: (
      <>
        <V>n</V>
        <Op tight>−</Op>
        <V>i</V>
        <Op tight>+</Op>
        <N>2</N>
      </>
    ),
  },
  // 11 答案：上面一行 5 个
  { x: RIGHT_X, y: ctr(1), from: K.up5b, to: END_ALL, node: <N>5</N> },
];

/** 弧线箭头（矩阵局部坐标）：从 a 格画到 b 格，向右下鼓出 */
const ARCS: Array<{ a: [number, number]; b: [number, number]; from: number; to: number }> = [
  { a: [3, 4], b: [4, 3], from: K.arc34, to: K.upper },
  { a: [4, 3], b: [3, 4], from: K.arc43, to: K.quiz },
  { a: [5, 2], b: [2, 5], from: K.arc52, to: END_ALL },
];

// 下三角 / 上三角的轮廓（台阶形），蓝色细线
const stairPts = (() => {
  const m = 7;
  const e = (k: number) => k * STEP - GAP;
  const pts: Array<[number, number]> = [[-m, -m], [e(1) + m, -m]];
  for (let k = 1; k <= 4; k++) {
    pts.push([e(k) + m, e(k) + GAP / 2]);
    pts.push([e(k + 1) + m, e(k) + GAP / 2]);
  }
  pts.push([e(5) + m, e(5) + m], [-m, e(5) + m]);
  return pts;
})();
const LOWER_PATH = "M " + stairPts.map(([x, y]) => `${x} ${y}`).join(" L ") + " Z";
const UPPER_PATH = "M " + stairPts.map(([x, y]) => `${y} ${x}`).join(" L ") + " Z";
const STAIRS = [
  { d: LOWER_PATH, from: K.stairL, to: K.arc34 + 10 },
  { d: UPPER_PATH, from: K.flip + 12, to: K.rowN + 6 },
];

// ───────────────────────── 矩阵 ─────────────────────────
const breath = (f: number) => 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(f / 7));

const Matrix: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const appear = progress(f, K.matIn, 16);
  if (appear <= 0) return null;
  const valuesA = 1 - progress(f, K.valuesOff - 12, 12, EASE_IN);

  const cells: React.ReactNode[] = [];
  for (let r = 1; r <= NN; r++) {
    for (let c = 1; c <= NN; c++) {
      const st = stored(f, r, c);
      const cellIn = progress(f, K.matIn + (r + c) * 1.5, 12);
      let border = mixColor(COL.faint, COL.line, st);
      let bw = 1 + 0.5 * st;
      let fill = COL.bg;
      let dashed = false;
      // 蓝
      let b = 0;
      for (const h of BLUE) {
        h.cells.forEach(([rr, cc], k) => {
          if (rr === r && cc === c) b = Math.max(b, win(f, h.from + k * (h.stagger ?? 0), h.to, 8, 10));
        });
      }
      if (b > 0) {
        fill = mixColor(fill, COL.blueSoft, b);
        border = mixColor(border, COL.blue, b);
        bw = mix(bw, 2, b);
      }
      // 第 2 镜"沿主对角线"：对角线上的格子描橙边
      if (r === c) {
        const d = win(f, K.diag + (r - 1) * 3, K.half + 10, 8, 12);
        if (d > 0) {
          border = mixColor(border, COL.coral, d);
          bw = mix(bw, 2.5, d);
        }
      }
      // 珊瑚橙
      let labelNode: React.ReactNode = null;
      for (const fo of FOCUS) {
        if (fo.r !== r || fo.c !== c) continue;
        const a = win(f, fo.from, fo.to, 10, 10) * (fo.dimFrom ? 1 - 0.55 * progress(f, fo.dimFrom, 16) : 1);
        if (a <= 0) continue;
        const sol = fo.solid ? win(f, fo.solid[0], fo.solid[1], 10, 10) : 0;
        border = mixColor(border, COL.coral, a * (sol > 0 ? 1 : breath(f)));
        bw = mix(bw, fo.ghost ? 2.5 : 3, a);
        if (fo.ghost) dashed = true;
        if (sol > 0) fill = mixColor(fill, COL.coral, sol);
        const color = mixColor(COL.coral, "#FFFFFF", sol);
        labelNode = (
          <>
            {fo.labels.map(([sub, at], k) => {
              const next = fo.labels[k + 1]?.[1];
              const la = a * progress(f, at, 10) * (next === undefined ? 1 : 1 - progress(f, next - 4, 10));
              if (la <= 0) return null;
              return (
                <div key={k} style={{ ...centerAbs, opacity: la, color, fontSize: 32 }}>
                  <A sub={sub} />
                </div>
              );
            })}
          </>
        );
      }
      for (const bl of BLUE_LABELS) {
        if (bl.r !== r || bl.c !== c) continue;
        const la = win(f, bl.from, bl.to, 10, 10);
        if (la > 0)
          labelNode = (
            <div style={{ ...centerAbs, opacity: la, color: COL.blue, fontSize: 30 }}>
              <A sub={bl.sub} />
            </div>
          );
      }
      const va = valuesA * st;
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            left: x0(c),
            top: x0(r),
            width: CELL,
            height: CELL,
            boxSizing: "border-box",
            borderRadius: 6,
            border: `${bw}px ${dashed ? "dashed" : "solid"} ${border}`,
            background: fill,
            opacity: cellIn,
          }}
        >
          {va > 0.01 ? (
            <div style={{ ...centerAbs, opacity: va, color: COL.ink, fontSize: 34, fontFamily: FONT.sans, fontWeight: 500 }}>{val(r, c)}</div>
          ) : null}
          {labelNode}
        </div>,
      );
    }
  }

  // 行号、列号（弱字；换成 i、j 时交叉淡化）
  const axis: React.ReactNode[] = [];
  for (let k = 1; k <= NN; k++) {
    for (const kind of ["row", "col"] as const) {
      const ov = AXIS.find((o) => o.axis === kind && o.idx === k && f >= o.from - 10 && f < o.to + 10);
      const oa = ov ? win(f, ov.from, ov.to, 10, 10) : 0;
      const pos = kind === "row" ? { left: -34, top: ctr(k) } : { left: ctr(k), top: -32 };
      axis.push(
        <div key={`${kind}${k}`} style={{ position: "absolute", ...pos, transform: "translate(-50%, -50%)" }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 22, color: COL.ink3, opacity: 1 - oa }}>{k}</span>
          {ov ? (
            <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -54%)", fontFamily: FONT.math, fontStyle: "italic", fontSize: 30, color: COL.coral, opacity: oa }}>
              {ov.text}
            </span>
          ) : null}
        </div>,
      );
    }
  }

  // 每行个数
  const notes = NOTES.map((n, i) => {
    const a = win(f, n.from, n.to, 10, 10);
    if (a <= 0) return null;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: n.x,
          top: n.y,
          transform: `translate(${n.x >= MW ? "0" : "-50%"}, -50%) translateY(${(1 - progress(f, n.from, 12)) * 8}px)`,
          opacity: a,
          color: COL.blue,
          fontSize: 30,
          fontFamily: FONT.sans,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {n.node}
      </div>
    );
  });

  // 主对角线（第 2 镜）
  const diagDraw = progress(f, K.diag, 20);
  const diagA = 1 - progress(f, K.half + 10, 14, EASE_IN);
  const diagLen = Math.SQRT2 * (MW + 28);

  return (
    <div
      style={{
        position: "absolute",
        left: cam.cx - MW / 2,
        top: cam.cy - MW / 2,
        width: MW,
        height: MW,
        transform: `scale(${cam.s})`,
        transformOrigin: "50% 50%",
        opacity: appear,
      }}
    >
      {/* 主对角线画在格子下面：格子有底色，线只在格缝和两端露出来，不压住数字 */}
      <svg width={MW} height={MW} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {diagDraw > 0 && diagA > 0 ? (
          <line
            x1={-14}
            y1={-14}
            x2={MW + 14}
            y2={MW + 14}
            stroke={COL.coral}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={diagLen}
            strokeDashoffset={diagLen * (1 - diagDraw)}
            opacity={0.8 * diagA}
          />
        ) : null}
      </svg>
      {cells}
      {axis}
      {notes}
      <svg width={MW} height={MW} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {STAIRS.map((s, i) => {
          const a = win(f, s.from, s.to, 14, 12);
          if (a <= 0) return null;
          return <path key={i} d={s.d} fill="none" stroke={COL.blue} strokeWidth={2} strokeLinejoin="round" opacity={0.7 * a} />;
        })}
        {ARCS.map((arc, i) => {
          const a = win(f, arc.from, arc.to, 6, 10);
          if (a <= 0) return null;
          const draw = progress(f, arc.from, 18);
          const ax = ctr(arc.a[1]);
          const ay = ctr(arc.a[0]);
          const bx = ctr(arc.b[1]);
          const by = ctr(arc.b[0]);
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          const d = Math.hypot(bx - ax, by - ay);
          const bulge = 0.42 * d;
          const qx = mx + bulge * Math.SQRT1_2;
          const qy = my + bulge * Math.SQRT1_2;
          // 端点从格子中心往外收一点，不压住标签
          const shrink = (px: number, py: number, k: number) => {
            const dx = qx - px;
            const dy = qy - py;
            const l = Math.hypot(dx, dy);
            return [px + (dx / l) * k, py + (dy / l) * k];
          };
          const [sx, sy] = shrink(ax, ay, 34);
          const [ex, ey] = shrink(bx, by, 38);
          const path = `M ${sx} ${sy} Q ${qx} ${qy} ${ex} ${ey}`;
          const len = d * 1.25;
          // 箭头方向 = 曲线在终点的切线（Q → E）
          const ang = Math.atan2(ey - qy, ex - qx);
          const hl = 14;
          const head = `M ${ex - hl * Math.cos(ang - 0.45)} ${ey - hl * Math.sin(ang - 0.45)} L ${ex} ${ey} L ${ex - hl * Math.cos(ang + 0.45)} ${ey - hl * Math.sin(ang + 0.45)}`;
          return (
            <g key={i} opacity={a}>
              <path d={path} fill="none" stroke={COL.coral} strokeWidth={3} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
              <path d={head} fill="none" stroke={COL.coral} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={progress(f, arc.from + 14, 6)} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const centerAbs: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
};

// ───────────────────────── 一维数组 ─────────────────────────
const ARRAY_WINDOWS: Array<[number, number]> = [
  [K.toArray + 4, K.push + 10],
  [K.pull8 + 4, K.gen + 10],
  [K.pull10 + 4, K.genU + 10],
];
/** 数组里的落位：前面几格蓝、第 k 格橙 */
const ARRAY_FILLS = [
  { n: 8, label: "43", fill: K.pull8 + 14, hit: K.k8, to: K.gen + 10 },
  { n: 10, label: "34", fill: K.pull10 + 14, hit: K.k10, to: K.genU + 10 },
];

const ArrayRow: React.FC = () => {
  const f = useCurrentFrame();
  let a = 0;
  let dy = 0;
  for (const [from, to] of ARRAY_WINDOWS) {
    const w = win(f, from, to, 16, 14);
    if (w > a) {
      a = w;
      dy = f < from + 16 ? (1 - progress(f, from, 16)) * 40 : progress(f, to - 14, 14, EASE_IN) * 40;
    }
  }
  if (a <= 0) return null;
  const valuesA = 1 - progress(f, K.valuesOff - 12, 12, EASE_IN);
  const idxIn = (k: number) => progress(f, K.index + k * 1.5, 10);
  const fillNow = ARRAY_FILLS.find((x) => f >= x.fill - 2 && f < x.to);

  return (
    <div style={{ position: "absolute", left: 0, top: dy, width: 1920, height: 1080, opacity: a }}>
      {Array.from({ length: 15 }, (_, k) => {
        let border = COL.line;
        let fill = COL.bg;
        let bw = 1.5;
        let label: React.ReactNode = null;
        if (fillNow) {
          if (k < fillNow.n) {
            const b = progress(f, fillNow.fill + k * 2, 8);
            fill = mixColor(fill, COL.blueSoft, b);
            border = mixColor(border, COL.blue, b);
            bw = mix(bw, 2, b);
          } else if (k === fillNow.n) {
            const h = progress(f, fillNow.hit, 10);
            fill = mixColor(fill, COL.coral, h);
            border = mixColor(border, COL.coral, h);
            bw = mix(bw, 2, h);
            label = (
              <div style={{ ...centerAbs, color: "#FFFFFF", fontSize: 25, opacity: h }}>
                <A sub={fillNow.label} />
              </div>
            );
          }
        }
        // 第 3 镜：值一个个落进来
        const land = K.fly + k * 4 + FLY;
        const v = LOWER[k];
        const showVal = f >= land ? valuesA : 0;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: AX + k * (AC + AG),
              top: AY,
              width: AC,
              height: AC,
              boxSizing: "border-box",
              borderRadius: 5,
              border: `${bw}px solid ${border}`,
              background: fill,
            }}
          >
            {showVal > 0.01 ? (
              <div style={{ ...centerAbs, color: COL.ink, fontSize: 26, fontFamily: FONT.sans, fontWeight: 500, opacity: showVal }}>{val(v[0], v[1])}</div>
            ) : null}
            {label}
          </div>
        );
      })}
      {/* 下标 0..14 */}
      {Array.from({ length: 15 }, (_, k) => {
        const zero = k === 0 ? 1 - progress(f, K.index + 50, 16) : 0;
        const hit = fillNow && k === fillNow.n ? progress(f, fillNow.hit, 10) : 0;
        return (
          <div
            key={`i${k}`}
            style={{
              position: "absolute",
              left: slotCx(k),
              top: AY + AC + 20,
              transform: "translate(-50%, -50%)",
              fontFamily: FONT.mono,
              fontSize: 20,
              fontWeight: hit > 0.5 || zero > 0.5 ? 700 : 400,
              color: mixColor(COL.ink3, COL.coralDeep, Math.max(zero * progress(f, K.index, 8), hit)),
              opacity: idxIn(k),
            }}
          >
            {k}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: AX - 34,
          top: AY + AC + 20,
          transform: "translate(-50%, -54%)",
          fontFamily: FONT.math,
          fontStyle: "italic",
          fontSize: 26,
          color: COL.ink2,
          opacity: idxIn(0),
        }}
      >
        k
      </div>
      {/* k = 8 / k = 10 */}
      {fillNow ? (
        <div
          style={{
            position: "absolute",
            left: slotCx(fillNow.n),
            top: AY + AC + 86,
            transform: `translate(-50%, -50%) translateY(${(1 - progress(f, fillNow.hit + 4, 14)) * 12}px)`,
            opacity: progress(f, fillNow.hit + 4, 12),
            color: COL.coral,
            fontSize: 48,
            whiteSpace: "nowrap",
          }}
        >
          <V>k</V>
          <Op>=</Op>
          <N style={{ fontWeight: 600 }}>{fillNow.n}</N>
        </div>
      ) : null}
    </div>
  );
};

/** 第 3 镜：值从矩阵飞进数组（跟着镜头算矩阵格子的屏幕位置） */
const FlyLayer: React.FC = () => {
  const f = useCurrentFrame();
  if (f < K.fly - 1 || f > K.fly + 15 * 4 + 20) return null;
  const cam = camAt(f);
  return (
    <>
      {LOWER.map(([r, c], k) => {
        const t0 = K.fly + k * 4;
        // 飞行 [t0, t0+FLY)，第 t0+FLY 帧起由数组格子自己显示（按帧号切换，不会漏一帧）
        if (f < t0 || f >= t0 + FLY) return null;
        const t = progress(f, t0, FLY, EASE_OUT);
        const s = toScreen(cam, ctr(c), ctr(r));
        const x = mix(s.x, slotCx(k), t);
        const y = mix(s.y, AY + AC / 2, t) - Math.sin(Math.PI * t) * 40;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: mix(34 * cam.s, 26, t),
              color: COL.ink,
            }}
          >
            {val(r, c)}
          </div>
        );
      })}
    </>
  );
};

// ───────────────────────── 右栏文字 / 公式 ─────────────────────────
/** 在 (x, y) 显示一段内容：[from, to) 淡入淡出 + 入场上浮。align = 内容的水平对齐点 */
const Txt: React.FC<{
  x: number;
  y: number;
  from: number;
  to: number;
  size: number;
  color?: string;
  align?: "left" | "center";
  weight?: number;
  font?: string;
  children: React.ReactNode;
}> = ({ x, y, from, to, size, color = COL.ink, align = "center", weight = 400, font = FONT.sans, children }) => {
  const f = useCurrentFrame();
  const a = win(f, from, to, 12, 10);
  if (a <= 0) return null;
  const dy = (1 - progress(f, from, 16)) * 14;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : "0"}, -50%) translateY(${dy}px)`,
        opacity: a,
        fontSize: size,
        color,
        fontWeight: weight,
        fontFamily: font,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        lineHeight: 1.2,
      }}
    >
      {children}
    </div>
  );
};

const Cap: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ fontFamily: FONT.sans }}>{children}</span>;

// 公式片段
const iMinus1 = (
  <>
    <V>i</V>
    <Op tight>−</Op>
    <N>1</N>
  </>
);
const iFrac = <Frac num={<><V>i</V><P>(</P>{iMinus1}<P>)</P></>} den={<N>2</N>} />;
const upNum = (
  <>
    <P>(</P>
    {iMinus1}
    <P>)</P>
    <P>(</P>
    <N>2</N>
    <V>n</V>
    <Op tight>−</Op>
    <V>i</V>
    <Op tight>+</Op>
    <N>2</N>
    <P>)</P>
  </>
);
const upFrac = <Frac num={upNum} den={<N>2</N>} />;

const PX = 1355; // 右栏中线（机位 left）
const PU = 1390; // 上三角公式那一段的右栏中线（矩阵右边有 n−i+2，往右让一点）
const CX = 1236; // 右栏左边界（机位 count）

const Panels: React.FC = () => {
  const f = useCurrentFrame();
  // 下三角公式：在 K.only 往上挪一点，给下面两行让位
  const yL = mix(452, 352, progress(f, K.only, 20));
  const sizeL = mix(60, 54, progress(f, K.only, 20));
  const yU = mix(452, 372, progress(f, K.gtj, 20));
  return (
    <>
      {/* 1 片头 */}
      <Txt x={960} y={452} from={K.titleIn} to={K.titleOut} size={72} weight={600}>
        对称矩阵的压缩存储
      </Txt>
      <Txt x={960} y={540} from={K.titleIn + 8} to={K.titleOut} size={26} color={COL.ink3}>
        Compressed storage of symmetric matrices
      </Txt>

      {/* 2 aij = aji */}
      <Txt x={PX} y={452} from={K.symEq + 8} to={K.heading} size={68}>
        <A sub="ij" />
        <Op>=</Op>
        <A sub="ji" />
      </Txt>
      {/* 3 按行存下三角 */}
      <Txt x={PX} y={452} from={K.heading + 6} to={K.toArray + 4} size={46} weight={500}>
        按行存下三角
      </Txt>

      {/* 4 数 a43 前面：右边一栏算式 */}
      <Txt x={CX} y={318} from={K.sum6} to={K.pull8 + 4} size={26} color={COL.ink3} align="left">
        上面三行
      </Txt>
      <Txt x={CX} y={370} from={K.sum6} to={K.pull8 + 4} size={50} align="left">
        <N>1</N>
        <Op>+</Op>
        <N>2</N>
        <Op>+</Op>
        <N>3</N>
        <Op>=</Op>
        <N style={{ color: COL.blue, fontWeight: 600 }}>6</N>
      </Txt>
      <Txt x={CX} y={450} from={K.left2} to={K.pull8 + 4} size={26} color={COL.ink3} align="left">
        本行左边
      </Txt>
      <Txt x={CX} y={502} from={K.left2} to={K.pull8 + 4} size={50} align="left">
        <N style={{ color: COL.blue, fontWeight: 600 }}>2</N>
      </Txt>
      <Txt x={CX} y={582} from={K.front8} to={K.pull8 + 4} size={26} color={COL.ink3} align="left">
        前面一共
      </Txt>
      <Txt x={CX} y={634} from={K.front8} to={K.pull8 + 4} size={50} align="left">
        <N>6</N>
        <Op>+</Op>
        <N>2</N>
        <Op>=</Op>
        <N style={{ color: COL.coral, fontWeight: 600 }}>8</N>
      </Txt>

      {/* 5 一般的 aij：上面 / 左边 → 公式 */}
      <Txt x={PX} y={330} from={K.sumL} to={K.fmlL + 2} size={26} color={COL.ink3}>
        上面 <V style={{ margin: "0 0.2em" }}>i</V>−1 行
      </Txt>
      <Txt x={PX} y={414} from={K.sumL} to={K.halfL + 6} size={50}>
        <N>1</N>
        <Op>+</Op>
        <N>2</N>
        <Op>+</Op>
        <N>…</N>
        <Op>+</Op>
        <P>(</P>
        {iMinus1}
        <P>)</P>
      </Txt>
      <Txt x={PX} y={428} from={K.halfL + 6} to={K.fmlL + 2} size={50}>
        {iFrac}
      </Txt>
      <Txt x={PX} y={540} from={K.leftL + 14} to={K.fmlL + 2} size={26} color={COL.ink3}>
        本行左边
      </Txt>
      <Txt x={PX} y={596} from={K.leftL + 14} to={K.fmlL + 2} size={50}>
        <V>j</V>
        <Op>−</Op>
        <N>1</N>
      </Txt>
      <Txt x={PX} y={yL} from={K.fmlL + 2} to={K.upper} size={sizeL}>
        <V>k</V>
        <Op>=</Op>
        {iFrac}
        <Op>+</Op>
        <P>(</P>
        <V>j</V>
        <Op tight>−</Op>
        <N>1</N>
        <P>)</P>
      </Txt>
      {/* 6 只能算下三角；a34 = a43；i < j 交换 */}
      <Txt x={PX} y={450} from={K.stairL + 6} to={K.ghost34} size={28} color={COL.ink2}>
        只算下三角（<V>i</V>
        <Op tight>≥</Op>
        <V>j</V>）
      </Txt>
      <Txt x={PX} y={490} from={K.eq34} to={K.upper} size={48}>
        <A sub="34" />
        <Op>=</Op>
        <A sub="43" />
      </Txt>
      <Txt x={PX} y={580} from={K.ltj} to={K.upper} size={34} color={COL.ink2}>
        <V>i</V>
        <Op>&lt;</Op>
        <V>j</V>
        <Cap>&nbsp;时</Cap>
        <span style={{ opacity: progress(f, K.swapL, 12) }}>
          <Cap>，交换&nbsp;</Cap>
          <V>i</V>
          <Cap>&nbsp;和&nbsp;</Cap>
          <V>j</V>
        </span>
      </Txt>

      {/* 7 按行存上三角 */}
      <Txt x={1440} y={452} from={K.flip - 4} to={K.rowN} size={46} weight={500}>
        按行存上三角
      </Txt>

      {/* 8 a34：n = 5，上面 5 + 4，左边 1 */}
      <Txt x={CX} y={300} from={K.n5} to={K.pull10 + 4} size={30} color={COL.ink2} align="left">
        <V>n</V>
        <Op>=</Op>
        <N>5</N>
      </Txt>
      <Txt x={CX} y={394} from={K.up5} to={K.pull10 + 4} size={26} color={COL.ink3} align="left">
        上面两行
      </Txt>
      <Txt x={CX} y={446} from={K.up5} to={K.pull10 + 4} size={50} align="left">
        <N>5</N>
        <span style={{ opacity: progress(f, K.up4, 10) }}>
          <Op>+</Op>
          <N>4</N>
        </span>
      </Txt>
      <Txt x={CX} y={526} from={K.left1} to={K.pull10 + 4} size={26} color={COL.ink3} align="left">
        本行左边
      </Txt>
      <Txt x={CX} y={578} from={K.left1} to={K.pull10 + 4} size={50} align="left">
        <N style={{ color: COL.blue, fontWeight: 600 }}>1</N>
      </Txt>

      {/* 9 一般的 aij（上三角） */}
      <Txt x={PU} y={330} from={K.sumU} to={K.fmlU + 2} size={26} color={COL.ink3}>
        <span style={{ opacity: 1 - progress(f, K.arith - 4, 10) }}>
          上面 <V style={{ margin: "0 0.2em" }}>i</V>−1 行
        </span>
      </Txt>
      <Txt x={PU} y={330} from={K.arith} to={K.fmlU + 2} size={26} color={COL.ink3}>
        等差数列求和
      </Txt>
      <Txt x={PU} y={414} from={K.sumU} to={K.arith + 6} size={44}>
        <V>n</V>
        <Op>+</Op>
        <P>(</P>
        <V>n</V>
        <Op tight>−</Op>
        <N>1</N>
        <P>)</P>
        <Op>+</Op>
        <N>…</N>
        <Op>+</Op>
        <P>(</P>
        <V>n</V>
        <Op tight>−</Op>
        <V>i</V>
        <Op tight>+</Op>
        <N>2</N>
        <P>)</P>
      </Txt>
      <Txt x={PU} y={428} from={K.arith + 6} to={K.fmlU + 2} size={48}>
        {upFrac}
      </Txt>
      <Txt x={PU} y={540} from={K.leftU + 14} to={K.fmlU + 2} size={26} color={COL.ink3}>
        本行左边
      </Txt>
      <Txt x={PU} y={596} from={K.leftU + 14} to={K.fmlU + 2} size={50}>
        <V>j</V>
        <Op>−</Op>
        <V>i</V>
      </Txt>
      <Txt x={PU} y={yU} from={K.fmlU + 2} to={K.quiz} size={mix(48, 46, progress(f, K.gtj, 20))}>
        <V>k</V>
        <Op>=</Op>
        {upFrac}
        <Op>+</Op>
        <P>(</P>
        <V>j</V>
        <Op tight>−</Op>
        <V>i</V>
        <P>)</P>
      </Txt>
      <Txt x={PU} y={540} from={K.gtj + 6} to={K.quiz} size={34} color={COL.ink2}>
        <V>i</V>
        <Op>&gt;</Op>
        <V>j</V>
        <Cap>&nbsp;时，先交换&nbsp;</Cap>
        <V>i</V>
        <Cap>&nbsp;和&nbsp;</Cap>
        <V>j</V>
      </Txt>

      {/* 10 小题 */}
      <Txt x={PX} y={330} from={K.quiz + 12} to={END_ALL} size={26} color={COL.ink3}>
        最后一题
      </Txt>
      <Txt x={PX} y={392} from={K.quizCap} to={END_ALL} size={32} color={COL.ink2}>
        <V>n</V>
        <Op>=</Op>
        <N>5</N>
        <Cap>，按行存上三角</Cap>
      </Txt>
      <Txt x={PX} y={486} from={K.ask52} to={END_ALL} size={64}>
        <A sub="52" />
        <Op>→</Op>
        <V>k</V>
        <Op>=</Op>
        <span style={{ position: "relative", display: "inline-block", width: "0.62em", textAlign: "center" }}>
          <N style={{ color: COL.coral, fontWeight: 600, opacity: 1 - progress(f, K.ans, 8) }}>?</N>
          <N
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              color: COL.coral,
              fontWeight: 600,
              opacity: progress(f, K.ans, 10),
              transform: `scale(${mix(1.35, 1, progress(f, K.ans, 14))})`,
              display: "inline-block",
            }}
          >
            8
          </N>
        </span>
      </Txt>
      <Countdown />
      <Txt x={PX} y={606} from={K.up5b} to={END_ALL} size={46} color={COL.ink}>
        <N>5</N>
        <span style={{ opacity: progress(f, K.left3, 10) }}>
          <Op>+</Op>
          <N>3</N>
        </span>
        <span style={{ opacity: progress(f, K.eq8, 10) }}>
          <Op>=</Op>
          <N style={{ color: COL.coral, fontWeight: 600 }}>8</N>
        </span>
      </Txt>
    </>
  );
};

/** 小题停顿：一条缩短的细线（2.5 s） */
const Countdown: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.waitFrom, K.waitTo + 6, 8, 10);
  if (a <= 0) return null;
  const w = 360 * (1 - progress(f, K.waitFrom, K.waitTo - K.waitFrom, (t) => t));
  return <div style={{ position: "absolute", left: PX - w / 2, top: 566, width: w, height: 2, borderRadius: 1, background: COL.ink3, opacity: 0.8 * a }} />;
};

// ───────────────────────── 音效（少而轻，停顿时不放） ─────────────────────────
const SFX: Sfx[] = [
  { at: K.matIn + 2, src: "pop", vol: 0.07 },
  { at: K.diag, src: "whoosh", vol: 0.06 },
  { at: K.half, src: "whoosh", vol: 0.05 },
  { at: K.fly, src: "whoosh", vol: 0.06 },
  { at: K.ask43, src: "pop", vol: 0.09 },
  { at: K.row1, src: "pop", vol: 0.05 },
  { at: K.row2, src: "pop", vol: 0.05 },
  { at: K.row3, src: "pop", vol: 0.05 },
  { at: K.k8, src: "ding_hi", vol: 0.11 },
  { at: K.fmlL + 4, src: "ding", vol: 0.08 },
  { at: K.arc34, src: "whoosh", vol: 0.07 },
  { at: K.flip, src: "whoosh", vol: 0.06 },
  { at: K.ask34, src: "pop", vol: 0.08 },
  { at: K.k10, src: "ding_hi", vol: 0.11 },
  { at: K.fmlU + 4, src: "ding", vol: 0.08 },
  { at: K.arc43, src: "whoosh", vol: 0.06 },
  { at: K.ask52, src: "pop", vol: 0.08 },
  { at: K.ans, src: "ding_hi", vol: 0.12 },
  { at: K.arc52, src: "whoosh", vol: 0.06 },
  { at: K.eq8, src: "snap", vol: 0.06 },
];

// ───────────────────────── 合成 ─────────────────────────
const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const out = 1 - progress(f, TOTAL - 26, 24, EASE_IN);
  return <AbsoluteFill style={{ opacity: out }}>{children}</AbsoluteFill>;
};

// ───────────────────────── BGM 选择 / 测量用分轨（2026-11-09 加） ─────────────────────────
// REMOTION_BGM：不设 = bright-01（主版本）；bright-02 / bright-03 经 bgm-02.env / bgm-03.env（pnpm render:bgm02 / render:bgm03）设。
//   level 和闪避参数三首一样（0.6），只换音频文件。
// REMOTION_STEM：测量用，默认不设 = 正常混音。bgm = 只有 BGM（旁白、音效、字幕都不放）；voice = 只有旁白（BGM、音效不放）。
//   只在渲染纯音频（--codec=wav）做测量时用，见 BGM对比.md。
declare const process: { env: Record<string, string | undefined> };
const BGM = process.env.REMOTION_BGM ?? "bright-01";
if (!["bright-01", "bright-02", "bright-03"].includes(BGM)) throw new Error(`未知的 REMOTION_BGM=${BGM}`);
const STEM = process.env.REMOTION_STEM ?? "";
if (!["", "bgm", "voice"].includes(STEM)) throw new Error(`未知的 REMOTION_STEM=${STEM}`);

export const SymStoreV2: React.FC = () => (
  <AbsoluteFill style={{ background: COL.bg, overflow: "hidden", fontFamily: FONT.sans, fontVariantNumeric: "tabular-nums" }}>
    <Stage>
      <ArrayRow />
      <Matrix />
      <FlyLayer />
      <Panels />
    </Stage>
    {STEM === "voice" ? null : <BgmTrack tl={TL} src={`bgm/${BGM}.wav`} level={0.6} />}
    {STEM === "" ? <SfxTrack list={SFX} /> : null}
    {STEM === "bgm" ? null : <NarrationTrack tl={TL} subtitlePalette={SUB_PALETTE} />}
  </AbsoluteFill>
);
