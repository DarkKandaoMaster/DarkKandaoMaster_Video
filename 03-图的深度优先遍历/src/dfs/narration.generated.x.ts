// 配音变体 x 的占位清单：还没跑 `tts.py --engine edge --variant x` 时让 tsc 能过（空数组 = 没有变体）。
// 跑过之后这个文件会被 tts.py 整个覆盖成真正的清单（src 指向 public/<slug>/audio-x/）。
export type Seg = { text: string; t: number };
export type Sub = { text: string; t: number; en?: string };
export type Clip = { id: string; scene: string; speak: string; src: string; seconds: number; frames: number;
  onset: number; end: number; segs: Seg[]; subs: Sub[] };
export const CLIPS: Clip[] = [];
