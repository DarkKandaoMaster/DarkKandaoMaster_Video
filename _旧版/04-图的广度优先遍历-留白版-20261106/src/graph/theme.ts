// 图论系列的视觉 token（“图论·暖白”）：暖白底 + 淡点阵，顶点白圆墨边，每一遍遍历一种颜色。
// 浅色、对比高，课堂投影也清楚。BFS 等后续视频复制本目录（src/graph/）直接用。
import { mixColor } from "../base/theme";

export const G = {
  bg: "#FAF7F0", // 暖白底
  dot: "rgba(70, 60, 40, 0.075)", // 点阵
  ink: "#1F2430", // 主文字 / 指针
  ink2: "#555B6B", // 次文字
  ink3: "#959AA6", // 弱文字（下标、注释）
  edge: "#CFC8BA", // 未走过的边
  vFill: "#FFFFFF",
  vStroke: "#2A2F3B",
  card: "#FFFFFF",
  cardLine: "#E5DED0",
  shadow: "rgba(90, 70, 30, 0.10)",
  bad: "#E03131",
  good: "#2B8A3E",
} as const;

/** 每一遍遍历一种颜色（第 1 遍橙、第 2 遍蓝、第 3 遍绿、第 4 遍紫） */
export const RUN = {
  orange: "#E8590C",
  blue: "#1C7ED6",
  green: "#2B8A3E",
  purple: "#9C36B5",
} as const;
export const RUN_ORDER: string[] = [RUN.orange, RUN.blue, RUN.green, RUN.purple];

/** 浅色版（白里掺一点颜色） */
export const tint = (c: string, k = 0.16): string => mixColor("#FFFFFF", c, k);
/** 深色版（文字用） */
export const deep = (c: string, k = 0.22): string => mixColor(c, "#000000", k);

export type Pos = { x: number; y: number };
/** 顶点编号（1 起）→ 画布坐标 */
export type Layout = Record<number, Pos>;
/** 整张图的平移 + 缩放：p' = p·s + (x, y) */
export type Xf = { x: number; y: number; s: number };
export const XF0: Xf = { x: 0, y: 0, s: 1 };
export const applyXf = (p: Pos, t: Xf): Pos => ({ x: p.x * t.s + t.x, y: p.y * t.s + t.y });
export const mixXf = (a: Xf, b: Xf, k: number): Xf => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k });

/** 字幕卡配色（BilingualSubtitle 用） */
// 留白版：字幕卡几乎和底色一样（不描边、不投影），只在压到图上时托一下字
export const SUB_PALETTE = { bg: "rgba(250, 247, 240, 0.72)", line: "none", zh: "#2A2F3B", en: "#80869A", shadow: "transparent" };
