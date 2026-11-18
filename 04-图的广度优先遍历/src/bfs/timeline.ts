// 时间线（帧，30 fps）。旁白按 TTS 实测时长排，空档写在 PLAN 里。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
// 遍历事件（trace.generated.ts，由 scripts/check_numbers.py 生成）每个事件一个时刻，也都由 p() 推出来。
import { buildTimeline, type Plan } from "../base/timeline";
import { checkBTimes } from "../graph/bfs";
import { CLIPS as CLIPS_MAIN } from "./narration.generated";
import { CLIPS as CLIPS_X } from "./narration.generated.x";
import { G6_CALLS, RUN_ASC, RUN_DESC, RUN_LIST } from "./trace.generated";

declare const process: { env: Record<string, string | undefined> };
export const VARIANT = process.env.REMOTION_VARIANT ?? "";
if (VARIANT === "x" && CLIPS_X.length === 0) throw new Error("REMOTION_VARIANT=x，但 narration.generated.x.ts 是空的：先跑 tts.py --variant x");
if (VARIANT !== "" && VARIANT !== "x") throw new Error(`未知的 REMOTION_VARIANT=${VARIANT}`);
const CLIPS = VARIANT === "x" ? CLIPS_X : CLIPS_MAIN;

/** [旁白 id, 与上一条之间的空档帧数]；第一条的空档 = 片头留白 */
export const PLAN: Plan = [
  ["s1a", 24],
  ["s1b", 10],
  ["s2a", 24],
  ["s2b", 12],
  ["s2c", 12],
  ["s2d", 14],
  ["s3a", 26],
  ["s3b", 10],
  ["s3c", 14],
  ["s3d", 10],
  ["s3e", 12],
  ["s3f", 12],
  ["s3g", 12],
  ["s3h", 14],
  ["s3i", 16],
  ["s3j", 24],
  ["s3k", 20],
  ["s4a", 26],
  ["s4b", 14],
  ["s4c", 26],
  ["s4d", 12],
  ["s5a", 26],
  ["s5b", 10],
  ["s5c", 24],
  ["s5d", 16],
  ["s6a", 26],
  ["s6b", 12],
  ["s7a", 26],
  ["s8a", 26],
  ["s9a", 26],
  ["s9b", 256],
  ["s10a", 26],
];

/** 第三个参数 = 最后一条旁白之后的片尾帧数 */
export const TL = buildTimeline(CLIPS, PLAN, 72);
export const AT = TL.at;
export const END = TL.end;
export const p = TL.p;

// ---------------------------------------------------------------- 镜头切换
export const SCENE = {
  s6: AT.s6a - 14,
  s7: AT.s7a - 14,
  s8: AT.s8a - 14,
  s9: AT.s9a - 14,
  s10: AT.s10a - 14,
};

// ---------------------------------------------------------------- 第 2 镜：一层层出来（只点亮，不带队列）
/** 每个顶点点亮的时刻、从哪个顶点描边过来（父顶点照 check_numbers.py 的 BFS 生成树） */
export const LAYER_ITEMS: { v: number; at: number; from?: number }[] = [
  { v: 1, at: p("s2a", "从V一") + 4 },
  { v: 2, at: p("s2b", "V二") - 8, from: 1 },
  { v: 3, at: p("s2b", "V三") - 8, from: 1 },
  { v: 4, at: p("s2c", "V四") - 8, from: 2 },
  { v: 5, at: p("s2c", "V五") - 8, from: 2 },
  { v: 6, at: p("s2c", "V六") - 8, from: 3 },
  { v: 7, at: p("s2c", "V七") - 8, from: 3 },
  { v: 8, at: p("s2d") + 8, from: 4 },
];
/** 第 k 层套框（和图上层带）的时刻 */
export const LAYER_BOX = [p("s2a", "算第零层"), p("s2b", "这是第一层"), p("s2c", "第二层"), p("s2d", "第三层")];

// ---------------------------------------------------------------- 第 3 镜：先挑编号小的（#00–#27，对照 check_numbers.py 第 1 节）
const mk = p("s3d", "标记");
export const T_ASC: (number | null)[] = [
  p("s3c", "V一先标记"), //      #00 起点 v1：标记、入队
  p("s3d") + 4, //               #01 v1 出队
  p("s3d", "邻居V二") + 6, //    #02 v2 入队
  p("s3d", "V三没来过"), //      #03 v3 入队
  p("s3e") + 4, //               #04 v2 出队
  p("s3e", "V一来过了") + 4, //  #05 v2 看 v1
  p("s3e", "V四") - 6, //        #06 v4 入队
  p("s3e", "V五入队") - 4, //    #07 v5 入队
  p("s3f") + 4, //               #08 v3 出队
  p("s3f") + 18, //              #09 v3 看 v1
  p("s3f", "V六") - 4, //        #10 v6 入队
  p("s3f", "V七入队") - 4, //    #11 v7 入队
  p("s3g") + 2, //               #12 v4 出队
  p("s3g") + 12, //              #13 v4 看 v2
  p("s3g", "V八入队") - 2, //    #14 v8 入队
  p("s3h") + 2, //               #15 v5 出队
  p("s3h", "邻居V二") + 4, //    #16 v5 看 v2
  p("s3h", "V八都来过") + 2, //  #17 v5 看 v8（入队时已标记）
  p("s3j") + 24, //              #18 v6 出队
  p("s3j") + 32, //              #19 v6 看 v3
  p("s3j") + 40, //              #20 v6 看 v7
  p("s3j", "V七") - 2, //        #21 v7 出队
  p("s3j", "V七") + 4, //        #22 v7 看 v3
  p("s3j", "V七") + 10, //       #23 v7 看 v6
  p("s3j", "V八出队") + 2, //    #24 v8 出队
  p("s3j", "V八出队") + 12, //   #25 v8 看 v4
  p("s3j", "V八出队") + 22, //   #26 v8 看 v5
  p("s3j", "队列空了"), //       #27 队空，结束
];
export const OV_ASC = {
  0: { lit: p("s3c", "V一先标记"), mark: p("s3c", "V一先标记") + 4, push: p("s3c", "再入队") + 2, seq: p("s3c", "再入队") + 6 },
  2: { lit: mk, mark: mk + 2, push: mk + 12, seq: mk + 15 },
  3: { lit: mk + 4, mark: mk + 6, push: mk + 20, seq: mk + 23 },
};
checkBTimes(RUN_ASC, T_ASC, "RUN_ASC");

// ---------------------------------------------------------------- 第 4 镜：先挑编号大的（check 不演）
const b = (s: string, d = 0) => p("s4b", s) + d;
export const DESC_MOVE = 9;
export const T_DESC: (number | null)[] = [
  b("V一"), //            #00 起点 v1
  b("V一", 8), //         #01 v1 出队
  b("V三", -6), //        #02 v3 入队
  b("V二", -6), //        #03 v2 入队
  b("V七", -12), //       #04 v3 出队
  b("V七", -6), //        #05 v7 入队
  b("V六", -6), //        #06 v6 入队
  null, //                #07 v3 看 v1
  b("V五", -12), //       #08 v2 出队
  b("V五", -6), //        #09 v5 入队
  b("V四", -6), //        #10 v4 入队
  null, //                #11
  b("V四", 4), //         #12 v7 出队
  null, //                #13
  null, //                #14
  b("V四", 10), //        #15 v6 出队
  null, //                #16
  null, //                #17
  b("最后", -2), //       #18 v5 出队
  b("最后", 4), //        #19 v8 入队
  null, //                #20
  b("最后", 20), //       #21 v4 出队
  null, //                #22
  null, //                #23
  b("最后", 34), //       #24 v8 出队
  null, //                #25
  null, //                #26
  b("最后", 44), //       #27 结束
];
checkBTimes(RUN_DESC, T_DESC, "RUN_DESC");

// ---------------------------------------------------------------- 第 5 镜：按邻接表（全部事件匀速快放）
export const LIST_STEP = 6;
export const LIST_START = p("s5b") + 8;
export const T_LIST: (number | null)[] = RUN_LIST.map((_, i) => LIST_START + i * LIST_STEP);
checkBTimes(RUN_LIST, T_LIST, "RUN_LIST");

// ---------------------------------------------------------------- 第 7 镜：非连通图，三次调用
const c0 = p("s7a") + 10;
const c1 = p("s7a", "外面") + 4;
export const G6_LOOP = {
  /** 循环指针依次到 v1…v6 的时刻 */
  cursor: [c0, c1, c1 + 8, c1 + 16, c1 + 58, c1 + 66],
};
export const G6_STEP = 6;
export const T_G6: (number | null)[][] = [
  G6_CALLS[0].map((_, i) => G6_LOOP.cursor[0] + 8 + i * G6_STEP),
  G6_CALLS[1].map((_, i) => G6_LOOP.cursor[3] + 8 + i * G6_STEP),
  G6_CALLS[2].map((_, i) => G6_LOOP.cursor[5] + 8 + i * 8),
];
G6_CALLS.forEach((evs, i) => checkBTimes(evs, T_G6[i], `G6 第${i + 1}次`));

// ---------------------------------------------------------------- 其他关键时刻
export const K = {
  // 第 1 镜
  titleOut: p("s1a", "口诀"),
  motto: p("s1a", "层层扩散"),
  mottoUp: p("s1b"),
  graphIn: p("s1b") + 6,
  stone: p("s1b", "水波") - 10,
  ripple: p("s1b", "水波"),
  // 第 2 镜
  caption: p("s2a"),
  allLayers: p("s2d", "所有"),
  // 第 3 镜
  reset0: p("s3a"),
  morph: p("s3a", "靠一个"),
  qLabels: p("s3a", "先进先出"),
  rule: p("s3b"),
  ruleA: p("s3b", "出队一个"),
  ruleB: p("s3b", "把它"),
  panelIn: END.s3b - 4,
  qLayer2: p("s3f", "现在"),
  qLayer2End: END.s3f + 14,
  v8Ring: p("s3h", "V八都来过") + 2,
  markedEarly: p("s3i"),
  wrongIf: p("s3i", "要是"),
  ghostIn: p("s3i", "V五各放进") - 4,
  ghostOut: END.s3i + 16,
  seqLayers: [0, 1, 2, 3].map((i) => p("s3k") + 4 + i * 9),
  // 第 4 镜
  reset1: p("s4a", "这回"),
  bracket: p("s4c"),
  bracketEnd: END.s4c + 20,
  nextFollows: p("s4c", "下一层"),
  bothOk: p("s4d"),
  count8: p("s4d", "这张图"),
  // 第 5 镜
  toList: p("s5a"),
  listBuild: p("s5a") + 16,
  same: p("s5c", "就是第一条"),
  revOn: p("s5d"),
  revRow2: p("s5d", "走出来"),
  revOff: p("s5d", "所以"),
  exam: p("s5d", "答案就唯一"),
  // 第 6 镜
  spTable: p("s6a", "层号"),
  spPath: p("s6b"),
  spCount: p("s6b", "最少"),
  spUse: p("s6b", "无权图"),
  // 第 7 镜
  g6Code: p("s7a", "外面"),
  g6Comp: p("s7a", "调几次"),
  g6Three: p("s7a", "就有几个"),
  // 第 8 镜
  matScan: p("s8a", "邻接矩阵"),
  listScan: p("s8a", "邻接表"),
  // 第 9 镜
  quizOpts: p("s9a", "下面"),
  countFrom: END.s9a + 6,
  countSec: 8,
  reveal: p("s9b"),
  why: p("s9b", "V三先"),
  whyKids: p("s9b", "V六"),
  // 第 10 镜
  outroDfs: p("s10a", "DFS"),
  outroBfs: p("s10a", "BFS"),
};
