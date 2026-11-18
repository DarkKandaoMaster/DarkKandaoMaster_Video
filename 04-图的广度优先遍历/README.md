# 图的广度优先遍历（BFS）

B站讲解视频，面向刚学图的大学生和考研党，《图的深度优先遍历》（`..\03-图的深度优先遍历\`）的姊妹篇，从那条工程复制而来，画面风格、组件、流程都沿用。记号按严蔚敏《数据结构（C语言版）》第7章（算法7.6，入队时就置visited），例图是教材图7.13的无向图G4。成片：`图的广度优先遍历.mp4`（1920×1080、30 fps、H.264 + AAC，-16 LUFS），抽帧在`抽帧\`。分镜和旁白见`脚本.md`。

内容：口诀“层层扩散”开场（水波）→ 参考视频的做法：从v1出发每层彩色逐个出现、套框标第0–3层 → 四个框合成一条队列，从头重放（入队、出队、visited同步；“现在队里正好是第2层”；v8入队时就标记，反例“出队才标记”v8会入队两次）→ 先挑编号大的再跑一遍（序列不唯一，下一层跟着上一层的顺序，从v1出发共8种）→ 给定邻接表序列唯一（链倒过来就是第二条）→ 层号＝最短边数（v8在第3层，v1→v2→v4→v8）→ 非连通图（调用BFS的次数＝连通分量个数）→ 复杂度O(n²) / O(n+e) → 8秒限时题（答案B）→ DFS用栈 / BFS用队列并排收尾。

## 重渲

在本目录（PowerShell，`$PY` = `D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe`）：

```powershell
$env:PYTHONIOENCODING="utf-8"
& $PY scripts\check_numbers.py            # 暴力核对层、队列每一步、visited、全部BFS序列（8种）、最短边数、限时题，并重写 src\bfs\trace.generated.ts
& $PY scripts\check_script.py --speed 1.1 # 旁白字幕自检 + 时长估计
& $PY ..\_tools\tts.py --speed 1.1 --no-api   # 只改了字幕 / 时间线时：不调接口，重算清单
#   改了某条 speak：& $PY ..\_tools\tts.py --speed 1.1 --only s3b   （一定带 --speed 1.1，否则签名变了会整批重配）
& $PY ..\_tools\print_timeline.py         # 看各条旁白的绝对帧
pnpm exec tsc --noEmit
pnpm render --port=3701                   # → out\BFS.mp4（约 6 分钟）
& $PY ..\_tools\finish.py out\BFS.mp4 图的广度优先遍历.mp4
& $PY ..\_tools\grab_frames.py 图的广度优先遍历.mp4 抽帧 名字=帧号 ...
& $PY scripts\asr_check.py                # （可选）funasr + 本地 MOSS 转写每条旁白，核对 TTS 读音
```

- 配音：MiniMax `speech-2.8-hd`，默认主音色，speed 1.1。
- BGM：`public\bgm\bright-01.wav`（随DFS那条复制来的213秒版，比本片长，没重新合成）。
- 字体在`public\fonts\`（随工程复制）。

## 文件

```
scripts/check_numbers.py   分层、两种挑法的事件（每步队列 / visited / 序列）、出队才标记的反例、全部BFS序列（三种独立算法）、
                           邻接表与头插倒序、最短边数（枚举全部简单路径）、非连通图、复杂度计数、限时题 → 打印核对 + 写 trace.generated.ts
scripts/check_script.py    旁白 / 字幕自检（at 位置、中英空格、禁用词、每屏字数）+ 时长估计
scripts/asr_check.py       TTS 读音转写核对（只读）
src/bfs/narration.json     旁白（speak 送 TTS，subs 字幕，en 英文行）
src/bfs/trace.generated.ts 由 check_numbers.py 生成：G4、三遍遍历的事件序列、层、BFS 树父顶点、最短边数、邻接表、G6、限时题
src/bfs/timeline.ts        PLAN（旁白空档）、每个遍历事件的帧号（全部由 p(旁白, 分句) 推出）、关键时刻 K
src/bfs/layout.ts          G4 / G6 顶点坐标、层带、各镜布局（右侧面板、队列、规则卡、分层行）
src/bfs/MainStage.tsx      第 1–5 镜（同一张 G4 贯穿，只换布局）；LayerBands（层带，第 6 镜也用）
src/bfs/Scenes.tsx         第 6–10 镜（最短路、非连通图、复杂度、限时题、结尾）
src/bfs/BFS.tsx            Composition BFS：画面 + BGM 闪避 + 音效 + 旁白/双语字幕
src/graph/                 图论系列通用件（DFS 那条的原样 + 本条新增 / 改动，见下）
src/base/、src/components/ 模板原样
```

## 通用件 `src\graph\` 相对 DFS 那条的改动

- 新增`bfs.ts`：`BEvent`（visit / deq / enq / check / done，带每步queue / visited / seq / layer）；`bfsAt(f, events, times, opts)` → 和`TState`同形的状态（GraphView、ArrayView、SeqRow直接用）＋`queue`（给QueueView）；入队事件可覆盖lit / mark / push / seq时刻；`checkBTimes`；`litState`（只点亮一组顶点并从父顶点描边，分层那一镜和题目讲解用）。BFS里“在队里”＝实心、“已出队”＝浅色，入队描的那条边在子顶点出队后变浅。
- `Structures.tsx`的`QueueView`重写（DFS那条留的版本没用过）：管左端是队头、右端队尾；`curX`给了就有“出队”格（出队的元素滑进去停着，下一个出队时淡掉）；`ghost`元素（红色虚线＋斜杠，反例用）；`hi`给连续几格套灰框（“第2层”）；`tube`/`labels`透明度（框变队列用）；`pulse`。
- `Structures.tsx`的`ArrayView`：格子上方的v_i名字从`y − 38`上移到`y − 48`，标题`visited`从`y − 86`上移到`y − 92`；循环指针的墨色框从“外扩4px、描边4px”缩成“外扩3px、描边3.5px”。原来框的上沿会压住格名的下标（非连通图那一镜的v5）。DFS那条可照此改。
- 其余文件（GraphView / AdjListView / Kit / theme / traverse）和DFS工程最终版逐字节相同（DFS那边修完 probes 墨色、指针不压标签、邻接表格子、visited闪烁、倒计时环之后复制的）。

## 成片时间点（179.71 秒 ≈ 3:00）

第1镜口诀 0:00 · 第2镜一层层出来 0:10 · 第3镜框变队列 0:30（v1入队 0:41，“正好是第2层” 0:56，入队即标记 1:05.6，反例 1:09，队空 1:17）· 第4镜不唯一 1:22.7 · 第5镜邻接表 1:43.4 · 第6镜最短路 2:03.8 · 第7镜非连通 2:16.5 · 第8镜复杂度 2:25 · 第9镜限时题 2:31.3（倒计时 2:37.3–2:45.3，揭晓 2:45.7）· 第10镜结尾 2:51.9。

## 已知问题 / 待用户定

- 自己定的默认见`脚本.md`末尾。
- 第5镜右下的队列只在扫链那几秒出现（进场时淡出，扫链前淡入，扫完淡出），其余时间不显示。
- TTS转写里s8a的“O n加e”听成“加一”，DFS那条同一说法转写结果相同，判断是转写器对字母e的写法，没重配。
