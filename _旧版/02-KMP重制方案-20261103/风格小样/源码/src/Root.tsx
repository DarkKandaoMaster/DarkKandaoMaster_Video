import "./base/fonts";
import "./board/fonts";
import React from "react";
import { Composition, Still } from "remotion";
import { VIDEO } from "./base/theme";
import { Example, TOTAL } from "./example/Example";
import { StyleMiss } from "./board/stills/StyleMiss";
import { StyleNext } from "./board/stills/StyleNext";

const V = { fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height };
const S = { width: VIDEO.width, height: VIDEO.height };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Example" component={Example} durationInFrames={TOTAL} {...V} />
    <Still id="BoardMiss" component={StyleMiss} {...S} />
    <Still id="BoardNext" component={StyleNext} {...S} />
  </>
);
