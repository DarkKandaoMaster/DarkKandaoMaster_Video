// 时间线（帧，30 fps）。旁白按 TTS 实测时长排，空档写在 PLAN 里。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
import { buildTimeline, type Plan } from "../base/timeline";
import { CLIPS as CLIPS_MAIN } from "./narration.generated";
import { CLIPS as CLIPS_X } from "./narration.generated.x";
import { CLIPS as CLIPS_M } from "./narration.generated.m";
import { CLIPS as CLIPS_N } from "./narration.generated.n";

// 配音变体：渲染 / 预览时设 REMOTION_VARIANT=x（pnpm render:x / dev:x 经 variant-x.env 设）就用 Edge TTS 那套旁白
// （tts.py --engine edge --variant x 生成的 narration.generated.x.ts + public/<slug>/audio-x/）；不设 = 主版本（B 站版）。
// REMOTION_VARIANT=m（pnpm render:m / dev:m 经 variant-m.env 设）= MiniMax 系统音色 presenter_male 那套
// （tts.py --engine minimax --voice-id presenter_male --speed 1.1 --variant m 生成的 narration.generated.m.ts + audio-m/）。
// REMOTION_VARIANT=n（pnpm render:n / dev:n 经 variant-n.env 设）= 2026-11-06 重录克隆的新音色 DarkKandaoMaster_voice 那套
// （tts.py --engine minimax --voice-id DarkKandaoMaster_voice --speed 1.1 --variant n 生成的 narration.generated.n.ts + audio-n/）。
// Remotion 把 REMOTION_ 前缀的环境变量和 --env-file 里的变量放进浏览器端的 process.env。
declare const process: { env: Record<string, string | undefined> };
export const VARIANT = process.env.REMOTION_VARIANT ?? "";
if (VARIANT === "x" && CLIPS_X.length === 0) throw new Error("REMOTION_VARIANT=x，但 narration.generated.x.ts 是空的：先跑 tts.py --variant x");
if (VARIANT === "m" && CLIPS_M.length === 0) throw new Error("REMOTION_VARIANT=m，但 narration.generated.m.ts 是空的：先跑 tts.py --voice-id presenter_male --speed 1.1 --variant m");
if (VARIANT === "n" && CLIPS_N.length === 0) throw new Error("REMOTION_VARIANT=n，但 narration.generated.n.ts 是空的：先跑 tts.py --voice-id DarkKandaoMaster_voice --speed 1.1 --variant n");
if (VARIANT !== "" && VARIANT !== "x" && VARIANT !== "m" && VARIANT !== "n") throw new Error(`未知的 REMOTION_VARIANT=${VARIANT}`);
const CLIPS = VARIANT === "x" ? CLIPS_X : VARIANT === "m" ? CLIPS_M : VARIANT === "n" ? CLIPS_N : CLIPS_MAIN;

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
