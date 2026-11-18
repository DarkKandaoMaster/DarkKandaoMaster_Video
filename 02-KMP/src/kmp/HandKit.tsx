// 手推场景（第 4、7、8 镜）共用的小件：布局插值、数字格（盖章 / 翻牌 / 飞入）、下括号 + "=" / "×" 标记、
// 指向弧线、带小爪子的小 i（托腮 / 鼓掌 / 挥手 / 举牌）。只给 Scene4 / Scene7 / Scene8 用，其他镜不依赖它。
import React from "react";
import { EASE_IN, mix, progress } from "../base/anim";
import { L } from "../base/paper";
import { FONT, hexA } from "../base/theme";
import { Brace } from "../components/Marks";
import { LittleI, type Face } from "./LittleI";
import { Cell, type CellLook } from "./StringRow";
import { H, KC, M, type RowGeo } from "./layout";

// ───────────────────────── 交接（相邻镜结束时的状态，按另一个子代理的实现对齐）─────────────────────────
/** 第 3 镜结束时：匹配布局，模式头对主串第 h 位；小 i 站在主串第 i 位上方 */
export const FROM_3 = { h: 6, i: 8 } as const;
/** 第 6 镜结束时：匹配布局（主串 NV_MAIN），模式头对第 h 位；小 i 在第 i 位上方 */
export const FROM_6 = { h: 5, i: 5 } as const;

/** 手推场景里小 i 的"观众席"（左上角）：中线 x、顶边 y、缩放 */
export const PERCH = { x: 190, y: 70, scale: 1.45 } as const;

// ───────────────────────── 时间小工具 ─────────────────────────
/** 窗口：start 起 inDur 帧淡入，end 前 outDur 帧淡出 */
export const win = (f: number, start: number, end: number, inDur = 10, outDur = 10): number =>
  Math.min(progress(f, start, inDur), 1 - progress(f, end - outDur, outDur, EASE_IN));

/** 正弦脉冲 0 → 1 → 0 */
export const pulse = (f: number, start: number, dur = 14): number => {
  const t = progress(f, start, dur, (x) => x);
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
};

// ───────────────────────── 布局插值 ─────────────────────────
/** 匹配布局（模式头在 h）→ 手推布局：t = 0 匹配，1 手推。返回给 StringRow 的 geo（h 一律传 1） */
export const geoMix = (h: number, t: number): RowGeo => ({
  x0: mix(M.x0 + (h - 1) * M.step, H.x0, t),
  cell: mix(M.cell, H.cell, t),
  step: mix(M.step, H.step, t),
});

export const colX = (g: RowGeo, j: number): number => g.x0 + (j - 1) * g.step;
export const colCX = (g: RowGeo, j: number): number => colX(g, j) + g.cell / 2;

// ───────────────────────── 数字格 ─────────────────────────
/** 一个数字格：v = 显示的值（null 空格）；stamp 0..1 = 盖章进度（大 → 小落下）；flip 0..1 = 翻牌（前半显示 back） */
export const NumCell: React.FC<{
  x: number;
  y: number;
  w: number;
  hgt: number;
  v: React.ReactNode | null;
  size: number;
  look?: CellLook;
  stamp?: number;
  flip?: number;
  back?: React.ReactNode;
  ink?: string;
  opacity?: number;
}> = ({ x, y, w, hgt, v, size, look, stamp = 1, flip, back, ink, opacity = 1 }) => {
  if (opacity <= 0.001) return null;
  let sx = 1;
  let content: React.ReactNode | null = v;
  if (flip !== undefined) {
    sx = Math.abs(Math.cos(Math.PI * Math.min(1, Math.max(0, flip))));
    if (flip < 0.5) content = back ?? null;
  }
  const s = 1 + 1.1 * (1 - Math.min(1, stamp)) ** 2;
  const numA = flip !== undefined ? 1 : Math.min(1, stamp * 2);
  const empty = content === null || content === "";
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: hgt, opacity, transform: sx < 0.999 ? `scaleX(${Math.max(0.02, sx)})` : undefined }}>
      <Cell x={0} y={0} w={w} hgt={hgt} kind="num" look={look ?? (empty ? { dim: 0.55 } : undefined)} fontSize={size} font={FONT.sans} weight={700}>
        {empty ? (
          ""
        ) : (
          <span style={{ display: "inline-block", transform: `scale(${s})`, opacity: numA, color: ink }}>{content}</span>
        )}
      </Cell>
    </div>
  );
};

/** 行首标签（"next" / "nextval" / "T"），右对齐到 right */
export const RowLabel: React.FC<{ right: number; y: number; hgt: number; size: number; color?: string; opacity?: number; children: React.ReactNode }> = ({
  right,
  y,
  hgt,
  size,
  color = L.ink2,
  opacity = 1,
  children,
}) =>
  opacity <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: right - 400,
        width: 400,
        top: y,
        height: hgt,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: size,
        color,
        opacity,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );

// ───────────────────────── 括号与标记 ─────────────────────────
/** 第 a..b 格（含）下方的花括号（尖朝下）；inset = 两端内缩 */
export const CellBrace: React.FC<{ g: RowGeo; a: number; b: number; y: number; color: string; draw: number; opacity?: number; up?: boolean; h?: number }> = ({
  g,
  a,
  b,
  y,
  color,
  draw,
  opacity = 1,
  up = false,
  h = 18,
}) => {
  const x1 = colX(g, a) + 8;
  const x2 = colX(g, b) + g.cell - 8;
  return <Brace x={x1} y={y} w={x2 - x1} h={h} dir={up ? "up" : "down"} draw={draw} color={color} stroke={4} opacity={opacity} />;
};

/** 小圆标记："=" 绿、"×" 红、"≠" 蓝；p 0..1 弹出 */
export const MarkDot: React.FC<{ cx: number; cy: number; kind: "eq" | "x" | "ne"; p: number; r?: number; color?: string }> = ({ cx, cy, kind, p, r = 17, color }) => {
  if (p <= 0.001) return null;
  const s = 0.4 + 0.6 * Math.min(1, p) + 0.18 * Math.sin(Math.min(1, p) * Math.PI);
  const bg = color ?? (kind === "eq" ? KC.ok : kind === "x" ? KC.bad : L.blue);
  const k = r / 17;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", zIndex: 40 }}>
      <g transform={`translate(${cx} ${cy}) scale(${s})`} opacity={Math.min(1, p * 2)}>
        <circle r={r} fill={bg} stroke="#FFFFFF" strokeWidth={2.5} />
        <g stroke="#FFFFFF" strokeWidth={3.6 * k} strokeLinecap="round">
          {kind === "x" ? (
            <>
              <path d={`M ${-6 * k} ${-6 * k} L ${6 * k} ${6 * k}`} />
              <path d={`M ${6 * k} ${-6 * k} L ${-6 * k} ${6 * k}`} />
            </>
          ) : (
            <>
              <path d={`M ${-7.5 * k} ${-4 * k} L ${7.5 * k} ${-4 * k}`} />
              <path d={`M ${-7.5 * k} ${4 * k} L ${7.5 * k} ${4 * k}`} />
              {kind === "ne" ? <path d={`M ${4 * k} ${-10 * k} L ${-4 * k} ${10 * k}`} /> : null}
            </>
          )}
        </g>
      </g>
    </svg>
  );
};

/** 两个括号尖之间的虚线（y 处，从 x1 到 x2），draw 0..1 */
export const DashLink: React.FC<{ x1: number; x2: number; y: number; draw: number; color: string; opacity?: number }> = ({ x1, x2, y, draw, color, opacity = 1 }) => {
  if (draw <= 0.001 || opacity <= 0.001) return null;
  const xm = (x1 + x2) / 2;
  const half = ((x2 - x1) / 2) * Math.min(1, draw);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", opacity, zIndex: 30 }}>
      <line x1={xm - half} y1={y} x2={xm + half} y2={y} stroke={color} strokeWidth={3} strokeDasharray="7 7" strokeLinecap="round" />
    </svg>
  );
};

// ───────────────────────── 指向弧线（第 7 镜：p_j → p_next[j]）─────────────────────────
export const PointArc: React.FC<{
  x1: number;
  x2: number;
  y: number;
  draw: number;
  color: string;
  opacity?: number;
  /** 弧顶的标记（"=" / "≠"），0..1 */
  mark?: number;
  markKind?: "eq" | "ne";
}> = ({ x1, x2, y, draw, color, opacity = 1, mark = 0, markKind = "ne" }) => {
  if (draw <= 0.001 || opacity <= 0.001) return null;
  const d = Math.abs(x2 - x1);
  const lift = 70 + 0.26 * d; // 控制点高度；弧顶 = 一半
  const cx = (x1 + x2) / 2;
  const path = `M ${x1} ${y} Q ${cx} ${y - lift} ${x2} ${y}`;
  const len = d * 1.25 + lift;
  const head = Math.max(0, (draw - 0.8) / 0.2);
  // 终点切线方向（二次贝塞尔：终点导数 ∝ P2 − P1）
  const tx = x2 - cx;
  const ty = lift;
  const tl = Math.hypot(tx, ty);
  const ux = tx / tl;
  const uy = ty / tl;
  const hx = (a: number, b: number) => `${x2 - ux * a + -uy * b} ${y - uy * a + ux * b}`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none", zIndex: 35 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={path} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(1, draw))} />
        <path d={`M ${hx(22, 12)} L ${x2} ${y} L ${hx(22, -12)}`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={head} />
      </svg>
      <MarkDot cx={cx} cy={y - lift / 2} kind={markKind} p={mark} r={20} color={markKind === "eq" ? L.accent : L.blue} />
    </div>
  );
};

/** 小爆点（"撞"一下）：cx, cy 处一圈短线，p 0..1 向外散开后消失 */
export const Burst: React.FC<{ cx: number; cy: number; p: number; color?: string; r?: number }> = ({ cx, cy, p, color = L.accent, r = 30 }) => {
  if (p <= 0.001 || p >= 0.999) return null;
  const a = 1 - p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", zIndex: 45 }}>
      {Array.from({ length: 8 }, (_, k) => {
        const ang = (k / 8) * Math.PI * 2 + 0.2;
        const r1 = r * (0.5 + p * 0.9);
        const r2 = r1 + 14 * a + 4;
        return (
          <line
            key={k}
            x1={cx + Math.cos(ang) * r1}
            y1={cy + Math.sin(ang) * r1}
            x2={cx + Math.cos(ang) * r2}
            y2={cy + Math.sin(ang) * r2}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={a}
          />
        );
      })}
    </svg>
  );
};

// ───────────────────────── 带爪子的小 i ─────────────────────────
export type Pose = "none" | "chin" | "clap" | "wave" | "sign";

const Paw: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 7.5 }) => (
  <circle cx={x} cy={y} r={r} fill="#F7A07F" stroke={L.accentDeep} strokeWidth={1.8} />
);

/**
 * 小 i + 爪子。x = 中线，y = 顶边（scale = 1 时；缩放、旋转都以尖端为原点）。
 * pose：chin 托腮（右爪托在下巴）/ clap 鼓掌（beat 0..1 一拍）/ wave 挥手（beat 驱动摆动）/ sign 举牌（举着一根杆，牌子另画）。
 */
export const HandI: React.FC<{
  x: number;
  y: number;
  scale?: number;
  face?: Face;
  pose?: Pose;
  beat?: number;
  rotate?: number;
  opacity?: number;
  lookX?: number;
  lookY?: number;
  squash?: number;
  /** 举牌时的牌子内容 */
  sign?: React.ReactNode;
  signP?: number;
}> = ({ x, y, scale = 1, face = "normal", pose = "none", beat = 0, rotate = 0, opacity = 1, lookX = 0, lookY = 0, squash = 0, sign, signP = 1 }) => {
  if (opacity <= 0.001) return null;
  const W = 60;
  const HG = 85;
  let paws: React.ReactNode = null;
  if (pose === "chin") {
    paws = (
      <g>
        <path d="M 50 50 Q 47 58 40 55" fill="none" stroke={L.accentDeep} strokeWidth={2} strokeLinecap="round" />
        <Paw x={38} y={53} />
      </g>
    );
  } else if (pose === "clap") {
    const d = 3 + 9 * (0.5 + 0.5 * Math.cos(beat * Math.PI * 2));
    paws = (
      <g>
        <Paw x={30 - d} y={58} />
        <Paw x={30 + d} y={58} />
      </g>
    );
  } else if (pose === "wave") {
    const ang = -20 + 28 * Math.sin(beat * Math.PI * 2);
    paws = (
      <g transform={`rotate(${ang} 52 40)`}>
        <path d="M 52 40 L 66 12" stroke={L.accentDeep} strokeWidth={3} strokeLinecap="round" />
        <Paw x={67} y={10} r={8.5} />
      </g>
    );
  } else if (pose === "sign") {
    paws = (
      <g>
        <path d="M 54 44 L 70 -26" stroke="#8B6B43" strokeWidth={4} strokeLinecap="round" />
        <Paw x={58} y={30} />
      </g>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x - W / 2,
        top: y,
        width: W,
        height: HG,
        opacity,
        transformOrigin: `${W / 2}px ${HG}px`,
        transform: `rotate(${rotate}deg) scale(${scale * (1 + squash * 0.18)}, ${scale * (1 - squash * 0.2)})`,
        zIndex: 60,
        isolation: "isolate",
      }}
    >
      {pose === "sign" && sign && signP > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: 14,
            top: -84,
            width: 120,
            height: 58,
            borderRadius: 8,
            background: "#FFFFFF",
            boxShadow: `inset 0 0 0 2px ${L.accent}, 0 3px 8px ${L.shadow}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.sans,
            fontWeight: 800,
            fontSize: 32,
            color: L.accentDeep,
            transform: `rotate(${-6 + 6 * Math.sin(beat * Math.PI * 2)}deg) scale(${0.5 + 0.5 * Math.min(1, signP)})`,
            transformOrigin: "50% 100%",
            opacity: Math.min(1, signP * 2),
            whiteSpace: "nowrap",
          }}
        >
          {sign}
        </div>
      ) : null}
      <LittleI x={W / 2} y={0} face={face} lookX={lookX} lookY={lookY} />
      {paws ? (
        <svg width={W} height={HG} viewBox={`0 0 ${W} ${HG}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 70 }}>
          {paws}
        </svg>
      ) : null}
    </div>
  );
};

/** 角落小 Chip（白底描边） */
export const NoteChip: React.FC<{ x: number; y: number; p: number; size?: number; color?: string; children: React.ReactNode; rot?: number }> = ({
  x,
  y,
  p,
  size = 34,
  color = L.ink2,
  children,
  rot = 0,
}) =>
  p <= 0.001 ? null : (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 1.5), transform: `scale(${0.7 + 0.3 * Math.min(1, p)}) rotate(${rot}deg)`, transformOrigin: "0 50%", zIndex: 40 }}>
      <span
        style={{
          display: "inline-block",
          padding: "6px 20px 8px",
          borderRadius: 999,
          background: hexA("#FFFFFF", 0.95),
          boxShadow: `inset 0 0 0 2px ${L.cardLine}, 0 4px 12px ${L.shadow}`,
          color,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: size,
          lineHeight: 1.25,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </div>
  );
