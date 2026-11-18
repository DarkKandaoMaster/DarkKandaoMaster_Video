// 时间线（帧，30 fps）。旁白按 TTS 实测时长排，空档写在 PLAN 里（“先想一想”的停顿也在这里）。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
// 遍历事件（trace.generated.ts，由 scripts/check_numbers.py 生成）每个事件一个时刻，也都由 p() 推出来。
import { buildTimeline, type Plan } from "../base/timeline";
import { checkBTimes } from "../graph/bfs";
import type { Xf } from "../graph/theme";
import { CLIPS } from "./narration.generated";
import { RUN_ASC } from "./trace.generated";

/** [旁白 id, 与上一条之间的空档帧数]；第一条的空档 = 片头留白。带“想”的是留给观众先猜的停顿 */
export const PLAN: Plan = [
  ["s1a", 36],
  ["s1b", 14],
  ["s1c", 12],
  ["s2a", 44], // 想：该按什么顺序走？
  ["s2b", 14],
  ["s2c", 36], // 想：走一条边能到哪几个？
  ["s2d", 14],
  ["s2e", 12],
  ["s2g", 18],
  ["s2h", 16],
  ["s3a", 30],
  ["s3b", 14],
  ["s3c", 34], // 想：程序怎么排出这个顺序？
  ["s3d", 14],
  ["s3f", 22],
  ["s3g", 14],
  ["s3h", 16],
  ["s3i", 40], // 想：下一个出队的是谁？
  ["s3j", 10],
  ["s3k", 16],
  ["s3l", 12],
  ["s3m", 14],
  ["s3n", 42], // 想：要不要再放一次 v8？
  ["s3o", 18],
  ["s3p", 22],
  ["s3q", 18],
];

/** 第三个参数 = 最后一条旁白之后的片尾帧数 */
export const TL = buildTimeline(CLIPS, PLAN, 96);
export const AT = TL.at;
export const END = TL.end;
export const p = TL.p;

// ---------------------------------------------------------------- 镜头（整张图的平移 + 缩放）
// G4 的画布坐标见 layout.ts（v1 在 (540, 215)，v8 在 (330, 800)）；Xf：屏幕 = 画布·s + (x, y)
export const CAM: Record<string, Xf> = {
  /** 第 1 镜：图居中 */
  full: { x: 376.8, y: -77.6, s: 1.08 },
  /** 第 1 镜慢慢推近一点（不让画面完全静止） */
  full2: { x: 344.4, y: -108, s: 1.14 },
  /** 推近 v1 */
  v1: { x: 150, y: -22.5, s: 1.5 },
  /** 第 0–1 层 */
  l1: { x: 258, y: -39.5, s: 1.3 },
  /** 第 0–2 层 */
  l2: { x: 339, y: -24.5, s: 1.15 },
  /** 图挪到左半边，右边留给标题 / 序列 / 队列 */
  left: { x: 27, y: -1.7, s: 0.95 },
  /** 推近 v5、v8（“要不要再放一次”） */
  v5: { x: -90, y: -277.5, s: 1.25 },
};

export const CAM_KEYS: { to: Xf; from: number; dur: number }[] = [
  { to: CAM.full2, from: p("s1b"), dur: AT.s2a - p("s1b") },
  { to: CAM.v1, from: p("s2a"), dur: 48 },
  { to: CAM.l1, from: p("s2b"), dur: 42 },
  { to: CAM.l2, from: p("s2d"), dur: 42 },
  { to: CAM.full, from: p("s2e") - 6, dur: 40 },
  { to: CAM.left, from: p("s2g", "这就是") - 10, dur: 42 },
  { to: CAM.v5, from: p("s3m"), dur: 40 },
  { to: CAM.left, from: p("s3p") - 8, dur: 40 },
];

// ---------------------------------------------------------------- 第 2 镜：一层层出来（只点亮，不带队列）
// 父顶点照 check_numbers.py 的 BFS 生成树（PARENT_ASC）：v2 v3 ← v1，v4 v5 ← v2，v6 v7 ← v3，v8 ← v4
const d4 = p("s2d", "V四") - 6;
const d7 = p("s2d", "第二层") - 16;
const dStep = (d7 - d4) / 3;
export const LAYER_ITEMS: { v: number; at: number; from?: number }[] = [
  { v: 1, at: p("s2a", "V一自己") + 4 },
  { v: 2, at: p("s2c") - 8, from: 1 },
  { v: 3, at: p("s2c") + 10, from: 1 },
  { v: 4, at: Math.round(d4), from: 2 },
  { v: 5, at: Math.round(d4 + dStep), from: 2 },
  { v: 6, at: Math.round(d4 + 2 * dStep), from: 3 },
  { v: 7, at: Math.round(d7), from: 3 },
  { v: 8, at: p("s2e") + 10, from: 4 },
];
/** 第 k 层的层带出现的时刻 */
export const LAYER_BOX = [p("s2a", "算第零层"), p("s2c", "这是第一层"), p("s2d", "第二层"), p("s2e", "第三层")];

// ---------------------------------------------------------------- 第 3 镜：队列走一遍（#00–#27，对照 check_numbers.py 第 1 节“先挑编号小的”）
const restFrom = p("s3p") + 26;
export const T_ASC: (number | null)[] = [
  p("s3f") + 14, //                 #00 起点 v1：标记、入队
  p("s3f", "V一出队") + 2, //       #01 v1 出队
  p("s3f", "邻居") + 4, //          #02 v2 入队
  p("s3f", "V三入队"), //           #03 v3 入队
  p("s3g") + 2, //                  #04 v2 出队
  p("s3g", "V一来过了") + 4, //     #05 v2 看 v1
  p("s3g", "V四") - 6, //           #06 v4 入队
  p("s3g", "V五入队") - 6, //       #07 v5 入队
  p("s3k") + 2, //                  #08 v3 出队
  p("s3k") + 16, //                 #09 v3 看 v1
  p("s3k", "V六") - 4, //           #10 v6 入队
  p("s3k", "V七入队") - 4, //       #11 v7 入队
  p("s3l") + 2, //                  #12 v4 出队
  p("s3l") + 14, //                 #13 v4 看 v2
  p("s3l", "V八入队") - 6, //       #14 v8 入队
  p("s3m") + 14, //                 #15 v5 出队
  p("s3m") + 34, //                 #16 v5 看 v2
  p("s3m", "它也连着") + 14, //     #17 v5 看 v8（入队时已标记）
  restFrom, //                      #18 v6 出队
  restFrom + 8, //                  #19 v6 看 v3
  restFrom + 16, //                 #20 v6 看 v7
  p("s3p", "V七"), //               #21 v7 出队
  p("s3p", "V七") + 8, //           #22 v7 看 v3
  p("s3p", "V七") + 16, //          #23 v7 看 v6
  p("s3p", "V八"), //               #24 v8 出队
  p("s3p", "V八") + 8, //           #25 v8 看 v4
  p("s3p", "V八") + 16, //          #26 v8 看 v5
  p("s3p", "队列空了"), //          #27 队空，结束
];
checkBTimes(RUN_ASC, T_ASC, "RUN_ASC");
/** 入队时边从 u 描向 w 的帧数 */
export const MOVE = 12;

// ---------------------------------------------------------------- 其他关键时刻
const h4 = p("s3h", "V四");
const hQ = p("s3h", "下一个");
export const K = {
  // 第 1 镜
  graphIn: p("s1a") - 4,
  ringV1: p("s1a", "从V一"),
  ringV1Off: p("s2a", "V一自己") + 6,
  // 第 2 镜
  hint1: p("s2b") + 6,
  hint1Off: p("s2c") + 4,
  ripple: p("s2g", "像水波"),
  title: p("s2g", "这就是") + 14,
  titleBfs: p("s2g", "BFS"),
  titleOut: p("s2h") - 6,
  rowFly: p("s2h"),
  rowBoxes: p("s2h", "访问顺序"),
  // 第 3 镜
  reset0: p("s3a"),
  fogA: p("s3a", "它每次"),
  look: p("s3a", "看它连着谁"),
  ask: p("s3b"),
  morph: p("s3c"),
  qLabels: p("s3c", "先进队的"),
  fogAOff: p("s3c"),
  rule: p("s3d", "出队一个"),
  ruleB: p("s3d", "把它"),
  ruleOff: p("s3h"),
  qPulse: [h4 - 14, h4 + 2, Math.round((h4 + hQ) / 2) + 4] as number[],
  qAsk: hQ,
  qAskOff: p("s3i") + 4,
  v3First: p("s3i"),
  br1: p("s3j") + 6,
  br2: p("s3j") + 18,
  br1Pulse: p("s3j", "所以"),
  brOff: (T_ASC[8] as number) - 2,
  layer2: p("s3k", "队里"),
  layer2Off: (T_ASC[12] as number) - 2,
  fogM: p("s3m") + 4,
  edge58: p("s3m", "它也连着") + 14,
  v8Wait: p("s3m", "这时"),
  slotAsk: p("s3m", "要不要"),
  slotAskOff: p("s3n") + 2,
  marked: p("s3n") + 10,
  markedOff: p("s3o") + 4,
  wrongIf: p("s3o"),
  ghostIn: p("s3o", "V五会把") + 20,
  ghostOut: p("s3o", "所以"),
  markEnq: p("s3o", "所以"),
  fogMOff: p("s3p") - 8,
  qOut: p("s3q") - 12,
  finalRow: p("s3q"),
  finalBoxes: p("s3q") + 34,
};
