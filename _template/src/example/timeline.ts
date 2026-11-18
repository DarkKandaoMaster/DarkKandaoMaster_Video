// 示例时间线（帧，30 fps）。旁白按 TTS 实测时长排，空档写在 PLAN 里。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
import { buildTimeline, type Plan } from "../base/timeline";
import { CLIPS as CLIPS_MAIN } from "./narration.generated";
import { CLIPS as CLIPS_X } from "./narration.generated.x";

// 配音变体：渲染 / 预览时设 REMOTION_VARIANT=x（pnpm render:x / dev:x 经 variant-x.env 设）就用 Edge TTS 那套旁白
// （tts.py --engine edge --variant x 生成的 narration.generated.x.ts + public/<slug>/audio-x/）；不设 = 主版本。
// Remotion 把 REMOTION_ 前缀的环境变量和 --env-file 里的变量放进浏览器端的 process.env。
// 没有变体时 narration.generated.x.ts 是导出空数组的占位文件。
declare const process: { env: Record<string, string | undefined> };
export const VARIANT = process.env.REMOTION_VARIANT ?? "";
if (VARIANT === "x" && CLIPS_X.length === 0) throw new Error("REMOTION_VARIANT=x，但 narration.generated.x.ts 是空的：先跑 tts.py --variant x");
if (VARIANT !== "" && VARIANT !== "x") throw new Error(`未知的 REMOTION_VARIANT=${VARIANT}`);
const CLIPS = VARIANT === "x" ? CLIPS_X : CLIPS_MAIN;

/** [旁白 id, 与上一条之间的空档帧数]；第一条的空档 = 片头留白 */
export const PLAN: Plan = [["s1a", 20]];

/** 第三个参数 = 最后一条旁白之后的片尾帧数 */
export const TL = buildTimeline(CLIPS, PLAN, 40);
export const AT = TL.at;
export const p = TL.p;
