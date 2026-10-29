// 示例 Composition（约 6 秒）：浅色方格纸 + 一排便签格子 + 公式卡 + 双语字幕 + BGM 闪避 + 音效。
// 新视频照这个结构写：画面组件按 p() 取时刻，最后挂 BgmTrack / SfxTrack / NarrationTrack 三条轨。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_OUT, mix, progress } from "../base/anim";
import { L } from "../base/paper";
import { A, Op } from "../components/Math";
import { BgmTrack, NarrationTrack, SfxTrack, type Sfx } from "../components/Narration";
import { Card, Chip, PaperBackground, PTile, Txt } from "../components/PaperKit";
import { TL, p } from "./timeline";

export const TOTAL = TL.total;

const SUB_PALETTE = { bg: "rgba(255, 255, 255, 0.94)", line: L.cardLine, zh: L.ink, en: L.ink2, shadow: L.shadow };

const TILE = 120;
const GAP = 24;
const TILES = ["11", "21", "22", "31", "32"];
const X0 = (1920 - (TILES.length * TILE + (TILES.length - 1) * GAP)) / 2;

const K = {
  tiles: p("s1a"),
  fold: p("s1a", "沿对角线"),
  same: p("s1a", "两边"),
};

const SFX: Sfx[] = [
  ...TILES.map((_, i) => ({ at: K.tiles + 6 + i * 4, src: "tick", vol: 0.16 })),
  { at: K.fold, src: "whoosh", vol: 0.22 },
  { at: K.same, src: "pop", vol: 0.2 },
];

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const title = progress(f, 0, 18, EASE_OUT);
  const card = progress(f, K.same, 16, EASE_OUT);
  return (
    <>
      <Txt cx={960} y={170} size={56} weight={700} opacity={title} dy={mix(16, 0, title)}>
        示例视频 <Chip style={{ marginLeft: 16, verticalAlign: "middle" }}>_template</Chip>
      </Txt>
      {TILES.map((label, i) => {
        const t = progress(f, K.tiles + i * 4, 14, EASE_OUT);
        const hi = progress(f, K.fold + i * 3, 10) * (1 - progress(f, K.same, 12));
        return (
          <PTile
            key={label}
            x={X0 + i * (TILE + GAP)}
            y={360 + mix(30, 0, t)}
            w={TILE}
            label={label}
            opacity={t}
            look={{ tint: 1, row: i, hi }}
          />
        );
      })}
      <Card x={660} y={580} w={600} h={150} opacity={card} dy={mix(20, 0, card)}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, color: L.ink }}>
          <A sub="ij" />
          <Op>=</Op>
          <A sub="ji" style={{ color: L.accentDeep }} />
        </div>
      </Card>
    </>
  );
};

export const Example: React.FC = () => (
  <AbsoluteFill style={{ background: L.paper, overflow: "hidden" }}>
    <PaperBackground />
    <Scene />
    <BgmTrack tl={TL} src="bgm/bright-01.wav" level={1.0} />
    <SfxTrack list={SFX} />
    <NarrationTrack tl={TL} subtitlePalette={SUB_PALETTE} />
  </AbsoluteFill>
);
