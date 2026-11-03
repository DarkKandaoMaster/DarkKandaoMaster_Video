# KMP：失配了，i 凭什么不回头？（next 与 nextval）（KMP）

开头让拟人角色"小 i"在朴素匹配里被一把拽回去，问"凭什么重来"；在同一个失配现场看出"已匹配那段头尾相同 → 模式直接滑过去"，定义 next 并逐位手推；拿 next 把教材主串走完（朴素 20 次 vs KMP 15 次）；再用"同一个坑摔两次"引出 nextval 并手推；最后留小题 `ababaa`。记号按严蔚敏 4.3（下标从 1 起，next[1] = 0）。

- 成片：`KMP-next与nextval.mp4`（2026-10-29，2:28.4 = 148.39 s，4450 帧，1920×1080 30 fps H.264 + AAC 48 kHz，-16.0 LUFS，真峰值 -3.1 dBTP；11.7 MB）；验收抽帧在 `抽帧/`（每镜 3～4 张）
- 分镜与旁白：`脚本.md`（阶段 A 已审定；各镜表格有 TTS 实测秒数）；旁白：`src/kmp/narration.json`（MiniMax speech-2.8-hd，**speed 1.1**，aigc_watermark=false，24 条，合计 131.07 s）
- 时间线：`src/kmp/timeline.ts`（PLAN；全片 4450 帧 = 148.33 s；动画预留：s1c 前 +20、s4d 前 +30、s5a 前 +21、s5b 前 +30、s7a 前 +21 帧；`FIX` = 手工修正的分句切点；`SCENES` = 8 镜起止帧）
- BGM：`public/bgm/bright-01.wav`（`synth_bright.py --bars 72` 重新合成，160.0 s）；额外包络（急停 / 翻车 / 手推段压低）在 `src/kmp/bgm.ts`
- 画面：`src/kmp/KMP.tsx`（8 镜汇总）+ `Scene1～8.tsx`（每镜一个文件，绝对帧，挂 `p()`）；匹配场景小件 `matchKit.tsx`（第 1、2、3、5、6 镜），手推场景小件 `HandKit.tsx`（第 4、7、8 镜：布局插值 `geoMix`、盖章 / 翻牌数字格、括号 + "=" / "×"、指向弧线、带爪子的小 i）；公共件 `layout.ts`（两套布局坐标、`cellX(h, j)`）、`data.ts`（字符串、next / nextval、朴素与 KMP 的逐步比较记录）、`LittleI.tsx`（小 i，表情 normal / sad / happy / dizzy）、`StringRow.tsx`（字母格 + next 排，可按 h 平移）、`Compare.tsx`（比较竖线 + tick / ×）
- 核对脚本：`scripts/check_numbers.py`（暴力核对片中所有数字）、`scripts/check_data.py`（node 载入 `data.ts`，与 check_numbers 的结果逐项对照）、`scripts/check_splits.py`（抽查 TTS 分句切点）
- 和模板的差别：`src/base/anim.ts` 加了 `EASE_BACK / springy / hopLift / track`；`src/components/Narration.tsx` 的 `BgmTrack` 加了可选 `envelope` 参数

## 常用命令（在本目录，`$PY` = myenv 的 python.exe）

```powershell
$PY = "D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe"
$env:PYTHONIOENCODING="utf-8"
pnpm dev                                              # Remotion Studio 预览
pnpm exec tsc --noEmit
& $PY scripts\check_numbers.py
& $PY scripts\check_data.py
& $PY ..\_tools\tts.py --speed 1.1 --no-api           # 只改字幕 / 时间线时（不调接口）；改了 speak 才去掉 --no-api
& $PY scripts\check_splits.py
& $PY ..\_tools\print_timeline.py
pnpm render                                           # → out\KMP.mp4
& $PY ..\_tools\finish.py out\KMP.mp4 KMP.mp4
& $PY ..\_tools\grab_frames.py KMP.mp4 抽帧 名字=帧号 ...
```

注意：重新配音必须带 `--speed 1.1`，否则签名对不上，会按 1.0 重新调接口（花钱）。
