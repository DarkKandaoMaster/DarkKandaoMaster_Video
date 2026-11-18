# BGM 对比：bright-01 / bright-02 / bright-03 垫在讲解下面合不合适（2026-11-09）

## 三条片

| BGM | 成片 | 说明 |
|---|---|---|
| bright-01 | `对称矩阵压缩存储.mp4` | 现主版本，numpy 合成"马林巴"，C 大调 108 BPM |
| bright-02 | `对称矩阵压缩存储-bgm02.mp4` | numpy 合成，D 大调 100 BPM，电钢 + pad + 三角波 lead + 软鼓，分 air / calm / lift 三套编配 |
| bright-03 | `对称矩阵压缩存储-bgm03.mp4` | FluidSynth + GeneralUser GS 采样，G 大调 100 BPM，钢琴旋律 + 尼龙吉他 + 弦乐 + 刷子鼓 |

- 三条只有 BGM 文件不同：旁白（主版本旧克隆音色）、音效、画面、BGM level 0.6、闪避参数（说话时 0.16、空档最多 0.30、片头片尾 0.42）都一样；三个 BGM 原文件响度都是 -18.4～-18.5 LUFS。
- 都走了 `finish.py`：-16.0 LUFS，真峰值 -3.2 / -3.2 / -3.3 dBTP，finish 增益三条都是 -1.8 dB。
- 画面：新两条是重新完整渲染的，和主版本逐帧 PSNR 平均 67 dB、最低 51 dB（jpeg / x264 编码的微小差异，肉眼看不出），帧数都是 3686。

## A/B 片段（`对比片段\`）

从三条成片里截（已经过 finish.py，响度和成片一致），每个时间点三份，文件名带 BGM 名：

| 文件名前缀 | 片中时间 | 听什么 |
|---|---|---|
| `1-旁白密集-0m28s` | 0:28.5～0:37.5 | s4c～s4d 数格子"一、二、三个，一共六个……所以 k 等于八"，句间停顿只有 12～15 帧 |
| `2-公式推导-1m32s` | 1:32.5～1:41.5 | s9b 等差数列求和，最难的一段；bright-02 这里正好是 lift 编配（鼓和 lead 最满） |
| `3-小题停顿-1m47s` | 1:47.5～1:56.5 | 出题 → 停 2.5 s（1:51.9～1:54.4）→ "答案是八"，听 BGM 在停顿里涌上来多少 |
| `4-片尾-1m54s` | 1:54.5～2:02.9 | 讲答案 → 片尾 BGM 抬到 0.42 后淡出 |

## 测量结果

测量对象：另外渲染的"只有旁白"和"只有 BGM（带闪避，音量和成片混音里完全一样）"两条分轨（验证过：混音 − 旁白 − BGM 的残差正好是音效，-49 dB）。响度按 ITU-R BS.1770 的 K 加权算（与 ffmpeg ebur128 交叉核对过：BGM 原文件积分 -18.4 LUFS、LRA 3.3 LU、旁白积分 -14.2 LUFS，完全一致）。"说话窗"= 旁白 400 ms 响度不低于旁白积分响度 − 20 LU 的窗（占全片 87%）；"停顿窗"= 第一句到最后一句之间旁白完全无声的窗。脚本 `scripts\measure_bgm.py`，原始数字在 `out\stems\measure.json`。

| 指标 | bright-01 | bright-02 | bright-03 | 怎么看 |
|---|---:|---:|---:|---|
| **SMR 中位数**（说话时旁白 − BGM，400 ms 窗，dB） | **24.8** | **24.3** | **24.4** | 越大越好；三首几乎一样 |
| **SMR 最差 10%**（第 10 百分位） | 18.8 | 18.2 | 18.2 | 多是字尾 / 轻声字处 |
| 说话时 1–4 kHz：BGM − 旁白，中位数（dB） | -30.5 | **-31.6** | -29.8 | 越负越好 |
| 说话时 1–4 kHz：BGM − 旁白，最差 10% | -21.9 | **-24.0** | -21.2 | bright-03 的钢琴 / 吉他旋律在这个频段 |
| BGM 原文件 1–4 kHz 占总能量（dB） | -18.6 | **-20.9** | -18.2 | 同上，看曲子本身 |
| 停顿里 BGM 比说话时高（中位数 / 最大，dB） | 3.3 / 11.2 | 1.6 / 7.9 | 1.9 / 7.1 | 最大值都出现在小题 2.5 s 停顿 |
| 成片里停顿 BGM 绝对响度（中位数 / 最大，LUFS） | -38.7 / **-30.8** | -39.2 / -33.0 | -38.7 / -33.5 | 旁白 -16 LUFS；最大值比旁白低 15～17 LU |
| BGM 片中 LRA（含闪避，LU） | 1.9 | **3.5** | 2.5 | 越小越平稳 |
| BGM 原文件 LRA（前 122.9 s，LU） | 1.5 | **3.3** | 1.1 | bright-02 的 air→calm→lift 有明显音量起伏 |
| 说话时 BGM 响度随段落的变化（10 s 段中位数，LUFS，混音内） | -40.7～-39.8 | **-41.3～-37.4** | -39.1～-38.4 | bright-02 在 1:10～1:50（s7～s10）抬高 2～3 dB |
| onset 密度（个 / 秒，原文件） | **4.92** | 3.42 | 3.34 | 越少越不"碎" |
| 打击乐能量占比（HPSS，dB） | -8.8 | -9.3 | **-12.4** | 越低鼓点越不显 |

分段看 SMR（说话窗中位数，每 10 s 一段）：bright-01 24.1～25.7（最平）；bright-02 22.9～26.4，最低的 22.9 / 23.2 / 23.8 正好落在 1:20～1:50 的上三角公式推导和小题；bright-03 22.9～25.3，只在 0:50～1:00 一段到 22.9。

## 依据（只列真正打开读过的）

- W3C WCAG 2.2 成功准则 1.4.7 Low or No Background Audio（AAA 级）：以语音为主的预录纯音频，背景声要么没有、要么能关、要么"至少比前景语音低 20 dB"，一两秒的偶发声音除外；目的是让听力不好的人能把语音和背景分开。https://www.w3.org/WAI/WCAG22/Understanding/low-or-no-background-audio.html
- W3C 技术 G56（配套的混音做法）：测试步骤是找出语音之间背景声较响的地方，按 dB(A) 测背景和语音，相减应 ≥ 20。https://www.w3.org/WAI/WCAG22/Techniques/general/G56
- Fraunhofer IIS 音频博客（2019-04-12，AES 146 获奖论文介绍）：22 名听力正常的听众主观测试，建议解说比音乐至少高 10 LU、比环境声至少高 15 LU；外行听众平均比专业听众偏好再高 4 LU。https://audioblog.iis.fraunhofer.com/?p=4251

所以"人声比音乐高 15～20 dB 以上"这个说法：我读到的来源里，广播偏好研究给的下限是 10 LU（听力正常），无障碍标准给的是 20 dB（照顾听力不好的人）。教学视频面向大学生、手机外放的多，按 20 dB 要求更稳。注意 WCAG 针对的是纯音频、测法是 dB(A)，这里用的是 K 加权 LUFS，口径接近但不完全相同。

## 结论

1. **按音量，三首都不算抢。** 说话时旁白比 BGM 高约 24 dB（中位数），超过 WCAG 的 20 dB，远超广播研究的 10 LU；1–4 kHz 里 BGM 比旁白低 30 dB 左右，能量上基本不会掩蔽字音。最差 10% 的窗在 18 dB 上下，略低于 20 dB，主要是字尾、轻声字。停顿里 BGM 最多涌到 -31～-34 LUFS，仍比旁白低 15 LU 以上，不突兀。三首 level 一样，SMR 只差 0.5 dB 以内，所以**差别不在音量，在曲子本身的"性格"**：旋律在不在人声频段、鼓点多不多、音量有没有起伏。

2. **更适合垫教学旁白的是 bright-03，bright-02 次之，但差距不大，最后以耳朵为准。**
   - bright-03：鼓点最少（打击乐占比 -12.4 dB，比另两首低 3～4 dB；onset 3.3 个/秒），原文件 LRA 只有 1.1 LU，全片说话时 BGM 响度上下只差 0.7 dB，最平稳、最不会"突然热闹起来"。缺点：钢琴 / 吉他旋律落在 1–4 kHz，这个频段的能量是三首里最高的（最差 10% -21.2 dB），0:50～1:00 一段 SMR 降到 22.9。
   - bright-02：人声频段最干净（1–4 kHz 最低），onset 也少；但它的 air / calm / lift 编配让音量有 3.3 LU 的起伏，而 lift 段正好落在 1:10～1:50，也就是上三角公式推导和小题——全片最需要专心的地方，BGM 在这里反而抬高 2～3 dB、鼓和 lead 最满。这是"编配位置"问题，换个段落顺序就能解决。
   - bright-01：音量最平，但 onset 最密（4.9 个/秒，八分马林巴 + 每拍手拍 + 十六分沙锤一直不停）、打击乐最显，停顿里涌上来最多（+11 dB，-30.8 LUFS）；单听最"玩具"，长时间垫着最容易让人分神。

3. 数字说明不了"旋律是否抓耳"这种注意力上的干扰（这类干扰在音量差 20 dB 以上时比能量掩蔽更关键），所以请用 `对比片段\2-公式推导-1m32s-*` 和 `1-旁白密集-0m28s-*` 重点听：讲公式时有没有不自觉去听旋律。

## 如果听下来还是觉得抢，可以这样改（只是建议，没动 BGM 本身）

按改动从小到大：

1. **整体降一点**：level 0.6 → 0.48（-1.9 dB），最差 10% 的 SMR 就到 20 dB 左右；0.42（-3.1 dB）则中位数约 27～28 dB。只改 `SymStoreV2.tsx` 的 `level`，最省事。
2. **只加深说话时的闪避、停顿不动**：`Narration.tsx` 里 `duck: 0.16 → 0.11`（说话时再低 3.3 dB），空档 0.30 和片头片尾 0.42 保持，停顿时仍有音乐托着。
3. **说话时去掉旋律层**（最对症）：bright-02 的 `synth_bright02.py --stems` 能导出各声部干声，bright-03 的 `build\*.mid` 本来就是分轨的。做成两条：完整版 + 去掉 lead / 钢琴旋律的"底子"版，旁白时放底子、停顿和片头片尾交叉淡入完整版（就是 tibo.dog 笔记里"按旁白有无叠层"的做法）。
4. **说话时在 2～4 kHz 挖一个凹陷**：给 BGM 加一个只在旁白期间生效的 -4～-6 dB 峰值 EQ（或整体低通到 5～6 kHz），把人声清晰度频段让出来；对 bright-03 的钢琴 / 吉他最有用。
5. **bright-02 专用**：把 lift 段挪开，不要落在 1:10～1:50 的公式推导和小题上；或者整首用 calm / air，lift 只给片头片尾。
6. **bright-01 专用**：去掉十六分沙锤和每拍手拍，或者旁白时只留 pad 和低音。

## 复现

```powershell
$PY = "D:\Programs\DevEnvironments\Anaconda\anaconda3\envs\myenv\python.exe"
$env:PYTHONIOENCODING = "utf-8"
# 成片
pnpm render:bgm02 --port=3000; & $PY ..\_tools\finish.py out\SymStoreV2-bgm02.mp4 对称矩阵压缩存储-bgm02.mp4
pnpm render:bgm03 --port=3000; & $PY ..\_tools\finish.py out\SymStoreV2-bgm03.mp4 对称矩阵压缩存储-bgm03.mp4
# 分轨（纯音频，约 15 s 一条）：REMOTION_STEM = voice / bgm / 不设（混音），REMOTION_BGM = bright-02 / bright-03 / 不设（bright-01）
$env:REMOTION_STEM = "voice"; pnpm exec remotion render src/index.ts SymStoreV2 out/stems/voice.wav --config=remotion.audio.config.ts --port=3000
$env:REMOTION_STEM = "bgm"; $env:REMOTION_BGM = "bright-02"; pnpm exec remotion render src/index.ts SymStoreV2 out/stems/bgm-bright-02.wav --config=remotion.audio.config.ts --port=3000
# ……bgm-bright-01 / bgm-bright-03 / mix-bright-0x 同理
$env:REMOTION_STEM = $null; $env:REMOTION_BGM = $null
& $PY scripts\measure_bgm.py
```
