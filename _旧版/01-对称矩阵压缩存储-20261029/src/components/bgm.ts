// BGM 闪避：旁白期间压到 duck（默认 0.20，约 -14 dB），旁白间隙平滑回到最多 gap（0.38，只在空档较长时明显抬起，
// 避免"抽吸"），第一条旁白之前和最后一条旁白结束后 edge（0.50），开头 8 帧淡入、结尾 24 帧淡出。
import { progress } from "../base/anim";

/** speech：每条旁白占用的帧区间 [起, 止]（一般前后各留 4 帧） */
export const duckedVolume = (
  speech: ReadonlyArray<readonly [number, number]>,
  o: { introUntil: number; outroFrom: number; total: number; duck?: number; gap?: number; edge?: number },
) => {
  const duck = o.duck ?? 0.2;
  const gap = o.gap ?? 0.38;
  const edge = o.edge ?? 0.5;
  return (f: number) => {
    let d = Infinity;
    for (const [a, b] of speech) {
      if (f >= a && f <= b) {
        d = 0;
        break;
      }
      d = Math.min(d, f < a ? a - f : f - b);
    }
    const k = Math.min(1, Math.max(0, (d - 2) / 14));
    const smooth = k * k * (3 - 2 * k);
    const endBoost = progress(f, o.outroFrom, 14);
    const base = duck + (gap - duck) * smooth;
    const lvl = Math.max(base, f < o.introUntil ? edge : 0, edge * endBoost);
    const fadeIn = progress(f, 0, 8);
    const fadeOut = 1 - progress(f, o.total - 24, 24);
    return lvl * fadeIn * fadeOut;
  };
};
