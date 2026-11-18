// 留白版的画面坐标（1920×1080）。G4 按教材图 7.13 的样子摆：v1 在顶上，v2、v3 第二层，v4–v7 第三层，v8 在最下，
// 正好就是 BFS 从 v1 出发的第 0–3 层（层带画在这几条横线上）。图跟着镜头（timeline.ts 的 CAM）走，
// 右边一栏（标题 / 按层排好的一排 / 队列）是屏幕坐标，不跟镜头。
import type { Layout } from "../graph/theme";

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

/** 层带：每层一条很淡的横带（画布坐标，跟着镜头一起变） */
export const BANDS = { x0: 140, x1: 940, ys: [215, 405, 605, 800], h: 116, labelX: 40 };

/** 右边一栏的中线 x */
export const COL_X = 1450;

/** 按层排好的一排（第 2 镜末尾出现，第 3 镜四个框变成队列管；片尾再出现一次） */
export const ROW = { y: 458, cell: 76, gap: 10, groupGap: 36 };

/** 队列：管左端（队头）x、元素顶边 y */
export const QUEUE = { x: 1190, y: 450, cell: 92, gap: 10, cap: 5 };

/** 一排里第 i 个药丸（按序列）的 x；groups = 每层几个 */
export const rowX = (groups: number[]): number[] => {
  const { cell, gap, groupGap } = ROW;
  const total = groups.reduce((s, n) => s + n * cell + (n - 1) * gap, 0) + (groups.length - 1) * groupGap;
  let x = COL_X - total / 2;
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

/** 队列第 slot 格（0 = 队头）的左边 x */
export const qSlotX = (slot: number): number => QUEUE.x + QUEUE.gap / 2 + slot * (QUEUE.cell + QUEUE.gap);
