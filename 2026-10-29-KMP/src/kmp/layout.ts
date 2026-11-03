// 画面布局常量（照 脚本.md「画面布局」）。1920×1080，坐标都是左上角 px。
// 两套：匹配场景 M（第 1、2、5、6 镜）、手推场景 H（第 4、7、8 镜；第 8 镜小题另有 QZ）。
// 模式串与主串逐格上下对齐：模式头对着主串第 h 位时，模式第 j 格的 x = x0 + (h + j − 2) × step。
// h 可以是浮点数（滑动动画中途），主串自己就是 h = 1。

/** 一排格子的几何：左边界 x0、格宽 cell、步长 step（格宽 + 间距） */
export type RowGeo = { x0: number; cell: number; step: number };

// ───────────────────────── 匹配场景 ─────────────────────────
export const M = {
  // 顶部：左上小标题 Chip（"朴素匹配" / "KMP"）、右上比较次数计数器
  topY: 60,
  topH: 120,
  chipX: 100,
  counterRight: 1820,
  // 小 i：站在主串当前格正上方
  littleIY: 200,
  littleIH: 85,
  littleIW: 60,
  // 主串下标 1～17（小灰字）
  idxY: 296,
  idxSize: 26,
  // 主串一排：17 格，x 150–1770
  mainY: 330,
  // 模式串一排
  patY: 450,
  cell: 84,
  gap: 12,
  step: 96,
  x0: 150,
  letterSize: 52, // Consolas
  // 左侧标签 "S" / "T" / "next" / "nextval"
  labelX: 100,
  // 当前比较竖线（主串格底 → 模式格顶）
  cmpY1: 414,
  cmpY2: 450,
  // next 一排（紧贴模式串下方，跟着模式串滑），第 6 镜起加 nextval 一排
  nextY: 556,
  nextH: 56,
  nextvalY: 620,
  numSize: 36,
  // 下方公式卡 / 口诀卡 / Chip 区
  cardY: 700,
  cardH: 180,
  // 最底双语字幕卡
  subY: 930,
} as const;

export const M_GEO: RowGeo = { x0: M.x0, cell: M.cell, step: M.step };

// ───────────────────────── 手推场景 ─────────────────────────
export const H = {
  cell: 120,
  gap: 16,
  step: 136,
  x0: 424, // 8 格 x 424–1496
  patY: 260, // y 260–380
  jLabelY: 220, // j 号标在上方
  letterSize: 72,
  nextY: 420, // y 420–510
  nextH: 90,
  nextvalY: 530, // 第 7 镜，y 530–620
  numSize: 48,
  labelX: 300, // 行首标签（next / nextval）右对齐到这里
  cardY: 680, // 口诀卡 y 680–860
  cardH: 180,
} as const;

export const H_GEO: RowGeo = { x0: H.x0, cell: H.cell, step: H.step };

// ───────────────────────── 第 8 镜小题 ─────────────────────────
export const QZ = {
  cell: 120,
  step: 136,
  x0: 560, // 6 格 x 560–1360
  patY: 300, // y 300–420
  nextY: 460,
  nextH: 90,
} as const;

export const QZ_GEO: RowGeo = { x0: QZ.x0, cell: QZ.cell, step: QZ.step };

// ───────────────────────── 坐标函数 ─────────────────────────
/** 模式头对着主串第 h 位时，第 j 格（1 起）的左边 x；主串第 k 位 = cellX(1, k) */
export const cellX = (h: number, j: number, g: RowGeo = M_GEO): number => g.x0 + (h + j - 2) * g.step;
/** 同上，格子中线 x */
export const cellCX = (h: number, j: number, g: RowGeo = M_GEO): number => cellX(h, j, g) + g.cell / 2;

/** 主串第 k 位格子左边 x / 中线 x（匹配场景） */
export const mainX = (k: number): number => cellX(1, k);
export const mainCX = (k: number): number => cellCX(1, k);
/** 模式第 j 位（模式头在 h）左边 x / 中线 x（匹配场景） */
export const patX = (h: number, j: number): number => cellX(h, j);
export const patCX = (h: number, j: number): number => cellCX(h, j);

/** 手推场景第 j 格左边 x / 中线 x */
export const handX = (j: number): number => cellX(1, j, H_GEO);
export const handCX = (j: number): number => cellCX(1, j, H_GEO);

/** 小 i 站在主串第 k 位上方时的中线 x 与顶边 y */
export const littleIPos = (k: number): { x: number; y: number } => ({ x: mainCX(k), y: M.littleIY });

// ───────────────────────── 颜色（paper.ts 之外这条视频专用的）─────────────────────────
export const KC = {
  matchedBg: "#D7F0DF", // 已匹配：淡绿底
  matchedEdge: "#7FC296",
  ok: "#2E9A5A", // 绿 tick
  bad: "#D8483B", // 红 ×
  badSoft: "#FBDAD5",
  dimBg: "#F1EEE8", // 变灰（被丢掉的比较结果）
  dimEdge: "#D6D0C4",
  dimInk: "#A7A39B",
  hiYellow: "#FFF1BF", // 第 4 镜"只看 j 前面"的淡黄底
} as const;
