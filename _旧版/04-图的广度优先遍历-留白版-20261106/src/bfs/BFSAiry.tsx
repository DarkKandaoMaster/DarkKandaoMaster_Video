// Composition BFSAiry：图的广度优先遍历·留白版小样（第 1–3 镜）。画面 = AiryStage，音轨 = BGM（闪避，压低）+ 音效（少而轻）+ 旁白/双语字幕。
import React from "react";
import { AbsoluteFill } from "remotion";
import { BgmTrack, NarrationTrack, SfxTrack, type Sfx } from "../components/Narration";
import type { BEvent } from "../graph/bfs";
import { GraphBackground } from "../graph/Kit";
import { SUB_PALETTE } from "../graph/theme";
import { AiryStage } from "./AiryStage";
import { K, LAYER_BOX, LAYER_ITEMS, MOVE, T_ASC, TL } from "./timeline";
import { RUN_ASC } from "./trace.generated";

export const TOTAL = TL.total;

/** 遍历事件 → 音效：入队 pop、探邻居 tick（很轻）、出队 whoosh（很轻）、结束 ding */
const runSfx = (evs: BEvent[], ts: (number | null)[]): Sfx[] => {
  const out: Sfx[] = [];
  evs.forEach((e, i) => {
    const T = ts[i];
    if (T === null) return;
    if (e.t === "visit" || e.t === "enq") out.push({ at: T + (e.from === null ? 0 : MOVE) + 1, src: "pop", vol: 0.11 });
    else if (e.t === "check") out.push({ at: T, src: "tick", vol: 0.05 });
    else if (e.t === "deq") out.push({ at: T, src: "whoosh", vol: 0.06 });
    else if (e.t === "done") out.push({ at: T, src: "ding", vol: 0.14 });
  });
  return out;
};

const SFX: Sfx[] = [
  // 第 1 镜
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.graphIn + i * 5, src: "tick", vol: 0.05 })),
  // 第 2 镜
  ...LAYER_ITEMS.map((it) => ({ at: it.at + (it.from === undefined ? 0 : 10) - 2, src: "pop", vol: 0.1 })),
  ...LAYER_BOX.map((t) => ({ at: t, src: "snap", vol: 0.08 })),
  { at: K.ripple, src: "whoosh", vol: 0.1 },
  { at: K.title, src: "ding_hi", vol: 0.1 },
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.rowFly + 20 + i * 4, src: "tick", vol: 0.04 })),
  // 第 3 镜
  { at: K.morph, src: "whoosh", vol: 0.12 },
  ...runSfx(RUN_ASC, T_ASC),
  { at: K.marked, src: "snap", vol: 0.14 },
  { at: K.ghostIn + 2, src: "pop", vol: 0.1 },
  { at: K.markEnq, src: "stamp", vol: 0.16 },
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.finalRow + i * 4, src: "tick", vol: 0.04 })),
  { at: K.finalBoxes + 10, src: "snap", vol: 0.08 },
];

export const BFSAiry: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <GraphBackground />
    <AiryStage />
    <BgmTrack tl={TL} src="bgm/bright-01.wav" level={0.6} />
    <SfxTrack list={SFX} />
    <NarrationTrack tl={TL} subtitlePalette={SUB_PALETTE} />
  </AbsoluteFill>
);
