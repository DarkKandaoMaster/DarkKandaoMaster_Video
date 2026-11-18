// 时间线（帧，30 fps）。旁白按 TTS 实测时长排，空档写在 PLAN 里。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
import { buildTimeline, type Plan } from "../base/timeline";
import { CLIPS as CLIPS_MAIN } from "./narration.generated";
import { CLIPS as CLIPS_N } from "./narration.generated.n";

// 配音变体：不设 REMOTION_VARIANT = 主版本（旧克隆音色，.env 的 MINIMAX_VOICE_ID）。
// REMOTION_VARIANT=n（pnpm render:n / dev:n 经 variant-n.env 设）= 新克隆音色 DarkKandaoMaster_voice 那套
// （tts.py --engine minimax --voice-id DarkKandaoMaster_voice --speed 1.1 --variant n 生成的 narration.generated.n.ts + audio-n/）。
// Remotion 把 REMOTION_ 前缀的环境变量和 --env-file 里的变量放进浏览器端的 process.env。
declare const process: { env: Record<string, string | undefined> };
export const VARIANT = process.env.REMOTION_VARIANT ?? "";
if (VARIANT === "n" && CLIPS_N.length === 0) throw new Error("REMOTION_VARIANT=n，但 narration.generated.n.ts 是空的：先跑 tts.py --voice-id DarkKandaoMaster_voice --speed 1.1 --variant n");
if (VARIANT !== "" && VARIANT !== "n") throw new Error(`未知的 REMOTION_VARIANT=${VARIANT}`);
const CLIPS = VARIANT === "n" ? CLIPS_N : CLIPS_MAIN;

/** [旁白 id, 与上一条之间的空档帧数]；第一条的空档 = 片头留白。标"想"的是问句后的停顿 */
export const PLAN: Plan = [
  ["s1", 24],
  ["s2", 18],
  ["s3", 15],
  ["s4a", 18],
  ["s4b", 27], // 想：a43 存在哪儿？
  ["s4c", 12],
  ["s4d", 15],
  ["s5a", 21],
  ["s5b", 12],
  ["s5c", 10],
  ["s6a", 21],
  ["s6b", 12],
  ["s7", 24],
  ["s8", 15],
  ["s9a", 21],
  ["s9b", 10],
  ["s9c", 15],
  ["s10", 24],
  ["s11", 75], // 想：小题 a52 的 k 是几？停 2.5 s，画面安静，只有一条缩短的细线
];

/** 第三个参数 = 最后一条旁白之后的片尾帧数 */
export const TL = buildTimeline(CLIPS, PLAN, 75);
export const AT = TL.at;
export const END = TL.end;
export const p = TL.p;

// ───────────────────────── 关键时刻（全部由旁白推出来） ─────────────────────────
export const K = {
  // 1 片头
  titleIn: AT.s1 - 10,
  titleOut: AT.s2 - 2,
  // 2 只存一半
  matIn: p("s2") - 4,
  diag: p("s2") + 22,
  pairs: p("s2") + 52,
  pairsOff: p("s2", "a i j") + 6,
  symEq: p("s2", "a i j"),
  half: p("s2", "所以"),
  // 3 按行存下三角
  heading: p("s3") + 4,
  sweep: p("s3", "也就是") + 6,
  toArray: p("s3", "一行接一行") - 8,
  fly: p("s3", "一行接一行") + 8,
  index: p("s3", "下标"),
  valuesOff: AT.s4a - 4,
  // 4 数出 a43
  ask43: p("s4a") + 8,
  push: p("s4b") - 4,
  row1: p("s4c", "二") - 12,
  row2: p("s4c", "二") + 2,
  row3: p("s4c", "三个") + 2,
  sum6: p("s4c", "一共"),
  a41: p("s4c", "本行左边") + 30,
  a42: p("s4c", "a 四 二") - 2,
  left2: p("s4c", "a 四 二") + 14,
  front8: p("s4d") + 2,
  pull8: p("s4d", "所以") - 6,
  k8: p("s4d", "所以") + 30,
  // 5 下三角公式
  gen: AT.s5a - 8,
  genLabel: p("s5a") + 8,
  rowsL: p("s5b") + 4,
  sumL: p("s5b") + 46,
  halfL: p("s5b", "也就是"),
  leftL: p("s5c") + 4,
  fmlL: p("s5c", "所以"),
  // 6 i<j 交换
  only: AT.s6a - 6,
  stairL: p("s6a") + 10,
  ghost34: p("s6b") + 4,
  arc34: p("s6b", "但它和"),
  eq34: p("s6b", "但它和") + 22,
  ltj: p("s6b", "所以"),
  swapL: p("s6b", "把 i"),
  // 7 按行存上三角
  upper: AT.s7 - 6,
  flip: p("s7") + 18,
  rowN: p("s7", "第一行"),
  rowsLess: p("s7", "往下"),
  // 8 数出 a34
  ex34: AT.s8 - 4,
  n5: p("s8") + 8,
  ask34: p("s8") + 36,
  up5: p("s8", "上面") + 24,
  up4: p("s8", "上面") + 44,
  a33: p("s8", "本行") + 16,
  left1: p("s8", "左边"),
  pull10: p("s8", "所以") - 6,
  k10: p("s8", "所以") + 22,
  // 9 上三角公式
  genU: AT.s9a - 8,
  genULabel: p("s9a") + 8,
  rowsU: p("s9a", "上面") + 8,
  sumU: p("s9a", "上面") + 20,
  cntN: p("s9a", "上面") + 46,
  cntN2: p("s9a", "上面") + 82,
  arith: p("s9b") + 40,
  leftU: p("s9b", "本行") + 4,
  fmlU: p("s9b", "加起来"),
  gtj: p("s9c"),
  arc43: p("s9c", "同样"),
  // 10 小题
  quiz: AT.s10 - 8,
  quizCap: p("s10", "五阶"),
  ask52: p("s10", "a 五 二"),
  waitFrom: END.s10 + 6,
  waitTo: AT.s11,
  // 11 答案
  ans: p("s11") + 24,
  arc52: p("s11", "先换成") + 8,
  a25: p("s11", "先换成") + 26,
  up5b: p("s11", "上面") + 10,
  left3: p("s11", "左边") + 8,
  eq8: p("s11", "一共") + 12,
};
