// 中文字幕：底部居中，半透明深色底条，适中字号（36 px），一条最多两行。
// 放在旁白的 Sequence 里：frame 0 = 该条旁白开始。字幕时刻来自 tts.py 算出的分句时刻。
import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../base/anim";
import { FONT } from "../base/theme";
import { Rich } from "./Rich";

export type SubCue = { text: string; t: number };

export const Subtitle: React.FC<{ cues: SubCue[]; speechFrames: number; tail: number; fps?: number }> = ({ cues, speechFrames, tail, fps = 30 }) => {
  const f = useCurrentFrame();
  const end = speechFrames + tail;
  if (f < 0 || f >= end || cues.length === 0) return null;
  let idx = 0;
  cues.forEach((c, i) => {
    if (f >= Math.round(c.t * fps) - 2) idx = i;
  });
  const start = Math.max(0, Math.round(cues[idx].t * fps) - 2);
  const first = idx === 0;
  const last = idx === cues.length - 1;
  const a = Math.min(first ? progress(f, start, 4) : 1, last ? 1 - progress(f, end - 6, 6) : 1);
  const textA = first ? 1 : progress(f, start, 3);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, display: "flex", justifyContent: "center", opacity: a }}>
      <div
        style={{
          maxWidth: 1360,
          padding: "8px 26px 10px",
          borderRadius: 10,
          background: "rgba(6, 10, 20, 0.62)",
          fontFamily: FONT.sans,
          fontSize: 36,
          fontWeight: 500,
          lineHeight: 1.4,
          letterSpacing: "0.02em",
          color: "#F4F6FA",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ opacity: textA }}>
          <Rich text={cues[idx].text} />
        </span>
      </div>
    </div>
  );
};
