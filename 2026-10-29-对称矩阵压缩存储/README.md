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
& $PY ..\_tools\tts.py --speed 1.1 --no-api           # 只改字幕 / 时间线时（不调接口）；改了 speak 才去掉 --no-api
& $PY scripts\check_splits.py
& $PY ..\_tools\print_timeline.py
pnpm render                                           # → out\SymStore.mp4
& $PY ..\_tools\finish.py out\SymStore.mp4 对称矩阵压缩存储.mp4
& $PY ..\_tools\grab_frames.py 对称矩阵压缩存储.mp4 抽帧 s3-k8=590 s6-morph=1830 s7-arc=2350 s7-k8=2460 end=2545
```

注意：重新配音必须带 `--speed 1.1`，否则签名对不上，会按 1.0 重新调接口。
