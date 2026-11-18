// 公式排版小件：变量用 Cambria Italic，数字和运算符用 Noto Sans（等宽数字），分式上下叠。
// 字号随父元素 fontSize 走（全部用 em），所以同一个公式放大缩小只改外层字号。
import React from "react";
import { FONT } from "../base/theme";

const NUM: React.CSSProperties = { fontFamily: FONT.sans, fontVariantNumeric: "tabular-nums", fontWeight: 500 };

/** 变量：i j n k a */
export const V: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontFamily: FONT.math, fontStyle: "italic", fontWeight: 400, padding: "0 0.04em", ...style }}>{children}</span>
);

/** 数字 / 普通文字 */
export const N: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ ...NUM, ...style }}>{children}</span>
);

/** 运算符，两侧留空：− + = × ÷ > */
export const Op: React.FC<{ children: React.ReactNode; tight?: boolean; style?: React.CSSProperties }> = ({ children, tight, style }) => (
  <span style={{ ...NUM, fontWeight: 400, padding: tight ? "0 0.08em" : "0 0.22em", ...style }}>{children}</span>
);

/** 括号 */
export const P: React.FC<{ children: string; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ ...NUM, fontWeight: 300, ...style }}>{children}</span>
);

/** 下标：a_{ij}；sub 里的字母按变量排，数字和逗号正体 */
export const Sub: React.FC<{ children: string; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontSize: "0.62em", position: "relative", top: "0.32em", marginLeft: "0.03em", whiteSpace: "nowrap", ...style }}>
    {[...children].map((ch, i) =>
      /[a-z]/.test(ch) ? (
        <V key={i} style={{ padding: 0 }}>{ch}</V>
      ) : (
        <span key={i} style={{ ...NUM, fontWeight: 500, margin: ch === "," ? "0 0.04em 0 0" : 0 }}>{ch}</span>
      ),
    )}
  </span>
);

/** 矩阵元素 a_{ij} */
export const A: React.FC<{ sub: string; style?: React.CSSProperties }> = ({ sub, style }) => (
  <span style={{ whiteSpace: "nowrap", ...style }}>
    <V style={{ padding: 0 }}>a</V>
    <Sub>{sub}</Sub>
  </span>
);

/** 分式 */
export const Frac: React.FC<{ num: React.ReactNode; den: React.ReactNode; style?: React.CSSProperties; barColor?: string }> = ({
  num,
  den,
  style,
  barColor,
}) => (
  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 0.12em", ...style }}>
    <span style={{ padding: "0 0.12em 0.04em", lineHeight: 1.1, whiteSpace: "nowrap" }}>{num}</span>
    <span style={{ alignSelf: "stretch", height: "0.06em", minHeight: 2, background: barColor ?? "currentColor", borderRadius: 2 }} />
    <span style={{ padding: "0.04em 0.12em 0", lineHeight: 1.1, whiteSpace: "nowrap" }}>{den}</span>
  </span>
);

/** 一行公式容器：基线对齐、不换行 */
export const Row: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", lineHeight: 1.2, ...style }}>{children}</span>
);
