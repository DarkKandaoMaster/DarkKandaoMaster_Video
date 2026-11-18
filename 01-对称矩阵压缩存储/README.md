# 对称矩阵压缩存储 · 留白版（SymStoreV2）

按用户定稿的 `字幕-v6.md` 重做的对称矩阵压缩存储：纯色暖白底、同屏最多两块、矩阵靠镜头推拉，讲给大一新生。顺序：只存一半 → 按行存下三角、数出 a₄₃ 的 k=8 → 一般式 i(i−1)/2+(j−1) → i<j 交换 → 按行存上三角、数出 a₃₄ 的 k=10 → 一般式 (i−1)(2n−i+2)/2+(j−i)、i>j 交换 → 小题 a₅₂（停 2.5 s）→ 答案 8。

- 成片：`对称矩阵压缩存储.mp4`，**2:02.9**（3686 帧，122.92 s），1920×1080，30 fps，H.264 + AAC 48 kHz，-16.0 LUFS，真峰值 -3.2 dBTP
- 旁白：`src/sym-store-v2/narration.json`，19 条，MiniMax speech-2.8-hd，旧克隆音色（.env 的 `MINIMAX_VOICE_ID`），**speed 1.1**，aigc_watermark=false，合计 107.0 s；字幕与 `字幕-v6.md` 逐字一致
- 分镜：`脚本.md`（旧旁白时的留白版设计在 `脚本-旧旁白版.md`；`字幕-v2.md`～`字幕-v6.md` 是旁白历次稿）
- 画面：`src/sym-store-v2/SymStoreV2.tsx`；时间线：`src/sym-store-v2/timeline.ts`（PLAN + 关键时刻 K，全部挂在 `p(旁白 id, 分句开头文字)` 上）
- BGM `bright-01`（level 0.6），音效 pop / snap / whoosh / ding / ding_hi（0.05～0.12），停顿时不放
- 核对脚本：`scripts/check_numbers.py`（暴力核对片中所有数字和公式）、`scripts/check_subs.py`（字幕与 v6 逐字比对、每屏字数）、`scripts/check_splits.py`（TTS 分句切点）
- 验收抽帧：`抽帧\`（25 张，覆盖每一段）

## 常用命令（在本目录，`$PY` = myenv 的 python.exe）

```powershell
$env:PYTHONIOENCODING="utf-8"
& $PY scripts\check_numbers.py
& $PY scripts\check_subs.py
& $PY ..\_tools\tts.py --speed 1.1 --no-api           # 只改字幕 / 时间线时（不调接口）；改了 speak 才去掉 --no-api
& $PY scripts\check_splits.py
& $PY ..\_tools\print_timeline.py
pnpm exec tsc --noEmit
pnpm dev                                              # Remotion Studio 预览
pnpm render --port=3000                               # → out\SymStoreV2.mp4（3705–3804 等端口段被 Windows 保留，3711 用不了）
& $PY ..\_tools\finish.py out\SymStoreV2.mp4 对称矩阵压缩存储.mp4
& $PY ..\_tools\grab_frames.py 对称矩阵压缩存储.mp4 抽帧 s04d-k8=1150 s08-k10=2592 s10-wait=3410 s11-end=3645
```

注意：重新配音必须带 `--speed 1.1`，否则签名对不上，会按 1.0 整套重新调接口。

## 新克隆音色版（变体 n）

- 成片：`对称矩阵压缩存储-新音色.mp4`，**2:13.5**（4005 帧，133.55 s），MiniMax speech-2.8-hd 克隆音色 `DarkKandaoMaster_voice`（11-07 克隆的新音色）、**speed 1.1**、aigc_watermark=false，-16.0 LUFS，真峰值 -2.7 dBTP；验收抽帧：`抽帧-新音色\`（11 张）
- 2026-11-09 出，供和主版本（旧音色，2:02.9）对比试听；主版本 `对称矩阵压缩存储.mp4` 及其 audio/、narration.generated.ts、缓存都没动
- 产物完全分开：`public/sym-store-v2/audio-n/`、`src/sym-store-v2/narration.generated.n.ts`、`scripts/cache/sym-store-v2-n-tts.json`；narration.json 共用主版本的 `speak`
- 机制：`variant-n.env`（REMOTION_VARIANT=n）+ `pnpm dev:n` / `render:n`；`timeline.ts` 按 VARIANT 选 CLIPS，不设变量 = 主版本
- 旁白合计 117.67 s，比主版本（107.02 s）长 10.65 s（约 10%），主要多在 s4c +2.44、s8 +1.90、s3 +1.09、s10 +0.96；动画都挂在分句上，跟着走
- check_splits：4 个 CHECK，都不影响画面——s3"下标"8.64 s（切点比低谷晚 0.06 s，起音偏软）、s7"只是每行"4.04 s 和"往下"7.22 s（同类，起音偏软）、s11"一共八个"4.84 s（"左边三个，一共八个"之间几乎不停顿；8 的高亮挂在切点 +12 帧，跟得上）

```powershell
& $PY ..\_tools\tts.py --engine minimax --voice-id DarkKandaoMaster_voice --speed 1.1 --variant n   # 调接口（花钱）；签名没变走缓存；只改字幕 / 时间线时加 --no-api
& $PY ..\_tools\print_timeline.py --variant n
& $PY scripts\check_splits.py --variant n
pnpm render:n --port=3000                             # → out\SymStoreV2-n.mp4（不会覆盖 out\SymStoreV2.mp4）
& $PY ..\_tools\finish.py out\SymStoreV2-n.mp4 对称矩阵压缩存储-新音色.mp4
& $PY ..\_tools\grab_frames.py 对称矩阵压缩存储-新音色.mp4 抽帧-新音色 s02-sym=280 s03-index=665 s04c-left2=1160 s04d-k8=1263 s05c-fml=1760 s06b-swap=2190 s07-rows=2500 s08-k10=2835 s09b-fml=3320 s10-wait=3720 s11-end=3940
```

注意：重配变体 n 必须同时带 `--voice-id DarkKandaoMaster_voice --speed 1.1 --variant n`，少一个签名就对不上，会整套重新调接口（不带 `--variant` 还会写到主版本路径）。

## BGM 对比版（bright-02 / bright-03，2026-11-09）

- 成片：`对称矩阵压缩存储-bgm02.mp4`、`对称矩阵压缩存储-bgm03.mp4`（2:02.9，-16.0 LUFS，真峰值 -3.2 / -3.3 dBTP）。旁白、画面、音效、BGM level 0.6 和闪避参数都和主版本一样，只换 BGM 文件（BGM 原文件都在 -18.4 LUFS 左右）。测量和结论见 `BGM对比.md`，A/B 片段在 `对比片段\`
- 机制：`REMOTION_BGM`（不设 = bright-01）经 `bgm-02.env` / `bgm-03.env` 设，`pnpm render:bgm02` / `render:bgm03` → `out\SymStoreV2-bgm02.mp4` / `-bgm03.mp4`；`dev:bgm02` / `dev:bgm03` 预览
- 测量用开关 `REMOTION_STEM`（默认不设）：`bgm` = 只有 BGM，`voice` = 只有旁白；配 `remotion.audio.config.ts` 只渲染 wav（约 15 s 一条），测量脚本 `scripts\measure_bgm.py`

```powershell
pnpm render:bgm02 --port=3000
& $PY ..\_tools\finish.py out\SymStoreV2-bgm02.mp4 对称矩阵压缩存储-bgm02.mp4
$env:REMOTION_STEM="bgm"; $env:REMOTION_BGM="bright-02"
pnpm exec remotion render src/index.ts SymStoreV2 out/stems/bgm-bright-02.wav --config=remotion.audio.config.ts --port=3000
$env:REMOTION_STEM=$null; $env:REMOTION_BGM=$null                     # 测完清掉，免得后面正常渲染也变成分轨
& $PY scripts\measure_bgm.py
```

## check_splits 的 3 处 CHECK（都不影响画面）

- s4c"a 四 二 两个"切点 5.02 s 偏晚（"a 四 一、a 四 二"之间几乎不停顿）：a₄₂ 染蓝挂在这个切点前 2 帧，看起来跟得上。
- s8"本行从 a 三 三"切点在低谷后 0.1 s、起音偏软：只用来换字幕，a₃₃ 标签另加 16 帧。
- s9c"同样先交换"谷浅：只用来放弧线箭头，误差在几帧内。

## 相对现版工程（`..\_旧版\01-对称矩阵压缩存储-20261029\`）的改动

- 画面全部重写（`SymStoreV2.tsx`），不再用方格纸 / PaperKit / 白卡片 / Chip；`components/BilingualSubtitle.tsx` 换成 BFS 留白版那份（31/21 px，`line: "none"` 时不描边不投影）。
- 去掉 x / m 配音变体；变体 n 去掉后又于 11-09 重新加回（见上"新克隆音色版"）。
- 复制来但用不到的文件（旧 SymStore.tsx、旧 narration*、PaperKit、Marks、paper.ts、calm-01、stamp、tick、现版的 README / 脚本副本）移到了 `..\_待删除\对称矩阵v2-复制来未用\`；多抽的 5 张帧在 `..\_待删除\对称矩阵v2-多抽的帧\`。
