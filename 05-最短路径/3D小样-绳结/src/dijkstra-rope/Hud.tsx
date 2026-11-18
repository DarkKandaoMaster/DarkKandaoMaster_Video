// 平面层：所有数字、名字、表格、字幕都在这里（普通 HTML，叠在 ThreeCanvas 上面）。
// 贴在 3D 物体旁边的标签用 camera.ts 的投影算屏幕坐标，字本身永远是正的、等大的。
import React from "react";
import { useCurrentFrame } from "remotion";
import { EASE_IN, fadeInOut, mix, progress } from "../base/anim";
import { FONT, hexA } from "../base/theme";
import { makeProjector } from "./camera";
import { DATA } from "./data.generated";
import { beadPositions, DIST, EDGES, N, NAMES, ORDER, R, ropeShape, S, SRC } from "./kinematics";
import { COL, TAPE_DX } from "./Scene3D";
import { camAt, heightAt, LOCK_FRAME, T } from "./timeline";

const INK = "#1E2738";
const INK2 = "#5A6274";
const INK3 = "#959BA6";

// ───────────────────────── Dijkstra 表的状态（按帧回放 check_numbers.py 的每一步） ─────────────────────────
type Cell = { val: number | null; old: number | null; changedAt: number; prev: number };
const UPDATE_DELAY = 10; // 锁定后多少帧更新邻居
const tableAt = (f: number): Cell[] => {
  const cells: Cell[] = Array.from({ length: N }, () => ({ val: null, old: null, changedAt: -999, prev: -1 }));
  cells[SRC] = { val: 0, old: null, changedAt: T.liftStart - 60, prev: -1 };
  for (const s of DATA.steps) {
    const at = LOCK_FRAME[s.lock] + UPDATE_DELAY;
    if (f < at) break;
    for (const u of s.updates) {
      cells[u.v] = { val: u.new, old: u.old, changedAt: at, prev: s.lock };
    }
  }
  return cells;
};

const Num: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontFamily: FONT.sans, fontVariantNumeric: "tabular-nums", ...style }}>{children}</span>
);

/** 顶点名：v 加下标 */
const VName: React.FC<{ v: number; size: number; color: string; weight?: number }> = ({ v, size, color, weight = 600 }) => (
  <span style={{ fontFamily: FONT.math, fontStyle: "italic", fontSize: size, color, fontWeight: weight, whiteSpace: "nowrap" }}>
    v<sub style={{ fontFamily: FONT.sans, fontStyle: "normal", fontSize: size * 0.62, verticalAlign: "-0.28em" }}>{NAMES[v].slice(1)}</sub>
  </span>
);

const PANEL_X = 1452;
const PANEL_W = 400;
const ROW_H = 60;
const TABLE_Y = 236;

const DistTable: React.FC<{ f: number }> = ({ f }) => {
  const appear = progress(f, T.hookDown - 10, 24);
  const cells = tableAt(f);
  const H = heightAt(f);
  const colX = [0, 120, 270]; // 顶点 / dist / path
  return (
    <div style={{ position: "absolute", left: PANEL_X, top: 0, width: PANEL_W, opacity: appear, transform: `translateY(${mix(14, 0, appear)}px)` }}>
      {/* H 读数 */}
      <div style={{ position: "absolute", top: 128, left: 0, fontFamily: FONT.sans, fontSize: 30, color: INK2, whiteSpace: "nowrap" }}>
        提起高度 <span style={{ fontFamily: FONT.math, fontStyle: "italic", color: INK }}>H</span>
        <Num style={{ color: INK, fontWeight: 600, marginLeft: 12 }}>= {H.toFixed(1)}</Num>
      </div>
      {/* 表头 */}
      <div style={{ position: "absolute", top: TABLE_Y - 2, left: 0, width: PANEL_W, height: ROW_H, fontFamily: FONT.sans, fontSize: 24, color: INK3 }}>
        <span style={{ position: "absolute", left: colX[0] + 8, top: 16 }}>顶点</span>
        <span style={{ position: "absolute", left: colX[1], top: 14, fontFamily: FONT.mono, fontSize: 27 }}>dist</span>
        <span style={{ position: "absolute", left: colX[2], top: 14, fontFamily: FONT.mono, fontSize: 27 }}>path</span>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1.5, background: "#D8D1C2" }} />
      </div>
      {Array.from({ length: N }, (_, v) => {
        const c = cells[v];
        const lock = progress(f, LOCK_FRAME[v], 10);
        const flash = fadeInOut(f, LOCK_FRAME[v], LOCK_FRAME[v] + 40, 6, 24);
        const top = TABLE_Y + ROW_H * (v + 1);
        const fresh = progress(f, c.changedAt, 10);
        const oldOut = c.old === null ? 0 : 1 - progress(f, c.changedAt + 46, 14, EASE_IN);
        return (
          <div key={v} style={{ position: "absolute", top, left: 0, width: PANEL_W, height: ROW_H }}>
            <div
              style={{
                position: "absolute",
                inset: "4px -10px",
                borderRadius: 12,
                background: hexA(COL.coral, 0.1 * lock + 0.12 * flash),
              }}
            />
            <div style={{ position: "absolute", left: colX[0] + 8, top: 6 }}>
              <VName v={v} size={34} color={lock > 0.5 ? COL.coral : INK} />
            </div>
            {/* dist */}
            <div style={{ position: "absolute", left: colX[1], top: 9, fontSize: 32, display: "flex", alignItems: "baseline", gap: 12 }}>
              {c.val === null ? (
                <Num style={{ color: INK3, fontSize: 32 }}>∞</Num>
              ) : (
                <>
                  {c.old !== null && oldOut > 0.01 ? (
                    <Num style={{ color: INK3, fontSize: 24, textDecoration: "line-through", opacity: oldOut }}>{c.old}</Num>
                  ) : c.old === null && c.changedAt > 0 && f < c.changedAt + 12 ? (
                    <Num style={{ color: INK3, fontSize: 24, textDecoration: "line-through", opacity: 1 - fresh }}>∞</Num>
                  ) : null}
                  <Num
                    style={{
                      color: lock > 0.5 ? COL.coral : INK,
                      fontWeight: lock > 0.5 ? 700 : 500,
                      display: "inline-block",
                      transform: `translateY(${mix(-10, 0, fresh)}px)`,
                      opacity: fresh,
                    }}
                  >
                    {c.val}
                  </Num>
                </>
              )}
            </div>
            {/* path（前驱） */}
            <div style={{ position: "absolute", left: colX[2], top: 6, opacity: c.prev >= 0 ? fresh : 1 }}>
              {c.prev >= 0 ? <VName v={c.prev} size={30} color={lock > 0.5 ? COL.coral : INK2} weight={500} /> : <Num style={{ color: INK3, fontSize: 30 }}>−</Num>}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: "#E6E0D3" }} />
          </div>
        );
      })}
      {/* 锁定顺序 */}
      <div style={{ position: "absolute", top: TABLE_Y + ROW_H * (N + 1) + 26, left: 0, width: PANEL_W + 40, fontFamily: FONT.sans, fontSize: 24, color: INK3 }}>
        锁定顺序（= 离桌顺序）
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 6 }}>
          {ORDER.map((v, i) => {
            const a = progress(f, LOCK_FRAME[v], 10);
            if (a <= 0) return null;
            return (
              <span key={v} style={{ opacity: a, display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                {i > 0 ? <span style={{ color: INK3, fontSize: 24 }}>→</span> : null}
                <VName v={v} size={30} color={COL.coral} />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── 贴在 3D 上的标签 ─────────────────────────
const Labels: React.FC<{ f: number }> = ({ f }) => {
  const cam = camAt(f);
  const proj = makeProjector(cam);
  const H = heightAt(f);
  const P = beadPositions(H);
  const intro = progress(f, 24, 20);
  // 珠子在屏幕上的半径（用来定字号）
  const pxPerWorld = (p: readonly [number, number, number]) => {
    const a = proj(p);
    const b = proj([p[0], p[1] + R, p[2]]);
    return Math.hypot(a.x - b.x, a.y - b.y) / R;
  };
  const out: React.ReactNode[] = [];

  const under: React.ReactNode[] = []; // 画在权值签下面的（虚线）

  // 权值：绳子中点上的小白签。先放在中点，再做几轮"互相推开 + 躲开珠子"，免得叠在一起或盖住珠子名
  const beads = P.map((p) => {
    const q = proj(p);
    return { x: q.x, y: q.y, r: pxPerWorld(p) * R };
  });
  const chips = EDGES.map((e) => {
    const shape = ropeShape(e, P);
    const q = proj(shape.pts[Math.floor(shape.pts.length / 2)]);
    const child = DIST[e.u] > DIST[e.v] ? e.u : e.v;
    return { e, x: q.x, y: q.y, hot: e.tree && shape.taut > 0.5 && f >= LOCK_FRAME[child] };
  });
  const CHIP_GAP = 38;
  for (let it = 0; it < 8; it++) {
    for (let i = 0; i < chips.length; i++) {
      for (let j = i + 1; j < chips.length; j++) {
        const a = chips[i];
        const b = chips[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= CHIP_GAP) continue;
        if (d < 1e-3) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (CHIP_GAP - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
      const c = chips[i];
      for (const b of beads) {
        const need = b.r + 20;
        const dx = c.x - b.x;
        const dy = c.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d >= need) continue;
        const ux = d > 1e-3 ? dx / d : 1;
        const uy = d > 1e-3 ? dy / d : 0;
        c.x = b.x + ux * need;
        c.y = b.y + uy * need;
      }
    }
  }
  for (const c of chips) {
    out.push(
      <div
        key={`w${c.e.key}`}
        style={{
          position: "absolute",
          left: c.x,
          top: c.y,
          transform: "translate(-50%, -50%)",
          minWidth: 30,
          padding: "1px 8px 2px",
          borderRadius: 9,
          background: "rgba(255, 253, 248, 0.94)",
          boxShadow: `inset 0 0 0 1.5px ${c.hot ? hexA(COL.coral, 0.7) : "#D5CCBB"}`,
          fontFamily: FONT.sans,
          fontVariantNumeric: "tabular-nums",
          fontSize: 23,
          fontWeight: 600,
          color: c.hot ? "#B8401A" : INK2,
          textAlign: "center",
          opacity: intro,
        }}
      >
        {c.e.w}
      </div>,
    );
  }

  // 珠子名字：写在珠子上
  P.forEach((p, v) => {
    const q = proj(p);
    const r = pxPerWorld(p) * R;
    const size = Math.max(18, Math.min(26, r * 0.95));
    out.push(
      <div key={`n${v}`} style={{ position: "absolute", left: q.x, top: q.y - size * 0.06, transform: "translate(-50%, -50%)", opacity: intro, lineHeight: 1 }}>
        <VName v={v} size={size} color="#FFFFFF" />
      </div>,
    );
  });

  // "源点"小签
  const srcA = fadeInOut(f, T.hookDown, T.liftStart + 120, 14, 20);
  if (srcA > 0) {
    const q = proj(P[SRC]);
    out.push(
      <div key="srcTag" style={{ position: "absolute", left: q.x - 40, top: q.y + 8, transform: "translate(-100%, 0)", opacity: srcA, fontFamily: FONT.sans, fontSize: 26, color: COL.coral, fontWeight: 600, whiteSpace: "nowrap" }}>
        源点
      </div>,
    );
  }

  // 卷尺读数：整数刻度灰色小字，已锁定的 dist 用珊瑚橙大字（写在尺带左边）
  if (f >= T.hookOn) {
    const src = P[SRC];
    const tapeX = src[0] + TAPE_DX;
    for (let k = 0; k <= Math.floor(H + 1e-6); k++) {
      const y = src[1] - k * S;
      if (y < R + 0.03) continue;
      const v = DIST.indexOf(k);
      const locked = v >= 0 && f >= LOCK_FRAME[v];
      const q = proj([tapeX - 0.08, y, src[2]]);
      const a = locked ? progress(f, LOCK_FRAME[v], 10) : 0.85;
      if (!locked && k % 2 === 1) continue;
      out.push(
        <div
          key={`t${k}`}
          style={{
            position: "absolute",
            left: q.x - 10,
            top: q.y,
            transform: "translate(-100%, -50%)",
            fontFamily: FONT.sans,
            fontVariantNumeric: "tabular-nums",
            fontSize: locked ? 26 : 17,
            fontWeight: locked ? 700 : 400,
            color: locked ? COL.coral : INK3,
            opacity: a,
            whiteSpace: "nowrap",
          }}
        >
          {k}
        </div>,
      );
    }
    // 侧视定格后：从卷尺上的 dist 刻度到对应珠子拉一条细虚线（"高度 = dist"）
    const g = progress(f, T.sideDone - 20, 30);
    if (g > 0) {
      for (const v of ORDER) {
        const p = P[v];
        const q0 = proj([tapeX + 0.06, p[1], p[2]]);
        const q1 = proj(p);
        const r = pxPerWorld(p) * R;
        const x1 = q1.x - r - 4;
        if (x1 <= q0.x) continue;
        under.push(
          <div
            key={`g${v}`}
            style={{
              position: "absolute",
              left: q0.x,
              top: q0.y,
              width: (x1 - q0.x) * g,
              height: 0,
              borderTop: `2px dashed ${hexA(COL.coral, 0.55)}`,
              transform: `rotate(${Math.atan2(q1.y - q0.y, x1 - q0.x)}rad)`,
              transformOrigin: "0 0",
            }}
          />,
        );
      }
    }
  }
  return (
    <>
      {under}
      {out}
    </>
  );
};

// ───────────────────────── 标题、字幕 ─────────────────────────
type Cap = { from: number; to: number; zh: string; en: string };
const CAPS: Cap[] = [
  { from: 22, to: 136, zh: "珠子是顶点，绳子是边，绳长就是权值", en: "Beads are vertices, strings are edges, and a string's length is its weight." },
  { from: 142, to: 300, zh: "捏住源点 v0，慢慢往上提", en: "Hold the source v0 and lift it slowly." },
  { from: 306, to: 470, zh: "离 v0 越近的珠子，越先离开桌面", en: "The closer a bead is to v0, the sooner it leaves the table." },
  { from: 476, to: 632, zh: "离桌那一刻提起的高度，正好是它的最短距离", en: "The height at that moment is exactly its shortest distance." },
  { from: 638, to: 784, zh: "绷直的绳子变成橙色；没绷直的，一直松松地垂着", en: "Taut strings turn orange; the slack ones just hang loose." },
  { from: 790, to: 866, zh: "先离开桌面的，就是先被锁定的", en: "First off the table = first locked in by Dijkstra." },
  { from: 872, to: T.total - 6, zh: "绷直的绳子连起来，就是最短路径树", en: "The taut strings together form the shortest-path tree." },
];

const Caption: React.FC<{ f: number }> = ({ f }) => {
  const c = CAPS.find((x) => f >= x.from - 2 && f < x.to + 2);
  if (!c) return null;
  const a = fadeInOut(f, c.from, c.to, 8, 8);
  const big = c.from >= T.conclude;
  return (
    <div style={{ position: "absolute", left: 0, width: 1400, bottom: 54, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ padding: "10px 30px 12px", borderRadius: 14, background: "rgba(250, 247, 240, 0.9)", textAlign: "center", fontFamily: FONT.sans }}>
        <div style={{ fontSize: big ? 44 : 36, fontWeight: big ? 700 : 500, color: big ? INK : "#2A2F3B", letterSpacing: "0.02em", lineHeight: 1.35 }}>
          {c.zh.split(/(v0)/).map((s, i) =>
            s === "v0" ? <VName key={i} v={0} size={big ? 44 : 36} color={COL.coral} weight={500} /> : <span key={i}>{s}</span>,
          )}
        </div>
        <div style={{ fontSize: 24, color: "#80869A", marginTop: 2, lineHeight: 1.3 }}>{c.en}</div>
      </div>
    </div>
  );
};

const Title: React.FC<{ f: number }> = ({ f }) => {
  const a = Math.min(progress(f, 4, 20), 1 - progress(f, T.hookDown + 20, 30, EASE_IN));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 72, top: 58, opacity: a, fontFamily: FONT.sans }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: INK, letterSpacing: "0.02em" }}>
        Dijkstra 的绳结模型
      </div>
      <div style={{ fontSize: 22, color: INK3, marginTop: 4 }}>The string-and-bead model of shortest paths</div>
    </div>
  );
};

export const Hud: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Labels f={f} />
      <Title f={f} />
      <DistTable f={f} />
      <Caption f={f} />
    </>
  );
};

