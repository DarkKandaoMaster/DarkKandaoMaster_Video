// 浅色版小件：方格纸背景、便签格子、空位、文字、竖花括号、计数小圆片、印章。颜色全部来自 ../base/paper（复制自「上下三角矩阵」的 kit.tsx）。
import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, hexA, mixColor } from "../base/theme";
import { A, N as Num } from "./Math";
import { L, ROW } from "../base/paper";

/** 米白方格纸：细格 40 px，每 200 px 一条稍深的线，四角略暗 */
export const PaperBackground: React.FC = () => (
  <AbsoluteFill style={{ background: L.paper }}>
    <AbsoluteFill
      style={{
        backgroundImage: [
          `linear-gradient(${L.gridBold} 1.5px, transparent 1.5px)`,
          `linear-gradient(90deg, ${L.gridBold} 1.5px, transparent 1.5px)`,
          `linear-gradient(${L.grid} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${L.grid} 1px, transparent 1px)`,
        ].join(", "),
        backgroundSize: "200px 200px, 200px 200px, 40px 40px, 40px 40px",
        backgroundPosition: "-1px -1px, -1px -1px, -1px -1px, -1px -1px",
        opacity: 0.9,
      }}
    />
    <AbsoluteFill
      style={{ background: `radial-gradient(ellipse 80% 75% at 50% 45%, rgba(0,0,0,0) 60%, ${hexA(L.paperDeep, 0.9)} 100%)` }}
    />
  </AbsoluteFill>
);

export type Look = {
  /** 0..1 便签色程度；row = 第几行的颜色（0 起） */
  tint?: number;
  row?: number;
  /** 0..1 复印件（灰掉 + 虚线） */
  ghost?: number;
  /** 0..1 重点描边 + 光晕 */
  hi?: number;
  /** 0..1 重点实心填充（答案） */
  fill?: number;
  /** 0..1 蓝色描边（"前面几行"） */
  blue?: number;
  /** 0..1：0 显示数字，1 显示 a_ij */
  labelMix?: number;
};

/** 便签格子：左上角 (x, y)，边长 w。label = 下标串（"43"），num = 第 1 镜里显示的数 */
export const PTile: React.FC<{
  x: number;
  y: number;
  w: number;
  label?: string;
  num?: number;
  look?: Look;
  opacity?: number;
  transform?: string;
  z?: number;
}> = ({ x, y, w, label, num, look = {}, opacity = 1, transform, z }) => {
  if (opacity <= 0.001) return null;
  const tint = look.tint ?? 0;
  const row = ROW[Math.max(0, Math.min(4, look.row ?? 0))];
  const ghost = look.ghost ?? 0;
  const hi = look.hi ?? 0;
  const fill = look.fill ?? 0;
  const blue = look.blue ?? 0;
  const mixL = look.labelMix ?? 1;
  let bg = mixColor(L.tile, row.bg, tint);
  bg = mixColor(bg, L.ghost, ghost);
  bg = mixColor(bg, L.accent, fill);
  let edge = mixColor(L.tileLine, row.edge, tint);
  edge = mixColor(edge, L.ghostLine, ghost);
  edge = mixColor(edge, L.blue, blue);
  edge = mixColor(edge, L.accent, Math.max(hi, fill));
  const text = mixColor(mixColor(L.ink, L.ink3, ghost), "#FFFFFF", fill);
  const bw = 2 + hi * 2 + blue * 1.5;
  const dashed = ghost > 0.5;
  const r = Math.round(w * 0.14);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: w,
        opacity,
        zIndex: z,
        transform,
        transformOrigin: "50% 50%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: r,
          background: bg,
          boxShadow: [
            dashed ? null : `inset 0 0 0 ${bw}px ${edge}`,
            `0 ${Math.round(w * 0.05)}px 0 ${hexA("#3C321E", 0.1 * (1 - ghost))}`,
            hi > 0.01 ? `0 0 ${30 * hi}px ${hexA(L.accent, 0.5 * hi)}` : null,
          ]
            .filter(Boolean)
            .join(", "),
          border: dashed ? `2px dashed ${edge}` : undefined,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: text,
          fontSize: Math.round(w * 0.38),
        }}
      >
        {num !== undefined && mixL < 0.999 ? (
          <span style={{ position: "absolute", opacity: 1 - mixL, fontSize: "1.18em" }}>
            <Num style={{ fontWeight: 600 }}>{num}</Num>
          </span>
        ) : null}
        {label && mixL > 0.001 ? (
          <span style={{ position: "absolute", opacity: mixL }}>
            <A sub={label} style={{ position: "relative", top: "-0.12em" }} />
          </span>
        ) : null}
      </div>
    </div>
  );
};

/** 空位：没存 / 已经被拉走的格子。color 给了就用实线描边（重点标注） */
export const PSlot: React.FC<{
  x: number;
  y: number;
  w: number;
  label?: string;
  opacity?: number;
  labelOpacity?: number;
  color?: string;
  colorAmt?: number;
  softFill?: string;
}> = ({ x, y, w, label, opacity = 1, labelOpacity = 0.55, color, colorAmt = 0, softFill }) => {
  if (opacity <= 0.001) return null;
  const edge = color ? mixColor(L.slotLine, color, colorAmt) : L.slotLine;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: w,
        opacity,
        borderRadius: Math.round(w * 0.14),
        border: `${2 + colorAmt * 1.5}px dashed ${edge}`,
        background: softFill && colorAmt > 0 ? mixColor(L.paper, softFill, colorAmt) : hexA("#FFFFFF", 0.35),
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color && colorAmt > 0.5 ? mixColor(L.ink3, color, colorAmt) : L.ink3,
        fontSize: Math.round(w * 0.34),
      }}
    >
      {label ? <A sub={label} style={{ opacity: Math.max(labelOpacity, colorAmt), position: "relative", top: "-0.12em" }} /> : null}
    </div>
  );
};

/** 绝对定位文字（cx 给了就以 cx 居中） */
export const Txt: React.FC<{
  cx?: number;
  x?: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  opacity?: number;
  dy?: number;
  width?: number;
  align?: "center" | "left" | "right";
  style?: React.CSSProperties;
}> = ({ cx, x, y, children, size = 30, color = L.ink, weight = 500, opacity = 1, dy = 0, width = 900, align, style }) => {
  if (opacity <= 0.001) return null;
  const al = align ?? (cx !== undefined ? "center" : "left");
  const left = cx !== undefined ? cx - width / 2 : al === "right" ? (x ?? 0) - width : x ?? 0;
  return (
    <div
      style={{
        position: "absolute",
        left,
        width,
        top: y + dy,
        textAlign: al,
        fontFamily: FONT.sans,
        fontSize: size,
        fontWeight: weight,
        color,
        opacity,
        whiteSpace: "nowrap",
        lineHeight: 1.25,
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 竖花括号：x 处，从 y 到 y+h；side = 尖朝哪边 */
export const VBrace: React.FC<{
  x: number;
  y: number;
  h: number;
  side?: "left" | "right";
  draw?: number;
  color?: string;
  stroke?: number;
  w?: number;
}> = ({ x, y, h, side = "right", draw = 1, color = L.ink2, stroke = 3, w = 20 }) => {
  if (draw <= 0.001) return null;
  const m = h / 2;
  const r = Math.min(w / 2, 14);
  // side=right：两端在左，尖在右
  const path = `M 0 0 Q ${r} 0 ${r} ${r} L ${r} ${m - r} Q ${r} ${m} ${w} ${m} Q ${r} ${m} ${r} ${m + r} L ${r} ${h - r} Q ${r} ${h} 0 ${h}`;
  const len = h + 2 * w;
  return (
    <svg
      width={w + 8}
      height={h + 8}
      viewBox={`-4 -4 ${w + 8} ${h + 8}`}
      style={{ position: "absolute", left: x - 4, top: y - 4, overflow: "visible", transform: side === "left" ? "scaleX(-1)" : undefined }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
      />
    </svg>
  );
};

/** 计数小圆片（数格子时贴在格子右上角） */
export const Badge: React.FC<{ cx: number; cy: number; n: React.ReactNode; p: number; color?: string; size?: number }> = ({
  cx,
  cy,
  n,
  p,
  color = L.blue,
  size = 34,
}) => {
  if (p <= 0.001) return null;
  const s = 0.4 + 0.6 * Math.min(1, p * 1.2) + 0.12 * Math.sin(Math.min(1, p) * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        color: "#FFFFFF",
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: size * 0.56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${s})`,
        opacity: Math.min(1, p * 2),
        boxShadow: `0 2px 6px ${L.shadow}`,
        fontVariantNumeric: "tabular-nums",
        zIndex: 30,
      }}
    >
      {n}
    </div>
  );
};

/** 印章：双线框 + 旋转，p 0..1 从大到小"盖"下来 */
export const Stamp: React.FC<{ cx: number; cy: number; p: number; opacity?: number; children: React.ReactNode; en?: string }> = ({
  cx,
  cy,
  p,
  opacity = 1,
  children,
  en,
}) => {
  if (p <= 0.001 || opacity <= 0.001) return null;
  const s = 1 + 0.9 * (1 - Math.min(1, p)) ** 2;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - 200,
        top: cy - 80,
        width: 400,
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `rotate(-12deg) scale(${s})`,
        opacity: Math.min(1, p * 1.8) * opacity * 0.92,
        zIndex: 30,
      }}
    >
      <div
        style={{
          padding: "8px 26px 10px",
          border: `5px solid ${L.accent}`,
          outline: `2px solid ${L.accent}`,
          outlineOffset: 5,
          borderRadius: 12,
          color: L.accent,
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 60,
          letterSpacing: "0.12em",
          lineHeight: 1.05,
          textAlign: "center",
          background: hexA(L.paper, 0.55),
        }}
      >
        {children}
        {en ? <div style={{ fontSize: 24, letterSpacing: "0.3em", fontWeight: 700, marginTop: 2 }}>{en}</div> : null}
      </div>
    </div>
  );
};

/** 白色便签卡片（公式卡） */
export const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  h?: number;
  opacity?: number;
  dy?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, opacity = 1, dy = 0, children, style }) =>
  opacity <= 0.001 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + dy,
        width: w,
        height: h,
        opacity,
        background: L.card,
        borderRadius: 18,
        boxShadow: `inset 0 0 0 1.5px ${L.cardLine}, 0 8px 24px ${L.shadow}`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );

/** 小标签胶囊 */
export const Chip: React.FC<{ children: React.ReactNode; color?: string; bg?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  color = L.accentDeep,
  bg = L.accentSoft,
  size = 24,
  style,
}) => (
  <span
    style={{
      display: "inline-block",
      padding: "3px 14px 4px",
      borderRadius: 999,
      background: bg,
      color,
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.25,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);
