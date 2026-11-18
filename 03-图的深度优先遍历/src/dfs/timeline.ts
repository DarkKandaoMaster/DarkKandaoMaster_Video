// 时间线（帧，30 fps）。旁白按 TTS 实测时长排，空档写在 PLAN 里。
// 画面动画一律挂在 p(旁白 id, 分句开头文字) 上：重新配音后时长变了，动画跟着走，不用改帧号。
// 遍历事件（trace.generated.ts，由 scripts/check_numbers.py 生成）每个事件一个时刻，也都由 p() 推出来。
import { buildTimeline, type Plan } from "../base/timeline";
import { checkTimes } from "../graph/traverse";
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
  ["s2a", 20],
  // s2b（“右边两样东西：visited数组……递归栈……”）2026-11-06 为压时长从时间线拿掉；音频和 narration.json 条目保留，加回来只要放回这一行
  ["s3a", 22],
  ["s3b", 10],
  ["s3c", 10],
  ["s3d", 10],
  ["s3e", 16],
  ["s3f", 8],
  ["s3g", 18],
  ["s3h", 24],
  ["s3i", 10],
  ["s3j", 12],
  ["s3k", 10],
  ["s3l", 14],
  ["s3m", 18],
  ["s4a", 22],
  ["s4b", 10],
  ["s4c", 34],
  ["s5a", 22],
  ["s5b", 12],
  ["s5c", 10],
  ["s5d", 48],
  ["s5e", 14],
  ["s6a", 26],
  ["s6b", 14],
  ["s6c", 18],
  ["s7a", 26],
  ["s7b", 10],
  ["s8a", 26],
  ["s8b", 262],
  ["s9a", 24],
];

/** 第三个参数 = 最后一条旁白之后的片尾帧数 */
export const TL = buildTimeline(CLIPS, PLAN, 66);
export const AT = TL.at;
export const END = TL.end;
export const p = TL.p;

// ---------------------------------------------------------------- 镜头切换
export const SCENE = {
  s6: AT.s6a - 14,
  s7: AT.s7a - 14,
  s8: AT.s8a - 14,
  s9: AT.s9a - 14,
};

// ---------------------------------------------------------------- 第 3 镜：先挑编号小的（#00–#26，对照 check_numbers.py 第 1 节）
export const T_ASC: (number | null)[] = [
  p("s3a", "访问V一"), //       #00 访问 v1
  p("s3b", "走V二"), //         #01 访问 v2
  p("s3c", "V一来过了"), //     #02 v2 看 v1
  p("s3c", "走V四"), //         #03 访问 v4
  p("s3d") + 4, //              #04 v4 看 v2
  p("s3d", "V四到V八"), //      #05 访问 v8
  p("s3d", "V八到V五"), //      #06 v8 看 v4
  p("s3d", "V八到V五") + 14, // #07 访问 v5
  p("s3e", "邻居V二") + 2, //   #08 v5 看 v2
  p("s3e", "V八都来过"), //     #09 v5 看 v8
  p("s3g", "沿着"), //          #10 退回 v5→v8（第一次回退）
  p("s3i", "退回V四"), //       #11 退回 v8→v4
  p("s3i", "退回V二"), //       #12 退回 v4→v2
  p("s3j") + 24, //             #13 v2 看 v5
  p("s3j", "再退回"), //        #14 退回 v2→v1
  p("s3k", "走V三"), //         #15 访问 v3
  p("s3k", "再到"), //          #16 v3 看 v1
  p("s3k", "再到") + 8, //      #17 访问 v6
  p("s3k", "V七") - 8, //       #18 v6 看 v3
  p("s3k", "V七") + 4, //       #19 访问 v7
  p("s3l") + 2, //              #20 v7 看 v3
  p("s3l") + 18, //             #21 v7 看 v6
  p("s3l", "一路退回"), //      #22 退回 v7→v6
  p("s3l", "一路退回") + 15, // #23 退回 v6→v3
  p("s3l", "一路退回") + 29, // #24 v3 看 v7
  p("s3l", "一路退回") + 42, // #25 退回 v3→v1
  p("s3l", "栈空"), //          #26 v1 出栈，结束
];
export const OV_ASC = {
  0: { mark: p("s3a", "visited记上") + 4, push: p("s3a", "压进栈") + 2, seq: p("s3a", "写进序列") + 2 },
  10: { pop: p("s3g", "V五出栈") },
};
checkTimes(RUN_ASC, T_ASC, "RUN_ASC");

// ---------------------------------------------------------------- 第 4 镜：先挑编号大的（check 不演）
const b = (s: string, d = 0) => p("s4b", s) + d;
export const T_DESC: (number | null)[] = [
  b("V一"), //            #00 访问 v1
  b("V三"), //            #01 访问 v3
  b("V七"), //            #02 访问 v7
  b("V六"), //            #03 访问 v6
  null, //                #04 v6 看 v7
  null, //                #05 v6 看 v3
  b("退回V一"), //        #06 退回 v6→v7
  null, //                #07 v7 看 v3
  b("退回V一", 12), //    #08 退回 v7→v3
  null, //                #09
  null, //                #10
  b("退回V一", 24), //    #11 退回 v3→v1
  b("再走V二"), //        #12 访问 v2
  b("V五"), //            #13 访问 v5
  b("V八"), //            #14 访问 v8
  null, //                #15 v8 看 v5
  b("V四"), //            #16 访问 v4
  null, //                #17
  null, //                #18
  b("V四", 22), //        #19 退回 v4→v8
  b("V四", 32), //        #20 退回 v8→v5
  null, //                #21
  b("V四", 42), //        #22 退回 v5→v2
  null, //                #23
  null, //                #24
  b("V四", 52), //        #25 退回 v2→v1
  b("V四", 62), //        #26 v1 出栈
];
checkTimes(RUN_DESC, T_DESC, "RUN_DESC");

// ---------------------------------------------------------------- 第 5 镜：按邻接表（全部事件匀速快放）
export const LIST_STEP = 6;
export const LIST_START = p("s5c") + 10;
export const T_LIST: (number | null)[] = RUN_LIST.map((_, i) => LIST_START + i * LIST_STEP);
checkTimes(RUN_LIST, T_LIST, "RUN_LIST");

// ---------------------------------------------------------------- 第 6 镜：非连通图，三次调用
export const G6_LOOP = {
  /** 循环指针依次到 v1…v6 的时刻 */
  cursor: [p("s6a", "从V一"), p("s6b") + 20, p("s6b") + 30, p("s6b") + 40, p("s6b") + 92, p("s6b") + 102],
};
export const T_G6: (number | null)[][] = [
  G6_CALLS[0].map((_, i) => G6_LOOP.cursor[0] + 8 + i * 8),
  G6_CALLS[1].map((_, i) => G6_LOOP.cursor[3] + 8 + i * 8),
  G6_CALLS[2].map((_, i) => G6_LOOP.cursor[5] + 8 + i * 12),
];
G6_CALLS.forEach((evs, i) => checkTimes(evs, T_G6[i], `G6 第${i + 1}次`));

// ---------------------------------------------------------------- 其他关键时刻
export const K = {
  // 第 1 镜
  titleOut: p("s1a", "先记"),
  motto: p("s1a", "不撞南墙"),
  motto2: p("s1b"),
  mottoUp: p("s1b", "能往前"),
  graphIn: p("s1b", "能往前") + 6,
  // 第 2 镜
  flashAll: p("s2a"),
  caption: p("s2a", "拿教材"),
  ptrShow: p("s2a", "从V一"),
  visitedIn: p("s2a", "拿教材") + 8,
  stackIn: p("s2a", "从V一") + 4,
  // 第 3 镜
  cand: p("s3b"),
  candEnd: p("s3b", "走V二") + 6,
  wall: p("s3f", "这就是"),
  topLink: p("s3h", "注意"),
  topLinkEnd: END.s3h + 6,
  popMeansBack: p("s3h", "所以"),
  seqPulse: ["V一、", "V二、", "V四、", "V八、", "V五、", "V三、", "V六、", "V七。"].map((s) => p("s3m", s)),
  // 第 4 镜
  reset1: p("s4a", "换成"),
  bothOk: p("s4c"),
  count8: p("s4c", "这张图"),
  // 第 5 镜
  toList: p("s5a"),
  listBuild: p("s5a", "题目"),
  rowV2: p("s5b"),
  rowV2End: p("s5c"),
  same: p("s5d", "就是第一条"),
  revOn: p("s5e"),
  revRow2: p("s5e", "走出来"),
  revOff: p("s5e", "所以"),
  exam: p("s5e", "考研"),
  // 第 6 镜
  g6Code: p("s6b"),
  g6Comp: p("s6c"),
  g6Three: p("s6c", "这里"),
  // 第 7 镜
  matScan: p("s7b"),
  listScan: p("s7b", "邻接表"),
  // 第 8 镜
  quizOpts: p("s8a", "下面"),
  countFrom: END.s8a + 6,
  countSec: 8,
  reveal: p("s8b"),
  why: p("s8b", "走到"),
  whyNo: p("s8b", "只能"),
  // 第 9 镜
  outro2: p("s9a", "下期"),
};
