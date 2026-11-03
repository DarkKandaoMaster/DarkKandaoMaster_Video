// 第 8 镜：小题 + 收尾。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[7].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_8（绝对帧），由 KMP.tsx 汇总。
//
// 画面：第 7 镜的模式串 + next / nextval 两排整体缩小到右上角存档（印章、规则卡淡掉）；中间弹出题卡"小题 · 求 next"，
// 模式 ababaa + 6 个"?"；小 i 跑到题卡左边举牌"你来！"。旁白后 3 秒倒计时（进度环 + 3 声 tick）；
// 揭晓：6 个"?"逐个翻成 next（j = 4、5、6 下方一闪各自的前后缀括号），小字"附送：nextval = …"；
// 片尾：口诀卡居中，小 i 挥手，底部"推对了吗？"。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_IN, hopLift, mix, progress, springy } from "../base/anim";
import { L } from "../base/paper";
import { FONT, hexA } from "../base/theme";
import type { Sfx } from "../components/Narration";
import { Card } from "../components/PaperKit";
import { NEXT, NEXTVAL, PAT, QUIZ, QUIZ_NEXTVAL, QUIZ_STEPS } from "./data";
import { CellBrace, HandI, NumCell, PERCH, RowLabel, colX } from "./HandKit";
import { S7Leftover, S7_SEAL } from "./Scene7";
import { StringRow } from "./StringRow";
import { H, H_GEO, QZ, QZ_GEO } from "./layout";
import { AT, COUNTDOWN, SCENES, TAIL, TL, p } from "./timeline";

const S = SCENES[7];
const END = S.from + S.dur;

// ───────────────────────── 时间点 ─────────────────────────
const T = {
  in: S.from,
  ask: p("s8a", "轮到你"),
  str: p("s8a", "a b a b"),
  cd: AT.s8b - COUNTDOWN, // 倒计时开始（s8a 之后的空档）
  ans: p("s8b", "答案"),
  digits: p("s8b", "零一一二三四"),
  ok: p("s8b", "推对了吗"),
  tail: TL.total - TAIL,
};
const CARD_IN = Math.max(T.ask, T.in + 16); // 题卡等存档缩得差不多再弹出
const FLIP_EVERY = 8;
const FLIP_DUR = 8;
const flipAt = (k: number) => T.digits + k * FLIP_EVERY; // 第 k 格（0 起）开始翻
const BONUS = flipAt(QUIZ.length - 1) + FLIP_DUR + 6; // 附送 nextval
const SHRINK = 30;

// ───────────────────────── 音效 ─────────────────────────
export const SFX_8: Sfx[] = [
  { at: T.in + 2, src: "whoosh", vol: 0.18 },
  { at: CARD_IN, src: "pop", vol: 0.2 },
  { at: T.str + 18, src: "pop", vol: 0.12 },
  ...[0, 1, 2].map((k) => ({ at: T.cd + k * (COUNTDOWN / 3), src: "tick", vol: 0.3 })),
  ...Array.from({ length: QUIZ.length }, (_, k) =>
    k === QUIZ.length - 1 ? { at: flipAt(k) + 4, src: "ding_hi", vol: 0.24 } : { at: flipAt(k) + 4, src: "pop", vol: 0.15 },
  ),
  { at: T.tail + 6, src: "pop", vol: 0.16 },
];

// ───────────────────────── 布局 ─────────────────────────
// 存档：手推布局（锚点 ARCH_ANCHOR）缩到右上角 ARCH_TO
const ARCH_S = 0.34;
const ARCH_ANCHOR = { x: 250, y: 250 };
const ARCH_TO = { x: 1450, y: 40 };
// 题卡
const CARD = { x: 420, y: 168, w: 1080, h: 488 };
// 小 i 站位：题卡左边 / 片尾
const QI = { x: 320, y: 330, scale: 1.4 };
const TI = { x: 190, y: 360, scale: 1.6 };
// 倒计时环
const RING = { cx: 1660, cy: 400, r: 62 };

/** 第 7 镜的终态（手推布局：模式串 + next + nextval），给存档用 */
const HandRows: React.FC<{ jA: number }> = ({ jA }) => (
  <>
    {jA > 0.001
      ? Array.from({ length: PAT.length }, (_, k) => (
          <div
            key={`j${k}`}
            style={{
              position: "absolute",
              left: colX(H_GEO, k + 1),
              width: H.cell,
              top: H.jLabelY - 6,
              textAlign: "center",
              fontFamily: FONT.sans,
              fontSize: 32,
              fontWeight: 500,
              color: L.ink3,
              opacity: jA,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {k + 1}
          </div>
        ))
      : null}
    <StringRow text={PAT} kind="pattern" y={H.patY} geo={H_GEO} letterSize={H.letterSize} label="T" labelGap={26} />
    <RowLabel right={H.x0 - 26} y={H.nextY} hgt={H.nextH} size={Math.round(H.numSize * 0.78)}>
      next
    </RowLabel>
    {NEXT.map((v, k) => (
      <NumCell key={`n${k}`} x={colX(H_GEO, k + 1)} y={H.nextY} w={H.cell} hgt={H.nextH} v={v} size={H.numSize} />
    ))}
    <RowLabel right={H.x0 - 26} y={H.nextvalY} hgt={H.nextH} size={Math.round(H.numSize * 0.78)}>
      nextval
    </RowLabel>
    {NEXTVAL.map((v, k) => (
      <NumCell key={`v${k}`} x={colX(H_GEO, k + 1)} y={H.nextvalY} w={H.cell} hgt={H.nextH} v={v} size={H.numSize} />
    ))}
  </>
);

export const Scene8: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= END) return null;

  const out = progress(f, T.tail, 10, EASE_IN); // 片尾前全部收掉
  // 存档
  const sh = progress(f, T.in, SHRINK, EASE_CAMERA);
  const s = mix(1, ARCH_S, sh);
  const tx = mix(0, ARCH_TO.x - ARCH_S * ARCH_ANCHOR.x, sh);
  const ty = mix(0, ARCH_TO.y - ARCH_S * ARCH_ANCHOR.y, sh);
  const leftover = 1 - progress(f, T.in, 10, EASE_IN); // 第 7 镜的印章 / 规则卡

  // 题卡
  const cardP = springy(f, CARD_IN, 16);
  const cardA = Math.min(1, progress(f, CARD_IN, 10)) * (1 - out);

  // 小 i：左上角 → 题卡左边（蹦三下）→ 片尾站位
  const run = progress(f, T.in + 8, 30, EASE_CAMERA);
  const toTail = progress(f, T.tail + 2, 20, EASE_CAMERA);
  let ix = mix(PERCH.x, QI.x, run);
  let iy = mix(PERCH.y, QI.y, run) - Math.abs(Math.sin(run * Math.PI * 3)) * 36 * (run < 1 ? 1 : 0);
  let isc = mix(PERCH.scale, QI.scale, run);
  ix = mix(ix, TI.x, toTail);
  iy = mix(iy, TI.y, toTail) - hopLift(f, T.tail + 2, 20, 50);
  isc = mix(isc, TI.scale, toTail);
  const signP = progress(f, T.in + 36, 10) * (1 - progress(f, T.ans - 4, 8, EASE_IN));
  const tail = f >= T.tail + 2;
  const solved = f >= flipAt(QUIZ.length - 1) + FLIP_DUR;

  // 倒计时
  const ringA = Math.min(progress(f, T.cd - 8, 8), 1 - progress(f, T.ans, 8, EASE_IN));
  const cdT = Math.max(0, Math.min(1, (f - T.cd) / COUNTDOWN));
  const left = Math.max(1, 3 - Math.floor((f - T.cd) / (COUNTDOWN / 3)));
  const beatPop = f >= T.cd && f < T.cd + COUNTDOWN ? springy(f, T.cd + (3 - left) * (COUNTDOWN / 3), 8) : 1;

  const tailP = progress(f, T.tail + 6, 16);

  return (
    <AbsoluteFill>
      {/* 第 7 镜留下的规则卡 / 印章：淡掉 */}
      <S7Leftover opacity={leftover} />

      {/* 题卡 */}
      {cardA > 0.001 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: cardA,
            transformOrigin: `${CARD.x + CARD.w / 2}px ${CARD.y + CARD.h / 2}px`,
            transform: `scale(${0.85 + 0.15 * cardP})`,
          }}
        >
          <Card x={CARD.x} y={CARD.y} w={CARD.w} h={CARD.h}>{null}</Card>
          {/* 标题 */}
          <div style={{ position: "absolute", left: CARD.x, width: CARD.w, top: CARD.y + 20, textAlign: "center" }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 26px 6px",
                borderRadius: 999,
                background: L.accentSoft,
                color: L.accentDeep,
                fontFamily: FONT.sans,
                fontWeight: 700,
                fontSize: 46,
                lineHeight: 1.25,
              }}
            >
              小题 · 求 next
            </span>
          </div>
          {/* j 号 */}
          {Array.from({ length: QUIZ.length }, (_, k) => (
            <div
              key={`j${k}`}
              style={{
                position: "absolute",
                left: colX(QZ_GEO, k + 1),
                width: QZ.cell,
                top: QZ.patY - 36,
                textAlign: "center",
                fontFamily: FONT.sans,
                fontSize: 28,
                color: L.ink3,
                lineHeight: 1,
                opacity: progress(f, T.str + 10, 10),
              }}
            >
              {k + 1}
            </div>
          ))}
          <StringRow
            text={QUIZ}
            kind="pattern"
            y={QZ.patY}
            geo={QZ_GEO}
            letterSize={H.letterSize}
            label="T"
            labelGap={26}
            opacity={progress(f, T.str, 8)}
            looks={(j) => ({ show: springy(f, T.str + (j - 1) * 4, 12) })}
          />
          {/* 揭晓时 j = 4、5、6 的前后缀括号（一闪而过）：蓝 = 前缀、橙 = 后缀（橙的错开一层，重叠时也看得清） */}
          {QUIZ_STEPS.filter((st) => st.border.length > 0).map((st) => {
            const k = st.j - 1;
            const n = st.j - 1;
            const len = st.border.length;
            // 每组括号只留到下一格翻开（不和下一组叠在一起）；最后一组留到片尾前
            const until = st.j === QUIZ.length ? T.tail - 10 : flipAt(k + 1) + 2;
            const a = Math.min(progress(f, flipAt(k), 6), 1 - progress(f, until - 6, 6, EASE_IN));
            if (a <= 0.001) return null;
            const d = progress(f, flipAt(k), 8);
            return (
              <React.Fragment key={`b${st.j}`}>
                <CellBrace g={QZ_GEO} a={1} b={len} y={QZ.patY + QZ.cell + 3} h={14} color={L.blue} draw={d} opacity={a} />
                <CellBrace g={QZ_GEO} a={n - len + 1} b={n} y={QZ.patY + QZ.cell + 19} h={14} color={L.accent} draw={d} opacity={a} />
              </React.Fragment>
            );
          })}
          {/* next 一排："?" → 翻牌 */}
          <RowLabel right={QZ.x0 - 26} y={QZ.nextY} hgt={QZ.nextH} size={Math.round(H.numSize * 0.78)} opacity={progress(f, T.str + 18, 8)}>
            next
          </RowLabel>
          {QUIZ_STEPS.map((st, k) => {
            const show = springy(f, T.str + 18 + k * 3, 12);
            const fl = progress(f, flipAt(k), FLIP_DUR, (x) => x);
            const flipped = fl >= 1;
            const glow = Math.min(progress(f, flipAt(k) + FLIP_DUR, 4), 1 - progress(f, flipAt(k) + FLIP_DUR + 14, 10));
            return (
              <NumCell
                key={`q${k}`}
                x={colX(QZ_GEO, k + 1)}
                y={QZ.nextY}
                w={QZ.cell}
                hgt={QZ.nextH}
                v={st.value}
                back={<span style={{ color: L.ink3 }}>?</span>}
                size={H.numSize + 4}
                flip={fl}
                look={{ show, focus: glow, matched: flipped ? 0.5 : 0 }}
                ink={flipped ? L.accentDeep : undefined}
              />
            );
          })}
          {/* 附送 nextval（只在画面上） */}
          <div
            style={{
              position: "absolute",
              left: CARD.x,
              width: CARD.w,
              top: QZ.nextY + QZ.nextH + 22,
              textAlign: "center",
              fontFamily: FONT.sans,
              fontSize: 44,
              fontWeight: 500,
              color: L.ink2,
              opacity: progress(f, BONUS, 12),
              transform: `translateY(${mix(10, 0, progress(f, BONUS, 12))}px)`,
              whiteSpace: "nowrap",
            }}
          >
            附送：<span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>nextval = {QUIZ_NEXTVAL.join(" ")}</span>
          </div>
        </div>
      ) : null}

      {/* 存档：第 7 镜两排缩到右上角（压在题卡上面，缩的过程中不被挡） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          opacity: 1 - out,
        }}
      >
        <HandRows jA={leftover} />
      </div>

      {/* 倒计时环 */}
      {ringA > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, opacity: ringA }}>
          <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
            <circle cx={RING.cx} cy={RING.cy} r={RING.r + 16} fill="#FFFFFF" stroke={L.cardLine} strokeWidth={2} />
            <circle cx={RING.cx} cy={RING.cy} r={RING.r} fill="none" stroke={hexA(L.ink3, 0.25)} strokeWidth={12} />
            <circle
              cx={RING.cx}
              cy={RING.cy}
              r={RING.r}
              fill="none"
              stroke={L.accent}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * RING.r}
              strokeDashoffset={2 * Math.PI * RING.r * cdT}
              transform={`rotate(-90 ${RING.cx} ${RING.cy})`}
              opacity={cdT >= 1 ? 0 : 1}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              left: RING.cx - 60,
              width: 120,
              top: RING.cy - 44,
              height: 88,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT.sans,
              fontWeight: 800,
              fontSize: 72,
              color: L.accentDeep,
              transform: `scale(${0.7 + 0.3 * beatPop})`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {left}
          </div>
        </div>
      ) : null}

      {/* 片尾口诀卡 */}
      {tailP > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, opacity: tailP, transform: `translateY(${mix(24, 0, tailP)}px)` }}>
          <Card x={330} y={292} w={1360} h={300}>
            <div style={{ position: "absolute", left: 0, right: 0, top: -26, textAlign: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 26px 6px",
                  borderRadius: 999,
                  background: L.accent,
                  color: "#FFFFFF",
                  fontFamily: FONT.sans,
                  fontWeight: 700,
                  fontSize: 40,
                  lineHeight: 1.25,
                }}
              >
                口诀
              </span>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 58, textAlign: "center", fontSize: 72, fontWeight: 700, color: L.ink, whiteSpace: "nowrap", lineHeight: 1.2 }}>
              <span style={{ fontFamily: FONT.mono }}>next = </span>
              <span style={{ fontFamily: FONT.sans }}>最长相等前后缀长度 </span>
              <span style={{ fontFamily: FONT.mono }}>+ 1</span>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 168, textAlign: "center", fontSize: 72, fontWeight: 700, color: L.ink, whiteSpace: "nowrap", lineHeight: 1.2 }}>
              <span style={{ fontFamily: FONT.mono }}>nextval</span>
              <span style={{ fontFamily: FONT.sans }}>：相同就</span>
              <span style={{ fontFamily: FONT.sans, color: L.accent }}>接着跳</span>
            </div>
          </Card>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 650,
              textAlign: "center",
              fontFamily: FONT.sans,
              fontSize: 48,
              fontWeight: 600,
              color: L.ink2,
              opacity: progress(f, T.tail + 20, 12),
            }}
          >
            推对了吗？
          </div>
        </div>
      ) : null}

      <HandI
        x={ix}
        y={iy}
        scale={isc}
        face={tail || solved || f < T.in + 8 ? "happy" : "normal"}
        pose={tail ? "wave" : run >= 1 && f < T.ans + 4 ? "sign" : f < T.in + 8 ? "clap" : "none"}
        beat={f < T.in + 8 ? (f - S7_SEAL) / 8 : (f - T.in) / 18}
        lookX={tail ? 0.3 : run >= 1 ? 1 : 0.6}
        lookY={0.2}
        sign="你来！"
        signP={signP}
      />
    </AbsoluteFill>
  );
};
