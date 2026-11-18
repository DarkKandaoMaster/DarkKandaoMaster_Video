// 旁白驱动的时间线：按 TTS 实测时长把每条旁白排在帧轴上，画面动画都挂在旁白（或旁白里的分句）上。
import { VIDEO } from "./theme";

export type Seg = { text: string; t: number };
/** 字幕：en 是可选的英文行（双语字幕用；只有中文的视频不写） */
export type Sub = { text: string; t: number; en?: string };
export type Clip = {
  id: string;
  scene: string;
  speak: string;
  src: string;
  seconds: number;
  frames: number;
  onset: number;
  end: number;
  segs: Seg[];
  subs: Sub[];
};

/** plan：按播放顺序 [旁白 id, 与上一条之间的空档帧数]（第一条的空档 = 片头留白） */
export type Plan = ReadonlyArray<readonly [string, number]>;

export type Timeline = {
  /** 旁白开始帧 */
  at: Record<string, number>;
  /** 旁白结束帧（按实测语音结束） */
  end: Record<string, number>;
  clips: Record<string, Clip>;
  order: string[];
  total: number;
  /** 某条旁白里从 substr 所在分句开始的绝对帧；substr 省略 = 旁白开始 */
  p: (id: string, substr?: string) => number;
  /** 所有旁白占用的帧区间，给 BGM 闪避用 */
  speech: Array<[number, number]>;
};

export const buildTimeline = (all: Clip[], plan: Plan, tailFrames: number): Timeline => {
  const clips: Record<string, Clip> = {};
  for (const c of all) clips[c.id] = c;
  const at: Record<string, number> = {};
  const end: Record<string, number> = {};
  let cursor = 0;
  for (const [id, gap] of plan) {
    const c = clips[id];
    if (!c) throw new Error(`时间线里的旁白 ${id} 不在清单里`);
    at[id] = cursor + gap;
    end[id] = at[id] + Math.ceil(c.end * VIDEO.fps);
    cursor = at[id] + c.frames;
  }
  const order = plan.map(([id]) => id);
  const p = (id: string, substr?: string): number => {
    const c = clips[id];
    if (!substr) return at[id] + Math.round(c.onset * VIDEO.fps);
    const pos = c.speak.indexOf(substr);
    if (pos < 0) throw new Error(`旁白 ${id} 里没有 ${substr}`);
    let acc = 0;
    let t = c.segs[0].t;
    for (const s of c.segs) {
      if (acc <= pos) t = s.t;
      acc += s.text.length;
    }
    return at[id] + Math.round(t * VIDEO.fps);
  };
  const speech = order.map((id) => [at[id] + Math.round(clips[id].onset * VIDEO.fps) - 4, end[id] + 4] as [number, number]);
  return { at, end, clips, order, total: cursor + tailFrames, p, speech };
};
