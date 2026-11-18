// Composition BFS：图的广度优先遍历。画面 = MainStage（第 1–5 镜）+ 第 6–10 镜，音轨 = BGM（闪避）+ 音效 + 旁白/双语字幕。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { progress } from "../base/anim";
import { BgmTrack, NarrationTrack, SfxTrack, type Sfx } from "../components/Narration";
import type { BEvent, BOverride } from "../graph/bfs";
import { GraphBackground } from "../graph/Kit";
import { SUB_PALETTE } from "../graph/theme";
import { HeaderStatic, MainStage } from "./MainStage";
import { S10Outro, S6ShortPath, S7Disconnected, S8Complexity, S9Quiz } from "./Scenes";
import { DESC_MOVE, G6_STEP, K, LAYER_BOX, LAYER_ITEMS, LIST_STEP, OV_ASC, SCENE, T_ASC, T_DESC, T_G6, T_LIST, TL } from "./timeline";
import { G6_CALLS, RUN_ASC, RUN_DESC, RUN_LIST } from "./trace.generated";

export const TOTAL = TL.total;

/** 遍历事件 → 音效：入队 pop、探邻居 tick、出队 whoosh（轻）、结束 ding */
const runSfx = (
  evs: BEvent[],
  ts: (number | null)[],
  o: { move: number; vol: number; checks?: boolean; deqs?: boolean; ov?: Record<number, BOverride> },
): Sfx[] => {
  const out: Sfx[] = [];
  evs.forEach((e, i) => {
    const T = ts[i];
    if (T === null) return;
    if (e.t === "visit" || e.t === "enq") {
      const push = o.ov?.[i]?.push ?? T + (e.from === null ? 0 : o.move) + 3;
      out.push({ at: push - 2, src: "pop", vol: o.vol });
    } else if (e.t === "check" && o.checks) out.push({ at: T, src: "tick", vol: o.vol * 0.55 });
    else if (e.t === "deq" && o.deqs) out.push({ at: T, src: "whoosh", vol: o.vol * 0.5 });
    else if (e.t === "done") out.push({ at: T, src: "ding", vol: o.vol * 1.1 });
  });
  return out;
};

const SFX: Sfx[] = [
  // 第 1 镜
  { at: K.motto, src: "stamp", vol: 0.3 },
  { at: K.mottoUp, src: "whoosh", vol: 0.18 },
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.graphIn + i * 5, src: "tick", vol: 0.08 })),
  { at: K.stone + 10, src: "pop", vol: 0.2 },
  // 第 2 镜
  ...LAYER_ITEMS.map((it) => ({ at: it.at + (it.from === undefined ? 0 : 10) - 2, src: "pop", vol: 0.15 })),
  ...LAYER_BOX.map((t) => ({ at: t, src: "snap", vol: 0.16 })),
  // 第 3 镜
  { at: K.reset0, src: "whoosh", vol: 0.16 },
  { at: K.morph, src: "whoosh", vol: 0.2 },
  ...runSfx(RUN_ASC, T_ASC, { move: 12, vol: 0.17, checks: true, deqs: true, ov: OV_ASC }),
  { at: K.markedEarly, src: "stamp", vol: 0.26 },
  { at: K.ghostIn + 2, src: "pop", vol: 0.16 },
  ...K.seqLayers.map((t) => ({ at: t, src: "snap", vol: 0.12 })),
  // 第 4 镜
  { at: K.reset1, src: "whoosh", vol: 0.18 },
  ...runSfx(RUN_DESC, T_DESC, { move: DESC_MOVE, vol: 0.12 }),
  // 第 5 镜
  { at: K.toList, src: "whoosh", vol: 0.2 },
  ...runSfx(RUN_LIST, T_LIST, { move: LIST_STEP, vol: 0.08 }),
  { at: K.revOn + 8, src: "whoosh", vol: 0.16 },
  { at: K.revOff, src: "whoosh", vol: 0.16 },
  { at: K.exam, src: "stamp", vol: 0.22 },
  // 第 6 镜
  { at: SCENE.s6, src: "whoosh", vol: 0.2 },
  ...[0, 1, 2].map((i) => ({ at: K.spPath + 6 + i * 14, src: "tick", vol: 0.14 })),
  { at: K.spPath + 34, src: "ding", vol: 0.16 },
  // 第 7 镜
  { at: SCENE.s7, src: "whoosh", vol: 0.2 },
  ...G6_CALLS.flatMap((evs, i) => runSfx(evs, T_G6[i], { move: G6_STEP, vol: 0.1 })),
  { at: K.g6Three, src: "ding_hi", vol: 0.2 },
  // 第 8 镜
  { at: SCENE.s8, src: "whoosh", vol: 0.2 },
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.matScan + i * 6, src: "tick", vol: 0.06 })),
  // 第 9 镜
  { at: SCENE.s9, src: "whoosh", vol: 0.2 },
  ...Array.from({ length: 4 }, (_, i) => ({ at: K.quizOpts + i * 6, src: "pop", vol: 0.13 })),
  ...Array.from({ length: K.countSec }, (_, i) => ({ at: K.countFrom + i * 30, src: "tick", vol: 0.2 })),
  { at: K.countFrom + K.countSec * 30, src: "ding", vol: 0.22 },
  { at: K.reveal, src: "ding_hi", vol: 0.28 },
  // 第 10 镜
  { at: SCENE.s10, src: "whoosh", vol: 0.2 },
];

const Header: React.FC = () => {
  const f = useCurrentFrame();
  const a = progress(f, SCENE.s6, 2) * (1 - progress(f, SCENE.s10, 12));
  if (a <= 0) return null;
  return <HeaderStatic opacity={a} />;
};

export const BFS: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <GraphBackground />
    <MainStage />
    <S6ShortPath />
    <S7Disconnected />
    <S8Complexity />
    <S9Quiz />
    <S10Outro />
    <Header />
    <BgmTrack tl={TL} src="bgm/bright-01.wav" level={0.85} />
    <SfxTrack list={SFX} />
    <NarrationTrack tl={TL} subtitlePalette={SUB_PALETTE} />
  </AbsoluteFill>
);
