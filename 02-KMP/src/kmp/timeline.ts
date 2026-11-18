// 时间线（帧，30 fps）。旁白按 TTS 实测时长排（speed 1.1），空档写在 PLAN 里。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
// 空档约定：片头 15 帧（0.5 s），条间 9 帧（0.3 s）；s8a 后 + 小题倒计时 90 帧；片尾 75 帧（2.5 s）。
// 脚本里"画面可能比旁白多停 1～2 秒"的三处先各多留 30 帧（HOLD），做动画时再调：
//   s1c 之前（第 1 镜拽回去）、s4d 之前（第 4 镜 j = 6 的滑动）、s5b 之前（第 5 镜 #4～#8 连续比较）。
import { buildTimeline, type Plan } from "../base/timeline";
import { CLIPS } from "./narration.generated";

export const COUNTDOWN = 90; // 小题倒计时 3 s
export const TAIL = 75; // 片尾 2.5 s

/** [旁白 id, 与上一条之间的空档帧数]；第一条的空档 = 片头留白 */
export const PLAN: Plan = [
  ["s1a", 15],
  ["s1b", 9],
  ["s1c", 29],
  ["s2a", 9],
  ["s2b", 9],
  ["s2c", 9],
  ["s2d", 9],
  ["s3a", 9],
  ["s3b", 9],
  ["s4a", 9],
  ["s4b", 9],
  ["s4c", 9],
  ["s4d", 39],
  ["s5a", 30],
  ["s5b", 39],
  ["s5c", 9],
  ["s6a", 9],
  ["s6b", 9],
  ["s6c", 9],
  ["s7a", 30],
  ["s7b", 9],
  ["s7c", 9],
  ["s8a", 9],
  ["s8b", 99],
];
// 上面的数字必须写字面量：_tools/print_timeline.py 用正则读 PLAN。

/** 第三个参数 = 最后一条旁白之后的片尾帧数（字面量，print_timeline.py 要读） */
export const TL = buildTimeline(CLIPS, PLAN, 75);
export const AT = TL.at;
export const END = TL.end;

/**
 * 分句切点修正（秒，相对该条旁白开始）：tts.py 按标点找能量低谷切分句，个别地方 TTS 没停顿、切点不准
 * （scripts/check_splits.py 标 CHECK 的），这里手工给值，p() 优先用它。
 * - s1a "错了"：TTS 把"第六个，错了！"连着读，自动切点落在 5.26 s（语音已结束）；看包络"错"约在 4.74 s 起音。
 * - s6b "又摔一次"：在分句"在同一个坑里又摔一次。"中间，按字数比例估约 4.2 s。
 * 两处都要在 Studio 里听一下再微调。
 */
const FIX: Record<string, Record<string, number>> = {
  s1a: { 错了: 4.74 },
  s6b: { 又摔一次: 4.2 },
};

/** 某条旁白里从 substr 所在分句开始的绝对帧；substr 省略 = 旁白开始（先查 FIX） */
export const p = (id: string, substr?: string): number => {
  const fix = substr !== undefined ? FIX[id]?.[substr] : undefined;
  if (fix !== undefined) return AT[id] + Math.round(fix * 30);
  return TL.p(id, substr);
};

/** 每一镜的起止帧（第 1 镜从 0 起；每镜到下一镜第一条旁白开始为止；第 8 镜到全片结束） */
export const SCENE_FIRST = ["s1a", "s2a", "s3a", "s4a", "s5a", "s6a", "s7a", "s8a"] as const;
export const SCENES = SCENE_FIRST.map((id, k) => {
  const from = k === 0 ? 0 : AT[id];
  const to = k === SCENE_FIRST.length - 1 ? TL.total : AT[SCENE_FIRST[k + 1]];
  return { no: k + 1, from, dur: to - from };
});
