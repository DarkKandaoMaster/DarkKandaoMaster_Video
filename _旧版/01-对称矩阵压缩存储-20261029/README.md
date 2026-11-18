# 对称矩阵压缩存储（SymStore）

先抛题"a₄₃ 的下标 k 是几"，数前面的格子推出下标公式，再讲 i < j 时交换、按行存上三角，最后接着"i > j 照样交换"留一道上三角小题 a₅₂（换成 a₂₅，k = 8）。

- 成片：`对称矩阵压缩存储.mp4`，**1:25.2**（2553 帧，85.16 s），1920×1080，30 fps，H.264 + AAC 48 kHz，-16.0 LUFS，真峰值 -3.0 dBTP
- 分镜与旁白：`脚本.md`；旁白：`src/sym-store/narration.json`（MiniMax speech-2.8-hd，**speed 1.1**，aigc_watermark=false，16 条）
- 画面：`src/sym-store/SymStore.tsx`；时间线：`src/sym-store/timeline.ts`（动画挂在 `p(旁白 id, 分句开头文字)` 上）
- 核对脚本：`scripts/check_numbers.py`（暴力核对片中所有数字和公式）；`scripts/check_splits.py`（抽查 TTS 分句切点是否落在停顿之后）
- 验收抽帧：`抽帧\`

## 常用命令（在本目录，`$PY` = myenv 的 python.exe）

```powershell
$env:PYTHONIOENCODING="utf-8"
pnpm dev                                              # Remotion Studio 预览
pnpm exec tsc --noEmit
& $PY scripts\check_numbers.py
& $PY ..\..\_tools\tts.py --speed 1.1 --no-api           # 只改字幕 / 时间线时（不调接口）；改了 speak 才去掉 --no-api
& $PY scripts\check_splits.py
& $PY ..\..\_tools\print_timeline.py
pnpm render                                           # → out\SymStore.mp4
& $PY ..\..\_tools\finish.py out\SymStore.mp4 对称矩阵压缩存储.mp4
& $PY ..\..\_tools\grab_frames.py 对称矩阵压缩存储.mp4 抽帧 s3-k8=590 s6-morph=1830 s7-arc=2350 s7-k8=2460 end=2545
```

注意：重新配音必须带 `--speed 1.1`，否则签名对不上，会按 1.0 重新调接口。

## Edge TTS 配音版（不用本人声音的平台）

- 成片：`对称矩阵压缩存储-edge.mp4`，**1:23.4**（2499 帧，83.30 s），Edge TTS `zh-CN-YunxiNeural`、`--rate +10%`，-16.1 LUFS，真峰值 -1.7 dBTP；验收抽帧：`抽帧-edge\`
- 产物与 B 站版完全分开：`public/sym-store/audio-x/`、`src/sym-store/narration.generated.x.ts`、`scripts/cache/sym-store-x-tts.json`
- narration.json 里 s5a / s5b / s6c / s6e 有 `speak_x`（只给 Edge 用的读法：s5a 去掉"呢"前的空格、s5b 加"当"、s6c "2 个"写成"二个"（否则读成"两个"）、s6e 加"就"），B 站版的 `speak` 没动

```powershell
& $PY ..\..\_tools\tts.py --engine edge --voice zh-CN-YunxiNeural --rate +10% --variant x   # 免费；签名没变走缓存
& $PY ..\..\_tools\print_timeline.py --variant x
& $PY scripts\check_splits.py --variant x
pnpm render:x --port=3700                             # → out\SymStore-x.mp4（--port：本机 3000 段端口被 Windows 保留时要加）
& $PY ..\..\_tools\finish.py out\SymStore-x.mp4 对称矩阵压缩存储-edge.mp4
& $PY ..\..\_tools\grab_frames.py 对称矩阵压缩存储-edge.mp4 抽帧-edge s3-k8=580 s6-morph=1766 s7-k8=2410 end=2491
```

## MiniMax 系统音色版（变体 m）

- 成片：`对称矩阵压缩存储-minimax.mp4`，**1:27.7**（2630 帧，87.72 s），MiniMax speech-2.8-hd 系统音色 `presenter_male`、**speed 1.1**、aigc_watermark=false，-16.0 LUFS，真峰值 -2.5 dBTP；验收抽帧：`抽帧-m\`
- 产物与 B 站版、Edge 版完全分开：`public/sym-store/audio-m/`、`src/sym-store/narration.generated.m.ts`、`scripts/cache/sym-store-m-tts.json`（缓存条目记 `voice: presenter_male`）
- narration.json 只有 s6d 加了 `speak_m`（"拼长方形。再砍一半。"：逗号改句号，否则 presenter_male 一口气读完、切点落不到"再砍一半"起音上）；其余直接读 B 站版的 `speak`（同是 MiniMax，读法已验证过）
- check_splits：1 个 CHECK，s6e"i 大于 j"切点比起音早约 0.1 s（前面是 0.6 s 长停顿，无碍，和 Edge 版那两处同类）；s6d"再砍一半"切点 2.36 s，正好在起音处

```powershell
& $PY ..\..\_tools\tts.py --engine minimax --voice-id presenter_male --speed 1.1 --variant m   # 调接口（花钱）；签名没变走缓存
& $PY ..\..\_tools\print_timeline.py --variant m
& $PY scripts\check_splits.py --variant m
pnpm render:m --port=3700                             # → out\SymStore-m.mp4
& $PY ..\..\_tools\finish.py out\SymStore-m.mp4 对称矩阵压缩存储-minimax.mp4
& $PY ..\..\_tools\grab_frames.py 对称矩阵压缩存储-minimax.mp4 抽帧-m s3-k8=606 s6-morph=1868 s6d-halve=1982 s7-k8=2538 end=2622
```

注意：重新配音必须带 `--voice-id presenter_male --speed 1.1`，否则签名对不上（或去读密钥文件里的克隆音色）；只改字幕 / 时间线时加 `--no-api`。

## 新克隆音色试听版（变体 n）

- 成片：`对称矩阵压缩存储-新音色.mp4`，**1:30.2**（2705 帧，90.22 s），MiniMax speech-2.8-hd 克隆音色 `DarkKandaoMaster_voice`（2026-11-06 重录样本克隆）、**speed 1.1**、aigc_watermark=false，-16.0 LUFS，真峰值 -2.3 dBTP；验收抽帧：`抽帧-新音色\`
- 2026-11-07 首次正式调用这个音色（供用户和主版本旧音色对比试听）；主版本 `对称矩阵压缩存储.mp4` 仍是旧音色，没动
- 产物完全分开：`public/sym-store/audio-n/`、`src/sym-store/narration.generated.n.ts`、`scripts/cache/sym-store-n-tts.json`（缓存条目记 `voice: DarkKandaoMaster_voice`）；narration.json 没加 `speak_n`，直接读主版本的 `speak`
- 旁白合计 78.82 s，比主版本（73.72 s）长 5.1 s（约 7%），主要多在 s2a +1.04、s4c +0.94、s4b +0.78、s5a +0.74；动画都挂在分句上，跟着走
- check_splits：1 个 CHECK，s6b"左边一个"切点 2.92 s，比最低点晚 0.14 s（谷只有 -36.7 dB，切点落在起音处）

```powershell
& $PY ..\..\_tools\tts.py --engine minimax --voice-id DarkKandaoMaster_voice --speed 1.1 --variant n   # 调接口（花钱）；签名没变走缓存
& $PY ..\..\_tools\print_timeline.py --variant n
& $PY scripts\check_splits.py --variant n
pnpm render:n --port=3700                             # → out\SymStore-n.mp4
& $PY ..\..\_tools\finish.py out\SymStore-n.mp4 对称矩阵压缩存储-新音色.mp4
& $PY ..\..\_tools\grab_frames.py 对称矩阵压缩存储-新音色.mp4 抽帧-新音色 s1-q=150 s2-fly=380 s3-k8=625 s4-done=1120 s5-swap=1440 s6-morph=1972 s6d-halve=2080 s7-k8=2612
```

注意：.env 里的 `MINIMAX_VOICE_ID` 已改成新音色，主版本（不带 `--variant`）现在如果不加 `--no-api` 跑 tts.py，签名会对不上，会用新音色把主版本整套重配、覆盖旧音色音频。主版本只改字幕 / 时间线时一定加 `--no-api`。
