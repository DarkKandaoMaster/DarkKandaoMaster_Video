// 小样 1：p1 对 s3，s3..s7 与 p1..p5 全对，s8 / p6 失配；i 指在 s8；便签全空。
import React from "react";
import { AbsoluteFill } from "remotion";
import "../fonts";
import { B } from "../theme";
import { BoardBackground, BoardStage, BoardSubtitle, ChalkArrow, Geo, Mark, NextNote, Ruler, Track, colCX, colX } from "../ChalkKit";
import { S, T } from "./data";

const TRACK: Geo = { x0: 150, y: 330, cell: 84, pitch: 96 };
const SHIFT = 2; // p1 对 s(1+SHIFT) = s3
const RULER: Geo = { ...TRACK, x0: colX(TRACK, 1 + SHIFT), y: 500 };

export const StyleMiss: React.FC = () => (
  <AbsoluteFill>
    <BoardBackground />
    <BoardStage>
      <Track g={TRACK} text={S} known={[3, 4, 5, 6, 7]} label="S" />
      <Ruler g={RULER} text={T} />
      {[1, 2, 3, 4, 5, 6].map((j) => (
        <Mark key={j} x={colCX(TRACK, j + SHIFT) - 17} y1={TRACK.y + TRACK.cell + 8} y2={RULER.y - 18} kind={j <= 5 ? "ok" : "bad"} />
      ))}
      <ChalkArrow x={colCX(TRACK, 8)} tip={TRACK.y - 44} label="i" color={B.chalk} />
      <NextNote x={1290} y={680} values={[null, null, null, null, null, null, null, null]} />
      <BoardSubtitle zh="失配这一刻，主串这五格我们其实已经知道了" en="At the miss, we already know these five letters of the text." />
    </BoardStage>
  </AbsoluteFill>
);
