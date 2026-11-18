// 系列视频的视觉 token：深色底 + 高对比白字，琥珀是唯一重点色（当前元素、关键量）。
// 绿 / 红只在例题结算时少量点缀。所有视频共用，改色只改这里。

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

export const C = {
  bg: "#0E1628", // 墨蓝黑底
  bgDeep: "#0A1120", // 暗角
  panel: "#16213B", // 卡片
  panelLine: "#26324F",
  tile: "#1B2743", // 格子
  tileLine: "#3A4A70",
  tileHi: "#24335A", // 被选中（非重点）的格子
  slotLine: "#2C3958", // 空位虚线
  grid: "rgba(150, 170, 210, 0.06)",
  ink: "#F2F4F8", // 主文字
  ink2: "#B4BED2", // 次文字
  ink3: "#76829C", // 弱文字（下标号、注释）
  amber: "#D9962B", // 唯一重点色
  amberBright: "#F2B24A",
  ok: "#46B172",
  bad: "#D9594C",
} as const;

/**
 * 字体族名（fonts.ts 从 public/fonts 加载，文件从 C:\Windows\Fonts 复制，不入库）。
 * - sans：中文与界面文字（Noto Sans SC 可变字重），数字一律 tabular-nums
 * - mono：数组下标号、列号
 * - math：公式里的变量 i、j、n、k、a（Cambria Italic）
 */
export const FONT = {
  sans: '"DK Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  mono: '"DK Mono", Consolas, ui-monospace, monospace',
  math: '"DK Math", "Cambria", "Times New Roman", serif',
} as const;

/** 带透明度的颜色：hexA("#D9962B", 0.3) → "rgba(217,150,43,0.3)" */
export const hexA = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** 两个颜色按 t 混合（接受 #rrggbb 或 rgb(r, g, b)，输出 #rrggbb，可以连续嵌套混合） */
const parseColor = (c: string): [number, number, number] => {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};

export const mixColor = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = parseColor(a);
  const [r2, g2, b2] = parseColor(b);
  const k = Math.max(0, Math.min(1, t));
  const m = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
};
