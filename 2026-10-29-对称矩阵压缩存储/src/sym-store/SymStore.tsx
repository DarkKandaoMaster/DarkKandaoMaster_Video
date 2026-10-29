// 对称矩阵压缩存储（约 86 秒）：钩子题 a43 → 只存下三角 → 数出 k = 8 → 推广 i(i−1)/2 + (j−1)
// → i < j 交换 → 按行存上三角 (i−1)(2n−i+2)/2 + (j−i) → 小题（仍按上三角）a52 → 片尾两张公式卡。
// 布局：左上 5×5 矩阵，右侧推导区，下方 15 格一维数组（始终同屏，同步点亮），最底双语字幕。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_IN, EASE_OUT, mix, progress } from "../base/anim";
import { L } from "../base/paper";
import { FONT, hexA } from "../base/theme";
import { Brace } from "../components/Marks";
import { A, Frac, N, Op, P, Row, V } from "../components/Math";
import { BgmTrack, NarrationTrack, SfxTrack, type Sfx } from "../components/Narration";
import { Card, Chip, PaperBackground, PSlot, PTile, Txt, VBrace } from "../components/PaperKit";
import { TL, p } from "./timeline";

export const TOTAL = TL.total;

const SUB_PALETTE = { bg: "rgba(255, 255, 255, 0.94)", line: L.cardLine, zh: L.ink, en: L.ink2, shadow: L.shadow };

// ───────────────────────── 几何 ─────────────────────────
const NN = 5;
const T = 96; // 矩阵格子
const G = 8;
const MX = 200;
const MY = 172;
const cellX = (c: number) => MX + (c - 1) * (T + G);
const cellY = (r: number) => MY + (r - 1) * (T + G);
const M_RIGHT = cellX(NN) + T; // 712
const M_BOTTOM = cellY(NN) + T; // 684

const S = 92; // 数组格子
const SG = 10;
const AX = 200;
const AY = 732;
const slotX = (k: number) => AX + k * (S + SG);
const IDX_Y = AY + S + 4; // 下标号
const BR_Y = AY + S + 36; // 数组下方括号

const RX = 960; // 右侧推导区左边界

// 存放顺序（i、j 从 1，k 从 0）
const kLower = (r: number, c: number) => (r * (r - 1)) / 2 + (c - 1);
const kUpper = (r: number, c: number) => ((r - 1) * (2 * NN - r + 2)) / 2 + (c - r);
const LOWER_AT: Array<[number, number]> = [];
const UPPER_AT: Array<[number, number]> = [];
for (let r = 1; r <= NN; r++) for (let c = 1; c <= r; c++) LOWER_AT.push([r, c]);
for (let r = 1; r <= NN; r++) for (let c = r; c <= NN; c++) UPPER_AT.push([r, c]);

// 片中矩阵的值（对称，scripts/check_numbers.py 核对过）
const LOWER_VALUES = [[2], [7, 1], [8, 2, 8], [1, 8, 2, 8], [4, 5, 9, 0, 4]];
const val = (r: number, c: number) => (r >= c ? LOWER_VALUES[r - 1][c - 1] : LOWER_VALUES[c - 1][r - 1]);

// ───────────────────────── 关键时刻 ─────────────────────────
const K = {
  q: p("s1a", "a 四 三"),
  diag: p("s2a"),
  match: p("s2a", "两边一样"),
  half: p("s2a", "只存"),
  fly: p("s2a", "只存") + 10,
  count: p("s3a"),
  rows: p("s3b"),
  left: p("s3b", "本行左边"),
  k8: p("s3b", "所以"),
  gen: p("s4a"),
  gen2: p("s4a", "上面有"),
  len: p("s4a", "长度"),
  stair: p("s4b"),
  halve: p("s4b", "再砍一半"),
  tri: p("s4b", "就是"),
  addj: p("s4c"),
  done: p("s4c", "公式就齐了"),
  s5: p("s5a"),
  notStored: p("s5a", "它在上三角"),
  never: p("s5a", "根本没存"),
  eq: p("s5b"),
  ilj: p("s5b", "所以"),
  swap: p("s5b", "交换"),
  up: p("s6a"),
  upFly: p("s6a") + 18,
  first: p("s6a", "第一行"),
  fewer: p("s6a", "往下"),
  u34: p("s6b"),
  uleft: p("s6b", "左边一个"),
  k10: p("s6b", "k 等于十"),
  ugen: p("s6c"),
  ulast: p("s6c", "最后那行"),
  urem: p("s6c", "剩"),
  ustair: p("s6d"),
  uhalve: p("s6d", "再砍一半"),
  urow: p("s6e"),
  uleft2: p("s6e", "左边只有"),
  uswap: p("s6e", "i 大于 j"),
  quiz: p("s7a"),
  q52: p("s7a", "a 五 二"),
  cd: TL.end["s7a"] + 6,
  ans: p("s7b"),
  five: p("s7b", "上面一行"),
  three: p("s7b", "左边三个"),
  kq: p("s7b", "k 等于八"),
  end: TL.end["s7b"] + 10,
};
const CD_LEN = 54; // 小题倒计时帧数
const OUT = 9; // 片尾前：矩阵、数组、题卡、公式卡、括号一起淡出的帧数
const END_IN = K.end + OUT + 1; // 全部淡没之后片尾卡才进场

// 飞行：第 k 个元素从矩阵飞进数组
const FLY_STEP = 4;
const FLY_DUR = 16;
const lowLand = (k: number) => K.fly + k * FLY_STEP + FLY_DUR;
const upLand = (k: number) => K.upFly + k * FLY_STEP + FLY_DUR;

/** 存哪一半：1 = 下三角，0 = 上三角 */
const lowerMode = (f: number) => 1 - progress(f, K.up, 14); // 第 7 镜小题留在上三角

/** 窗口：start 淡入，end 淡出 */
const win = (f: number, start: number, end: number, inDur = 12, outDur = 10) =>
  Math.min(progress(f, start, inDur), 1 - progress(f, end - outDur, outDur, EASE_IN));

const pulse = (f: number, start: number, dur = 14) => {
  const t = progress(f, start, dur, (x) => x);
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
};

// ───────────────────────── 音效 ─────────────────────────
const SFX: Sfx[] = [
  ...Array.from({ length: 25 }, (_, i) => ({ at: 2 + i * 2, src: "tick", vol: 0.06 })),
  { at: K.q, src: "pop", vol: 0.2 },
  { at: K.diag, src: "whoosh", vol: 0.2 },
  { at: K.match, src: "ding", vol: 0.16 },
  ...LOWER_AT.map((_, k) => ({ at: lowLand(k), src: "tick", vol: 0.12 })),
  ...Array.from({ length: 8 }, (_, k) => ({ at: K.count + 4 + k * 6, src: "tick", vol: 0.16 })),
  { at: K.rows + 6, src: "pop", vol: 0.16 },
  { at: K.left + 4, src: "pop", vol: 0.16 },
  { at: K.k8, src: "ding_hi", vol: 0.22 },
  { at: K.gen, src: "snap", vol: 0.14 },
  { at: K.stair + 30, src: "snap", vol: 0.2 },
  { at: K.halve, src: "whoosh", vol: 0.18 },
  { at: K.tri, src: "pop", vol: 0.16 },
  { at: K.addj + 24, src: "stamp", vol: 0.2 },
  { at: K.done + 8, src: "ding", vol: 0.18 },
  { at: K.never, src: "stamp", vol: 0.14 },
  { at: K.eq, src: "whoosh", vol: 0.18 },
  { at: K.swap, src: "snap", vol: 0.2 },
  { at: K.up, src: "whoosh", vol: 0.18 },
  ...UPPER_AT.map((_, k) => ({ at: upLand(k), src: "tick", vol: 0.12 })),
  ...[0, 1, 2, 3, 4].map((r) => ({ at: K.first + r * 6, src: "pop", vol: 0.12 })),
  { at: K.u34 + 10, src: "pop", vol: 0.16 },
  { at: K.uleft, src: "pop", vol: 0.16 },
  { at: K.k10, src: "ding_hi", vol: 0.22 },
  { at: K.urem, src: "snap", vol: 0.18 },
  { at: K.ustair + 34, src: "snap", vol: 0.2 },
  { at: K.uhalve, src: "whoosh", vol: 0.18 },
  { at: K.urow + 30, src: "stamp", vol: 0.2 },
  { at: K.uleft2 + 30, src: "ding", vol: 0.18 },
  { at: K.uswap, src: "snap", vol: 0.16 },
  { at: K.q52, src: "pop", vol: 0.2 },
  ...[0, 1, 2].map((i) => ({ at: K.cd + i * 18, src: "tick", vol: 0.26 })),
  { at: K.ans, src: "whoosh", vol: 0.18 },
  { at: K.five, src: "pop", vol: 0.16 },
  { at: K.three, src: "pop", vol: 0.16 },
  { at: K.kq, src: "ding_hi", vol: 0.24 },
  { at: END_IN, src: "ding", vol: 0.16 },
];

// ───────────────────────── 小件 ─────────────────────────
/** 弧线箭头：从 (x1,y1) 到 (x2,y2)，bend = 控制点偏离中点的距离（正 = 往右手边鼓） */
const Arc: React.FC<{ x1: number; y1: number; x2: number; y2: number; bend: number; draw: number; color?: string; opacity?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  bend,
  draw,
  color = L.accent,
  opacity = 1,
}) => {
  if (draw <= 0.001 || opacity <= 0.001) return null;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  const total = len * 1.3 + Math.abs(bend);
  // 终点切线方向 = 终点 - 控制点
  const tx = x2 - cx;
  const ty = y2 - cy;
  const tl = Math.hypot(tx, ty);
  const ux = tx / tl;
  const uy = ty / tl;
  const head = Math.max(0, (draw - 0.8) / 0.2);
  const hx1 = x2 - ux * 22 + uy * 12;
  const hy1 = y2 - uy * 22 - ux * 12;
  const hx2 = x2 - ux * 22 - uy * 12;
  const hy2 = y2 - uy * 22 + ux * 12;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity, zIndex: 40 }}>
      <path
        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={total}
        strokeDashoffset={total * (1 - draw)}
      />
      <path d={`M ${hx1} ${hy1} L ${x2} ${y2} L ${hx2} ${hy2}`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={head} />
    </svg>
  );
};

/** 揭晓时的一圈扩散光环 */
const Burst: React.FC<{ cx: number; cy: number; at: number; r0?: number; r1?: number; color?: string }> = ({ cx, cy, at, r0 = 40, r1 = 120, color = L.accent }) => {
  const f = useCurrentFrame();
  const t = progress(f, at, 20, EASE_OUT);
  if (t <= 0 || t >= 1) return null;
  const r = mix(r0, r1, t);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - r,
        top: cy - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: "50%",
        border: `${mix(6, 1, t)}px solid ${color}`,
        opacity: 1 - t,
        zIndex: 45,
      }}
    />
  );
};

/** 两段文字交叉淡入淡出：t = 0 显示 a，1 显示 b */
const Swap: React.FC<{ t: number; a: React.ReactNode; b: React.ReactNode; left?: boolean }> = ({ t, a, b, left }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    <span style={{ opacity: 1 - t, display: "inline-block", transform: `translateY(${-10 * t}px)` }}>{a}</span>
    <span
      style={{
        position: "absolute",
        left: left ? 0 : "50%",
        top: 0,
        opacity: t,
        transform: left ? `translateY(${10 * (1 - t)}px)` : `translate(-50%, ${10 * (1 - t)}px)`,
        whiteSpace: "nowrap",
      }}
    >
      {b}
    </span>
  </span>
);

// 公式片段
const fLowerTri = (
  <>
    <V>i</V>
    <P>(</P>
    <V>i</V>
    <Op tight>−</Op>
    <N>1</N>
    <P>)</P>
  </>
);
const fUpperTri = (
  <>
    <P>(</P>
    <V>i</V>
    <Op tight>−</Op>
    <N>1</N>
    <P>)(</P>
    <N>2</N>
    <V>n</V>
    <Op tight>−</Op>
    <V>i</V>
    <Op tight>+</Op>
    <N>2</N>
    <P>)</P>
  </>
);
const FormulaLower: React.FC = () => (
  <Row>
    <V>k</V>
    <Op>=</Op>
    <Frac num={fLowerTri} den={<N>2</N>} />
    <Op>+</Op>
    <P>(</P>
    <V>j</V>
    <Op tight>−</Op>
    <N>1</N>
    <P>)</P>
  </Row>
);
const FormulaUpper: React.FC = () => (
  <Row>
    <V>k</V>
    <Op>=</Op>
    <Frac num={fUpperTri} den={<N>2</N>} />
    <Op>+</Op>
    <P>(</P>
    <V>j</V>
    <Op tight>−</Op>
    <V>i</V>
    <P>)</P>
  </Row>
);

// ───────────────────────── 矩阵 ─────────────────────────
/** 当前存法下，target 前面的格子是否该点蓝（返回 0..1） */
const blueOf = (f: number, r: number, c: number): number => {
  const inLower = r >= c;
  const inUpper = r <= c;
  let b = 0;
  // 第 3 镜：a43 前面 8 个（下三角）
  if (inLower) {
    const k = kLower(r, c);
    if (k < 8) b = Math.max(b, progress(f, K.count + 4 + k * 6, 6) * (1 - progress(f, K.s5, 12)));
  }
  // 第 6 镜：a34 前面 10 个（上三角）
  if (inUpper) {
    const k = kUpper(r, c);
    if (k < 10) b = Math.max(b, progress(f, K.u34 + 6 + k * 2, 8) * (1 - progress(f, K.quiz, 12)));
  }
  // 第 7 镜：a52 → a25 前面 8 个（上三角：第 1 行 5 个 + 本行左边 3 个）
  if (inUpper) {
    const k = kUpper(r, c);
    if (k < 8) b = Math.max(b, progress(f, k < 5 ? K.five + k * 2 : K.three + (k - 5) * 3, 8) * (1 - progress(f, K.end, OUT)));
  }
  return b;
};

/** 重点描边：当前讨论的那一格 */
const hiOf = (f: number, r: number, c: number): number => {
  const breathe = 0.82 + 0.18 * Math.sin(f / 5);
  if (r === 4 && c === 3) {
    return Math.max(win(f, K.q, K.s5, 8, 10) * breathe, win(f, K.eq + 20, K.up, 8, 10));
  }
  if (r === 3 && c === 4) return Math.max(win(f, K.s5, K.eq + 30, 8, 10), win(f, K.u34, K.quiz, 8, 10));
  if (r === 5 && c === 2) return win(f, K.q52, K.ans + 20, 8, 10) * breathe;
  if (r === 2 && c === 5) return win(f, K.ans + 14, K.end, 8, 10);
  return 0;
};

/** a_ij 换成通用标签的时段 */
const labelOf = (f: number, r: number, c: number): string => {
  if (r === 4 && c === 3 && f >= K.gen && f < K.s5) return "ij";
  if (r === 3 && c === 4 && f >= K.ugen && f < K.quiz) return "ij";
  return `${r}${c}`;
};

const MatrixLayer: React.FC = () => {
  const f = useCurrentFrame();
  const lm = lowerMode(f);
  const halfP = progress(f, K.half, 16);
  const foldT = progress(f, K.diag + 8, 30, EASE_CAMERA);
  const foldOn = f >= K.diag + 8 && f < K.half + 12;
  const labelMix = progress(f, K.fly, 24);
  const dimRow = win(f, K.urow, K.uswap, 10, 10); // 第 6 镜末：只看第 i 行
  const out = 1 - progress(f, K.end, OUT);
  if (out <= 0.001) return null;
  const tiles: React.ReactNode[] = [];
  for (let r = 1; r <= NN; r++) {
    for (let c = 1; c <= NN; c++) {
      const intro = progress(f, 2 + (r + c - 2) * 3, 14, EASE_OUT);
      const isLowerOnly = r > c;
      const isUpperOnly = r < c;
      // 没存的那一半：下三角模式里上三角是复印件；上三角模式里下三角是复印件
      let ghost = 0;
      if (isUpperOnly) ghost = halfP * lm;
      if (isLowerOnly) ghost = 1 - lm;
      // 翻折期间：上三角原位只剩虚线空位
      const movingAway = isUpperOnly && foldOn;
      const tint = halfP * (1 - ghost);
      const hiPop = 1 + 0.06 * pulse(f, K.k8) * (r === 4 && c === 3 ? 1 : 0);
      const dim = r === 3 ? 1 : 1 - 0.7 * dimRow;
      const gen = labelOf(f, r, c) === "ij";
      const swapPop = 1 + 0.12 * (pulse(f, K.gen, 10) * (r === 4 && c === 3 ? 1 : 0) + pulse(f, K.ugen, 10) * (r === 3 && c === 4 ? 1 : 0));
      if (movingAway) {
        tiles.push(<PSlot key={`s${r}${c}`} x={cellX(c)} y={cellY(r)} w={T} opacity={intro} />);
        continue;
      }
      tiles.push(
        <PTile
          key={`t${r}${c}`}
          x={cellX(c)}
          y={cellY(r)}
          w={T}
          label={labelOf(f, r, c)}
          num={val(r, c)}
          opacity={intro * dim}
          transform={`scale(${(0.6 + 0.4 * intro) * hiPop * swapPop})`}
          look={{ tint, row: r - 1, ghost, hi: hiOf(f, r, c), blue: blueOf(f, r, c), labelMix: gen ? 1 : labelMix }}
          z={hiOf(f, r, c) > 0.1 ? 5 : 1}
        />,
      );
    }
  }
  // 翻折：上三角的格子越过对角线盖到下三角上（沿对角线的垂直方向压扁再展开）
  const folds: React.ReactNode[] = [];
  if (foldOn) {
    const fadeAway = 1 - progress(f, K.half, 12);
    const flash = pulse(f, K.match, 16);
    for (let r = 1; r <= NN; r++) {
      for (let c = r + 1; c <= NN; c++) {
        const x = mix(cellX(c), cellX(r), foldT);
        const y = mix(cellY(r), cellY(c), foldT);
        const sq = Math.max(0.04, Math.abs(Math.cos(Math.PI * foldT)));
        folds.push(
          <PTile
            key={`f${r}${c}`}
            x={x}
            y={y}
            w={T}
            num={val(r, c)}
            label={`${r}${c}`}
            opacity={fadeAway * 0.92}
            transform={`rotate(-45deg) scaleX(${sq}) rotate(45deg)`}
            look={{ labelMix: 0, hi: flash, tint: 0 }}
            z={10}
          />,
        );
      }
    }
  }
  // 对角线
  const diagDraw = progress(f, K.diag, 14) * (1 - progress(f, K.fly, 14));
  const d0x = MX - 18;
  const d0y = MY - 18;
  const d1x = M_RIGHT + 18;
  const d1y = M_BOTTOM + 18;
  // 行列号
  const headA = progress(f, 6, 14);
  const rowName = (r: number) => (r === 4 && f >= K.gen && f < K.s5 ? "i" : r === 3 && f >= K.ugen && f < K.quiz ? "i" : `${r}`);
  const colName = (c: number) => (c === 3 && f >= K.gen && f < K.s5 ? "j" : c === 4 && f >= K.ugen && f < K.quiz ? "j" : `${c}`);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      {Array.from({ length: NN }, (_, i) => i + 1).map((r) => {
        const g = rowName(r) !== `${r}`;
        return (
          <Txt key={`r${r}`} cx={MX - 34} y={cellY(r) + T / 2 - 18} width={60} size={g ? 34 : 26} opacity={headA} color={g ? L.accentDeep : L.ink3} weight={g ? 600 : 500} style={{ fontFamily: g ? FONT.math : FONT.mono, fontStyle: g ? "italic" : undefined }}>
            {rowName(r)}
          </Txt>
        );
      })}
      {Array.from({ length: NN }, (_, i) => i + 1).map((c) => {
        const g = colName(c) !== `${c}`;
        return (
          <Txt key={`c${c}`} cx={cellX(c) + T / 2} y={MY - 44} width={60} size={g ? 34 : 26} opacity={headA} color={g ? L.accentDeep : L.ink3} weight={g ? 600 : 500} style={{ fontFamily: g ? FONT.math : FONT.mono, fontStyle: g ? "italic" : undefined }}>
            {colName(c)}
          </Txt>
        );
      })}
      {tiles}
      {folds}
      {diagDraw > 0.001 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, zIndex: 20 }}>
          <line
            x1={d0x}
            y1={d0y}
            x2={mix(d0x, d1x, diagDraw)}
            y2={mix(d0y, d1y, diagDraw)}
            stroke={L.accent}
            strokeWidth={4}
            strokeDasharray="14 10"
            strokeLinecap="round"
            opacity={0.6}
          />
        </svg>
      ) : null}
    </div>
  );
};

/** 矩阵上的附加标注：行长小圆片、右侧竖括号、"没存"、"从这开始"、翻折弧线 */
const MatrixNotes: React.FC = () => {
  const f = useCurrentFrame();
  const out = 1 - progress(f, K.end, OUT);
  if (out <= 0.001) return null;
  const c = (col: number) => cellX(col) + T / 2;
  const m = (row: number) => cellY(row) + T / 2;
  // 第 3 镜：行尾小圆片 1、2、3（下三角每行最后一格 = 对角线那格）
  const lowBadges = [1, 2, 3].map((r) => {
    const a = progress(f, K.rows + 4 + (r - 1) * 5, 10) * (1 - progress(f, K.stair, 10));
    return a > 0.001 ? (
      <div key={`lb${r}`} style={{ position: "absolute", left: cellX(r) + T - 22, top: cellY(r) - 12, opacity: a, zIndex: 30 }}>
        <Chip color="#FFFFFF" bg={L.blue} size={24} style={{ padding: "1px 11px 2px", transform: `scale(${0.6 + 0.4 * a})` }}>
          {r}
        </Chip>
      </div>
    ) : null;
  });
  // 第 4 镜：右侧竖括号"i − 1 行"
  const vb = progress(f, K.gen2, 14) * (1 - progress(f, K.stair + 20, 12));
  // 第 6 镜：上三角每行个数（行尾右侧）
  const upBadges = [1, 2, 3, 4, 5].map((r) => {
    const a = progress(f, K.first + (r - 1) * 6, 10) * (1 - progress(f, K.ustair, 10));
    const n = NN - r + 1;
    return a > 0.001 ? (
      <div key={`ub${r}`} style={{ position: "absolute", left: M_RIGHT + 18, top: m(r) - 20, opacity: a, zIndex: 30 }}>
        <Chip color="#FFFFFF" bg={L.accent} size={26} style={{ padding: "2px 13px 3px", transform: `scale(${0.6 + 0.4 * a})` }}>
          {n}
        </Chip>
      </div>
    ) : null;
  });
  // 第 5 镜："没存"
  const ns = progress(f, K.never, 10) * (1 - progress(f, K.eq + 30, 10));
  // 第 5 镜：a34 → a43 弧线；第 7 镜：a52 → a25
  const arc1 = progress(f, K.eq + 4, 18) * (1 - progress(f, K.ilj + 20, 10));
  const arc2 = progress(f, K.ans + 2, 18) * (1 - progress(f, K.three, 10));
  // 第 6 镜末："从对角线开始"
  const start = win(f, K.urow + 6, K.uswap, 10, 10);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      {lowBadges}
      <VBrace x={M_RIGHT + 14} y={cellY(1)} h={cellY(3) + T - cellY(1)} side="right" draw={vb} color={L.blue} stroke={3.5} w={22} />
      <Txt x={M_RIGHT + 46} y={(cellY(1) + cellY(3) + T) / 2 - 24} size={38} color={L.blue} weight={600} opacity={vb} width={200}>
        <V>i</V> − 1 行
      </Txt>
      {upBadges}
      {ns > 0.001 ? (
        <div style={{ position: "absolute", left: cellX(4) + T - 30, top: cellY(3) - 22, zIndex: 35, opacity: ns, transform: `rotate(-10deg) scale(${1 + 0.5 * (1 - ns)})` }}>
          <Chip color="#FFFFFF" bg={L.ink2} size={26}>
            没存
          </Chip>
        </div>
      ) : null}
      <Arc x1={c(4)} y1={m(3)} x2={c(3) + 6} y2={m(4) - 6} bend={-70} draw={arc1} />
      {/* a52 上边中点 → a25 左边中点：45° 线正好沿格子缝走（a42|a43、a33|a34、a24|a25 之间），不压 a43、a34 的标签 */}
      <Arc x1={c(2)} y1={cellY(5) + 2} x2={cellX(5) + 6} y2={m(2) - 4} bend={-8} draw={arc2} />
      {start > 0.001 ? (
        <div style={{ position: "absolute", left: c(3) - 100, top: cellY(3) + T + 6, width: 200, textAlign: "center", opacity: start, zIndex: 35 }}>
          <svg width={28} height={16} style={{ display: "block", margin: "0 auto" }}>
            <path d="M 14 0 L 27 15 L 1 15 Z" fill={L.accent} />
          </svg>
          <Chip color="#FFFFFF" bg={L.accent} size={26}>
            从对角线开始
          </Chip>
        </div>
      ) : null}
    </div>
  );
};

// ───────────────────────── 一维数组 ─────────────────────────
type SlotView = { label?: string; row: number; opacity: number; sx: number; sy: number };

const slotView = (f: number, k: number): SlotView | null => {
  const [lr, lc] = LOWER_AT[k];
  const [ur, uc] = UPPER_AT[k];
  const lower: SlotView = { label: `${lr}${lc}`, row: lr - 1, opacity: 1, sx: 1, sy: 1 };
  const upper: SlotView = { label: `${ur}${uc}`, row: ur - 1, opacity: 1, sx: 1, sy: 1 };
  if (f < K.up) return f >= lowLand(k) ? { ...lower, sy: 1 + 0.12 * pulse(f, lowLand(k), 8) } : null;
  if (f >= upLand(k)) return { ...upper, sy: 1 + 0.12 * pulse(f, upLand(k), 8) };
  const d = progress(f, K.up + k, 10, EASE_IN);
  return d < 1 ? { ...lower, opacity: 1 - d, sx: 1 - 0.4 * d, sy: 1 - 0.4 * d } : null;
};

const ArrayLayer: React.FC = () => {
  const f = useCurrentFrame();
  const intro = (k: number) => progress(f, 6 + k * 2, 14, EASE_OUT);
  const out = 1 - progress(f, K.end, OUT);
  if (out <= 0.001) return null;
  const items: React.ReactNode[] = [];
  for (let k = 0; k < 15; k++) {
    const x = slotX(k);
    const a = intro(k);
    items.push(<PSlot key={`p${k}`} x={x} y={AY + mix(30, 0, a)} w={S} opacity={a} />);
    const v = slotView(f, k);
    // 高亮
    let blue = 0;
    let fill = 0;
    if (k < 8) blue = Math.max(blue, progress(f, K.count + 4 + k * 6, 6) * (1 - progress(f, K.s5, 12)));
    if (k === 8) fill = Math.max(fill, progress(f, K.k8, 8) * (1 - progress(f, K.s5, 12)), win(f, K.eq + 20, K.up, 8, 8));
    if (k < 10) blue = Math.max(blue, progress(f, K.u34 + 6 + k * 2, 8) * (1 - progress(f, K.quiz, 10)));
    if (k === 10) fill = Math.max(fill, progress(f, K.k10, 8) * (1 - progress(f, K.quiz, 10)));
    if (k < 5) blue = Math.max(blue, progress(f, K.five + k * 2, 8) * (1 - progress(f, K.end, OUT)));
    if (k >= 5 && k < 8) blue = Math.max(blue, progress(f, K.three + (k - 5) * 3, 8) * (1 - progress(f, K.end, OUT)));
    if (k === 8) fill = Math.max(fill, progress(f, K.kq, 8) * (1 - progress(f, K.end, OUT)));
    // 目标元素在数组里先描橙边（答案揭晓后变实心）
    let hi = 0;
    if (k === 8) hi = win(f, lowLand(8) + 4, K.k8 + 8, 8, 8);
    if (k === 10) hi = Math.max(hi, win(f, K.u34 + 4, K.k10 + 8, 8, 8));
    if (k === 8) hi = Math.max(hi, win(f, K.ans + 14, K.kq + 8, 8, 8));
    if (v) {
      items.push(
        <PTile
          key={`v${k}`}
          x={x}
          y={AY}
          w={S}
          label={v.label}
          opacity={v.opacity}
          transform={`scale(${v.sx * (1 + 0.08 * fill)}, ${v.sy * (1 + 0.08 * fill)})`}
          look={{ tint: 1, row: v.row, blue: blue * (1 - fill) * (1 - hi), fill, hi }}
          z={fill > 0.1 || hi > 0.1 ? 5 : 1}
        />,
      );
    }
    // 下标号：答案那一格变橙、放大
    const hot = k === 8 ? Math.max(progress(f, K.k8, 8) * (1 - progress(f, K.s5, 12)), progress(f, K.kq, 8) * (1 - progress(f, K.end, OUT))) : k === 10 ? progress(f, K.k10, 8) * (1 - progress(f, K.quiz, 10)) : 0;
    items.push(
      <Txt key={`i${k}`} cx={x + S / 2} y={IDX_Y - 4 * hot} width={80} size={24 + 8 * hot} opacity={a} color={hot > 0.5 ? L.accentDeep : L.ink3} weight={hot > 0.5 ? 700 : 500} style={{ fontFamily: FONT.mono }}>
        {k}
      </Txt>,
    );
  }
  return <div style={{ position: "absolute", inset: 0, opacity: out }}>{items}</div>;
};

/** 数组下方的括号与标注 */
const BraceUnder: React.FC<{ k0: number; k1: number; draw: number; color: string; children: React.ReactNode; size?: number }> = ({ k0, k1, draw, color, children, size = 32 }) => {
  if (draw <= 0.001) return null;
  const x0 = slotX(k0) + 4;
  const x1 = slotX(k1) + S - 4;
  return (
    <>
      <Brace x={x0} y={BR_Y} w={x1 - x0} h={16} dir="down" draw={draw} color={color} stroke={3} opacity={Math.min(1, draw * 3)} />
      <Txt cx={(x0 + x1) / 2} y={BR_Y + 18} width={Math.max(160, x1 - x0 + 120)} size={size} color={color} weight={700} opacity={Math.min(1, draw * 1.5)}>
        {children}
      </Txt>
    </>
  );
};

const ArrayBraces: React.FC = () => {
  const f = useCurrentFrame();
  // 下三角
  const lA = progress(f, K.rows + 6, 14) * (1 - progress(f, K.s5, 12));
  const lB = progress(f, K.left + 4, 12) * (1 - progress(f, K.s5, 12));
  const lA1 = progress(f, K.len, 12);
  const lA2 = progress(f, K.tri, 12);
  const lB1 = progress(f, K.addj, 12);
  // 上三角
  const uA = progress(f, K.u34 + 10, 14) * (1 - progress(f, K.quiz, 10));
  const uB = progress(f, K.uleft, 12) * (1 - progress(f, K.quiz, 10));
  const uA1 = progress(f, K.uhalve + 10, 12);
  const uB1 = progress(f, K.uleft2, 12);
  // 小题
  const qA = progress(f, K.five, 14) * (1 - progress(f, K.end, OUT));
  const qB = progress(f, K.three, 12) * (1 - progress(f, K.end, OUT));
  return (
    <>
      <BraceUnder k0={0} k1={5} draw={lA} color={L.blue}>
        <Swap
          t={lA2}
          a={
            <Swap
              t={lA1}
              a={<span>1 + 2 + 3 = 6</span>}
              b={
                <span>
                  1 + 2 + … + (<V>i</V> − 1)
                </span>
              }
            />
          }
          b={
            <span>
              <V>i</V>(<V>i</V> − 1)/2
            </span>
          }
        />
      </BraceUnder>
      <BraceUnder k0={6} k1={7} draw={lB} color={L.accentDeep}>
        <Swap
          t={lB1}
          a={<span>2</span>}
          b={
            <span>
              <V>j</V> − 1
            </span>
          }
        />
      </BraceUnder>
      <BraceUnder k0={0} k1={8} draw={uA} color={L.blue}>
        <Swap
          t={uA1}
          a={<span>5 + 4 = 9</span>}
          b={
            <span>
              (<V>i</V> − 1)(2<V>n</V> − <V>i</V> + 2)/2
            </span>
          }
        />
      </BraceUnder>
      <BraceUnder k0={9} k1={9} draw={uB} color={L.accentDeep}>
        <Swap
          t={uB1}
          a={<span>1</span>}
          b={
            <span>
              <V>j</V> − <V>i</V>
            </span>
          }
        />
      </BraceUnder>
      <BraceUnder k0={0} k1={4} draw={qA} color={L.blue}>
        5
      </BraceUnder>
      <BraceUnder k0={5} k1={7} draw={qB} color={L.accentDeep}>
        3
      </BraceUnder>
    </>
  );
};

/** 计数小圆片：第 3 镜数 a43 前面的 8 格 */
const CountBadges: React.FC = () => {
  const f = useCurrentFrame();
  const out = 1 - progress(f, K.rows, 10);
  if (out <= 0.001) return null;
  return (
    <>
      {Array.from({ length: 8 }, (_, k) => {
        const a = progress(f, K.count + 4 + k * 6, 8);
        if (a <= 0.001) return null;
        const s = 0.5 + 0.5 * a + 0.15 * Math.sin(Math.PI * Math.min(1, a));
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: slotX(k) + S - 22,
              top: AY - 16,
              width: 34,
              height: 34,
              borderRadius: 34,
              background: L.blue,
              color: "#FFFFFF",
              fontFamily: FONT.sans,
              fontWeight: 700,
              fontSize: 19,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${s})`,
              opacity: a * out,
              zIndex: 30,
            }}
          >
            {k + 1}
          </div>
        );
      })}
    </>
  );
};

/** 飞行副本：矩阵 → 数组 */
const FlyLayer: React.FC = () => {
  const f = useCurrentFrame();
  const items: React.ReactNode[] = [];
  const fly = (list: Array<[number, number]>, start: number, tag: string) => {
    list.forEach(([r, c], k) => {
      const s0 = start + k * FLY_STEP;
      const t = progress(f, s0, FLY_DUR, EASE_CAMERA);
      if (f < s0 || t >= 1) return;
      const x = mix(cellX(c), slotX(k), t);
      const y = mix(cellY(r), AY, t) - 70 * Math.sin(Math.PI * t);
      const w = mix(T, S, t);
      items.push(<PTile key={`${tag}${k}`} x={x} y={y} w={w} label={`${r}${c}`} look={{ tint: 1, row: r - 1 }} z={50} transform={`rotate(${6 * Math.sin(Math.PI * t)}deg)`} />);
    });
  };
  fly(LOWER_AT, K.fly, "l");
  fly(UPPER_AT, K.upFly, "u");
  return <>{items}</>;
};

// ───────────────────────── 右侧推导区 ─────────────────────────
const ModeChip: React.FC = () => {
  const f = useCurrentFrame();
  const a = progress(f, 4, 14) * (1 - progress(f, K.end, OUT));
  const lm = lowerMode(f);
  if (a <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: MX - 4, top: 46, opacity: a }}>
      <Chip size={28} color={L.ink} bg={hexA("#FFFFFF", 0.9)} style={{ boxShadow: `inset 0 0 0 1.5px ${L.cardLine}` }}>
        按行存 ·{" "}
        <Swap t={1 - lm} a={<span style={{ color: L.accentDeep }}>下三角</span>} b={<span style={{ color: L.accentDeep }}>上三角</span>} />
      </Chip>
    </div>
  );
};

/** 第 1～3 镜：题目卡 */
const QuestionCard: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.q - 6, K.gen + 6, 12, 12);
  if (a <= 0.001) return null;
  const rev = progress(f, K.k8, 10);
  const qBlink = rev > 0 ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(f / 7));
  const x = RX + 40;
  const y = 210;
  return (
    <>
      <Card x={x} y={y} w={680} h={210} opacity={a} dy={mix(24, 0, progress(f, K.q - 6, 14))}>
        <div style={{ position: "absolute", left: 28, top: 20 }}>
          <Chip size={24}>考题</Chip>
        </div>
        <div style={{ position: "absolute", inset: 0, top: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100, color: L.ink }}>
          <A sub="43" />
          <Op style={{ color: L.ink3, fontSize: "0.7em" }}>→</Op>
          <V>k</V>
          <Op>=</Op>
          <span style={{ display: "inline-block", minWidth: "1.2em", textAlign: "center", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, right: 0, opacity: (1 - rev) * qBlink, color: L.accent, fontFamily: FONT.sans, fontWeight: 700 }}>?</span>
            <span style={{ opacity: rev, color: L.accentDeep, display: "inline-block", transform: `scale(${1 + 0.35 * pulse(f, K.k8, 14)})` }}>
              <N style={{ fontWeight: 700 }}>8</N>
            </span>
          </span>
        </div>
      </Card>
      <Burst cx={x + 560} cy={y + 125} at={K.k8} />
    </>
  );
};

/** 台阶拼长方形：rows = 每行长度（左对齐的原台阶），W = 拼好后的宽 */
const Staircase: React.FC<{
  x: number;
  y: number;
  tile: number;
  gap: number;
  rows: number[];
  W: number;
  start: number;
  join: number; // 复制件开始飞入
  halve: number; // 砍一半
  opacity: number;
  colorRow: (r: number) => number;
}> = ({ x, y, tile, gap, rows, W, start, join, halve, opacity, colorRow }) => {
  const f = useCurrentFrame();
  if (opacity <= 0.001) return null;
  const H = rows.length;
  const step = tile + gap;
  const boxW = W * step - gap;
  const boxH = H * step - gap;
  const items: React.ReactNode[] = [];
  rows.forEach((len, r) => {
    for (let c = 0; c < len; c++) {
      const a = progress(f, start + r * 4 + c * 2, 10);
      items.push(
        <PTile key={`o${r}-${c}`} x={x + c * step} y={y + r * step + mix(16, 0, a)} w={tile} opacity={a} look={{ tint: 1, row: colorRow(r) }} />,
      );
    }
  });
  // 复制件：同形状，绕中心转 180° 同时从右边滑进来
  const t = progress(f, join, 28, EASE_CAMERA);
  const copyA = progress(f, join, 8) * (1 - 0.85 * progress(f, halve, 14));
  const copy: React.ReactNode[] = [];
  rows.forEach((len, r) => {
    for (let c = 0; c < len; c++) {
      copy.push(
        <div
          key={`c${r}-${c}`}
          style={{
            position: "absolute",
            left: c * step,
            top: r * step,
            width: tile,
            height: tile,
            borderRadius: Math.round(tile * 0.14),
            background: L.copy,
            border: `2px dashed ${L.copyLine}`,
            boxSizing: "border-box",
          }}
        />,
      );
    }
  });
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {items}
      {copyA > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: boxW,
            height: boxH,
            opacity: copyA,
            transformOrigin: "50% 50%",
            transform: `translateX(${mix(360, 0, t)}px) rotate(${mix(0, 180, t)}deg)`,
          }}
        >
          {copy}
        </div>
      ) : null}
    </div>
  );
};

/** 第 4 镜：下三角的台阶 1、2、3 → 3×4 长方形 → 一半 */
const StairLower: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.stair, K.s5, 10, 12);
  if (a <= 0.001) return null;
  const tile = 66;
  const gap = 6;
  const x = RX + 70;
  const y = 214;
  const W = 4;
  const H = 3;
  const boxW = W * (tile + gap) - gap;
  const boxH = H * (tile + gap) - gap;
  const lab = progress(f, K.stair + 34, 12);
  const res = progress(f, K.tri, 14);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Staircase x={x} y={y} tile={tile} gap={gap} rows={[1, 2, 3]} W={W} start={K.stair} join={K.stair + 6} halve={K.halve} opacity={1} colorRow={(r) => r} />
      <Txt cx={x + boxW / 2} y={y - 52} width={300} size={38} color={L.ink2} weight={600} opacity={lab}>
        宽 <V>i</V>
      </Txt>
      <Txt x={x - 18} y={y + boxH / 2 - 24} width={200} align="right" size={38} color={L.ink2} weight={600} opacity={lab}>
        高 <V>i</V> − 1
      </Txt>
      <div style={{ position: "absolute", left: x + boxW + 48, top: y - 6, opacity: progress(f, K.stair + 40, 12) }}>
        <Chip size={24} color={L.ink2} bg={hexA("#FFFFFF", 0.9)} style={{ boxShadow: `inset 0 0 0 1.5px ${L.cardLine}` }}>
          等差数列求和
        </Chip>
      </div>
      <div style={{ position: "absolute", left: x + boxW + 44, top: y + 70, opacity: res, transform: `translateY(${mix(14, 0, res)}px)`, fontSize: 66, color: L.ink }}>
        <Row>
          <Op>=</Op>
          <Frac num={fLowerTri} den={<N>2</N>} />
        </Row>
      </div>
    </div>
  );
};

/** 公式卡（下三角）：第 4 镜落下，第 6 镜缩到右上角 */
const CardLower: React.FC = () => {
  const f = useCurrentFrame();
  const a = progress(f, K.addj + 12, 14);
  if (a <= 0.001) return null;
  const toCorner = progress(f, K.up, 22, EASE_CAMERA);
  const gone = progress(f, K.end, OUT);
  const x0 = RX + 20;
  const y0 = 470;
  const w = 720;
  const h = 140;
  const sc = mix(1, 0.56, toCorner);
  const x = mix(x0, 1880 - w * 0.56, toCorner);
  const y = mix(y0, 36, toCorner);
  const check = win(f, K.done + 4, K.up, 12, 10);
  const chip = progress(f, K.swap, 12);
  return (
    <div style={{ position: "absolute", left: x, top: y + mix(30, 0, a), width: w, height: h, transformOrigin: "0 0", transform: `scale(${sc * (1 + 0.04 * pulse(f, K.addj + 24, 12))})`, opacity: a * (1 - gone), zIndex: 20 }}>
      <Card x={0} y={0} w={w} h={h}>
        <div style={{ position: "absolute", left: 22, top: -18 }}>
          <Chip size={22} color={L.ink2} bg={L.paperDeep} style={{ boxShadow: `inset 0 0 0 1.5px ${L.cardLine}` }}>
            按行存下三角
          </Chip>
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, color: L.ink }}>
          <FormulaLower />
        </div>
        {chip > 0.001 ? (
          <div style={{ position: "absolute", right: -18, top: -22, opacity: chip, transform: `scale(${0.6 + 0.4 * chip}) rotate(4deg)` }}>
            <Chip size={26} color="#FFFFFF" bg={L.accent}>
              <V>i</V> &lt; <V>j</V> 时交换 <V>i</V>、<V>j</V>
            </Chip>
          </div>
        ) : null}
      </Card>
      {check > 0.001 ? (
        <Txt cx={w / 2} y={h + 16} width={w} size={34} color={L.ink2} opacity={check}>
          <V>i</V> = 4, <V>j</V> = 3 → 6 + 2 = 8 <span style={{ color: L.ok, fontWeight: 800 }}>✓</span>
        </Txt>
      ) : null}
    </div>
  );
};

/** 第 5 镜：a34 = a43，i、j 交换 */
const SwapWidget: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.eq, K.up, 12, 12);
  if (a <= 0.001) return null;
  const eqA = progress(f, K.eq + 8, 12);
  const sw = progress(f, K.swap, 22, EASE_CAMERA);
  const gA = progress(f, K.ilj, 12);
  // 通用 a_ij：i、j 沿两道弧交换位置
  const fs = 96;
  const dx = 0.42 * fs * 0.62; // 两个下标字的间距
  const lift = Math.sin(Math.PI * sw) * 34;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <div style={{ position: "absolute", left: RX, width: 760, top: 196, textAlign: "center", fontSize: fs, color: L.ink, opacity: eqA }}>
        <A sub="34" />
        <Op>=</Op>
        <A sub="43" style={{ color: L.accentDeep }} />
      </div>
      <div style={{ position: "absolute", left: RX, width: 760, top: 330, height: 120, opacity: gA, fontSize: fs, color: L.ink }}>
        <div style={{ position: "absolute", left: 300, top: 0 }}>
          <V style={{ padding: 0 }}>a</V>
        </div>
        <div style={{ position: "absolute", left: 300 + fs * 0.52, top: fs * 0.34, fontSize: fs * 0.62, width: 2 * dx + 40, height: fs }}>
          <span style={{ position: "absolute", left: mix(0, dx, sw), top: -lift, fontFamily: FONT.math, fontStyle: "italic", color: L.accentDeep }}>i</span>
          <span style={{ position: "absolute", left: mix(dx, 0, sw), top: lift, fontFamily: FONT.math, fontStyle: "italic", color: L.blue }}>j</span>
        </div>
        <Txt x={270} y={34} width={260} size={40} color={L.ink2} weight={600} align="right">
          <V>i</V> &lt; <V>j</V>
        </Txt>
      </div>
    </div>
  );
};

/** 第 6 镜：上面每行的个数，最后那行 n − (i − 2) → n − i + 2 */
const ListUpper: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.ugen, K.ustair + 4, 12, 12);
  if (a <= 0.001) return null;
  const x = RX + 40;
  const y = 200;
  const lh = 66;
  const l3 = progress(f, K.ulast, 12);
  const morph = progress(f, K.urem, 16);
  const rowStyle = (i: number): React.CSSProperties => ({ position: "absolute", left: x, top: y + i * lh, fontSize: 44, color: L.ink, whiteSpace: "nowrap", fontFamily: FONT.sans });
  const lab = (t: React.ReactNode) => <span style={{ display: "inline-block", width: 250, color: L.ink2, fontSize: 36 }}>{t}</span>;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <div style={{ ...rowStyle(0), opacity: progress(f, K.ugen + 4, 10) }}>
        {lab("第 1 行")}
        <V>n</V> 个
      </div>
      <div style={{ ...rowStyle(1), opacity: progress(f, K.ugen + 10, 10) }}>
        {lab("第 2 行")}
        <V>n</V> − 1 个
      </div>
      <div style={{ ...rowStyle(2), opacity: progress(f, K.ugen + 16, 10), color: L.ink3 }}>{lab("⋮")}</div>
      <div style={{ ...rowStyle(3), opacity: l3 }}>
        {lab(
          <span>
            第 <V>i</V> − 1 行
          </span>,
        )}
        <span style={{ color: L.accentDeep, fontWeight: 600 }}>
          <Swap
            t={morph}
            left
            a={
              <span>
                <V>n</V> − (<V>i</V> − 2) <span style={{ color: L.ink, fontWeight: 400 }}>个</span>
              </span>
            }
            b={
              <span>
                <V>n</V> − <V>i</V> + 2 <span style={{ color: L.ink, fontWeight: 400 }}>个</span>
              </span>
            }
          />
        </span>
      </div>
      <div style={{ position: "absolute", left: x - 8, top: y + 3 * lh - 6, width: 640, height: lh, borderRadius: 12, border: `3px solid ${L.accent}`, opacity: pulse(f, K.urem, 24) * 0.9 }} />
      <Txt x={x + 250} y={y + 4 * lh + 6} width={500} size={28} color={L.ink3} opacity={l3 * (1 - morph)}>
        比第 1 行少了 <V>i</V> − 2 个
      </Txt>
    </div>
  );
};

/** 第 6 镜：上三角的台阶 5、4 → 2×9 长方形 → 一半 */
const StairUpper: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.ustair, K.urow + 26, 10, 12);
  if (a <= 0.001) return null;
  const tile = 52;
  const gap = 5;
  const x = RX + 150;
  const y = 236;
  const W = 9;
  const H = 2;
  const boxW = W * (tile + gap) - gap;
  const boxH = H * (tile + gap) - gap;
  const lab = progress(f, K.ustair + 36, 12);
  const res = progress(f, K.uhalve + 8, 14);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <Staircase x={x} y={y} tile={tile} gap={gap} rows={[5, 4]} W={W} start={K.ustair} join={K.ustair + 8} halve={K.uhalve} opacity={1} colorRow={(r) => r} />
      <Txt cx={x + boxW / 2} y={y - 54} width={700} size={34} color={L.ink2} weight={600} opacity={lab}>
        宽 <V>n</V> + (<V>n</V> − <V>i</V> + 2) = 2<V>n</V> − <V>i</V> + 2
      </Txt>
      <Txt x={x - 18} y={y + boxH / 2 - 22} width={200} align="right" size={36} color={L.ink2} weight={600} opacity={lab}>
        高 <V>i</V> − 1
      </Txt>
      <div style={{ position: "absolute", left: x, width: boxW, top: y + boxH + 20, textAlign: "center", opacity: res, transform: `translateY(${mix(14, 0, res)}px)`, fontSize: 52, color: L.ink }}>
        <Row>
          <Op>=</Op>
          <Frac num={fUpperTri} den={<N>2</N>} />
        </Row>
      </div>
    </div>
  );
};

/** 公式卡（上三角） */
const CardUpper: React.FC = () => {
  const f = useCurrentFrame();
  const a = progress(f, K.urow + 24, 14) * (1 - progress(f, K.end, OUT));
  if (a <= 0.001) return null;
  const x = RX + 20;
  const y = mix(470, 520, progress(f, K.quiz, 18, EASE_CAMERA));
  const w = 760;
  const h = 140;
  const check = progress(f, K.uleft2 + 26, 12) * (1 - progress(f, K.quiz, 10));
  const chip = progress(f, K.uswap, 12);
  return (
    <div style={{ position: "absolute", left: x, top: y + mix(30, 0, progress(f, K.urow + 24, 14)), width: w, height: h, opacity: a, transform: `scale(${1 + 0.04 * pulse(f, K.urow + 30, 12)})`, zIndex: 20 }}>
      <Card x={0} y={0} w={w} h={h}>
        <div style={{ position: "absolute", left: 22, top: -18 }}>
          <Chip size={22} color={L.ink2} bg={L.paperDeep} style={{ boxShadow: `inset 0 0 0 1.5px ${L.cardLine}` }}>
            按行存上三角
          </Chip>
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, color: L.ink }}>
          <FormulaUpper />
        </div>
        {chip > 0.001 ? (
          <div style={{ position: "absolute", right: -18, top: -22, opacity: chip, transform: `scale(${0.6 + 0.4 * chip}) rotate(4deg)` }}>
            <Chip size={26} color="#FFFFFF" bg={L.accent}>
              <V>i</V> &gt; <V>j</V> 时交换 <V>i</V>、<V>j</V>
            </Chip>
          </div>
        ) : null}
      </Card>
      {check > 0.001 ? (
        <Txt cx={w / 2} y={h + 16} width={w} size={34} color={L.ink2} opacity={check}>
          <V>n</V> = 5, <V>i</V> = 3, <V>j</V> = 4 → 9 + 1 = 10 <span style={{ color: L.ok, fontWeight: 800 }}>✓</span>
        </Txt>
      ) : null}
    </div>
  );
};

/** 第 6 镜开头：a34 的题卡（小） */
const Upper34Card: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.u34, K.ugen + 4, 12, 12);
  if (a <= 0.001) return null;
  const rev = progress(f, K.k10, 10);
  const x = RX + 80;
  const y = 230;
  return (
    <>
      <Card x={x} y={y} w={600} h={180} opacity={a} dy={mix(20, 0, progress(f, K.u34, 14))}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 92, color: L.ink }}>
          <A sub="34" />
          <Op style={{ color: L.ink3, fontSize: "0.7em" }}>→</Op>
          <V>k</V>
          <Op>=</Op>
          <span style={{ display: "inline-block", minWidth: "1.3em", textAlign: "center", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, right: 0, opacity: 1 - rev, color: L.accent, fontFamily: FONT.sans, fontWeight: 700 }}>?</span>
            <span style={{ opacity: rev, color: L.accentDeep, display: "inline-block", transform: `scale(${1 + 0.35 * pulse(f, K.k10, 14)})` }}>
              <N style={{ fontWeight: 700 }}>10</N>
            </span>
          </span>
        </div>
      </Card>
      <Burst cx={x + 488} cy={y + 90} at={K.k10} />
    </>
  );
};

/** 第 7 镜：小题卡 + 倒计时环 */
const QuizCard: React.FC = () => {
  const f = useCurrentFrame();
  const a = win(f, K.quiz + 6, K.end + OUT, 12, OUT);
  if (a <= 0.001) return null;
  const rev = progress(f, K.kq, 10);
  const cd = progress(f, K.cd, CD_LEN, (x) => x) * (1 - rev);
  const x = RX + 40;
  const y = 200;
  const ringCx = x + 560;
  const ringCy = y + 130;
  const R = 74;
  const C = 2 * Math.PI * R;
  return (
    <>
      <Card x={x} y={y} w={680} h={230} opacity={a} dy={mix(24, 0, progress(f, K.quiz + 6, 14))}>
        <div style={{ position: "absolute", left: 28, top: 20 }}>
          <Chip size={24}>小题 · 按行存上三角</Chip>
        </div>
        <div style={{ position: "absolute", left: 40, top: 70, height: 130, display: "flex", alignItems: "center", fontSize: 96, color: L.ink }}>
          <A sub="52" />
          <Op style={{ color: L.ink3, fontSize: "0.7em" }}>→</Op>
          <V>k</V>
          <Op>=</Op>
        </div>
        <div style={{ position: "absolute", left: ringCx - x - 80, top: ringCy - y - 66, width: 160, height: 130, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96 }}>
          <span style={{ position: "absolute", opacity: (1 - rev) * (0.6 + 0.4 * Math.abs(Math.sin(f / 7))), color: L.accent, fontFamily: FONT.sans, fontWeight: 700 }}>?</span>
          <span style={{ opacity: rev, color: L.accentDeep, transform: `scale(${1 + 0.35 * pulse(f, K.kq, 14)})` }}>
            <N style={{ fontWeight: 700 }}>8</N>
          </span>
        </div>
      </Card>
      {cd > 0.001 && cd < 0.999 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, zIndex: 30, opacity: a }}>
          <circle cx={ringCx} cy={ringCy} r={R} fill="none" stroke={L.cardLine} strokeWidth={8} />
          <circle
            cx={ringCx}
            cy={ringCy}
            r={R}
            fill="none"
            stroke={L.accent}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - cd)}
            transform={`rotate(-90 ${ringCx} ${ringCy})`}
          />
        </svg>
      ) : null}
      {f >= K.cd && f < K.ans ? (
        <Txt cx={ringCx} y={y + 250} width={300} size={30} color={L.ink3} opacity={progress(f, K.cd, 8) * (1 - progress(f, K.ans - 6, 6))}>
          想一想…
        </Txt>
      ) : null}
      <Burst cx={ringCx} cy={ringCy} at={K.kq} />
    </>
  );
};

/** 片尾：两张公式卡 */
const EndCards: React.FC = () => {
  const f = useCurrentFrame();
  const a = progress(f, END_IN, 14);
  if (a <= 0.001) return null;
  const card = (x: number, title: string, formula: React.ReactNode, chip: React.ReactNode, delay: number) => {
    const t = progress(f, END_IN + delay, 14, EASE_OUT);
    return (
      <Card x={x} y={290} w={760} h={300} opacity={t} dy={mix(30, 0, t)} style={{ transform: `scale(${mix(0.94, 1, t)})` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 26, textAlign: "center" }}>
          <Chip size={30} color={L.ink} bg={L.paperDeep}>
            {title}
          </Chip>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 80, height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, color: L.ink }}>
          {formula}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 236, textAlign: "center" }}>
          <Chip size={26}>{chip}</Chip>
        </div>
      </Card>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {card(
        160,
        "按行存下三角",
        <FormulaLower />,
        <span>
          <V>i</V> &lt; <V>j</V> 时先交换 <V>i</V>、<V>j</V>
        </span>,
        0,
      )}
      {card(
        1000,
        "按行存上三角",
        <FormulaUpper />,
        <span>
          <V>i</V> &gt; <V>j</V> 时先交换 <V>i</V>、<V>j</V>
        </span>,
        6,
      )}
      <Txt cx={960} y={660} width={800} size={40} color={L.ink2} weight={600} opacity={progress(f, END_IN + 18, 12)}>
        小题答对了吗？
      </Txt>
    </div>
  );
};

export const SymStore: React.FC = () => (
  <AbsoluteFill style={{ background: L.paper, overflow: "hidden" }}>
    <PaperBackground />
    <ModeChip />
    <MatrixLayer />
    <MatrixNotes />
    <ArrayLayer />
    <ArrayBraces />
    <CountBadges />
    <QuestionCard />
    <StairLower />
    <CardLower />
    <SwapWidget />
    <Upper34Card />
    <ListUpper />
    <StairUpper />
    <CardUpper />
    <QuizCard />
    <EndCards />
    <FlyLayer />
    <BgmTrack tl={TL} src="bgm/bright-01.wav" level={1.0} />
    <SfxTrack list={SFX} />
    <NarrationTrack tl={TL} subtitlePalette={SUB_PALETTE} />
  </AbsoluteFill>
);

