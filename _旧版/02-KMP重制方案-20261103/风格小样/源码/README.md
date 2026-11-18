# _template：新视频起手工程

最小可跑的 Remotion 工程：Composition `Example`（207 帧 = 6.9 秒，浅色方格纸 + 一排便签格子 + 公式卡 + 中英双语字幕 + BGM 闪避 + 音效）。

## 新开一条视频

1. 先写 `脚本.md`（分镜 + 旁白）给用户过目。
2. 复制（任选其一），目录名 = `创建日期-标题`：
   - 从模板：在根目录 `robocopy _template 2026-11-02-标题 /E /XD node_modules out`
   - 从最接近的一条：`robocopy _旧版\01-对称矩阵压缩存储-20261029 2026-11-02-标题 /E /XD node_modules out`（再把用不到的旧镜头移到 `_待删除\`）
3. 新目录里 `pnpm install`（字体 `public/fonts/` 已随目录复制；若没有，见根 README）。
4. 把 `src/example/` 改名为这条的 slug（如 `src/linked-list/`），`public/example/` 同步改名，`Root.tsx` 改 Composition id，`package.json` 改 `name` 与 `render` / `render:x` 脚本里的 id。
5. 写 `src/<slug>/narration.json` → `& $PY ..\_tools\tts.py` → 改 `timeline.ts` 的 PLAN → 写画面 → `pnpm render` → `finish.py` → `grab_frames.py` 抽帧逐张看。

## 里面有什么

```
src/
  base/theme.ts      VIDEO（1920×1080 / 30 fps）、FONT、hexA / mixColor、深色 token C（第一条视频那套）
  base/paper.ts      浅色方格纸 token L、每行便签色 ROW（第二条起的风格）
  base/anim.ts       缓动与进度：progress / mix / fadeIn / rise …
  base/fonts.ts      从 public/fonts 加载 DK Sans / DK Mono / DK Math
  base/timeline.ts   buildTimeline(CLIPS, PLAN, 片尾帧) → at / end / p(旁白, 分句开头文字) / speech（BGM 闪避区间）
  components/
    PaperKit.tsx     PaperBackground、PTile 便签格子、PSlot 空位、Txt、VBrace、Badge、Stamp、Card、Chip
    Math.tsx         V 变量 / N 数字 / Op / P / Sub / A(a_ij) / Frac / Row
    Marks.tsx        Brace / StartMark / Hop / Label（默认深色配色，浅色视频传 color）
    Narration.tsx    NarrationTrack（旁白 + 字幕；传 subtitlePalette = 双语字幕）、BgmTrack（闪避）、SfxTrack
    BilingualSubtitle.tsx  Subtitle.tsx  Rich.tsx（字幕里 a_{35} → 下标）  bgm.ts（闪避曲线）
  example/           narration.json → narration.generated.ts（tts.py 生成）、timeline.ts、Example.tsx
                     narration.generated.x.ts  配音变体 x 的清单（模板里是导出空数组的占位，见下"配音变体"）
public/
  example/audio/s1a.mp3   示例旁白（取自旧片「上下三角矩阵」s1a，所以 tts.py --no-api 能直接跑）
  bgm/calm-01.wav  bgm/bright-01.wav  sfx/*.wav   由 _tools/synth_audio.py、synth_bright.py 合成
```

深色版的格子 `Cells.tsx` 与墨蓝背景 `Background.tsx` 没放进模板，要用从 `docs\参考\旧版深色组件-8126196\` 取（2026-11-07 从已弃用的首个提交 8126196 里抽出的副本；docs 不进 git）。

## 命令

```powershell
pnpm dev                     # 预览
pnpm exec tsc --noEmit
pnpm render                  # → out\Example.mp4
```

## 配音变体（不想用本人克隆音的平台：免费 Edge TTS 配一版）

主版本（MiniMax）的音频、清单、成片完全不动，变体的产物都走独立路径：

```powershell
$env:PYTHONIOENCODING="utf-8"
& $PY ..\_tools\tts.py --engine edge --voice zh-CN-YunxiNeural --rate +10% --variant x
#   → public\<slug>\audio-x\*.mp3、src\<slug>\narration.generated.x.ts、scripts\cache\<slug>-x-tts.json（免费，可反复调 --rate）
& $PY ..\_tools\print_timeline.py --variant x
pnpm render:x                # = remotion render ... out\<Comp>-x.mp4 --env-file=variant-x.env
& $PY ..\_tools\finish.py out\<Comp>-x.mp4 <标题>-edge.mp4
```

- 选哪套旁白由 `REMOTION_VARIANT` 决定：`variant-x.env` 里写着 `REMOTION_VARIANT=x`，`render:x` / `dev:x` 用 `--env-file` 读它；`pnpm render` / `pnpm dev` 不读，所以还是主版本。`src/<slug>/timeline.ts` 里按它选 `CLIPS`。
- 画面动画都挂在 `p(旁白 id, 分句开头文字)` 上，换了配音时长也跟着走；不要写死绝对帧号。
- Edge 读错的地方（字母、"2 个"读成"两个"等）在 narration.json 那一项加 `speak_x`（变体送读文本，按标点切开的分句数必须和 `speak` 一样），主版本的 `speak` 不动。
- 渲染报 `No available ports found` 时（Windows 把 3000 段端口保留了），在命令后加 `--port=3700`：`pnpm render:x --port=3700`。
