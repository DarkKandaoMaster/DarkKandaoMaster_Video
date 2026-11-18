// 黑板主题 token（"深色黑板 + 尺子"）：墨绿黑板、粉笔白字，粉笔黄是唯一焦点色；
// 绿 = 对、红 = 错、青 = 辅助（前缀等）。不依赖 paper.ts，与浅色方格纸主题互不影响。
import { FONT } from "../base/theme";

export const B = {
  // 黑板
  board: "#1E2B26", // 主色
  boardLight: "#273830", // 中心略亮（擦过的地方）
  boardDeep: "#141D19", // 四角暗
  // 木框
  wood: "#6A4A2E",
  woodLight: "#8A6440",
  woodDark: "#3E2A19",
  // 粉笔
  chalk: "#F1EFE6", // 主文字 / 主描边
  chalkDim: "#9FA9A2", // 弱文字（下标号、英文字幕）
  chalkFaint: "rgba(241, 239, 230, 0.16)", // 格子极淡底
  yellow: "#F5D76E", // 焦点（尺子、当前、已知）
  known: "#F3E2A6", // "已知"字母：粉笔白偏黄一点
  green: "#9ED9A2", // 对
  red: "#F2907F", // 错
  cyan: "#8ED3DD", // 辅助（前缀括号）
  // 便签
  note: "#FBF6E3", // 白底微黄
  noteLine: "#D8CDAA",
  noteInk: "#2E3A4C", // 铅笔 / 圆珠笔字
  noteTitle: "#7A6A48",
} as const;

export const BFONT = {
  sans: FONT.sans, // Noto Sans SC（中文）
  mono: FONT.mono, // Consolas（字母、下标、数组）
  hand: '"DK Hand", "Ink Free", "Segoe Print", cursive', // 便签里的手写数字（C:\Windows\Fonts\Inkfree.ttf）
} as const;

/** 字号表（px，1920×1080 下） */
export const SIZE = {
  trackLetter: 52, // 主串字母
  trackIndex: 22, // 主串下标 1..17
  rulerLetter: 52, // 尺子字母（主串同比例时）
  rulerIndex: 22, // 尺子 j
  bigLetter: 72, // 放大尺子的字母
  bigIndex: 28,
  label: 30, // 粉笔标注（"前缀 ab" 等）
  pointer: 40, // 指针字母 i
  noteTitle: 26,
  noteDigit: 36,
  subZh: 38,
  subEn: 24,
} as const;
