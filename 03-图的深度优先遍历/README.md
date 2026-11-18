# 图的深度优先遍历（DFS）

B 站讲解视频，面向刚学图的大学生和考研党。记号按严蔚敏《数据结构（C语言版）》第 7 章，例图是教材图 7.13 的无向图 G4。成片：`图的深度优先遍历.mp4`（1920×1080、30 fps、H.264 + AAC，-16 LUFS），抽帧在 `抽帧\`。分镜和旁白见 `脚本.md`。

内容：口诀开场 → 在 G4 上一步步走 DFS（visited 数组 + 递归栈同步，回退 = 指针沿边退回 + 栈顶弹出）→ 先挑编号大的再走一遍（序列不唯一，从 v1 出发共 8 种）→ 给定邻接表序列唯一（链倒过来就是第二条）→ 非连通图（调用 DFS 的次数 = 连通分量个数）→ 复杂度 O(n²) / O(n+e) → 8 秒限时题（答案 C）。

这条也是“图论系列”的第一条，`src\graph\` 是给后面的视频（BFS 等）复制用的通用件。

## 重渲

在本目录（PowerShell，`$PY` = `D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe`）：

```powershell
$env:PYTHONIOENCODING="utf-8"
& $PY scripts\check_numbers.py            # 暴力核对全部序列 / 栈 / visited / 限时题，并重写 src\dfs\trace.generated.ts
& $PY scripts\check_script.py --speed 1.1 # 旁白字幕自检 + 时长估计
& $PY ..\_tools\tts.py --speed 1.1 --no-api   # 只改了字幕 / 时间线时：不调接口，重算清单
#   改了某条 speak：& $PY ..\_tools\tts.py --speed 1.1 --only s3b   （一定带 --speed 1.1，否则签名变了会整批重配）
& $PY ..\_tools\print_timeline.py         # 看各条旁白的绝对帧
pnpm exec tsc --noEmit
pnpm render --port=3700                   # → out\DFS.mp4（约 6 分钟）
& $PY ..\_tools\finish.py out\DFS.mp4 图的深度优先遍历.mp4
& $PY ..\_tools\grab_frames.py 图的深度优先遍历.mp4 抽帧 名字=帧号 ...
& $PY scripts\asr_check.py                # （可选）funasr + 本地 MOSS 转写每条旁白，核对 TTS 读音
```

- 配音：MiniMax `speech-2.8-hd`，默认主音色，speed 1.1。
- BGM：`public\bgm\bright-01.wav`，本工程用 `..\_tools\synth_bright.py --bars 96` 重新合成到 213 秒（模板里那份 142 秒不够长）。
- 字体在 `public\fonts\`（随模板复制）。

## 文件

```
scripts/check_numbers.py   序列、栈、visited、全部 DFS 序列（8 种）、邻接表、非连通图、限时题 → 打印核对 + 写 trace.generated.ts
scripts/check_script.py    旁白 / 字幕自检（at 位置、中英空格、禁用词、每屏字数）+ 时长估计
scripts/asr_check.py       TTS 读音转写核对（只读）
src/dfs/narration.json     旁白（speak 送 TTS，subs 字幕，en 英文行）
src/dfs/trace.generated.ts 由 check_numbers.py 生成：G4、三遍遍历的事件序列（含每步栈 / visited / 序列）、邻接表、G6、限时题
src/dfs/timeline.ts        PLAN（旁白空档）、每个遍历事件的帧号（全部由 p(旁白, 分句) 推出）、关键时刻 K
src/dfs/layout.ts          G4 / G6 顶点坐标、各镜布局
src/dfs/MainStage.tsx      第 1–5 镜（同一张 G4 贯穿，只换布局）
src/dfs/Scenes.tsx         第 6–9 镜（非连通图、复杂度、限时题、结尾）
src/dfs/DFS.tsx            Composition DFS：画面 + BGM 闪避 + 音效 + 旁白/双语字幕
src/graph/                 图论系列通用件（见下）
src/base/、src/components/ 模板原样（时间线、动画工具、旁白 / 字幕 / BGM 轨）；PaperKit.tsx、paper.ts 是模板的方格纸件，这条没用
```

## 通用件 `src\graph\`（BFS 那条直接复制）

视觉“图论·暖白”：暖白底 `#FAF7F0` + 淡点阵；顶点白圆墨边，斜体 v + 下标；边暖灰；每一遍遍历一种颜色（`RUN_ORDER`：橙、蓝、绿、紫）；在栈里实心、出栈后浅色，最后剩下的浅色边就是生成树。

| 文件 | 内容 |
|---|---|
| `theme.ts` | 色板 `G`、遍历色 `RUN` / `RUN_ORDER`、`tint` / `deep`、`Layout`、整图平移缩放 `Xf` / `applyXf` / `mixXf`、字幕配色 `SUB_PALETTE` |
| `Kit.tsx` | `GraphBackground`（暖白点阵底）、`VName` / `SvgVName`（v_i 记号）、`Card`、`Txt`、`Tag`、`Pill`（序列里的顶点药丸）、`Countdown`（倒计时圆环）、`bump` |
| `traverse.ts` | `traverseAt(f, events, times, opts)`：事件序列（visit / check / back / done）+ 每个事件的帧号 → 这一帧的顶点 / 边 / 指针 / 探邻居虚线 / 栈 / visited / 序列状态；`checkTimes` 校验时刻；`pathState` 只点亮一条路径；`stackTop` / `stackDepth` |
| `GraphView.tsx` | 图（SVG）：顶点、边、走过的边、探邻居虚线、指针（停着是圆环，走在边上缩成圆点）、脉冲圈 `rings`、发光边 `glow`、箭头 `arrows`、访问顺序小圆牌、出场动画 `drawAt`；可同时叠几遍状态 |
| `Structures.tsx` | `StackView`（开口朝上的递归栈，入栈落下、出栈飞出，栈顶标记 / 描红）、`ArrayView`（visited 数组，T/F，可带循环指针）、`SeqRow`（访问序列一行）、`QueueView`（水平队列，队头出、队尾进，BFS 用） |
| `AdjListView.tsx` | 邻接表（严蔚敏画法：顶点表 + 边链表，adjvex | nextarc，∧），扫描标记 skip / go、扫描框、整行高亮、链表倒序动画、结点下的 v_j 小字 |

做 BFS 时：`check_numbers.py` 里加 BFS 的事件生成（入队 / 出队可以作为新事件类型，或直接用 `QueueView` 的 `inAt / outAt`），`traverseAt` 的 visit / check 照用；“第 k 层”套框可以在 `GraphView` 外面用 SVG 画。

## 成片时间点（179.48 秒 = 2:59）

第1镜口诀 0:00 · 第2镜准备 0:11.6 · 第3镜走一遍 0:17.1（撞南墙 0:40.1，第一次回退 0:42.6，栈顶=位置 0:46.4）· 第4镜不唯一 1:17.8 · 第5镜邻接表 1:36.8 · 第6镜非连通 2:02.9 · 第7镜复杂度 2:20.3 · 第8镜限时题 2:30.9（倒计时 2:36–2:44，揭晓 2:44.7）· 第9镜结尾 2:51.9。

- 为压到 3:00 以内，s2b（“右边两样东西：visited数组……递归栈……”）已从 `timeline.ts` 的 PLAN 拿掉；visited 和栈改成在 s2a 里直接出场，作用由 s3a“visited记上，压进栈”和 s3h 讲。音频 `public\dfs\audio\s2b.mp3` 和 narration.json 条目都还在，放回 PLAN 那一行即可恢复（约 +6.8 秒）。另外 s3m、s9a 前的空档和片尾各缩了一点。

## 已知问题 / 待用户定

- 模板带来的 `src/example`、`public/example` 已移到 `..\_待删除\2026-11-06-DFS-模板示例\`；187 秒版的旧抽帧移到 `..\_待删除\2026-11-06-DFS-旧抽帧\`。
- 其余默认见 `脚本.md` 末尾“自己定的默认”。