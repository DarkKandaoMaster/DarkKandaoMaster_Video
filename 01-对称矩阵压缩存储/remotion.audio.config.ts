/**
 * 只渲染音频（--codec=wav）时用的配置：remotion.config.ts 里设了 CRF / H.264，wav 不接受，所以另开一份。
 * 用法见 BGM对比.md：remotion render src/index.ts SymStoreV2 out/stems/x.wav --config=remotion.audio.config.ts
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setOverwriteOutput(true);
Config.setCodec("wav");
Config.setAudioCodec("pcm-16");
Config.setDelayRenderTimeoutInMilliseconds(120000);
