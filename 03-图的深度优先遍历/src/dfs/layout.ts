// 这条视频的画面坐标（1920×1080）。G4 按教材图 7.13 的样子摆：v1 在顶上，v2、v3 第二层，v4–v7 第三层，v8 在最下。
import type { Layout, Xf } from "../graph/theme";

export const G4_LAYOUT: Layout = {
  1: { x: 540, y: 215 },
  2: { x: 330, y: 405 },
  3: { x: 750, y: 405 },
  4: { x: 220, y: 605 },
  5: { x: 440, y: 605 },
  6: { x: 640, y: 605 },
  7: { x: 860, y: 605 },
  8: { x: 330, y: 800 },
};

/** 第 2–4 镜：图在左半边原样 */
export const XF_MAIN: Xf = { x: 0, y: 0, s: 1 };
/** 第 5 镜：缩小挪到左边给邻接表让位 */
export const XF_LIST: Xf = { x: -95, y: 200, s: 0.72 };
/** 第 8 镜：限时题左边的小图 */
export const XF_QUIZ: Xf = { x: -52, y: 196, s: 0.72 };

/** 右侧面板 */
export const PANEL = {
  visited: { x: 1100, y: 178, cell: 84, gap: 6 },
  visitedList: { x: 1390, y: 772, cell: 52, gap: 5 },
  stack: { x: 1110, yBottom: 862, w: 200, h: 62, gap: 4, cap: 6 },
  seq: { x: 1390, titleY: 300, rowY: 384, rowStep: 96 },
  adj: { x: 640, y: 258, rowH: 78, cellH: 44 },
};

/** 非连通图 G6：v1 v2 v3 三角形，v4-v5，v6 孤立 */
export const G6_LAYOUT: Layout = {
  1: { x: 280, y: 340 },
  2: { x: 160, y: 570 },
  3: { x: 400, y: 570 },
  4: { x: 630, y: 370 },
  5: { x: 750, y: 590 },
  6: { x: 930, y: 470 },
};
/** 三个连通分量外面的框（x, y, w, h） */
export const G6_BLOBS: [number, number, number, number][] = [
  [92, 268, 376, 372],
  [562, 300, 256, 360],
  [862, 402, 136, 136],
];
