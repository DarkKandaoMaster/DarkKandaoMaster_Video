// KMP：失配了，i 凭什么不回头？（next 与 nextval）。约 2:27，8 镜，分镜见 ../../脚本.md。
// 每镜一个文件 Scene1..Scene8.tsx：用绝对帧（不套 Sequence），各自只在自己的区间渲染；音效各镜导出 SFX_n，这里汇总。
import React from "react";
import { AbsoluteFill } from "remotion";
import { L } from "../base/paper";
import { BgmTrack, NarrationTrack, SfxTrack, type Sfx } from "../components/Narration";
import { PaperBackground } from "../components/PaperKit";
import { envelope } from "./bgm";
import { Scene1, SFX_1 } from "./Scene1";
import { Scene2, SFX_2 } from "./Scene2";
import { Scene3, SFX_3 } from "./Scene3";
import { Scene4, SFX_4 } from "./Scene4";
import { Scene5, SFX_5 } from "./Scene5";
import { Scene6, SFX_6 } from "./Scene6";
import { Scene7, SFX_7 } from "./Scene7";
import { Scene8, SFX_8 } from "./Scene8";
import { TL } from "./timeline";

export const TOTAL = TL.total;

const SUB_PALETTE = { bg: "rgba(255, 255, 255, 0.94)", line: L.cardLine, zh: L.ink, en: L.ink2, shadow: L.shadow };

const SFX: Sfx[] = [...SFX_1, ...SFX_2, ...SFX_3, ...SFX_4, ...SFX_5, ...SFX_6, ...SFX_7, ...SFX_8];

export const KMP: React.FC = () => (
  <AbsoluteFill style={{ background: L.paper, overflow: "hidden" }}>
    <PaperBackground />
    <Scene1 />
    <Scene2 />
    <Scene3 />
    <Scene4 />
    <Scene5 />
    <Scene6 />
    <Scene7 />
    <Scene8 />
    <BgmTrack tl={TL} src="bgm/bright-01.wav" level={1.0} envelope={envelope} />
    <SfxTrack list={SFX} />
    <NarrationTrack tl={TL} subtitlePalette={SUB_PALETTE} />
  </AbsoluteFill>
);
