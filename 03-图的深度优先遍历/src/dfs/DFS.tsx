// Composition DFS：图的深度优先遍历。画面 = MainStage（第 1–5 镜）+ 第 6–9 镜，音轨 = BGM（闪避）+ 音效 + 旁白/双语字幕。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { progress } from "../base/anim";
import { BgmTrack, NarrationTrack, SfxTrack, type Sfx } from "../components/Narration";
import { GraphBackground } from "../graph/Kit";
import { SUB_PALETTE } from "../graph/theme";
import type { TEvent } from "../graph/traverse";
import { HeaderStatic, MainStage } from "./MainStage";
import { S6Disconnected, S7Complexity, S8Quiz, S9Outro } from "./Scenes";
import { K, LIST_STEP, OV_ASC, SCENE, T_ASC, T_DESC, T_G6, T_LIST, TL } from "./timeline";
import { G6_CALLS, RUN_ASC, RUN_DESC, RUN_LIST } from "./trace.generated";

export const TOTAL = TL.total;

/** 遍历事件 → 音效：到达顶点 pop、探邻居 tick、回退 whoosh + 出栈 snap、结束 ding */
const runSfx = (
  evs: TEvent[],
  ts: (number | null)[],
  o: { move: number; vol: number; checks?: boolean; backs?: boolean; pops?: Record<number, number> },
): Sfx[] => {
  const out: Sfx[] = [];
  evs.forEach((e, i) => {
    const T = ts[i];
    if (T === null) return;
    if (e.t === "visit") out.push({ at: T + (e.from === null ? 0 : o.move) - 2, src: "pop", vol: o.vol });
    else if (e.t === "check" && o.checks) out.push({ at: T, src: "tick", vol: o.vol * 0.55 });
    else if (e.t === "back") {
      if (o.backs) out.push({ at: T, src: "whoosh", vol: o.vol * 0.6 });
      out.push({ at: o.pops?.[i] ?? T, src: "snap", vol: o.vol * 0.8 });
    } else if (e.t === "done") out.push({ at: T, src: "ding", vol: o.vol * 1.1 });
  });
  return out;
};

const SFX: Sfx[] = [
  // 第 1 镜
  { at: K.motto, src: "stamp", vol: 0.3 },
  { at: K.mottoUp, src: "whoosh", vol: 0.18 },
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.graphIn + i * 5, src: "tick", vol: 0.08 })),
  // 第 2 镜
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.flashAll + i * 5, src: "tick", vol: 0.07 })),
  { at: K.visitedIn, src: "pop", vol: 0.14 },
  { at: K.stackIn, src: "pop", vol: 0.14 },
  // 第 3 镜
  ...runSfx(RUN_ASC, T_ASC, { move: 12, vol: 0.17, checks: true, backs: true, pops: { 10: OV_ASC[10].pop } }),
  { at: K.wall, src: "stamp", vol: 0.32 },
  // 第 4 镜
  { at: K.reset1, src: "whoosh", vol: 0.18 },
  ...runSfx(RUN_DESC, T_DESC, { move: 9, vol: 0.12 }),
  // 第 5 镜
  { at: K.toList, src: "whoosh", vol: 0.2 },
  ...runSfx(RUN_LIST, T_LIST, { move: LIST_STEP, vol: 0.08 }),
  { at: K.revOn + 8, src: "whoosh", vol: 0.16 },
  { at: K.revOff, src: "whoosh", vol: 0.16 },
  { at: K.exam, src: "stamp", vol: 0.24 },
  // 第 6 镜
  { at: SCENE.s6, src: "whoosh", vol: 0.2 },
  ...G6_CALLS.flatMap((evs, i) => runSfx(evs, T_G6[i], { move: 8, vol: 0.1 })),
  ...T_G6.map((ts) => ({ at: ts[0] as number, src: "pop", vol: 0.16 })),
  { at: K.g6Three, src: "ding_hi", vol: 0.2 },
  // 第 7 镜
  { at: SCENE.s7, src: "whoosh", vol: 0.2 },
  ...Array.from({ length: 8 }, (_, i) => ({ at: K.matScan + i * 7, src: "tick", vol: 0.06 })),
  // 第 8 镜
  { at: SCENE.s8, src: "whoosh", vol: 0.2 },
  ...Array.from({ length: 4 }, (_, i) => ({ at: K.quizOpts + i * 6, src: "pop", vol: 0.13 })),
  ...Array.from({ length: K.countSec }, (_, i) => ({ at: K.countFrom + i * 30, src: "tick", vol: 0.2 })),
  { at: K.countFrom + K.countSec * 30, src: "ding", vol: 0.22 },
  { at: K.reveal, src: "ding_hi", vol: 0.28 },
  // 第 9 镜
  { at: SCENE.s9, src: "whoosh", vol: 0.2 },
];

const Header: React.FC = () => {
  const f = useCurrentFrame();
  const a = progress(f, SCENE.s6, 2) * (1 - progress(f, SCENE.s9, 12));
  if (a <= 0) return null;
  return <HeaderStatic opacity={a} />;
};

export const DFS: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <GraphBackground />
    <MainStage />
    <S6Disconnected />
    <S7Complexity />
    <S8Quiz />
    <S9Outro />
    <Header />
    <BgmTrack tl={TL} src="bgm/bright-01.wav" level={0.85} />
    <SfxTrack list={SFX} />
    <NarrationTrack tl={TL} subtitlePalette={SUB_PALETTE} />
  </AbsoluteFill>
);
