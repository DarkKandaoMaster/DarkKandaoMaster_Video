// 双语字幕：中文一行（31 px）+ 英文一行（21 px、灰一点），底部居中；palette.line = "none" 时不加描边和投影（留白版用透明底）。
// 和 Subtitle.tsx 同一套时刻规则（放在旁白的 Sequence 里，frame 0 = 该条旁白开始）；
// 配色由调用方传入（浅色 / 深色视频都能用），不读全局主题，所以不影响只用中文字幕的旧视频。
import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../base/anim";
import { FONT } from "../base/theme";
import { Rich } from "./Rich";

export type BiCue = { text: string; t: number; en?: string };

export type SubtitlePalette = {
  bg: string;
  line: string;
  zh: string;
  en: string;
  shadow: string;
};

export const BilingualSubtitle: React.FC<{
  cues: BiCue[];
  speechFrames: number;
  tail: number;
  palette: SubtitlePalette;
  fps?: number;
}> = ({ cues, speechFrames, tail, palette, fps = 30 }) => {
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
  const cue = cues[idx];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", justifyContent: "center", opacity: a }}>
      <div
        style={{
          maxWidth: 1500,
          padding: "5px 22px 7px",
          borderRadius: 12,
          background: palette.bg,
          boxShadow: palette.line === "none" ? undefined : `inset 0 0 0 1.5px ${palette.line}, 0 6px 18px ${palette.shadow}`,
          fontFamily: FONT.sans,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          opacity: textA,
        }}
      >
        <div style={{ fontSize: 31, fontWeight: 500, lineHeight: 1.34, letterSpacing: "0.02em", color: palette.zh }}>
          <Rich text={cue.text} />
        </div>
        {cue.en ? (
          <div style={{ fontSize: 21, fontWeight: 400, lineHeight: 1.3, marginTop: 1, color: palette.en, letterSpacing: "0.005em" }}>
            <Rich text={cue.en} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
