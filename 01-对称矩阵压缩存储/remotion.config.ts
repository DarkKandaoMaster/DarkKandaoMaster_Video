/**
 * CLI 渲染配置（只对 `remotion render` / `remotion studio` 生效）。
 * 成片规格：1920×1080、30 fps、H.264 yuv420p。
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
// bt709：输出标准 tv-range yuv420p（默认会被标成 yuvj420p 全范围）
Config.setColorSpace("bt709");
// 文字为主，CRF 20 足够清晰
Config.setCrf(20);
Config.setAudioCodec("aac");
// 中文可变字体 17～25 MB，首次加载慢一点，放宽 delayRender 超时
Config.setDelayRenderTimeoutInMilliseconds(120000);
