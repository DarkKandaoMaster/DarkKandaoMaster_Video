// 动画小工具：全部是 frame 的纯函数，不依赖时钟 / CSS 动画。
import { Easing, interpolate } from "remotion";
import { VIDEO } from "./theme";

/** 元素入场：快进慢出（整部片统一用这一条曲线） */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** 元素离场：慢进快出 */
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);
/** 镜头推拉 / 大块位移：两头都缓 */
export const EASE_CAMERA = Easing.bezier(0.45, 0, 0.15, 1);

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 秒 → 帧（四舍五入） */
export const sec = (s: number, fps: number = VIDEO.fps): number => Math.round(s * fps);

/** 0→1 进度：[start, start+dur] 区间内按 easing 走完 */
export const progress = (
  frame: number,
  start: number,
  dur: number,
  easing: (t: number) => number = EASE_OUT,
): number => interpolate(frame, [start, start + Math.max(1, dur)], [0, 1], { ...CLAMP, easing });

/** 淡入：start 起 dur 帧内 0→1 */
export const fadeIn = (frame: number, start = 0, dur = 14): number => progress(frame, start, dur);

/** 淡出：在 end 帧时恰好为 0（从 end-dur 开始） */
export const fadeOut = (frame: number, end: number, dur = 12): number =>
  1 - progress(frame, end - dur, dur, EASE_IN);

/** 淡入 + 淡出：[start, end) 可见 */
export const fadeInOut = (frame: number, start: number, end: number, inDur = 14, outDur = 12): number =>
  Math.min(fadeIn(frame, start, inDur), fadeOut(frame, end, outDur));

/** 入场上浮位移（px）：从 dist 回到 0 */
export const rise = (frame: number, start = 0, dur = 22, dist = 24): number =>
  (1 - progress(frame, start, dur)) * dist;

/** 错峰：第 i 个元素的起始帧 */
export const stagger = (i: number, base = 0, step = 4): number => base + i * step;

/** 两值之间按进度插值 */
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * 关键帧式插值：从 initial 出发，依次过渡到每个 key（在 [fromFrame, toFrame] 内）。
 * 两个 key 之间保持上一个 key 的值。Footage 的推拉与画框移动都用它。
 */
export type Keyframe<T> = T & {
  fromFrame: number;
  toFrame: number;
  easing?: (t: number) => number;
};

export const keyframes = <T extends { [K in keyof T]: number }>(
  frame: number,
  initial: T,
  keys: ReadonlyArray<Keyframe<Partial<T>>> | undefined,
  defaultEasing: (t: number) => number = EASE_CAMERA,
): T => {
  const state: Record<string, number> = { ...(initial as Record<string, number>) };
  for (const k of keys ?? []) {
    if (frame < k.fromFrame) break;
    const t = progress(frame, k.fromFrame, k.toFrame - k.fromFrame, k.easing ?? defaultEasing);
    for (const name of Object.keys(initial)) {
      const target = (k as Record<string, unknown>)[name];
      if (typeof target === "number") state[name] = mix(state[name], target, t);
    }
  }
  return state as T;
};
