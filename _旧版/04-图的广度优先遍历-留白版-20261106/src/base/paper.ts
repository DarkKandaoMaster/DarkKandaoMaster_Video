// 浅色方格纸主题（第二条视频「上下三角矩阵」起的系列风格）：米白方格纸 + 深墨字，柔和便签色块分行，珊瑚橙是唯一重点色。
// 深色 token（第一条「对称矩阵上三角」用的）在 ./theme.ts 的 C 里；VIDEO / FONT / hexA / mixColor 两边共用。

export const L = {
  paper: "#FBF8F1", // 纸面
  paperDeep: "#EFE8D9", // 四角暗一点
  grid: "#ECE5D6", // 方格纸细线
  gridBold: "#E2D9C6", // 每 5 格一条粗一点的线
  ink: "#1E2738", // 主文字
  ink2: "#5A6274", // 次文字
  ink3: "#959BA6", // 弱文字（下标号、注释）
  card: "#FFFFFF",
  cardLine: "#E6DECD",
  tile: "#FFFFFF", // 没上色的格子
  tileLine: "#CFC7B6",
  slotLine: "#D3CAB7", // 空位虚线
  ghost: "#EFEBE3", // 复印件（被划掉的那一半）
  ghostLine: "#C9C1B0",
  accent: "#E5582F", // 唯一重点色：当前元素、答案
  accentSoft: "#FDE4D9",
  accentDeep: "#B8401A", // 浅底上的重点文字
  blue: "#2F6FCC", // 第二标注色："前面几行"
  blueSoft: "#DCE8FA",
  copy: "#F3F6FB", // 拼图里复制出来的那一份（淡蓝灰）
  copyLine: "#8FB0DE",
  ok: "#2E9A5A",
  shadow: "rgba(60, 50, 30, 0.10)",
} as const;

/** 每一行一个便签色（第 1～5 行）：底色 + 描边 */
export const ROW = [
  { bg: "#FFE7A3", edge: "#E3BE52" },
  { bg: "#CDEBD7", edge: "#7FC296" },
  { bg: "#D3E5F9", edge: "#86B1E2" },
  { bg: "#E5DBF6", edge: "#AD97DD" },
  { bg: "#FAD9C9", edge: "#E2A283" },
] as const;
