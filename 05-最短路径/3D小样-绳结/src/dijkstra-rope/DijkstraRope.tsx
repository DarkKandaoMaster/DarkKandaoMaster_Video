// Dijkstra 绳结模型 · 3D 小样（不配音）。
// 两层：下面 ThreeCanvas 画 3D（桌面 / 珠子 / 绳子 / 提环 / 卷尺），上面普通 HTML 画所有数字、名字、表格、字幕。
import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, interpolate, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { fadeInOut } from "../base/anim";
import { Hud } from "./Hud";
import { COL, Scene3D } from "./Scene3D";
import { LOCK_FRAME, T } from "./timeline";
import { useCurrentFrame } from "remotion";

export const TOTAL = T.total;

const SFX: Array<{ at: number; src: string; vol: number }> = [
  { at: T.hookOn, src: "snap", vol: 0.16 },
  ...LOCK_FRAME.map((at) => ({ at: Math.round(at), src: "pop", vol: 0.15 })),
  { at: T.conclude, src: "ding", vol: 0.12 },
];

const Fade: React.FC = () => {
  const f = useCurrentFrame();
  const a = 1 - fadeInOut(f, 0, T.total, 12, 16);
  return <AbsoluteFill style={{ background: COL.bg, opacity: a, pointerEvents: "none" }} />;
};

export const DijkstraRope: React.FC = () => (
  <AbsoluteFill style={{ background: COL.bg, overflow: "hidden" }}>
    <ThreeCanvas width={1920} height={1080} shadows flat gl={{ antialias: true }}>
      <Scene3D />
    </ThreeCanvas>
    <Hud />
    <Fade />
    <Audio
      src={staticFile("bgm/calm-01.wav")}
      volume={(f) => 0.32 * interpolate(f, [0, 30, T.total - 50, T.total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
    {SFX.map((s, i) => (
      <Sequence key={i} from={s.at} durationInFrames={45}>
        <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={s.vol} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
