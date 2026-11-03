// 当前比较：主串格底边与模式格顶边之间的一根短竖线；相等 → 绿线 + 绿圆 tick，不等 → 红线 + 红圆 ×。
// 匹配场景里 y1 = M.cmpY1（414）、y2 = M.cmpY2（450），cx = 主串当前格中线。
// big = 第 1 镜"错了！"那一下的大 ×（盖在两格上，像打叉）。
import React from "react";
import { L } from "../base/paper";
import { hexA } from "../base/theme";
import { KC, M } from "./layout";

export type CmpState = "pending" | "eq" | "ne";

export const Compare: React.FC<{
  cx: number;
  y1?: number;
  y2?: number;
  state: CmpState;
  /** 0..1 竖线从上往下画出来 */
  draw?: number;
  /** 0..1 标记弹出（tick / ×） */
  mark?: number;
  /** 大 ×（0..1 盖下来） */
  big?: number;
  opacity?: number;
}> = ({ cx, y1 = M.cmpY1, y2 = M.cmpY2, state, draw = 1, mark = 1, big = 0, opacity = 1 }) => {
  if (opacity <= 0.001 || draw <= 0.001) return null;
  const color = state === "eq" ? KC.ok : state === "ne" ? KC.bad : L.ink3;
  const len = (y2 - y1) * Math.min(1, draw);
  const my = (y1 + y2) / 2;
  const r = 13;
  const s = mark <= 0 ? 0 : 0.4 + 0.6 * Math.min(1, mark) + 0.18 * Math.sin(Math.min(1, mark) * Math.PI);
  const markX = cx + 26; // 标记放在竖线右边，不挡字母
  const bigS = 1 + 0.8 * (1 - Math.min(1, big)) ** 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none", zIndex: 20 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line
          x1={cx}
          y1={y1 + 2}
          x2={cx}
          y2={y1 + 2 + Math.max(0, len - 4)}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={state === "pending" ? "5 6" : undefined}
        />
        {state !== "pending" && mark > 0.001 ? (
          <g transform={`translate(${markX} ${my}) scale(${s})`} opacity={Math.min(1, mark * 2)}>
            <circle r={r} fill={state === "eq" ? KC.ok : KC.bad} />
            {state === "eq" ? (
              <path d="M -6 0.5 L -1.8 5 L 6.5 -5" fill="none" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <g stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round">
                <path d="M -5 -5 L 5 5" />
                <path d="M 5 -5 L -5 5" />
              </g>
            )}
          </g>
        ) : null}
        {big > 0.001 ? (
          <g transform={`translate(${cx} ${my}) scale(${bigS}) rotate(-6)`} opacity={Math.min(1, big * 1.8) * 0.92}>
            <g stroke={hexA(KC.bad, 0.18)} strokeWidth={30} strokeLinecap="round" transform="translate(3 5)">
              <path d="M -60 -60 L 60 60" />
              <path d="M 60 -60 L -60 60" />
            </g>
            <g stroke={KC.bad} strokeWidth={20} strokeLinecap="round">
              <path d="M -60 -60 L 60 60" />
              <path d="M 60 -60 L -60 60" />
            </g>
          </g>
        ) : null}
      </svg>
    </div>
  );
};
