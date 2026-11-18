// 小样 2：放大的模式尺子 + 上方复印件右移 3 格，头 ab 压住尾 ab；p6 虚线框；前缀 / 后缀括号；便签填到第 5 格。
import React from "react";
import { AbsoluteFill } from "remotion";
import "../fonts";
import { B } from "../theme";
import { BoardBackground, BoardStage, BoardSubtitle, Bracket, ChalkText, Geo, NextNote, Ruler, Track, colCX, colX } from "../ChalkKit";
import { NEXT, S, T } from "./data";

const TRACK: Geo = { x0: 150, y: 84, cell: 84, pitch: 96 };
const BIG: Geo = { x0: 511, y: 440, cell: 108, pitch: 124 };
const SLIDE = 3;
const COPY: Geo = { ...BIG, x0: colX(BIG, 1 + SLIDE), y: 236 };
const CUR = 6; // 当前算第 6 位

export const StyleNext: React.FC = () => {
  const brY = BIG.y + BIG.cell + 49 + 14;
  const preR = colX(BIG, 2) + BIG.cell;
  const sufL = colX(BIG, 4);
  return (
    <AbsoluteFill>
      <BoardBackground />
      <BoardStage>
        <Track g={TRACK} text={S} opacity={0.2} label="S" />
        <Ruler
          g={BIG}
          text={T}
          letterSize={72}
          indexSize={28}
          looks={["plain", "plain", "plain", "hi", "hi", "current", "plain", "plain"]}
        />
        <Ruler g={COPY} text={T.slice(0, CUR - 1)} ghost letterSize={72} indexSize={28} looks={["hi", "hi"]} />
        <Bracket x1={colX(BIG, 1)} x2={preR} y={brY} color={B.cyan} label="前缀 ab" />
        <Bracket x1={sufL} x2={colX(BIG, 5) + BIG.cell} y={brY} color={B.yellow} label="后缀 ab" />
        <ChalkText x={(preR + sufL) / 2} y={brY + 54} size={46} font="mono" weight={700}>
          =
        </ChalkText>
        <ChalkText x={colCX(BIG, CUR) + 18} y={brY + 54} size={30} color={B.chalk}>
          当前算第 6 位
        </ChalkText>
        <NextNote x={1330} y={700} values={NEXT.map((v, i) => (i < CUR - 1 ? v : null))} hi={CUR} />
        <BoardSubtitle zh="复印一份往右滑，头尾第一次重合，滑了3格" en="Slide a copy right until head meets tail: 3 steps." />
      </BoardStage>
    </AbsoluteFill>
  );
};
