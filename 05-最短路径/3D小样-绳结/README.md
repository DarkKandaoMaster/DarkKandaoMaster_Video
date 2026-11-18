# 3D 小样：Dijkstra 绳结模型（2026-11-09）

用 3D 演示最短路径的"绳结模型"，用来试 3D 镜头的效果，不是正式视频（缘由见 `docs\2026-11-09-3D镜头想法.md`）。不配音，只有 BGM（`calm-01`）和几个音效，带中英双语字幕。

- 成片：`Dijkstra绳结-3D小样.mp4`（1920×1080，30 fps，33.0 秒，990 帧）
- 抽帧：`抽帧\`（12 张：开场、扣住源点、拖动 v2、每颗珠子离桌的瞬间、转侧视、两句结论）
- Composition：`DijkstraRope`，slug `dijkstra-rope`

## 演的是什么

无向带权图：顶点 = 桌上的珠子，边 = 绳子，绳长 = 权值。捏住源点 v0 往上提，提升高度记作 H：

1. **开场**：斜俯视桌面，珠子和绳子平放，绳子按长度松松地摊着，旁边标权值；镜头慢慢转。
2. **提起**：提环落下扣住 v0，往上提。H 到达 dist[v] 时珠子 v 正好离开桌面：珠子变橙色，右边 Dijkstra 表里 dist[v] 锁定，"锁定顺序"多一个。绳子被拉紧时在桌上拖着珠子走，离桌后父子之间的绳子是一条直线并变橙色；没用上的边一直是灰色的弯绳。提环上挂着一条卷尺，0 刻度对准 v0，卷尺在桌面处的读数就是 H；珠子离桌时卷尺上对应的刻度标橙。
3. **结尾**：镜头转到侧视，七颗珠子挂成一串，每颗珠子正好挂在卷尺的 dist 刻度上（虚线连过去）。字幕："先离开桌面的，就是先被锁定的""绷直的绳子连起来，就是最短路径树"。

右边 HUD 表的每一步按 `scripts/check_numbers.py` 记下的松弛事件回放：锁定 u 之后 10 帧，u 的邻居 dist 更新（旧值划掉，新值落下），path 写前驱。

## 图和数字（全部由 `scripts/check_numbers.py` 算出并核对）

10 条边（教材记号，源点 v0）：

| 边 | 权 | 在最短路径树上？ |
|---|---|---|
| v0–v2 | 3 | 是 |
| v2–v1 | 2 | 是 |
| v0–v4 | 7 | 是 |
| v1–v3 | 4 | 是 |
| v4–v6 | 4 | 是 |
| v3–v5 | 4 | 是 |
| v0–v1 | 6 | 否（余量 1） |
| v2–v3 | 8 | 否（余量 2） |
| v4–v3 | 4 | 否（余量 2） |
| v6–v5 | 4 | 否（余量 2） |

余量 = 权 − |dist[u] − dist[v]|，大于 0 就说明这根绳子到最后也拉不直。

| 顶点 | v0 | v1 | v2 | v3 | v4 | v5 | v6 |
|---|---|---|---|---|---|---|---|
| dist | 0 | 5 | 3 | 9 | 7 | 13 | 11 |
| path（前驱） | − | v2 | v0 | v1 | v0 | v3 | v4 |

- 锁定顺序（= 离桌顺序）：v0 → v2 → v1 → v4 → v3 → v6 → v5。顶点编号故意没按距离排，免得看起来像按编号走。
- "先找到较长、后更新为更短"有两次：锁定 v2 后 v1 从 6 变成 5（v0→v2→v1 比 v0→v1 近）；锁定 v1 后 v3 从 11 变成 9。
- dist 互不相同，锁定顺序没有歧义。
- 脚本核对：Dijkstra 和 Bellman-Ford、枚举所有简单路径三种算法结果一致；每条边在桌上的直线距离都比绳长短（绳子一开始是松的）；把 H 从 0 扫到 14，确认每颗珠子离桌时的 H 正好等于 dist，非树边的 3D 距离始终不超过绳长的 0.85，珠子之间没有穿模（最小间隙 0.116）。

## 运动学（`src/dijkstra-rope/kinematics.ts`，和脚本是同一套公式）

整个画面只由 H 决定，H 是帧号的函数（`timeline.ts` 的 `heightAt`），没有物理引擎和随机数，每次渲染结果一样。

- 1 个权值单位 = 0.45 世界单位；珠子半径 0.18。
- 源点水平不动，往上提 H·S。
- 其它珠子 v（树上的父结点 p，绳长 L）：p 被提起 h_p 后，绳子水平方向最多还能放 √(L² − h_p²)，珠子比这远就被拖着在桌上滑向 p；h_p = L（即 H = dist[v]）时正好滑到 p 下方离桌，之后挂在 p 下方，高度差 = 权值。所以离桌高度 = dist 是精确的。
- 松绳：两端之间画一条 sin 弧，弧高用二分法求出，让弧长 ≈ 绳长；在桌上时往侧面弯并贴着桌面，挂起来以后往侧面弯（主链上的往卷尺那侧，v4–v6 那一支上的往外侧），不和树边重叠。拉直（3D 距离 ≥ 绳长）时画直线。

## 怎么渲染

```powershell
cd D:\Release\DarkKandaoMaster_Video\05-最短路径\3D小样-绳结
pnpm install                                  # 第一次。three 相关包在 npmmirror 上 500 过，可以加 --registry=https://registry.npmjs.org/
$env:PYTHONIOENCODING="utf-8"
& $PY scripts\check_numbers.py                # 改了图 / 布局后重跑，生成 src\dijkstra-rope\data.generated.ts
pnpm dev                                      # Studio 预览
pnpm exec tsc --noEmit
pnpm render                                   # = remotion render ... --gl=angle --concurrency=6 → out\DijkstraRope.mp4
& $PY ..\..\_tools\finish.py out\DijkstraRope.mp4 Dijkstra绳结-3D小样.mp4
& $PY ..\..\_tools\grab_frames.py Dijkstra绳结-3D小样.mp4 抽帧 名字=帧号 ...
```

- WebGL 必须加 `--gl=angle`（Windows + NVIDIA）。单帧：`pnpm exec remotion still src/index.ts DijkstraRope out/x.png --frame=600 --gl=angle`。
- 依赖：`@remotion/three` 4.0.529（和 remotion 同版本）、`@react-three/fiber` 9、`three` 0.187、`@types/three`。
- 3D 层（`Scene3D.tsx`）只画几何；数字、名字、表格、字幕都在平面层（`Hud.tsx`），贴在 3D 物体旁边的标签用 `camera.ts` 里同一个相机函数投影到屏幕坐标，所以字永远是正的、等大的。

## 文件

```
scripts/check_numbers.py          图、Dijkstra、暴力核对、运动学自检 → data.generated.ts、scripts/out/numbers.json
src/dijkstra-rope/
  data.generated.ts               脚本生成，别手改
  kinematics.ts                   珠子位置、绳子形状（只依赖 H）
  timeline.ts                     时间点、H(帧)、每颗珠子的锁定帧、镜头关键帧
  camera.ts                       镜头参数 → three.js 相机；平面层投影
  Scene3D.tsx                     桌面、珠子、绳子、提环、卷尺
  Hud.tsx                         标签、Dijkstra 表、H 读数、标题、字幕
  DijkstraRope.tsx                两层叠起来 + BGM + 音效
```

## 已知局限

- 物理是"讲道理用的"近似：只有树边拖珠子，非树边不参与受力（脚本确认它们一直是松的，所以看不出破绽）；珠子在桌上被拖动时没有摩擦、没有惯性。
- 为了侧视时两支分得开，v4–v6 那一支挂起后往旁边错开 0.6，于是 v0–v4 这根绳子画出来比 7×0.45 长约 3.6%（高度仍然精确，离桌顺序和高度不受影响）。
- 挂起来的松绳往侧面弯成弧，而真实的绳子会垂成 U 形挂在下面；真垂下来会和主链重叠，看不清，所以选了侧弯。
- 画面里的珠子名用投影后的 HTML 字写在珠子上，被绳子挡住时字不会被挡（字永远在最上层）。
- 只有一个镜头一镜到底，局部修改要重渲整条（好在很快：本机 RTX 4060 Laptop，`--gl=angle --concurrency=6` 渲 990 帧约 40 秒）。
- 权值小签放在绳子中点，再做几轮"互相推开 + 躲开珠子"，挤的时候（v3 刚离桌那几秒，三根权为 4 的绳子聚在一起）签和绳子的对应关系要稍微看一下。
- 卷尺盒和连到提环的横杆是为了让"卷尺读数 = 提起高度"成立而加的道具，第一次看可能要想一下。

## 以后用在课堂版

老师的教创赛课（`..\课堂版-磁性套索\`）如果要用这个模型，建议做成按键分步的单文件 three.js HTML，而不是放视频：

- `kinematics.ts` 是纯函数，可以原样搬进去；按一下键 = H 走到下一个 dist（tween 过去），停住让老师讲，HUD 表同步锁定一格。
- 再加：← 退回上一步、R 重来、鼠标拖动转镜头（课堂上可以让学生自己转着看）、换一张图（只要换 `data.generated` 那份 JSON）。
- 字号要比视频再大一号，HUD 表放右边，投影仪上看得清。
- 离线：three.js 打包进 HTML，字体用系统字体或内嵌，不连网。
