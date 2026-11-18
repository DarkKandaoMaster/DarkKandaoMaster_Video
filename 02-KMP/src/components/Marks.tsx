// 标注件：花括号、起点标记、跳步弧线、文字标签。都是纯 SVG / div，按进度参数画出来。
import React from "react";
import { C, FONT } from "../base/theme";

/**
 * 水平花括号：从 x 到 x+w，尖朝 dir（"up" = 尖朝上，括号在下方；"down" = 尖朝下，括号在上方）。
 * draw 0..1 从中间向两边画出来。
 */
export const Brace: React.FC<{
  x: number;
  y: number;
  w: number;
  h?: number;
  dir?: "up" | "down";
  draw?: number;
  color?: string;
  stroke?: number;
  opacity?: number;
}> = ({ x, y, w, h = 22, dir = "down", draw = 1, color = C.ink2, stroke = 3, opacity = 1 }) => {
  if (draw <= 0.001 || opacity <= 0.001) return null;
  const m = w / 2;
  const r = Math.min(h / 2, 14);
  // dir=down：顶边是两端，尖在底部中间
  const path = `M 0 0 Q 0 ${r} ${r} ${r} L ${m - r} ${r} Q ${m} ${r} ${m} ${h} Q ${m} ${r} ${m + r} ${r} L ${w - r} ${r} Q ${w} ${r} ${w} 0`;
  const len = w + 2 * h;
  return (
    <svg
      width={w + 8}
      height={h + 8}
      viewBox={`-4 -4 ${w + 8} ${h + 8}`}
      style={{ position: "absolute", left: x - 4, top: y - 4, overflow: "visible", opacity, transform: dir === "up" ? "scaleY(-1)" : undefined }}
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

/** 竖向小三角 + 文字：标在格子下方指向格子（"起点：第 1 列"） */
export const StartMark: React.FC<{
  cx: number; // 指向的格子中线 x
  y: number; // 三角尖的 y
  text: React.ReactNode;
  color: string;
  progress: number; // 0..1
  size?: number;
  align?: "center" | "left";
}> = ({ cx, y, text, color, progress, size = 30, align = "center" }) => {
  if (progress <= 0.001) return null;
  const dy = (1 - progress) * 14;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: Math.min(1, progress * 1.4) }}>
      <svg width={28} height={18} style={{ position: "absolute", left: cx - 14, top: y + dy }}>
        <path d="M 14 0 L 27 17 L 1 17 Z" fill={color} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: align === "center" ? cx - 300 : cx - 20,
          width: align === "center" ? 600 : undefined,
          top: y + 22 + dy,
          textAlign: align,
          fontFamily: FONT.sans,
          fontSize: size,
          fontWeight: 600,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** 跳步弧线：从 x1 到 x2（同一 y），draw 0..1 画出来，箭头在终点，弧顶写 label */
export const Hop: React.FC<{
  x1: number;
  x2: number;
  y: number;
  height?: number;
  draw: number;
  color?: string;
  label?: React.ReactNode;
  labelSize?: number;
}> = ({ x1, x2, y, height = 56, draw, color = C.amber, label, labelSize = 30 }) => {
  if (draw <= 0.001) return null;
  const w = x2 - x1;
  const d = `M 0 ${height} Q ${w / 2} ${-height * 0.9} ${w} ${height}`;
  const len = w * 1.35 + height;
  const head = Math.max(0, (draw - 0.85) / 0.15);
  return (
    <div style={{ position: "absolute", left: x1, top: y - height }}>
      <svg width={w} height={height + 4} style={{ overflow: "visible" }}>
        <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        <path
          d={`M ${w - 14} ${height - 18} L ${w} ${height} L ${w - 21} ${height - 4}`}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={head}
        />
      </svg>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: w / 2 - 40,
            width: 80,
            top: -labelSize * 1.45,
            textAlign: "center",
            fontFamily: FONT.mono,
            fontWeight: 700,
            fontSize: labelSize,
            color,
            opacity: Math.min(1, draw * 2),
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

/** 绝对定位的文字块（居中于 cx） */
export const Label: React.FC<{
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
}> = ({ cx, x, y, children, size = 30, color = C.ink, weight = 500, opacity = 1, dy = 0, width = 900, align, style }) => {
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
        ...style,
      }}
    >
      {children}
    </div>
  );
};
