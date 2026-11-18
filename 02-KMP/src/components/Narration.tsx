// 旁白 + 字幕 + BGM（闪避）+ 音效：任何一条视频都用这一套，传时间线进来即可。
import React from "react";
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import type { Timeline } from "../base/timeline";
import { duckedVolume } from "./bgm";
import { BilingualSubtitle, type SubtitlePalette } from "./BilingualSubtitle";
import { Subtitle } from "./Subtitle";

export type Sfx = { at: number; src: string; vol: number };

/** subtitlePalette 给了就用双语字幕（中文 + 可选英文行，配色按传入的来）；不给 = 原来的中文字幕 */
export const NarrationTrack: React.FC<{ tl: Timeline; showSubs?: boolean; subtitlePalette?: SubtitlePalette }> = ({
  tl,
  showSubs = true,
  subtitlePalette,
}) => (
  <>
    {tl.order.map((id) => {
      const c = tl.clips[id];
      const speechFrames = Math.ceil(c.end * 30);
      return (
        <Sequence key={id} from={tl.at[id]} durationInFrames={c.frames + 12} name={`旁白 ${id}`}>
          <Audio src={staticFile(c.src)} />
          {!showSubs ? null : subtitlePalette ? (
            <BilingualSubtitle cues={c.subs} speechFrames={speechFrames} tail={8} palette={subtitlePalette} />
          ) : (
            <Subtitle cues={c.subs} speechFrames={speechFrames} tail={8} />
          )}
        </Sequence>
      );
    })}
  </>
);

/** envelope：可选的额外包络（按帧乘在闪避音量上，KMP 起新增：急停、翻车、分段再压低） */
export const BgmTrack: React.FC<{ tl: Timeline; src: string; level?: number; envelope?: (f: number) => number }> = ({
  tl,
  src,
  level = 0.55,
  envelope,
}) => {
  const first = tl.speech[0]?.[0] ?? 0;
  const last = tl.speech[tl.speech.length - 1]?.[1] ?? tl.total;
  const vol = duckedVolume(tl.speech, { introUntil: first, outroFrom: last, total: tl.total, duck: 0.16, gap: 0.3, edge: 0.42 });
  return <Audio src={staticFile(src)} volume={(f) => vol(f) * level * (envelope ? envelope(f) : 1)} />;
};

export const SfxTrack: React.FC<{ list: Sfx[] }> = ({ list }) => (
  <>
    {list.map((s, i) => (
      <Sequence key={`sfx${i}`} from={Math.max(0, Math.round(s.at))} durationInFrames={45} name={`音效 ${s.src}`}>
        <Audio src={staticFile(`sfx/${s.src}.wav`)} volume={s.vol} />
      </Sequence>
    ))}
  </>
);
