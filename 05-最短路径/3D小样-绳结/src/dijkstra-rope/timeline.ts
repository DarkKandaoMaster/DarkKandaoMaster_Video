// 时间线（30 fps，不配音，所以直接写帧号）。所有动画都是帧号的纯函数。
import { Easing, interpolate } from "remotion";
import { keyframes } from "../base/anim";
import { DIST, H_END, ORDER } from "./kinematics";

export const FPS = 30;
export const T = {
  intro: 0, // 俯视桌面
  hookDown: 140, // 提环落下来
  hookOn: 196, // 扣住源点
  liftStart: 210,
  liftEnd: 735, // H 到 H_END
  side: 640, // 镜头开始转到侧视
  sideDone: 790,
  conclude: 790, // 结论
  conclude2: 870,
  total: 990,
};

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 提升高度 H（权值单位）：两头缓、中间匀速 */
export const heightAt = (f: number): number =>
  interpolate(f, [T.liftStart, T.liftEnd], [0, H_END], { ...CLAMP, easing: Easing.bezier(0.3, 0, 0.75, 1) });

/** H 第一次达到 h 的帧（小数帧，二分） */
export const frameOfHeight = (h: number): number => {
  if (h <= 0) return T.liftStart;
  let lo = T.liftStart;
  let hi = T.liftEnd;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (heightAt(m) < h) lo = m;
    else hi = m;
  }
  return hi;
};

/** 每个顶点被锁定（离开桌面）的帧，按顶点下标 */
export const LOCK_FRAME: number[] = DIST.map((d) => (d === 0 ? T.liftStart : frameOfHeight(d)));
/** 第 k 个被锁定的顶点 */
export const LOCK_SEQ = ORDER.map((v) => ({ v, at: LOCK_FRAME[v] }));

// ───────────────────────── 镜头 ─────────────────────────
// 球坐标：看向 (tx, ty, tz)，方位角 az（0 = 从 +z 正面看，正值往右转），仰角 el，距离 dist，视场角 fov
export type Cam = { tx: number; ty: number; tz: number; az: number; el: number; dist: number; fov: number; cx: number };
const CAM0: Cam = { tx: 0.85, ty: 0.1, tz: 1.1, az: -30, el: 50, dist: 9.4, fov: 32, cx: 700 };
const CAM_KEYS = [
  { fromFrame: 0, toFrame: 200, az: -16, el: 46, dist: 9.0, easing: Easing.bezier(0.33, 0, 0.67, 1) },
  { fromFrame: 200, toFrame: 470, tx: 1.0, ty: 1.05, tz: 0.8, az: -6, el: 30, dist: 11.6 },
  { fromFrame: 470, toFrame: T.side, tx: 0.5, ty: 2.9, tz: 0.6, az: 4, el: 18, dist: 14.4 },
  { fromFrame: T.side, toFrame: T.sideDone, tx: -0.25, ty: 3.15, tz: 0.1, az: 12, el: 5, dist: 15.6, fov: 30, cx: 700 },
];
export const camAt = (f: number): Cam => keyframes(f, CAM0, CAM_KEYS);

export const camPosition = (c: Cam): [number, number, number] => {
  const az = (c.az * Math.PI) / 180;
  const el = (c.el * Math.PI) / 180;
  return [
    c.tx + c.dist * Math.cos(el) * Math.sin(az),
    c.ty + c.dist * Math.sin(el),
    c.tz + c.dist * Math.cos(el) * Math.cos(az),
  ];
};
