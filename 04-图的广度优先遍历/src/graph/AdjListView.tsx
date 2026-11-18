// 邻接表（严蔚敏画法）：左边顶点表「下标 | data | firstarc」，右边边链表，每个边结点「adjvex | nextarc」，
// 最后一个结点的 nextarc 写 ∧。adjvex 存的是邻接点在顶点表里的下标（0 起）。
// 可以标记扫描过的结点（skip = 已访问划灰，go = 去了填色）、画扫描框、整行高亮、链表倒序动画。
import React from "react";
import { mix, progress, EASE_OUT } from "../base/anim";
import { FONT, mixColor } from "../base/theme";
import { VName } from "./Kit";
import { G, deep, tint } from "./theme";

export type NodeMark = { type: "skip" | "go"; k: number };

export type AdjListViewProps = {
  x: number;
  y: number;
  f: number;
  /** lists[i] = 顶点 i+1 的链表（adjvex，0 起） */
  lists: number[][];
  rowH?: number;
  /** 格子高（默认 rowH − 18）；要在结点下写 v_j 小字时调小，留出行间距 */
  cellH?: number;
  color: string;
  opacity?: number;
  /** 从这一帧起逐行画出；不给 = 一开始就在 */
  buildAt?: number;
  /** key = `${顶点编号}-${链上第几个}` */
  marks?: Record<string, NodeMark>;
  cursor?: { u: number; k: number; vis: number } | null;
  /** 顶点编号 → 整行高亮 0..1 */
  rowHi?: Record<number, number>;
  /** 结点下面的小字 v_j（0..1） */
  subLabels?: number;
  /** 链表倒序进度 0..1（结点左右换位） */
  rev?: number;
  /** 某个结点额外闪一下 */
  nodeFlash?: (u: number, k: number) => number;
  /** 外框描色（0..1） */
  frame?: { k: number; color: string };
  /** 表头“顶点表 / 边链表”的透明度 */
  headers?: number;
};

export const ADJ = { idxW: 46, dataW: 82, arcW: 46, nodeA: 58, nodeN: 42, stride: 140, lead: 56 } as const;
export const adjNodeX = (x: number, slot: number) => x + ADJ.idxW + ADJ.dataW + ADJ.arcW + ADJ.lead + slot * ADJ.stride;

export const AdjListView: React.FC<AdjListViewProps> = ({
  x,
  y,
  f,
  lists,
  rowH = 70,
  cellH,
  color,
  opacity = 1,
  buildAt,
  marks = {},
  cursor,
  rowHi = {},
  subLabels = 0,
  rev = 0,
  nodeFlash,
  frame,
  headers = 1,
}) => {
  const ch = cellH ?? rowH - 18;
  const fs = Math.min(30, ch * 0.74);
  const nodeW = ADJ.nodeA + ADJ.nodeN;
  const maxLen = Math.max(...lists.map((l) => l.length));
  const width = adjNodeX(0, maxLen - 1) + nodeW + 20;
  const arrowA = 1 - Math.sin(Math.PI * rev);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity, pointerEvents: "none" }}>
      {frame && frame.k > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: x - 22,
            top: y - 58,
            width: width + 30,
            height: lists.length * rowH + 74,
            borderRadius: 20,
            boxShadow: `0 0 0 ${4 * frame.k}px ${frame.color}`,
            background: tint(frame.color, 0.06 * frame.k),
          }}
        />
      ) : null}
      <div style={{ position: "absolute", left: x + ADJ.idxW - 6, top: y - 46, width: ADJ.dataW + ADJ.arcW + 12, textAlign: "center", fontFamily: FONT.sans, fontSize: 22, fontWeight: 700, color: G.ink2, opacity: headers }}>
        顶点表
      </div>
      <div style={{ position: "absolute", left: adjNodeX(x, 0), top: y - 46, fontFamily: FONT.sans, fontSize: 22, fontWeight: 700, color: G.ink2, opacity: headers }}>
        边链表（adjvex | nextarc）
      </div>
      {lists.map((list, i) => {
        const u = i + 1;
        const k = buildAt === undefined ? 1 : progress(f, buildAt + i * 5, 12, EASE_OUT);
        if (k <= 0) return null;
        const ry = y + i * rowH;
        const cy = ry + rowH / 2 - 4;
        const hi = rowHi[u] ?? 0;
        const top = cy - ch / 2;
        const cellBox = (left: number, w: number, extra?: React.CSSProperties): React.CSSProperties => ({
          position: "absolute",
          left,
          top,
          width: w,
          height: ch,
          boxShadow: `inset 0 0 0 2.5px ${mixColor(G.vStroke, color, hi)}`,
          background: mixColor("#FFFFFF", tint(color, 0.18), hi),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...extra,
        });
        const arcX = x + ADJ.idxW + ADJ.dataW + ADJ.arcW / 2;
        return (
          <div key={u} style={{ opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
            <div style={{ position: "absolute", left: x, top, width: ADJ.idxW - 8, height: ch, display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: FONT.mono, fontSize: fs * 0.87, color: G.ink3 }}>
              {i}
            </div>
            <div style={{ ...cellBox(x + ADJ.idxW, ADJ.dataW), fontSize: fs * 1.07, color: G.ink, fontFamily: FONT.sans }}>
              {/* 下标会往下坠，整体上提一点，矮格子里也不贴底 */}
              <VName v={u} style={{ position: "relative", top: -fs * 0.16 }} />
            </div>
            <div style={cellBox(x + ADJ.idxW + ADJ.dataW - 2.5, ADJ.arcW)}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: G.ink }} />
            </div>
            {/* 箭头：firstarc → 第一个结点，结点之间 */}
            <svg style={{ position: "absolute", left: 0, top: 0, opacity: arrowA }} width={1920} height={1080}>
              {list.map((_, s) => {
                const x1 = s === 0 ? arcX : adjNodeX(x, s - 1) + ADJ.nodeA + ADJ.nodeN / 2;
                const x2 = adjNodeX(x, s) - 3;
                return (
                  <g key={s}>
                    <line x1={x1} y1={cy} x2={x2 - 10} y2={cy} stroke={G.ink2} strokeWidth={2.5} />
                    <path d={`M ${x2} ${cy} L ${x2 - 13} ${cy - 7} L ${x2 - 13} ${cy + 7} Z`} fill={G.ink2} />
                  </g>
                );
              })}
            </svg>
            {list.map((adj, kk) => {
              const slot = mix(kk, list.length - 1 - kk, rev);
              const nx = adjNodeX(x, slot);
              const m = marks[`${u}-${kk}`];
              const mk = m ? m.k : 0;
              const skip = m?.type === "skip";
              const go = m?.type === "go";
              const fl = nodeFlash ? nodeFlash(u, kk) : 0;
              const base = mixColor("#FFFFFF", tint(color, 0.2), hi * 0.5);
              const fill = go ? mixColor(base, tint(color, 0.32), mk) : skip ? mixColor(base, "#EEEBE4", mk) : base;
              const border = go ? mixColor(G.vStroke, color, mk) : mixColor(G.vStroke, color, Math.max(hi * 0.7, fl));
              const isLast = kk === list.length - 1;
              const lastSlot = Math.round(slot) === list.length - 1;
              return (
                <div key={kk} style={{ position: "absolute", left: nx, top, width: nodeW, height: ch, transform: `scale(${1 + 0.1 * fl})` }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: ADJ.nodeA,
                      height: ch,
                      background: fill,
                      boxShadow: `inset 0 0 0 2.5px ${border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONT.mono,
                      fontWeight: 700,
                      fontSize: fs,
                      color: skip ? mixColor(G.ink, G.ink3, mk) : go ? mixColor(G.ink, deep(color, 0.15), mk) : G.ink,
                    }}
                  >
                    {adj}
                    {skip && mk > 0.01 ? (
                      <svg style={{ position: "absolute", left: 0, top: 0 }} width={ADJ.nodeA} height={ch}>
                        <line x1={8} y1={ch - 8} x2={8 + (ADJ.nodeA - 16) * mk} y2={ch - 8 - (ch - 16) * mk} stroke={G.ink3} strokeWidth={3} strokeLinecap="round" />
                      </svg>
                    ) : null}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: ADJ.nodeA - 2.5,
                      top: 0,
                      width: ADJ.nodeN,
                      height: ch,
                      background: base,
                      boxShadow: `inset 0 0 0 2.5px ${border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONT.sans,
                      fontSize: fs * 0.87,
                      color: G.ink2,
                    }}
                  >
                    {(rev < 0.5 ? isLast : lastSlot) ? <span style={{ opacity: arrowA }}>∧</span> : <div style={{ width: 9, height: 9, borderRadius: 5, background: G.ink, opacity: arrowA }} />}
                  </div>
                  {subLabels > 0.001 ? (
                    <div style={{ position: "absolute", left: 0, width: ADJ.nodeA, top: ch + 1, textAlign: "center", fontSize: 19, color: G.ink3, opacity: subLabels, fontFamily: FONT.sans }}>
                      <VName v={adj + 1} />
                    </div>
                  ) : null}
                </div>
              );
            })}
            {cursor && cursor.u === u && cursor.vis > 0.001 ? (
              <div
                style={{
                  position: "absolute",
                  left: adjNodeX(x, mix(cursor.k, list.length - 1 - cursor.k, rev)) - 6,
                  top: top - 6,
                  width: ADJ.nodeA + 12,
                  height: ch + 12,
                  borderRadius: 8,
                  boxShadow: `0 0 0 4px ${G.ink}`,
                  opacity: cursor.vis,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
