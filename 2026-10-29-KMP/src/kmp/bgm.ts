// BGM 额外包络（乘在 components/bgm.ts 的闪避音量上）：脚本.md「BGM 提示表」里默认闪避做不到的几处。
// 断点全部用 p() 取，重新配音后跟着走。
//   - s1a "错了！"：3 帧压到 0（唱片急停），一直静到 s1c "KMP"，8 帧淡回；
//   - s6b "又摔一次"：3 帧压到一半（闪避电平 0.16 → 0.08）约 0.5 s，再 8 帧回来（"翻车"）；
//   - 第 4、7 镜（手推）：整体再乘 0.8（给手推留安静感），镜头交界处 15 帧过渡。
// 其余（片头 edge、s5b 找到后的空档、小题倒计时抬到 gap、片尾 edge + 最后 24 帧淡出）都是默认闪避行为。
import { progress } from "../base/anim";
import { SCENES, p } from "./timeline";

const LINEAR = (t: number) => t;

export const BGM_POINTS = {
  stop: p("s1a", "错了"),
  back: p("s1c", "KMP"),
  trip: p("s6b", "又摔一次"),
  hand4: SCENES[3],
  hand7: SCENES[6],
};

const TRIP_HOLD = 15; // 0.5 s
const TRIP_LEVEL = 0.5;
const HAND_LEVEL = 0.8;
const HAND_RAMP = 15;

/** 一段 [from, from+dur) 内乘 level，两头各 ramp 帧过渡 */
const dip = (f: number, from: number, to: number, level: number, rampIn: number, rampOut: number): number => {
  const w = Math.min(progress(f, from, rampIn, LINEAR), 1 - progress(f, to, rampOut, LINEAR));
  return 1 - (1 - level) * w;
};

export const envelope = (f: number): number => {
  const { stop, back, trip, hand4, hand7 } = BGM_POINTS;
  // 急停：stop 起 3 帧到 0；back 起 8 帧回到 1
  const halt = f < back ? 1 - progress(f, stop, 3, LINEAR) : progress(f, back, 8, LINEAR);
  const flop = dip(f, trip, trip + 3 + TRIP_HOLD, TRIP_LEVEL, 3, 8);
  const quiet4 = dip(f, hand4.from, hand4.from + hand4.dur, HAND_LEVEL, HAND_RAMP, HAND_RAMP);
  const quiet7 = dip(f, hand7.from, hand7.from + hand7.dur, HAND_LEVEL, HAND_RAMP, HAND_RAMP);
  return halt * flop * quiet4 * quiet7;
};
