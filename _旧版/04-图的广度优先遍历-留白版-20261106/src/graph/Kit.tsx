// 图论系列的小部件：背景、顶点名 v_i、卡片、标签、药丸、倒计时。全部是 frame 的纯函数。
import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../base/theme";
import { G, deep, tint } from "./theme";

/** 留白版：纯暖白底 + 很轻的暗角（去掉了点阵） */
export const GraphBackground: React.FC = () => (
  <AbsoluteFill style={{ background: G.bg }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 66%, rgba(120, 95, 50, 0.045) 100%)" }} />
  </AbsoluteFill>
);

/** HTML 里的顶点名：斜体 v + 下标数字（v 也可以换成别的字母） */
export const VName: React.FC<{ v: number | string; letter?: string; style?: React.CSSProperties }> = ({ v, letter = "v", style }) => (
  <span style={{ whiteSpace: "nowrap", ...style }}>
    <span style={{ fontFamily: FONT.math, fontStyle: "italic" }}>{letter}</span>
    <span style={{ fontFamily: FONT.sans, fontSize: "0.62em", position: "relative", top: "0.3em", marginLeft: "0.03em", fontVariantNumeric: "tabular-nums" }}>{v}</span>
  </span>
);

/** SVG 里的顶点名（居中在 x, y） */
export const SvgVName: React.FC<{ x: number; y: number; v: number | string; size: number; color: string; letter?: string; opacity?: number }> = ({
  x,
  y,
  v,
  size,
  color,
  letter = "v",
  opacity = 1,
}) => (
  <text x={x - size * 0.04} y={y + size * 0.05} textAnchor="middle" dominantBaseline="central" fill={color} opacity={opacity} style={{ fontSize: size }}>
    <tspan style={{ fontFamily: FONT.math, fontStyle: "italic" }}>{letter}</tspan>
    <tspan dy={size * 0.26} style={{ fontFamily: FONT.sans, fontSize: size * 0.62, fontWeight: 500 }}>
      {v}
    </tspan>
  </text>
);

/** 白卡片（绝对定位） */
export const Card: React.FC<{ x: number; y: number; w: number; h: number; opacity?: number; dy?: number; border?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  opacity = 1,
  dy = 0,
  border = G.cardLine,
  style,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y + dy,
      width: w,
      height: h,
      background: G.card,
      borderRadius: 18,
      boxShadow: `inset 0 0 0 2px ${border}, 0 8px 22px ${G.shadow}`,
      opacity,
      ...style,
    }}
  >
    {children}
  </div>
);

/** 绝对定位的一行字（cx 给了就水平居中） */
export const Txt: React.FC<{
  x?: number;
  cx?: number;
  y: number;
  size?: number;
  weight?: number;
  color?: string;
  opacity?: number;
  dy?: number;
  font?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, cx, y, size = 32, weight = 500, color = G.ink, opacity = 1, dy = 0, font = FONT.sans, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: cx !== undefined ? cx - 1000 : x,
      width: cx !== undefined ? 2000 : undefined,
      textAlign: cx !== undefined ? "center" : undefined,
      top: y + dy,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      opacity,
      whiteSpace: "nowrap",
      lineHeight: 1.2,
      fontVariantNumeric: "tabular-nums",
      ...style,
    }}
  >
    {children}
  </div>
);

/** 小标签：彩色圆角底 + 文字 */
export const Tag: React.FC<{ color: string; children?: React.ReactNode; solid?: boolean; size?: number; style?: React.CSSProperties }> = ({
  color,
  children,
  solid = false,
  size = 26,
  style,
}) => (
  <span
    style={{
      display: "inline-block",
      padding: `${size * 0.18}px ${size * 0.55}px ${size * 0.22}px`,
      borderRadius: size * 0.5,
      background: solid ? color : tint(color, 0.14),
      color: solid ? "#FFFFFF" : deep(color, 0.15),
      boxShadow: solid ? undefined : `inset 0 0 0 2px ${tint(color, 0.45)}`,
      fontFamily: FONT.sans,
      fontSize: size,
      fontWeight: 700,
      lineHeight: 1.15,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

/** 顶点药丸（序列里的一个 v_i）：彩色底白字 */
export const Pill: React.FC<{ v: number; color: string; size?: number; scale?: number; opacity?: number; ghost?: boolean; style?: React.CSSProperties }> = ({
  v,
  color,
  size = 50,
  scale = 1,
  opacity = 1,
  ghost = false,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: ghost ? tint(color, 0.14) : color,
      boxShadow: ghost ? `inset 0 0 0 2px ${tint(color, 0.55)}` : `0 3px 8px ${tint(color, 0.5)}`,
      color: ghost ? deep(color, 0.1) : "#FFFFFF",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.56,
      transform: `scale(${scale})`,
      opacity,
      flex: "none",
      ...style,
    }}
  >
    <VName v={v} style={{ position: "relative", top: -size * 0.05 }} />
  </div>
);

/** 倒计时圆环：k = 已经过去的比例 0→1，n = 总秒数 */
export const Countdown: React.FC<{ cx: number; cy: number; r?: number; k: number; n: number; color?: string; opacity?: number }> = ({
  cx,
  cy,
  r = 52,
  k,
  n,
  color = RUN_COUNTDOWN,
  opacity = 1,
}) => {
  const left = Math.max(0, Math.ceil(n * (1 - k) - 1e-6));
  const c = 2 * Math.PI * r;
  return (
    <svg style={{ position: "absolute", left: cx - r - 10, top: cy - r - 10, opacity }} width={2 * r + 20} height={2 * r + 20}>
      <circle cx={r + 10} cy={r + 10} r={r} fill="#FFFFFF" stroke={G.cardLine} strokeWidth={10} />
      <circle
        cx={r + 10}
        cy={r + 10}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${c * (1 - k)} ${c}`}
        opacity={k > 0.995 ? 0 : 1}
        transform={`rotate(-90 ${r + 10} ${r + 10})`}
      />
      <text x={r + 10} y={r + 12} textAnchor="middle" dominantBaseline="central" fill={G.ink} style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: r * 0.95 }}>
        {left}
      </text>
    </svg>
  );
};
const RUN_COUNTDOWN = "#E8590C";

/** 0→1→0 的小鼓包：at 起 dur 帧内 */
export const bump = (f: number, at: number, dur: number): number => {
  if (f < at || f > at + dur) return 0;
  return Math.sin((Math.PI * (f - at)) / dur);
};
