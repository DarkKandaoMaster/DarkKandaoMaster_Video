// 一排字母格：主串（白底）/ 模式串（浅蓝）/ 复制出来滑动的那一份（淡蓝灰虚线）。
// 每格状态 idle / matched（淡绿）/ focus（珊瑚橙描边）/ dim（灰）；也可以传 0..1 的权重做渐变。
// 下方可挂若干排数字（next / nextval），跟着模式头位置 h 一起平移；h 传插值后的浮点数就是滑动动画。
import React from "react";
import { L } from "../base/paper";
import { FONT, hexA, mixColor } from "../base/theme";
import { KC, M, M_GEO, cellX, type RowGeo } from "./layout";

export type CellState = "idle" | "matched" | "focus" | "dim";

/** 权重版：各项 0..1，可叠加；show = 入场进度（0 = 不显示，1 = 完全出现） */
export type CellWeights = {
  matched?: number;
  focus?: number;
  dim?: number;
  /** 0..1 淡黄底（第 4 镜"只看 j 前面"） */
  yellow?: number;
  /** 0..1 虚线框（第 4 镜"不看它自己"） */
  dashed?: number;
  show?: number;
  /** 竖向偏移 px（弹跳等） */
  dy?: number;
};

export type CellLook = CellState | CellWeights;

const toWeights = (look: CellLook | undefined): CellWeights => {
  if (!look || look === "idle") return {};
  if (look === "matched") return { matched: 1 };
  if (look === "focus") return { focus: 1 };
  if (look === "dim") return { dim: 1 };
  return look;
};

export type RowKind = "main" | "pattern" | "copy";

const BASE: Record<RowKind | "num", { bg: string; edge: string; ink: string }> = {
  main: { bg: L.tile, edge: L.tileLine, ink: L.ink },
  pattern: { bg: L.blueSoft, edge: "#9DBBE6", ink: L.ink },
  copy: { bg: L.copy, edge: L.copyLine, ink: L.ink2 },
  num: { bg: "#FFFFFF", edge: L.cardLine, ink: L.ink },
};

/** 单个格子（字母或数字），左上角 (x, y)，宽 w 高 hgt */
export const Cell: React.FC<{
  x: number;
  y: number;
  w: number;
  hgt?: number;
  kind: RowKind | "num";
  look?: CellLook;
  children?: React.ReactNode;
  fontSize: number;
  font?: string;
  weight?: number;
}> = ({ x, y, w, hgt, kind, look, children, fontSize, font = FONT.mono, weight = 700 }) => {
  const k = toWeights(look);
  const show = k.show ?? 1;
  if (show <= 0.001) return null;
  const matched = k.matched ?? 0;
  const focus = k.focus ?? 0;
  const dim = k.dim ?? 0;
  const yellow = k.yellow ?? 0;
  const base = BASE[kind];
  let bg = mixColor(base.bg, KC.matchedBg, matched);
  bg = mixColor(bg, KC.hiYellow, yellow);
  bg = mixColor(bg, KC.dimBg, dim);
  let edge = mixColor(base.edge, KC.matchedEdge, matched);
  edge = mixColor(edge, KC.dimEdge, dim);
  edge = mixColor(edge, L.accent, focus);
  const ink = mixColor(base.ink, KC.dimInk, dim);
  const h = hgt ?? w;
  const dashed = kind === "copy" || (k.dashed ?? 0) > 0.5;
  const bw = 2 + focus * 2.5;
  const s = 0.6 + 0.4 * show;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (k.dy ?? 0),
        width: w,
        height: h,
        opacity: Math.min(1, show * 1.5),
        transform: show < 1 ? `scale(${s})` : undefined,
        transformOrigin: "50% 60%",
        zIndex: focus > 0.01 ? 5 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: Math.round(Math.min(w, h) * 0.16),
          background: bg,
          boxSizing: "border-box",
          border: dashed ? `${bw}px dashed ${(k.dashed ?? 0) > 0.5 ? mixColor(edge, L.ink3, 0.5) : edge}` : undefined,
          boxShadow: [
            dashed ? null : `inset 0 0 0 ${bw}px ${edge}`,
            `0 ${Math.round(h * 0.05)}px 0 ${hexA("#3C321E", 0.1 * (1 - dim * 0.6))}`,
            focus > 0.01 ? `0 0 ${26 * focus}px ${hexA(L.accent, 0.45 * focus)}` : null,
          ]
            .filter(Boolean)
            .join(", "),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font,
          fontWeight: weight,
          fontSize,
          color: ink,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          paddingBottom: Math.round(fontSize * 0.08),
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** 一排数字（next / nextval）：values[j − 1]；null = 空格（还没填），字符串原样显示（如 "?"） */
export type NumRow = {
  label?: string;
  values: ReadonlyArray<number | string | null>;
  y: number;
  height: number;
  size?: number;
  looks?: ReadonlyArray<CellLook | undefined>;
  opacity?: number;
};

export const StringRow: React.FC<{
  text: string;
  kind: RowKind;
  /** 字母格顶边 y */
  y: number;
  /** 模式头对着主串第 h 位（浮点 = 滑动中）；主串 / 手推场景就是 1 */
  h?: number;
  geo?: RowGeo;
  /** 每格外观：数组（下标 j − 1）或函数 (j) => look */
  looks?: ReadonlyArray<CellLook | undefined> | ((j: number) => CellLook | undefined);
  letterSize?: number;
  /** 行首标签（"S" / "T"），右对齐到第 1 格左边 labelGap 处，随 h 平移 */
  label?: string;
  labelGap?: number;
  labelSize?: number;
  /** 格子上方的下标号（主串 1～17、手推的 j 号）：y = 号码顶边 */
  index?: { y: number; size?: number; color?: string };
  /** 下方挂的数字排（跟着 h 一起平移） */
  rows?: ReadonlyArray<NumRow>;
  opacity?: number;
}> = ({ text, kind, y, h = 1, geo = M_GEO, looks, letterSize = M.letterSize, label, labelGap = 18, labelSize, index, rows, opacity = 1 }) => {
  if (opacity <= 0.001) return null;
  const n = text.length;
  const lookOf = (j: number): CellLook | undefined => (typeof looks === "function" ? looks(j) : looks?.[j - 1]);
  const x1 = cellX(h, 1, geo);
  const lab = (txt: string, top: number, height: number, size: number, color: string) => (
    <div
      style={{
        position: "absolute",
        left: x1 - labelGap - 300,
        width: 300,
        top,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: size,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {txt}
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {label ? lab(label, y, geo.cell, labelSize ?? Math.round(letterSize * 0.8), kind === "main" ? L.ink2 : L.blue) : null}
      {index
        ? Array.from({ length: n }, (_, k) => (
            <div
              key={`ix${k}`}
              style={{
                position: "absolute",
                left: cellX(h, k + 1, geo),
                width: geo.cell,
                top: index.y,
                textAlign: "center",
                fontFamily: FONT.sans,
                fontSize: index.size ?? M.idxSize,
                lineHeight: 1,
                color: index.color ?? L.ink3,
                fontVariantNumeric: "tabular-nums",
                opacity: toWeights(lookOf(k + 1)).show ?? 1,
              }}
            >
              {k + 1}
            </div>
          ))
        : null}
      {Array.from({ length: n }, (_, k) => (
        <Cell key={`c${k}`} x={cellX(h, k + 1, geo)} y={y} w={geo.cell} kind={kind} look={lookOf(k + 1)} fontSize={letterSize}>
          {text[k]}
        </Cell>
      ))}
      {(rows ?? []).map((r, ri) =>
        (r.opacity ?? 1) <= 0.001 ? null : (
          <div key={`r${ri}`} style={{ position: "absolute", inset: 0, opacity: r.opacity ?? 1 }}>
            {r.label ? lab(r.label, r.y, r.height, Math.round((r.size ?? M.numSize) * 0.78), L.ink2) : null}
            {r.values.map((v, k) => (
              <Cell
                key={`n${k}`}
                x={cellX(h, k + 1, geo)}
                y={r.y}
                w={geo.cell}
                hgt={r.height}
                kind="num"
                look={r.looks?.[k] ?? (v === null ? { dim: 0.55 } : undefined)}
                fontSize={r.size ?? M.numSize}
                font={FONT.sans}
                weight={600}
              >
                {v === null ? "" : v}
              </Cell>
            ))}
          </div>
        ),
      )}
    </div>
  );
};
