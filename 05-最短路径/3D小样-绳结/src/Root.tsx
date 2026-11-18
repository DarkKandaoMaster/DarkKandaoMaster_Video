import "./base/fonts";
import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./base/theme";
import { DijkstraRope, TOTAL } from "./dijkstra-rope/DijkstraRope";

const V = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height };

export const RemotionRoot: React.FC = () => <Composition id="DijkstraRope" component={DijkstraRope} durationInFrames={TOTAL} {...V} />;
