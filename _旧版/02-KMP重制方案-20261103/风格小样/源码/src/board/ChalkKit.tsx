// 黑板主题小件：背景（黑板 + 木框）、粉笔滤镜、轨道（主串）、尺子（模式串 / 复印件）、勾叉、括号、便签、粉笔箭头、字幕。
// 除背景外都画在同一张 1920×1080 的 <svg> 里（BoardStage），坐标即像素。
import React from "react";
import { AbsoluteFill } from "remotion";
import { hexA } from "../base/theme";
import { B, BFONT, SIZE } from "./theme";

const W = 1920;
const H = 1080;

/* ------------------------------------------------------------------ 背景 */

/** 木框宽度（px）；黑板内容区 = 四周各缩进 FRAME */
export const FRAME = 20;

/** 深墨绿黑板 + 一圈细木框；中心略亮、四角略暗、几道淡擦痕、粉笔灰颗粒 */
export const BoardBackground: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(135deg, ${B.woodLight} 0%, ${B.wood} 45%, ${B.woodDark} 100%)` }}>
    {/* 木纹：几条很淡的横向条纹 */}
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0) 3px, rgba(255,255,255,0.04) 5px, rgba(0,0,0,0) 9px)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: FRAME,
        top: FRAME,
        right: FRAME,
        bottom: FRAME,
        background: [
          // 擦痕：几块斜向的淡白椭圆
          `radial-gradient(ellipse 520px 120px at 28% 30%, rgba(241,239,230,0.035), rgba(241,239,230,0) 70%)`,
          `radial-gradient(ellipse 640px 140px at 70% 62%, rgba(241,239,230,0.03), rgba(241,239,230,0) 70%)`,
          `radial-gradient(ellipse 420px 90px at 50% 88%, rgba(241,239,230,0.025), rgba(241,239,230,0) 70%)`,
          // 中心亮、四角暗
          `radial-gradient(ellipse 75% 70% at 50% 45%, ${B.boardLight} 0%, ${B.board} 55%, ${B.boardDeep} 100%)`,
        ].join(", "),
        boxShadow: `inset 0 0 0 2px ${hexA("#000000", 0.35)}, inset 0 0 40px ${hexA("#000000", 0.35)}`,
      }}
    >
      {/* 粉笔灰颗粒 */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.09 }}>
        <filter id="bg-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.94  0 0 0 0 0.9  2.2 0 0 0 -0.9" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-grain)" />
      </svg>
    </div>
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ 舞台与滤镜 */

/** 粉笔滤镜：rough = 描边轻微抖动 + 颗粒缺口；grain = 只有颗粒（文字用，保证清晰） */
export const ChalkDefs: React.FC = () => (
  <defs>
    <filter id="chalk-rough" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="wob" />
      <feDisplacementMap in="SourceGraphic" in2="wob" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="moved" />
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="11" result="grain" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.4 0 0 0 -0.75" result="mask" />
      <feComposite in="moved" in2="mask" operator="in" />
    </filter>
    <filter id="chalk-grain" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
      <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="5" result="grain" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.0 0 0 0 -0.35" result="mask" />
      <feComposite in="SourceGraphic" in2="mask" operator="in" />
    </filter>
    <filter id="note-shadow" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
      <feDropShadow dx="5" dy="8" stdDeviation="7" floodColor="#000000" floodOpacity="0.45" />
    </filter>
  </defs>
);

/** 全画面 SVG 舞台：子元素用像素坐标 */
export const BoardStage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
    <ChalkDefs />
    {children}
  </svg>
);

/** 粉笔字（SVG text，居中对齐到 (x, y)） */
export const ChalkText: React.FC<{
  x: number;
  y: number;
  size: number;
  color?: string;
  font?: "sans" | "mono" | "hand";
  weight?: number;
  anchor?: "start" | "middle" | "end";
  opacity?: number;
  grain?: boolean;
  children: React.ReactNode;
}> = ({ x, y, size, color = B.chalk, font = "sans", weight = 500, anchor = "middle", opacity = 1, grain = true, children }) => (
  <text
    x={x}
    y={y}
    fontSize={size}
    fontFamily={BFONT[font]}
    fontWeight={weight}
    fill={color}
    textAnchor={anchor}
    dominantBaseline="central"
    opacity={opacity}
    filter={grain ? "url(#chalk-grain)" : undefined}
    style={{ fontVariantNumeric: "tabular-nums" }}
  >
    {children}
  </text>
);

/* ------------------------------------------------------------------ 轨道（主串） */

export type Geo = { x0: number; y: number; cell: number; pitch: number };
/** 第 k 格（1 起）的左边 x */
export const colX = (g: Geo, k: number) => g.x0 + (k - 1) * g.pitch;
/** 第 k 格中心 x */
export const colCX = (g: Geo, k: number) => colX(g, k) + g.cell / 2;

/** 主串：一排粉笔白描边方格，格子上方写下标。known = 已知格（字母发黄 + 极淡黄底） */
export const Track: React.FC<{
  g: Geo;
  text: string;
  known?: number[];
  opacity?: number;
  letterSize?: number;
  indexSize?: number;
  label?: string;
}> = ({ g, text, known = [], opacity = 1, letterSize = SIZE.trackLetter, indexSize = SIZE.trackIndex, label }) => (
  <g opacity={opacity}>
    <g filter="url(#chalk-rough)">
      {text.split("").map((_, i) => {
        const k = i + 1;
        const isKnown = known.includes(k);
        return (
          <rect
            key={k}
            x={colX(g, k)}
            y={g.y}
            width={g.cell}
            height={g.cell}
            fill={isKnown ? hexA(B.yellow, 0.1) : "none"}
            stroke={B.chalk}
            strokeOpacity={0.85}
            strokeWidth={2.6}
          />
        );
      })}
    </g>
    {text.split("").map((ch, i) => {
      const k = i + 1;
      const isKnown = known.includes(k);
      return (
        <React.Fragment key={k}>
          <ChalkText x={colCX(g, k)} y={g.y - 22} size={indexSize} color={B.chalkDim} font="mono">
            {k}
          </ChalkText>
          <ChalkText x={colCX(g, k)} y={g.y + g.cell / 2 - 3} size={letterSize} color={isKnown ? B.known : B.chalk} font="mono">
            {ch}
          </ChalkText>
        </React.Fragment>
      );
    })}
    {label ? (
      <ChalkText x={g.x0 - 34} y={g.y + g.cell / 2 - 2} size={34} color={B.chalkDim} font="mono" weight={700}>
        {label}
      </ChalkText>
    ) : null}
  </g>
);

/* ------------------------------------------------------------------ 尺子（模式串） */

export type CellLook = "plain" | "hi" | "current";

/**
 * 尺子：整体一条半透明粉笔黄长条，左端把手 + 圆孔；格子下方标 j。
 * g.x0 = p1 格子左边，g.y = 格子顶边。ghost = 复印件（虚线、更淡）。
 * looks[j-1]：hi = 黄色高亮（重合），current = 虚线框（"当前算这一位"）。
 */
export const Ruler: React.FC<{
  g: Geo;
  text: string;
  ghost?: boolean;
  looks?: CellLook[];
  letterSize?: number;
  indexSize?: number;
  startIndex?: number;
  opacity?: number;
}> = ({ g, text, ghost = false, looks = [], letterSize = SIZE.rulerLetter, indexSize = SIZE.rulerIndex, startIndex = 1, opacity = 1 }) => {
  const n = text.length;
  const pad = Math.round(g.cell * 0.13);
  const handle = Math.round(g.cell * 0.72);
  const labelH = Math.round(indexSize * 1.75);
  const left = g.x0 - pad - handle;
  const right = colX(g, n) + g.cell + pad;
  const top = g.y - pad;
  const bottom = g.y + g.cell + labelH;
  const holeR = Math.round(g.cell * 0.13);
  const holeX = left + handle * 0.5 + pad * 0.3;
  const holeY = (top + bottom) / 2;
  const stripFill = ghost ? hexA(B.yellow, 0.05) : hexA(B.yellow, 0.17);
  const edge = ghost ? hexA(B.yellow, 0.62) : B.yellow;
  const dash = ghost ? "12 9" : undefined;
  // 刻度：下边缘每格 4 小格，格界处长一点
  const ticks: React.ReactNode[] = [];
  for (let k = 0; k <= n; k++) {
    const bx = k === 0 ? g.x0 - pad / 2 : k === n ? colX(g, n) + g.cell + pad / 2 : colX(g, k + 1) - (g.pitch - g.cell) / 2;
    ticks.push(<line key={`M${k}`} x1={bx} y1={bottom} x2={bx} y2={bottom - 14} stroke={edge} strokeWidth={2} strokeOpacity={0.75} />);
    if (k < n) {
      for (let q = 1; q < 4; q++) {
        const mx = bx + (g.pitch * q) / 4;
        ticks.push(<line key={`m${k}-${q}`} x1={mx} y1={bottom} x2={mx} y2={bottom - 7} stroke={edge} strokeWidth={1.6} strokeOpacity={0.5} />);
      }
    }
  }
  return (
    <g opacity={opacity}>
      <g filter="url(#chalk-rough)">
        {/* 长条本体 */}
        <rect x={left} y={top} width={right - left} height={bottom - top} rx={7} fill={stripFill} stroke={edge} strokeWidth={ghost ? 2.4 : 3} strokeDasharray={dash} />
        {/* 把手：圆孔 + 两道防滑纹 */}
        <circle cx={holeX} cy={holeY} r={holeR} fill={hexA(B.board, ghost ? 0.4 : 0.85)} stroke={edge} strokeWidth={2.4} strokeDasharray={ghost ? "6 5" : undefined} />
        <line x1={left + handle - 2} y1={top + 10} x2={left + handle - 2} y2={bottom - 10} stroke={edge} strokeWidth={1.8} strokeOpacity={0.55} strokeDasharray={ghost ? "6 6" : undefined} />
        {ghost ? null : ticks}
        {/* 格子 */}
        {text.split("").map((_, i) => {
          const j = i + 1;
          const look = looks[i] ?? "plain";
          const hi = look === "hi";
          return (
            <rect
              key={j}
              x={colX(g, j)}
              y={g.y}
              width={g.cell}
              height={g.cell}
              fill={hi ? hexA(B.yellow, 0.34) : hexA(B.board, ghost ? 0.15 : 0.45)}
              stroke={hi ? B.yellow : edge}
              strokeOpacity={hi ? 1 : 0.8}
              strokeWidth={hi ? 3.4 : 2.2}
              strokeDasharray={dash}
            />
          );
        })}
        {/* 当前位：外面一圈虚线框 */}
        {looks.map((look, i) =>
          look === "current" ? (
            <rect
              key={`cur${i}`}
              x={colX(g, i + 1) - 6}
              y={g.y - 6}
              width={g.cell + 12}
              height={g.cell + 12}
              fill="none"
              stroke={B.chalk}
              strokeWidth={2.6}
              strokeDasharray="10 8"
            />
          ) : null,
        )}
      </g>
      {text.split("").map((ch, i) => {
        const j = i + 1;
        const look = looks[i] ?? "plain";
        return (
          <React.Fragment key={j}>
            <ChalkText
              x={colCX(g, j)}
              y={g.y + g.cell / 2 - 3}
              size={letterSize}
              font="mono"
              color={look === "hi" ? "#FFF6D2" : B.chalk}
              opacity={ghost ? 0.72 : 1}
            >
              {ch}
            </ChalkText>
            <ChalkText x={colCX(g, j)} y={g.y + g.cell + labelH * 0.5 - 1} size={indexSize} font="mono" color={B.yellow} opacity={ghost ? 0.6 : 0.95}>
              {j + startIndex - 1}
            </ChalkText>
          </React.Fragment>
        );
      })}
      <ChalkText x={holeX} y={g.y + g.cell + labelH * 0.5 - 1} size={indexSize} font="mono" color={B.yellow} opacity={ghost ? 0.55 : 0.9}>
        j
      </ChalkText>
    </g>
  );
};

/* ------------------------------------------------------------------ 勾 / 叉 */

/** 两格之间（y1 → y2）的一根短竖线，旁边一个勾或叉 */
export const Mark: React.FC<{ x: number; y1: number; y2: number; kind: "ok" | "bad"; size?: number }> = ({ x, y1, y2, kind, size = 24 }) => {
  const color = kind === "ok" ? B.green : B.red;
  const cy = (y1 + y2) / 2;
  const sx = x + 10;
  const s = size;
  return (
    <g filter="url(#chalk-rough)" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={2.6} strokeOpacity={0.7} />
      {kind === "ok" ? (
        <path d={`M ${sx} ${cy} L ${sx + s * 0.36} ${cy + s * 0.38} L ${sx + s} ${cy - s * 0.5}`} stroke={color} strokeWidth={4.6} />
      ) : (
        <path
          d={`M ${sx + 2} ${cy - s * 0.42} L ${sx + s * 0.86} ${cy + s * 0.42} M ${sx + s * 0.86} ${cy - s * 0.42} L ${sx + 2} ${cy + s * 0.42}`}
          stroke={color}
          strokeWidth={4.8}
        />
      )}
    </g>
  );
};

/* ------------------------------------------------------------------ 括号 */

/** 下方括号（开口朝上）：x1..x2，顶边 y，深 h；label 写在下方 */
export const Bracket: React.FC<{ x1: number; x2: number; y: number; color: string; label?: React.ReactNode; h?: number }> = ({
  x1,
  x2,
  y,
  color,
  label,
  h = 24,
}) => {
  const m = (x1 + x2) / 2;
  const q = h / 2;
  const d = [
    `M ${x1} ${y}`,
    `Q ${x1} ${y + q} ${x1 + q} ${y + q}`,
    `L ${m - q} ${y + q}`,
    `Q ${m} ${y + q} ${m} ${y + h}`,
    `Q ${m} ${y + q} ${m + q} ${y + q}`,
    `L ${x2 - q} ${y + q}`,
    `Q ${x2} ${y + q} ${x2} ${y}`,
  ].join(" ");
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" filter="url(#chalk-rough)" />
      {label ? (
        <ChalkText x={m} y={y + h + 30} size={SIZE.label} color={color}>
          {label}
        </ChalkText>
      ) : null}
    </g>
  );
};

/* ------------------------------------------------------------------ 粉笔箭头（指针） */

/** 一根朝下的粉笔箭头，尾端写指针名（i / j）；tip = 箭头尖坐标 */
export const ChalkArrow: React.FC<{ x: number; tip: number; len?: number; label: string; color?: string }> = ({ x, tip, len = 70, label, color = B.chalk }) => (
  <g>
    <g filter="url(#chalk-rough)" stroke={color} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={x} y1={tip - len} x2={x} y2={tip - 2} />
      <path d={`M ${x - 15} ${tip - 19} L ${x} ${tip} L ${x + 15} ${tip - 19}`} />
    </g>
    <ChalkText x={x} y={tip - len - 30} size={SIZE.pointer} font="mono" weight={700} color={color}>
      {label}
    </ChalkText>
  </g>
);

/* ------------------------------------------------------------------ 便签 */

/** 右下角便签：白底微黄、−2°、阴影；标题 next，8 格。values[j-1] = 数字或 null；hi = 黄框高亮的格（1 起） */
export const NextNote: React.FC<{ x: number; y: number; values: (number | null)[]; hi?: number; title?: string }> = ({ x, y, values, hi, title = "next" }) => {
  const cell = 52;
  const pitch = 58;
  const padX = 26;
  const w = padX * 2 + (values.length - 1) * pitch + cell;
  const h = 176;
  const gx = x + padX;
  const gy = y + 92;
  return (
    <g transform={`rotate(-2 ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} fill={B.note} filter="url(#note-shadow)" />
      {/* 顶部一条略深的胶带边 */}
      <rect x={x} y={y} width={w} height={10} fill={hexA("#C9B98A", 0.35)} />
      <text x={x + padX} y={y + 40} fontFamily={BFONT.mono} fontWeight={700} fontSize={SIZE.noteTitle} fill={B.noteTitle} dominantBaseline="central">
        {title}
      </text>
      {values.map((v, i) => (
        <React.Fragment key={i}>
          <text x={gx + i * pitch + cell / 2} y={gy - 14} fontFamily={BFONT.mono} fontSize={16} fill={B.noteTitle} opacity={0.75} textAnchor="middle" dominantBaseline="central">
            {i + 1}
          </text>
          <rect x={gx + i * pitch} y={gy} width={cell} height={cell} fill="none" stroke={B.noteLine} strokeWidth={2} />
          {v !== null ? (
            <text
              x={gx + i * pitch + cell / 2}
              y={gy + cell / 2 + 1}
              fontFamily={BFONT.hand}
              fontSize={SIZE.noteDigit}
              fontWeight={700}
              fill={B.noteInk}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${[-4, 3, -2, 5, -3, 2, -5, 4][i]} ${gx + i * pitch + cell / 2} ${gy + cell / 2})`}
            >
              {v}
            </text>
          ) : null}
        </React.Fragment>
      ))}
      {hi ? (
        <rect x={gx + (hi - 1) * pitch - 5} y={gy - 5} width={cell + 10} height={cell + 10} fill={hexA(B.yellow, 0.28)} stroke="#E0B636" strokeWidth={3.4} />
      ) : null}
    </g>
  );
};

/* ------------------------------------------------------------------ 字幕 */

/** 底部双语字幕：中文 38 粉笔白、英文 24 偏灰，一行居中，无背景卡 */
export const BoardSubtitle: React.FC<{ zh: string; en?: string; y?: number }> = ({ zh, en, y = 966 }) => (
  <g>
    <ChalkText x={W / 2} y={y} size={SIZE.subZh} weight={500} grain={false}>
      {zh}
    </ChalkText>
    {en ? (
      <ChalkText x={W / 2} y={y + 44} size={SIZE.subEn} weight={400} color={B.chalkDim} grain={false}>
        {en}
      </ChalkText>
    ) : null}
  </g>
);
