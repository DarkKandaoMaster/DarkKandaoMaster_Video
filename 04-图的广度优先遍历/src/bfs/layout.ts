// 这条视频的画面坐标（1920×1080）。G4 按教材图 7.13 的样子摆：v1 在顶上，v2、v3 第二层，v4–v7 第三层，v8 在最下，
// 正好就是 BFS 从 v1 出发的第 0–3 层（层带画在这几条横线上）。
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

/** 层带：每层一条浅灰横带（画布坐标，跟着图的 Xf 一起变） */
export const BANDS = { x0: 140, x1: 940, ys: [215, 405, 605, 800], h: 112, labelX: 40 };

/** 第 2–4、6 镜：图在左半边原样 */
export const XF_MAIN: Xf = { x: 0, y: 0, s: 1 };
/** 第 5 镜：缩小挪到左边给邻接表让位 */
export const XF_LIST: Xf = { x: -95, y: 200, s: 0.72 };
/** 第 9 镜：限时题左边的小图 */
export const XF_QUIZ: Xf = { x: -52, y: 196, s: 0.72 };

/** 右侧面板 */
export const PANEL = {
  visited: { x: 1100, y: 178, cell: 84, gap: 6 },
  seq: { x: 1100, titleY: 300, rowY: 384, rowStep: 96 },
  seqList: { x: 1390 },
  /** 队列：管左端 x、元素顶边 y、“出队”格 x */
  queue: { x: 1210, y: 616, cell: 70, gap: 8, cap: 6, curX: 1100 },
  queueList: { x: 1500, y: 790, cell: 52, gap: 6, cap: 5, curX: 1400 },
  rule: { x: 1100, y: 772, w: 740, h: 66 },
  /** 第 2 镜的分层行（和队列同一高度，后面框变成队列管） */
  layerRow: { y: 616, cell: 70, gap: 8, groupGap: 40 },
  adj: { x: 640, y: 258, rowH: 78, cellH: 44 },
};

/** 分层行里第 i 个药丸（按序列）的 x；groups = 每层几个 */
export const layerRowX = (groups: number[]): number[] => {
  const { cell, gap, groupGap } = PANEL.layerRow;
  const total = groups.reduce((s, n) => s + n * cell + (n - 1) * gap, 0) + (groups.length - 1) * groupGap;
  let x = 1470 - total / 2;
  const out: number[] = [];
  groups.forEach((n, gi) => {
    for (let k = 0; k < n; k++) {
      out.push(x);
      x += cell + (k < n - 1 ? gap : 0);
    }
    if (gi < groups.length - 1) x += groupGap;
  });
  return out;
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
