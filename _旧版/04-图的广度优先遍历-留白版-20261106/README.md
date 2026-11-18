# 图的广度优先遍历（BFS）· 留白版小样

从`..\..\04-图的广度优先遍历\`（初稿）复制来的试验工程，只做初稿的前三镜（开场、一层层出来、框变成队列），用“留白、镜头、先问后答”的做法重做，给用户和初稿对比。初稿工程没动。分镜和旁白见`脚本.md`（含和初稿的对比表、自己定的默认）。成片：`图的广度优先遍历-留白版小样.mp4`（1920×1080、30 fps、H.264 + AAC，-16 LUFS），抽帧在`抽帧\`。

## 重渲

在本目录（PowerShell，`$PY` = `D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe`）：

```powershell
$env:PYTHONIOENCODING="utf-8"
& $PY scripts\check_numbers.py            # 核对层、队列每一步、出队才标记的反例，并重写 src\bfs\trace.generated.ts
& $PY scripts\check_script.py --speed 1.0 # 旁白字幕自检 + 时长估计
& $PY ..\..\_tools\tts.py --no-api           # 只改了字幕 / 时间线时（speed 默认 1.0，主音色）
& $PY ..\..\_tools\print_timeline.py
pnpm exec tsc --noEmit
pnpm render --port=3711                   # → out\BFSAiry.mp4
& $PY ..\..\_tools\finish.py out\BFSAiry.mp4 图的广度优先遍历-留白版小样.mp4
```

## 文件

```
src/bfs/narration.json     旁白（speak 送 TTS，subs 字幕，en 英文行）
src/bfs/timeline.ts        PLAN（含 5 处“先想一想”的停顿）、镜头关键位置 CAM / CAM_KEYS、遍历事件帧号 T_ASC、关键时刻 K
src/bfs/layout.ts          G4 坐标、层带、右边一栏（一排 / 队列）的位置
src/bfs/AiryStage.tsx      第 1–3 镜画面（镜头、雾、层带、标题、一排 → 队列、反例、片尾）
src/bfs/BFSAiry.tsx        Composition BFSAiry：画面 + BGM（level 0.6）+ 音效 + 双语字幕
src/bfs/trace.generated.ts check_numbers.py 生成
```

## 相对初稿通用件的改动（只在本工程）

- `graph/GraphView.tsx`：加`dim`（每个顶点的透明度系数，边取两端较小值），做“雾”。
- `graph/Kit.tsx`：背景去掉点阵，暗角更淡。
- `components/BilingualSubtitle.tsx` + `graph/theme.ts`的`SUB_PALETTE`：字幕31/21px，卡片近似底色、不描边不投影。
- `graph/Structures.tsx`：队列下“队头”“队尾”字更小更淡。
- 复制来但用不到的文件（初稿的 MainStage / Scenes / BFS.tsx、Edge 变体清单、初稿成片副本）移到了`..\..\_待删除\BFS留白版-复制来未用\`。
