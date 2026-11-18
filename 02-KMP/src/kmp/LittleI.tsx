// 拟人角色"小 i"：珊瑚橙的向下箭头（指着主串当前格）+ 两只圆点眼睛。只会往前走。
// 坐标由父组件给（x = 中线，y = 顶边；一般用 layout.ts 的 littleIPos(k)），移动时父组件用 anim.ts 的 track / hopLift 插值。
// 表情：normal 普通 / sad 委屈（被拽回去）/ happy 得意（i 不退）/ dizzy 摔晕（第 6 镜又摔一次）。
import React from "react";
import { L } from "../base/paper";
import { hexA } from "../base/theme";

export type Face = "normal" | "sad" | "happy" | "dizzy";

const W = 60; // scale = 1 时的宽高（与 layout.ts 的 M.littleIW / littleIH 一致）
const HGT = 85;
const EYE_Y = 27;
const EYE_DX = 10;
const WHITE = "#FFFFFF";
const PUPIL = L.ink;

/** 身体：圆头 + 向下的尖，尖端在 (30, 83) */
const BODY = "M 30 3 C 46 3 54 13 54 27 L 54 44 Q 54 48 51.5 51.5 L 33 80 Q 30 84 27 80 L 8.5 51.5 Q 6 48 6 44 L 6 27 C 6 13 14 3 30 3 Z";

const Eye: React.FC<{ cx: number; face: Face; lookX: number; lookY: number; side: -1 | 1 }> = ({ cx, face, lookX, lookY, side }) => {
  if (face === "happy") {
    // 笑眯眯的 ^ 形
    return <path d={`M ${cx - 5.5} ${EYE_Y + 2.5} Q ${cx} ${EYE_Y - 5} ${cx + 5.5} ${EYE_Y + 2.5}`} fill="none" stroke={WHITE} strokeWidth={3.2} strokeLinecap="round" />;
  }
  if (face === "dizzy") {
    // × 眼
    return (
      <g stroke={WHITE} strokeWidth={3} strokeLinecap="round">
        <path d={`M ${cx - 4.5} ${EYE_Y - 4.5} L ${cx + 4.5} ${EYE_Y + 4.5}`} />
        <path d={`M ${cx + 4.5} ${EYE_Y - 4.5} L ${cx - 4.5} ${EYE_Y + 4.5}`} />
      </g>
    );
  }
  const sad = face === "sad";
  const px = cx + lookX * 2.2;
  const py = EYE_Y + (sad ? 1.6 : 0) + lookY * 2.2;
  return (
    <g>
      <circle cx={cx} cy={EYE_Y} r={7.2} fill={WHITE} />
      <circle cx={px} cy={py} r={3.7} fill={PUPIL} />
      <circle cx={px - 1.2} cy={py - 1.3} r={1.1} fill={WHITE} />
      {sad ? (
        <>
          {/* 上眼皮耷拉 + 八字眉（内端抬高） */}
          <path d={`M ${cx - 7.6} ${EYE_Y - 1} Q ${cx} ${EYE_Y - 9.5} ${cx + 7.6} ${EYE_Y - 1} L ${cx + 7.6} ${EYE_Y - 9} L ${cx - 7.6} ${EYE_Y - 9} Z`} fill={L.accent} />
          <path d={`M ${cx - side * 6} ${EYE_Y - 13.5} L ${cx + side * 5} ${EYE_Y - 9.5}`} stroke={hexA("#5A1F0C", 0.75)} strokeWidth={2.4} strokeLinecap="round" />
        </>
      ) : null}
    </g>
  );
};

const Mouth: React.FC<{ face: Face }> = ({ face }) => {
  const y = 41;
  const stroke = { fill: "none", stroke: hexA("#5A1F0C", 0.8), strokeWidth: 2.4, strokeLinecap: "round" as const };
  if (face === "happy") return <path d={`M 22.5 ${y - 2} Q 30 ${y + 7} 37.5 ${y - 2} Z`} fill={hexA("#5A1F0C", 0.8)} stroke="none" />;
  if (face === "sad") return <path d={`M 25 ${y + 3} Q 30 ${y - 2.5} 35 ${y + 3}`} {...stroke} />;
  if (face === "dizzy") return <path d={`M 23 ${y + 1} q 2.3 -3 4.6 0 t 4.6 0 t 4.6 0`} {...stroke} />;
  return <path d={`M 25.5 ${y} Q 30 ${y + 4} 34.5 ${y}`} {...stroke} />;
};

export const LittleI: React.FC<{
  /** 中线 x */
  x: number;
  /** 顶边 y（不含 scale 的影响：缩放以尖端为原点） */
  y: number;
  face?: Face;
  scale?: number;
  opacity?: number;
  /** 旋转角（度），以尖端为原点：摔倒、晃动用 */
  rotate?: number;
  /** 压扁量 0..1：落地 / 起跳时的挤压（宽变大、高变小） */
  squash?: number;
  /** 眼珠朝向 -1..1 */
  lookX?: number;
  lookY?: number;
  /** 0..1：脸红（得意时） */
  blush?: number;
}> = ({ x, y, face = "normal", scale = 1, opacity = 1, rotate = 0, squash = 0, lookX = 0, lookY = 0, blush }) => {
  if (opacity <= 0.001) return null;
  const sx = scale * (1 + squash * 0.18);
  const sy = scale * (1 - squash * 0.2);
  const cheek = blush ?? (face === "happy" ? 1 : 0);
  return (
    <div
      style={{
        position: "absolute",
        left: x - W / 2,
        top: y,
        width: W,
        height: HGT,
        opacity,
        transformOrigin: `${W / 2}px ${HGT}px`,
        transform: `rotate(${rotate}deg) scale(${sx}, ${sy})`,
        zIndex: 50,
      }}
    >
      <svg width={W} height={HGT} viewBox={`0 0 ${W} ${HGT}`} style={{ overflow: "visible" }}>
        <path d={BODY} fill={hexA("#3C321E", 0.12)} transform="translate(0 3)" />
        <path d={BODY} fill={L.accent} stroke={L.accentDeep} strokeWidth={1.6} />
        <path d="M 16 14 Q 22 8 30 7.5" fill="none" stroke={hexA("#FFFFFF", 0.45)} strokeWidth={3} strokeLinecap="round" />
        {cheek > 0.01 ? (
          <g opacity={cheek}>
            <ellipse cx={30 - EYE_DX - 4} cy={EYE_Y + 10} rx={4} ry={2.4} fill={hexA("#FFB3A0", 0.9)} />
            <ellipse cx={30 + EYE_DX + 4} cy={EYE_Y + 10} rx={4} ry={2.4} fill={hexA("#FFB3A0", 0.9)} />
          </g>
        ) : null}
        <Eye cx={30 - EYE_DX} face={face} lookX={lookX} lookY={lookY} side={-1} />
        <Eye cx={30 + EYE_DX} face={face} lookX={lookX} lookY={lookY} side={1} />
        <Mouth face={face} />
      </svg>
    </div>
  );
};
