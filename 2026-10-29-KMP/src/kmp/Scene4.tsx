// 第 4 镜：手推 next。分镜见 ../../脚本.md。
// 约定：用绝对帧（useCurrentFrame 在顶层，不套 Sequence），所有动画挂在 timeline.ts 的 p(旁白 id, 分句开头文字) 上；
// 只在本镜区间 [SCENES[3].from, from + dur) 内渲染，其余返回 null。音效写在 SFX_4（绝对帧），由 KMP.tsx 汇总。
//
// 画面：开头从第 3 镜的匹配布局过渡（主串淡出、模式串放大上移到手推布局，小 i 退到左上角托腮）；
// next[1]、next[2] 先 pop 就位；之后每推一位 j 的固定动作：p1…p(j−1) 淡黄底、p_j 虚线框、
// 开头 / 结尾若干格下画蓝 / 橙括号（对上连虚线 + 绿"="，对不上红"×"），next 第 j 格盖章写数；
// j = 6 额外做"复制一份滑过去"的演示；最后整排闪一下 + 印章"next ✓"，小 i 鼓掌。
// 结尾停在手推布局（第 5 镜按脚本自己"主串淡入、模式串缩回"），只把下方卡片 / 印章在最后几帧淡掉。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_CAMERA, EASE_IN, hopLift, mix, progress, springy, track } from "../base/anim";
import { L } from "../base/paper";
import { FONT, mixColor as mixHex } from "../base/theme";
import type { Sfx } from "../components/Narration";
import { Card, Stamp } from "../components/PaperKit";
import { MAIN, NEXT_STEPS, PAT } from "./data";
import { CellBrace, DashLink, FROM_3, HandI, MarkDot, NoteChip, NumCell, PERCH, RowLabel, colCX, colX, geoMix, pulse, win } from "./HandKit";
import { StringRow, type CellWeights } from "./StringRow";
import { H, KC, M, littleIPos } from "./layout";
import { SCENES, p } from "./timeline";

const S = SCENES[3];
const END = S.from + S.dur;

// ───────────────────────── 时间点 ─────────────────────────
const T = {
  in: S.from,
  one: p("s4a", "第一位零"),
  two: p("s4a", "第二位一"),
  fixed: p("s4a", "这俩是固定的"),
};
const MORPH = 30; // 匹配布局 → 手推布局

type Try = { at: number; len: number; ok: boolean };
type JPlan = { j: number; look: number; tries: Try[]; write: number; value: number; border: string; end: number };

/** 每一位：look = "第 j 位看"，tries = 每次试的时刻（长度从 from 往下减），write = 写数的时刻 */
const RAW: Array<{ j: number; look: number; tries: number[]; from: number; write: number }> = [
  { j: 3, look: p("s4b", "第三位看"), tries: [p("s4b", "头尾不同")], from: 1, write: p("s4b", "记一") },
  { j: 4, look: p("s4b", "第四位看"), tries: [p("s4b", "头尾都是")], from: 1, write: p("s4b", "记二") },
  // j = 5 演示"从长往短试"：先 ab 对 aa（×），再缩到 a（=）
  { j: 5, look: p("s4c", "第五位看"), tries: [p("s4c", "第五位看") + 18, p("s4c", "还是一个")], from: 2, write: p("s4c", "记二") },
  { j: 6, look: p("s4c", "第六位看"), tries: [p("s4c", "头尾 a b") + 4], from: 2, write: p("s4c", "记三") },
  { j: 7, look: p("s4d", "第七位"), tries: [p("s4d", "结尾是")], from: 1, write: p("s4d", "记一") },
  { j: 8, look: p("s4d", "第八位"), tries: [p("s4d", "头尾一个")], from: 1, write: p("s4d", "记二") },
];

const PLAN: JPlan[] = RAW.map((r, k) => {
  const st = NEXT_STEPS[r.j - 1];
  const s = st.look;
  const tries = r.tries.map((at, q) => {
    const len = r.from - q;
    return { at, len, ok: s.slice(0, len) === s.slice(s.length - len) };
  });
  const last = tries[tries.length - 1];
  // 和 data.ts 的 border 对一遍：最后一次试的结果必须就是最长相等前后缀
  if ((last.ok ? last.len : 0) !== st.border.length) throw new Error(`Scene4：j = ${r.j} 的试探和 border 不一致`);
  const end = k + 1 < RAW.length ? RAW[k + 1].look : END - 1; // 最后一位的黄底 / 括号在本镜最后一帧恰好淡没
  return { j: r.j, look: r.look, tries, write: Math.max(r.write, last.at + 16), value: st.value, border: st.border, end };
});

/** j = 6 的滑动演示：复制 p1…p5，一格一格右滑，滑 shift 格后头尾重合 */
const J6 = PLAN.find((x) => x.j === 6)!;
const SLIDE = {
  shift: J6.j - 1 - J6.border.length, // = 3
  appear: J6.look + 6,
  first: J6.look + 16,
  every: 14,
  dur: 12,
};
const slideAt = (s: number) => SLIDE.first + (s - 1) * SLIDE.every; // 第 s 次滑动开始
const FLASH = slideAt(SLIDE.shift) + SLIDE.dur + 2; // 重合部分闪绿
const COPY_Y = 80; // 复制条在模式串上方（j 号之上）
const CARD_PAD = 224; // 卡片内文字左对齐的缩进（最长一行约 750 px，居中）

const J8 = PLAN[PLAN.length - 1];
const ROW_FLASH = J8.write + 8;
const SEAL = ROW_FLASH + 6;
const CLAP = SEAL + 2;
const OUT = END - 1 - 8; // 下方卡片、印章淡出：本镜最后一帧（END − 1）恰好为 0

/** 写到 next 第 j 格的时刻（1、2 位在 s4a 里 pop） */
const writeAt = (j: number): number => (j === 1 ? T.one : j === 2 ? T.two : PLAN.find((x) => x.j === j)!.write);

// ───────────────────────── 音效 ─────────────────────────
export const SFX_4: Sfx[] = [
  { at: T.in + 2, src: "whoosh", vol: 0.2 },
  { at: T.one, src: "pop", vol: 0.18 },
  { at: T.two, src: "pop", vol: 0.18 },
  ...Array.from({ length: SLIDE.shift }, (_, k) => ({ at: slideAt(k + 1) + 8, src: "tick", vol: 0.14 })),
  { at: FLASH, src: "ding", vol: 0.18 },
  // 对上了：ding（j = 6 已经在闪绿时响过）；对不上：无声
  ...PLAN.flatMap((pl) => pl.tries.filter((t) => t.ok && pl.j !== 6).map((t) => ({ at: t.at + 10, src: "ding", vol: 0.14 }))),
  ...PLAN.map((pl) => ({ at: pl.write, src: "stamp", vol: 0.3 })),
  { at: SEAL, src: "stamp", vol: 0.24 },
  { at: CLAP + 4, src: "pop", vol: 0.14 },
  { at: CLAP + 12, src: "pop", vol: 0.14 },
];

// ───────────────────────── 画面 ─────────────────────────
const ROW_Y_M = M.nextY;
const BRACE_Y = H.patY + H.cell + 6; // 386：模式格底下
const TIP_Y = BRACE_Y + 18;

/** 当前在推的是哪一位（0 = s4a 阶段） */
const currentJ = (f: number): number => {
  let j = 0;
  for (const pl of PLAN) if (f >= pl.look) j = pl.j;
  return j;
};

/** 某次试探的括号 + 标记 */
const TryMarks: React.FC<{ f: number; pl: JPlan; t: Try; until: number; g: ReturnType<typeof geoMix> }> = ({ f, pl, t, until, g }) => {
  const a = win(f, t.at, until, 6, 8);
  if (a <= 0.001) return null;
  const n = pl.j - 1; // 只看 p1…p(j−1)
  const draw = progress(f, t.at, 10);
  const mk = progress(f, t.at + 10, 10);
  const bx1 = (colX(g, 1) + colX(g, t.len) + g.cell) / 2;
  const bx2 = (colX(g, n - t.len + 1) + colX(g, n) + g.cell) / 2;
  const grey = t.ok ? 0 : progress(f, t.at + 10, 8);
  const blue = t.ok ? L.blue : mixHex(L.blue, KC.dimInk, grey * 0.6);
  const orange = t.ok ? L.accent : mixHex(L.accent, KC.dimInk, grey * 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a }}>
      <CellBrace g={g} a={1} b={t.len} y={BRACE_Y} color={blue} draw={draw} />
      <CellBrace g={g} a={n - t.len + 1} b={n} y={BRACE_Y} color={orange} draw={draw} />
      {t.ok ? <DashLink x1={bx1} x2={bx2} y={TIP_Y} draw={mk} color={KC.ok} /> : null}
      <MarkDot cx={(bx1 + bx2) / 2} cy={TIP_Y} kind={t.ok ? "eq" : "x"} p={mk} />
    </div>
  );
};

/** 下方卡片：每一位一张（交叉淡入淡出） */
const CardLine: React.FC<{ f: number; pl: JPlan }> = ({ f, pl }) => {
  const a = win(f, pl.look, Math.min(pl.end, OUT + 8), 8, 8);
  if (a <= 0.001) return null;
  const s = NEXT_STEPS[pl.j - 1].look;
  const last = pl.tries[pl.tries.length - 1];
  const known = progress(f, last.at + 10, 10); // 前后缀结论出来
  const res = progress(f, pl.write, 8);
  const L1 = pl.border.length;
  const letters = [...s].map((c, k) => {
    const pre = L1 > 0 && k < L1;
    const suf = L1 > 0 && k >= s.length - L1;
    const col = pre ? mixHex(L.ink, L.blue, known) : suf ? mixHex(L.ink, L.accent, known) : L.ink;
    return (
      <span key={k} style={{ color: col }}>
        {c}
      </span>
    );
  });
  const knownAt = last.at + 10;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a, transform: `translateY(${mix(10, 0, progress(f, pl.look, 12))}px)` }}>
      <div style={{ position: "absolute", left: CARD_PAD, top: 18, fontFamily: FONT.sans, fontSize: 44, fontWeight: 500, color: L.ink2, whiteSpace: "nowrap" }}>
        看 <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 50, letterSpacing: "0.08em" }}>{letters}</span>
        <span style={{ opacity: known }}>
          {"　"}最长相等前后缀：
          {L1 > 0 ? (
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 50, color: L.ink }}>{pl.border}</span>
          ) : (
            <span style={{ color: L.ink }}>无</span>
          )}
        </span>
      </div>
      <div style={{ position: "absolute", left: CARD_PAD, top: 78, fontFamily: FONT.mono, fontSize: 72, fontWeight: 700, color: L.ink, whiteSpace: "nowrap", lineHeight: 1.2 }}>
        next[{pl.j}] ={" "}
        {f < knownAt ? (
          <span style={{ color: L.ink3 }}>?</span>
        ) : (
          <>
            <span style={{ opacity: known }}>{L1} + 1 = </span>
            <span style={{ color: L.accent, display: "inline-block", transform: `scale(${1 + 0.6 * (1 - res) ** 2})`, opacity: res }}>{pl.value}</span>
          </>
        )}
      </div>
    </div>
  );
};

export const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  if (f < S.from || f >= END) return null;

  // 布局过渡：匹配 → 手推
  const mt = progress(f, T.in, MORPH, EASE_CAMERA);
  const g = geoMix(FROM_3.h, mt);
  const patY = mix(M.patY, H.patY, mt);
  const nextY = mix(ROW_Y_M, H.nextY, mt);
  const nextH = mix(M.nextH, H.nextH, mt);
  const numSize = mix(M.numSize, H.numSize, mt);
  const letter = mix(M.letterSize, H.letterSize, mt);
  const mainA = 1 - progress(f, T.in, 14); // 先快后慢：模式串上移时主串已基本淡掉
  const oldVals = 1 - progress(f, T.in, 12, EASE_IN); // 第 3 镜留下的 0 / 3 / ?

  const cj = currentJ(f);
  const pl = PLAN.find((x) => x.j === cj);

  // 模式串每格外观
  const lookOf = (j: number): CellWeights => {
    let yellow = 0;
    let dashed = 0;
    let matched = 0;
    let dy = 0;
    for (const q of PLAN) {
      const w = win(f, q.look, q.end, 8, 8);
      if (w <= 0.001) continue;
      if (j < q.j) yellow = Math.max(yellow, w * progress(f, q.look + (j - 1) * 2, 8));
      if (j === q.j) dashed = Math.max(dashed, w * progress(f, q.look + 4, 6));
    }
    // j = 6：重合的 ab 闪绿（p4、p5）
    const n6 = J6.j - 1;
    if (j > n6 - J6.border.length && j <= n6) {
      matched = win(f, FLASH, J6.end, 6, 8);
      dy = -hopLift(f, FLASH, 12, 10);
    }
    // 整排闪（结尾）
    const rf = pulse(f, ROW_FLASH + (j - 1) * 2, 16);
    return { yellow, dashed, matched: Math.max(matched, rf * 0.8), dy };
  };

  // 小 i：从主串上方退到左上角
  const from = littleIPos(FROM_3.i);
  const fly = progress(f, T.in + 4, 26, EASE_CAMERA);
  const ix = mix(from.x, PERCH.x, fly);
  const iy = mix(from.y, PERCH.y, fly) - hopLift(f, T.in + 4, 26, 60);
  const isc = mix(1, PERCH.scale, fly);
  const clapping = f >= CLAP;
  const curCX = pl ? colCX(g, pl.j) : colCX(g, 2);
  const lookX = Math.max(-1, Math.min(1, (curCX - ix) / 700));

  // j = 6 的复制条
  const copyA = win(f, SLIDE.appear, J6.end, 8, 10);
  const shift = track(
    f,
    0,
    Array.from({ length: SLIDE.shift }, (_, k) => [slideAt(k + 1), k + 1] as const),
    SLIDE.dur,
  );
  const landed = (s: number) => f >= slideAt(s) + SLIDE.dur && (s === SLIDE.shift || f < slideAt(s + 1));
  const n6 = J6.j - 1;
  const cardA = Math.min(progress(f, T.fixed - 6, 12), 1 - progress(f, OUT, 8, EASE_IN));

  return (
    <AbsoluteFill>
      {/* 主串（第 3 镜留下来的）淡出上移 */}
      {mainA > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${mix(0, -40, 1 - mainA)}px)` }}>
          <StringRow text={MAIN} kind="main" y={M.mainY} label="S" index={{ y: M.idxY }} opacity={mainA} />
        </div>
      ) : null}

      {/* j 号 */}
      {Array.from({ length: PAT.length }, (_, k) => {
        const j = k + 1;
        const on = pl?.j === j ? win(f, pl.look, pl.end, 6, 6) : 0;
        return (
          <div
            key={`j${j}`}
            style={{
              position: "absolute",
              left: colX(g, j),
              width: g.cell,
              top: H.jLabelY - 6,
              textAlign: "center",
              fontFamily: FONT.sans,
              fontSize: 32 + 6 * on,
              fontWeight: on > 0.5 ? 700 : 500,
              color: mixHex(L.ink3, L.accent, on),
              opacity: progress(f, T.in + 18, 12) * (1 - copyA * 0.6),
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {j}
          </div>
        );
      })}
      <RowLabel right={colX(g, 1) - 24} y={H.jLabelY - 8} hgt={40} size={36} color={L.ink3} opacity={progress(f, T.in + 18, 12) * (1 - copyA * 0.6) * (1 - progress(f, OUT, 8, EASE_IN))}>
        <span style={{ fontFamily: FONT.math, fontStyle: "italic", fontWeight: 400 }}>j</span>
      </RowLabel>

      {/* 模式串 */}
      <StringRow text={PAT} kind="pattern" y={patY} geo={g} looks={lookOf} letterSize={letter} label="T" labelGap={mix(18, 26, mt)} />

      {/* 括号与标记 */}
      {PLAN.map((q) =>
        q.tries.map((t, k) => <TryMarks key={`t${q.j}-${k}`} f={f} pl={q} t={t} until={k + 1 < q.tries.length ? q.tries[k + 1].at : q.end} g={g} />),
      )}

      {/* next 一排 */}
      <RowLabel right={colX(g, 1) - mix(18, 26, mt)} y={nextY} hgt={nextH} size={Math.round(numSize * 0.78)}>
        next
      </RowLabel>
      {Array.from({ length: PAT.length }, (_, k) => {
        const j = k + 1;
        const w = writeAt(j);
        const st = progress(f, w, 10);
        const old = j === 1 ? "0" : j === 6 ? "3" : "?";
        const isCur = (pl?.j === j && f < pl.write + 14) || ((j === 1 || j === 2) && f >= w - 4 && f < w + 16 && cj === 0);
        const focus = isCur ? Math.min(progress(f, pl?.j === j ? pl.look : w - 4, 6), 1 - progress(f, (pl?.j === j ? pl.write : w) + 8, 8)) : 0;
        const rf = pulse(f, ROW_FLASH + k * 2, 16);
        const look = f < w ? { dim: oldVals > 0.01 ? 0 : 0.55, focus } : { focus, matched: rf * 0.8 };
        let v: React.ReactNode | null = null;
        if (f >= w) v = NEXT_STEPS[k].value;
        else if (oldVals > 0.001) v = <span style={{ opacity: oldVals, color: old === "?" ? L.ink3 : L.ink }}>{old}</span>;
        return (
          <NumCell
            key={`n${j}`}
            x={colX(g, j)}
            y={nextY}
            w={g.cell}
            hgt={nextH}
            v={v}
            size={numSize}
            look={look}
            stamp={f >= w ? (j <= 2 ? springy(f, w, 12) : st) : 1}
            ink={f >= w ? mixHex(L.accentDeep, L.ink, progress(f, w + 20, 16)) : undefined}
          />
        );
      })}

      {/* j = 6：复制一份 p1…p5，往右一格一格滑 */}
      {copyA > 0.001 ? (
        <div style={{ position: "absolute", inset: 0, opacity: copyA }}>
          <StringRow
            text={PAT.slice(0, n6)}
            kind="copy"
            y={COPY_Y}
            geo={{ ...g, x0: g.x0 + shift * g.step }}
            letterSize={letter}
            looks={(k) => {
              const col = k + Math.round(shift);
              const settled = f >= slideAt(SLIDE.shift) + SLIDE.dur;
              return {
                dim: col > n6 ? 0.6 * progress(f, slideAt(1), 8) : 0,
                matched: settled && k <= J6.border.length ? win(f, FLASH, J6.end, 6, 8) : 0,
                dy: settled && k <= J6.border.length ? -hopLift(f, FLASH, 12, 10) : 0,
              };
            }}
          />
          {Array.from({ length: SLIDE.shift }, (_, k) => {
            const s = k + 1;
            const ok = s === SLIDE.shift;
            const land = slideAt(s) + SLIDE.dur;
            const vis = ok ? progress(f, land, 8) : landed(s) ? progress(f, land, 6) : 0;
            // 重合区：复制条第 1..(n6 − s) 格 ↔ 原串第 s+1..n6 格
            const cx = (colX(g, s + 1) + colX(g, n6) + g.cell) / 2;
            return <MarkDot key={`sm${s}`} cx={cx} cy={COPY_Y - 22} kind={ok ? "eq" : "x"} p={vis} />;
          })}
          <NoteChip x={colX(g, 1) - 4} y={COPY_Y - 56} p={progress(f, SLIDE.appear + 4, 10) * (1 - progress(f, SLIDE.first - 2, 6))} size={30}>
            复制一份
          </NoteChip>
        </div>
      ) : null}
      <NoteChip x={1430} y={150} p={win(f, J6.write + 10, J6.end, 12, 10)} size={34} color={L.accentDeep}>
        和第 2 镜同一个 3
      </NoteChip>

      {/* 下方卡片 */}
      {cardA > 0.001 ? (
        <Card x={360} y={690} w={1200} h={178} opacity={cardA}>
          {/* s4a：前两位固定 */}
          <div style={{ position: "absolute", inset: 0, opacity: win(f, T.fixed - 6, PLAN[0].look, 10, 8) }}>
            <div style={{ position: "absolute", left: CARD_PAD, top: 18, fontFamily: FONT.sans, fontSize: 44, fontWeight: 500, color: L.ink2 }}>
              前两位固定
            </div>
            <div style={{ position: "absolute", left: CARD_PAD - 100, top: 78, fontFamily: FONT.mono, fontSize: 72, fontWeight: 700, color: L.ink, whiteSpace: "nowrap", lineHeight: 1.2 }}>
              next[1] = {NEXT_STEPS[0].value}
              <span style={{ fontFamily: FONT.sans }}>，</span>next[2] = {NEXT_STEPS[1].value}
            </div>
          </div>
          {PLAN.map((q) => (
            <CardLine key={`c${q.j}`} f={f} pl={q} />
          ))}
        </Card>
      ) : null}

      {/* 结尾印章 */}
      <Stamp cx={1700} cy={H.nextY + H.nextH / 2 - 4} p={progress(f, SEAL, 10)} opacity={1 - progress(f, OUT, 8, EASE_IN)} >
        next ✓
      </Stamp>

      {/* 小 i：托腮看 → 鼓掌 */}
      <HandI
        x={ix}
        y={iy}
        scale={isc}
        face={clapping ? "happy" : "normal"}
        pose={fly < 1 ? "none" : clapping ? (f < END - 6 ? "clap" : "none") : "chin"}
        beat={clapping ? (f - CLAP) / 8 : 0}
        rotate={fly < 1 || clapping ? 0 : 7}
        lookX={fly < 1 ? 0 : clapping ? 0 : lookX}
        lookY={fly < 1 ? 0 : clapping ? 0 : 0.8}
        squash={0.5 * pulse(f, T.in + 28, 8)}
      />
    </AbsoluteFill>
  );
};

/** 本镜结束态（= 第 5 镜开始态）：手推布局（layout.ts 的 H / H_GEO），模式串 PAT 在 H.patY，next 一排已填满在 H.nextY；
 * 下方卡片和印章在最后 8 帧淡掉；小 i 在左上角 PERCH（HandKit.tsx），scale PERCH.scale，happy 脸在鼓掌。 */
export const S4_END = { patY: H.patY, nextY: H.nextY, nextH: H.nextH, littleI: PERCH } as const;
