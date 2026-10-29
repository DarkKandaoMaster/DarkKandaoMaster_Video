# DarkKandaoMaster 讲解视频

B 站知识区横屏讲解视频：1920×1080、30 fps、H.264 + AAC，Remotion 4.0.529 + React 19。**每条视频一个独立的 Remotion 工程**，目录名 = `创建日期-标题`；新视频从 `_template` 起手。约定与流程见 [AGENTS.md](AGENTS.md)。

| 目录 | Composition | 风格 | 时长 |
|---|---|---|---|
| `2026-10-29-对称矩阵压缩存储/` | `SymStore` | 浅色方格纸，中英双语字幕，BGM bright-01 | 1 分 25 秒 |
| `_template/` | `Example` | 浅色方格纸示例（6.9 秒） | — |

## 目录

```
<创建日期>-<标题>/
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
_template/                          # 起手工程，见 _template/README.md
_tools/                             # 共用脚本：tts.py finish.py grab_frames.py print_timeline.py synth_audio.py synth_bright.py（project.py = 定位工程）
_资料/                              # 记忆/（相关记忆副本）、会话记录/（历史会话，不入库）、参考/WickMind-AGENTS.md
_待删除/                            # 要丢弃的东西，用户手动删
```

## 常用命令

`PY` = `D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe`。在某条视频的工程目录里执行（`_tools` 的脚本也可以在根目录跑，加 `--project <目录>`）。

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

接口 `api.minimaxi.com/v1/t2a_v2`，模型 `speech-2.8-hd`，`aigc_watermark=false`，语速 1.0；按 sha1(模型 + 音色 + 语速 + 文本) 缓存在 `<工程>/scripts/cache/<slug>-tts.json`。密钥只从 `D:\Release\WickMind\config\.env` 读入，脚本只打印"是否读到"，本文件夹里不存密钥。每条旁白 loudnorm 到 -16 LUFS；成片再整体两遍 loudnorm。

## 约定

- 颜色只用 theme token：深色视频琥珀 `#D9962B` 唯一重点色；浅色视频珊瑚橙 `#E5582F` 唯一重点色、每行一种便签色；绿 / 红只在例题结算时用。
- 不拉 CDN / 网络字体；公式用 `Math.tsx` 的 HTML 排版。
- 不删文件：要丢弃的移到 `_待删除/`。
