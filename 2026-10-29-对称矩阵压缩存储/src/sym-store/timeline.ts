// 时间线（帧，30 fps）。旁白按 TTS 实测时长排，空档写在 PLAN 里。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
import { buildTimeline, type Plan } from "../base/timeline";
import { CLIPS } from "./narration.generated";

/** [旁白 id, 与上一条之间的空档帧数]；第一条的空档 = 片头留白 */
export const PLAN: Plan = [
  ["s1a", 15],
  ["s2a", 10],
  ["s3a", 14],
  ["s3b", 6],
  ["s4a", 20],
  ["s4b", 8],
  ["s4c", 8],
  ["s5a", 20],
  ["s5b", 6],
  ["s6a", 18],
  ["s6b", 12],
  ["s6c", 10],
  ["s6d", 8],
  ["s6e", 8],
  ["s7a", 20],
  ["s7b", 66],
];

/** 第三个参数 = 最后一条旁白之后的片尾帧数 */
export const TL = buildTimeline(CLIPS, PLAN, 84);
export const AT = TL.at;
export const p = TL.p;
