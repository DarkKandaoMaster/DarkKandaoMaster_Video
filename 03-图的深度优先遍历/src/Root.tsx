import "./base/fonts";
import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./base/theme";
import { DFS, TOTAL } from "./dfs/DFS";

const V = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height };

// 一个工程只注册这一条视频的 Composition（id 用 PascalCase，渲染命令里要写它）
export const RemotionRoot: React.FC = () => <Composition id="DFS" component={DFS} durationInFrames={TOTAL} {...V} />;
