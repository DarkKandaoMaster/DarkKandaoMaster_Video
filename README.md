# DarkKandaoMaster 讲解视频

B 站知识区横屏讲解视频：1920×1080、30 fps、H.264 + AAC，Remotion 4.0.529 + React 19。**每条视频一个独立的 Remotion 工程**；新视频从 `_template` 起手。约定与流程见 [AGENTS.md](AGENTS.md)。

**目录命名（2026-11-10 定）**：根目录每个视频（知识点）只有一个文件夹 `NN-标题/`，NN 按话题首次出现的先后编号，不带日期，日期记在下表和各自 README 里；同一知识点的旧版 / 待定变体统一放 `_旧版/NN-标题-<日期>/`。一个话题有多份材料时（如 05 最短路径）在它的文件夹下再分子目录。

| 目录 | 日期 | Composition | 风格 | 时长 | 状态 |
|---|---|---|---|---|---|
| `01-对称矩阵压缩存储/` | 2026-11-08 | `SymStoreV2` | 纯色暖白底 `#FAF7F0`、留白、细线空心格，BGM bright-01（另有 bright-02 / 03 对比版） | 2:03 | 重做版（旁白 `字幕-v6.md`），待用户看片 |
| `02-KMP/` | 2026-10-29 | `KMP` | 浅色方格纸，拟人角色"小 i" | 2:28 | 旧版已出片，用户要求重做（方案见 `_旧版/02-KMP重制方案-20261103/`），留作参考 |
| `03-图的深度优先遍历/` | 2026-11-06 | `DFS` | 暖白底 + 淡点阵，教材 G4 | 2:59 | 视频初稿待反馈；另有 `课堂版/`（鼠标点出的离线 HTML，第三版 67 步，2026-11-17 已交老师） |
| `04-图的广度优先遍历/` | 2026-11-06 | `BFS` | 同 DFS | 3:00 | 视频初稿待反馈；另有 `课堂版/`（第三版 77 步，2026-11-17 已交老师） |
| `05-最短路径/` | 2026-11-09 | 子目录各自看 | 课堂版 HTML（`课堂版-磁性套索/`）、`导航演示/`、`迪杰斯特拉/`（正课课堂版）、`迪杰斯特拉-视频/`（B 站配音版，字幕 v2 已定，待建工程）、3D 小样（`3D小样-绳结/`，`DijkstraRope`，0:33）、`地图/` | — | 老师教创赛用，见 `05-最短路径/README.md` |
| `_旧版/01-对称矩阵压缩存储-20261029/` | 2026-10-29 | `SymStore` | 浅色方格纸，中英双语字幕，BGM bright-01 | 1:25（Edge 变体 1:23，presenter_male 变体 1:28） | 第一版，已出片；主版本 = 本人克隆音色，另有 x / m / n 配音变体 |
| `_旧版/02-KMP重制方案-20261103/` | 2026-11-03 | — | 深色黑板 + 尺子 | 预计约 3:15 | 重制版方案：`脚本.md` 待过目 + `风格小样/`（静帧与源码），还不是 Remotion 工程 |
| `_旧版/04-图的广度优先遍历-留白版-20261106/` | 2026-11-06 | `BFSAiry` | 同 BFS，只做前三镜，留白 + 镜头 + 先问后答 | 2:22 | 试验小样，待用户定方向 |
| `_template/` | — | `Example` | 浅色方格纸示例（6.9 秒） | — | 起手工程 |

## 目录

```
NN-<标题>/                          # 一个视频（知识点）一个文件夹；日期写在 README
  package.json  pnpm-lock.yaml  remotion.config.ts  tsconfig.json
  src/
    index.ts  Root.tsx              # 只注册这一条的 Composition
    base/                           # theme（VIDEO / FONT / 深色 C）、anim（缓动 / 进度）、fonts、timeline（buildTimeline + p()）
    components/                     # 只放这条用到的通用件：Math / Marks / Narration（旁白 + 字幕 + BGM 闪避 + 音效）/ 字幕 …
    <slug>/                         # 这条视频：narration.json → narration.generated.ts、timeline.ts、各镜头组件
  public/
    fonts/                          # 不入库：从 C:\Windows\Fonts 复制 NotoSansSC-VF.ttf consola.ttf consolab.ttf cambriai.ttf
    bgm/  sfx/                      # 只放这条用到的（_tools/synth_*.py 合成，输出确定）
    <slug>/audio/*.mp3              # tts.py 生成的旁白
  scripts/cache/<slug>-tts.json     # TTS 签名缓存；scripts/raw/ 是接口原始返回（不入库）；视频专属脚本也放 scripts/
  <标题>.mp4  抽帧/  脚本.md  README.md
  out/                              # 渲染中间产物（不入库）
05-最短路径/                        # 一个话题多份材料时分子目录：课堂版-磁性套索/  3D小样-绳结/  地图/（见其 README）
_旧版/                              # 同一知识点的旧版 / 待定变体：NN-标题-<日期>/，比根目录深一层
_template/                          # 起手工程，见 _template/README.md
_tools/                             # 共用脚本：tts.py finish.py grab_frames.py print_timeline.py synth_audio.py synth_bright.py clone_voice.py（MiniMax 音色复刻）（project.py = 定位工程）
docs/                               # 整个不入库：记忆/（相关记忆副本）、会话记录/（历史会话）、参考/WickMind-AGENTS.md、
                                    #   参考视频/（蓝不过海呀 DFS/BFS 原片 + 转写 + 抽帧）、音色复刻/（新音色样本、试听、记录）、
                                    #   录音转文字-20261106/（11-06 重录 7 段 + 转写）、录音转文字-20261109/（和老师面谈录音 + 转写 + 摘要）、
                                    #   BGM试做-20261109/（bright-02 / bright-03 试做源文件，wav 已复制进 01 的 public/bgm/）、
                                    #   教创赛与青教赛PPT/、讨论提纲 / BGM 思路等 md
_待删除/                            # 要丢弃的东西，用户手动删
```

## 常用命令

`PY` = `D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe`。在某条视频的工程目录里执行（`_tools` 的脚本也可以在根目录跑，加 `--project <目录>`）。下面按根目录下一层的工程写；`_旧版\` 和 `05-最短路径\` 下面的工程深一层，`..\_tools` 改成 `..\..\_tools`。工程改名 / 移动后 pnpm 的 junction（绝对路径）会断，在新位置重新 `pnpm install --offline` 即可（不会删 `node_modules\.remotion\`）。

```powershell
pnpm install                                                  # 第一次（pnpm store 在 D:\.pnpm-store，硬链接，每个工程自身只占约 2 MB）
Copy-Item C:\Windows\Fonts\NotoSansSC-VF.ttf, C:\Windows\Fonts\consola.ttf, C:\Windows\Fonts\consolab.ttf, C:\Windows\Fonts\cambriai.ttf public\fonts\

$env:PYTHONIOENCODING="utf-8"
& $PY ..\_tools\tts.py                  # 配音（签名没变的条目走缓存，不调接口）；--no-api 只重算分句时刻 / 清单
& $PY ..\_tools\print_timeline.py       # 每条旁白 / 分句的绝对帧（挑抽帧时刻用）

pnpm dev                                # Remotion Studio 预览
pnpm exec tsc --noEmit
pnpm render                             # → out/<Composition>.mp4
& $PY ..\_tools\finish.py out\SymStore.mp4 对称矩阵压缩存储.mp4   # 两遍 loudnorm（-16 LUFS）+ 限幅 + 自检
& $PY ..\_tools\grab_frames.py 对称矩阵压缩存储.mp4 抽帧 名字=帧号 ...
```

渲染需要 Chrome Headless Shell（`node_modules/.remotion/`，约 270 MB）：没有时第一次 render 会自动下载；也可以从已有工程复制过来。

## 配音（MiniMax）

接口 `api.minimaxi.com/v1/t2a_v2`，模型 `speech-2.8-hd`，`aigc_watermark=false`；语速以各工程 README 为准（成片都是 `--speed 1.1`，BFS 留白版用默认 1.0），重配必须带同样的 `--speed`，否则签名变了会整批重调接口；按 sha1(模型 + 音色 + 语速 + 文本) 缓存在 `<工程>/scripts/cache/<slug>-tts.json`。密钥只从 `D:\Release\WickMind\config\.env` 读入，脚本只打印"是否读到"，本文件夹里不存密钥。每条旁白 loudnorm 到 -16 LUFS；成片再整体两遍 loudnorm。

配音变体：`tts.py --variant x --engine edge`（Edge TTS，免费）或 `--variant m --voice-id presenter_male`（MiniMax 系统音色），产物走 `audio-<变体>/`、`narration.generated.<变体>.ts` 等独立路径，不碰主版本；渲染用 `pnpm render:x` / `render:m`（`variant-<变体>.env` 设 `REMOTION_VARIANT`）。例子见 `_旧版/01-对称矩阵压缩存储-20261029/README.md`（`01-对称矩阵压缩存储/` 另有变体 n 和 `bgm-02.env` / `bgm-03.env` BGM 对比版）。

## 约定

- 颜色只用 theme token：深色视频琥珀 `#D9962B` 唯一重点色；浅色视频珊瑚橙 `#E5582F` 唯一重点色、每行一种便签色；绿 / 红只在例题结算时用。
- 不拉 CDN / 网络字体；公式用 `Math.tsx` 的 HTML 排版。
- 不删文件：要丢弃的移到 `_待删除/`。
