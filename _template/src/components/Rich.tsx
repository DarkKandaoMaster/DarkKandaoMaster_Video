// 字幕 / 标签用的轻量标记：a_{35}、a_{ij} 渲染成下标。其余原样输出。
import React from "react";
import { FONT } from "../base/theme";

export const Rich: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  const re = /([A-Za-z])_\{([^}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    parts.push(
      <span key={k++} style={{ whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: FONT.math, fontStyle: "italic" }}>{m[1]}</span>
        <span style={{ fontSize: "0.66em", position: "relative", top: "0.3em", marginLeft: "0.04em", fontVariantNumeric: "tabular-nums" }}>
          {[...m[2]].map((ch, i) =>
            /[a-z]/.test(ch) ? (
              <span key={i} style={{ fontFamily: FONT.math, fontStyle: "italic" }}>{ch}</span>
            ) : (
              <span key={i}>{ch}</span>
            ),
          )}
        </span>
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return <>{parts}</>;
};
