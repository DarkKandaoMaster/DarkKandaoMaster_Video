// 绳结模型的运动学：只由"源点被提起的高度 H"（权值单位）决定，纯函数，不用物理引擎。
// 和 scripts/check_numbers.py 里的 positions() 是同一套公式（那边扫过整个 H 范围做了自检）。
//
// 规则（世界坐标，桌面 y = 0，珠心在桌上时 y = R）：
// - 源点：水平不动，珠心高 R + H·S。
// - 其它珠子 v（最短路径树上的父结点 p，绳长 L = w(p,v)·S）：
//   H ≥ dist[v]：已离桌，挂在 p 正下方（加一点水平偏移 OFFSET），珠心高 R + (H − dist[v])·S；
//   H < dist[v]：还在桌上。p 被提起 h_p 后，绳子在水平方向最多还能放 r = √(L² − h_p²)；
//   珠子离 p 的水平距离超过 r 时就被拖着在桌面上滑向 p。h_p = L（即 H = dist[v]）时正好滑到 p 正下方离桌。
// 所以"离桌时的 H = dist[v]"是精确的。
import { DATA } from "./data.generated";

export type V3 = [number, number, number];

export const N = DATA.names.length;
export const S = DATA.S;
export const R = DATA.R;
export const H_END = DATA.H_END;
export const DIST: readonly number[] = DATA.dist;
export const PREV: readonly number[] = DATA.prev;
export const ORDER: readonly number[] = DATA.order;
export const NAMES: readonly string[] = DATA.names;
export const SRC = DATA.src;

export type Edge = { u: number; v: number; w: number; tree: boolean; slack: number; key: string };
export const EDGES: Edge[] = DATA.edges.map((e) => ({ ...e, key: `${e.u}-${e.v}` }));

const W = new Map<string, number>();
for (const e of EDGES) {
  W.set(`${e.u}-${e.v}`, e.w);
  W.set(`${e.v}-${e.u}`, e.w);
}
export const weight = (a: number, b: number): number => W.get(`${a}-${b}`) ?? NaN;

/** H 时每颗珠子珠心的位置 */
export const beadPositions = (H: number): V3[] => {
  const P: V3[] = new Array(N);
  for (const v of ORDER) {
    const h = Math.max(0, H - DIST[v]) * S;
    const [tx, tz] = DATA.table[v];
    if (v === SRC) {
      P[v] = [tx, R + h, tz];
      continue;
    }
    const p = PREV[v];
    const [px, py, pz] = P[p];
    const hp = py - R;
    const [ox, oz] = DATA.offset[v];
    const ax = px + ox;
    const az = pz + oz;
    if (H >= DIST[v]) {
      P[v] = [ax, R + h, az];
      continue;
    }
    const L = weight(p, v) * S;
    const r = Math.sqrt(Math.max(0, L * L - hp * hp));
    const dx = tx - ax;
    const dz = tz - az;
    const R0 = Math.hypot(dx, dz);
    const k = R0 > 1e-9 ? Math.min(R0, r) / R0 : 0;
    P[v] = [ax + dx * k, R, az + dz * k];
  }
  return P;
};

/** 珠子离桌高度 0..（世界单位） */
export const liftOf = (P: V3[], v: number): number => P[v][1] - R;

// ───────────────────────── 绳子形状 ─────────────────────────
const ROPE_R = 0.026; // 绳子半径（贴桌时绳心高度）
export const ROPE_RADIUS = ROPE_R;
const SEG = 40;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 桌面初始布局下每条边的"侧向"参考方向（绳子在桌上往哪边弯），之后一直和它保持同侧，避免翻面 */
const REF_SIDE: Map<string, V3> = (() => {
  const P0 = beadPositions(0);
  const m = new Map<string, V3>();
  const cx = DATA.table.reduce((s, t) => s + t[0], 0) / N;
  const cz = DATA.table.reduce((s, t) => s + t[1], 0) / N;
  for (const e of EDGES) {
    const a = P0[e.u];
    const b = P0[e.v];
    const d = sub(b, a);
    let side: V3 = norm([-d[2], 0, d[0]]);
    // 往图的外侧弯（离重心远的一侧），少和别的绳子交叉
    const mid: V3 = [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz];
    if (side[0] * mid[0] + side[2] * mid[2] < 0) side = [-side[0], 0, -side[2]];
    m.set(e.key, side);
  }
  return m;
})();

const curvePoints = (a: V3, b: V3, dir: V3, amp: number): V3[] => {
  const pts: V3[] = [];
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const s = Math.sin(Math.PI * t) * amp;
    const x = a[0] + (b[0] - a[0]) * t + dir[0] * s;
    const y = Math.max(ROPE_R, a[1] + (b[1] - a[1]) * t + dir[1] * s);
    const z = a[2] + (b[2] - a[2]) * t + dir[2] * s;
    pts.push([x, y, z]);
  }
  return pts;
};

/**
 * 挂起来以后松绳往哪边弯（xz 平面里的角度 atan2(z, x)）：
 * 两端都在主链上（最后都挂在源点正下方）→ 往 -x（卷尺那侧）；一端在 +x 那一支上 → 往 +x，不横穿主链。
 */
const HANG_ANGLE: Map<string, number> = (() => {
  const PF = beadPositions(H_END);
  const x0 = PF[SRC][0];
  const m = new Map<string, number>();
  for (const e of EDGES) {
    const dx = Math.max(PF[e.u][0], PF[e.v][0]) - x0;
    m.set(e.key, dx > 0.1 ? 0 : Math.PI);
  }
  return m;
})();

const polyLen = (pts: V3[]) => {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += len(sub(pts[i], pts[i - 1]));
  return s;
};

export type RopeShape = { pts: V3[]; taut: number; chord: number; L: number };

/**
 * 一条绳子的形状：端点在两颗珠子的珠心；3D 距离 ≥ 绳长 → 直线（绷紧）；
 * 否则沿"侧向 + 向下"弯一个 sin 弧，二分出弧高让弧长 ≈ 绳长（贴桌部分被桌面托住）。
 */
export const ropeShape = (e: Edge, P: V3[]): RopeShape => {
  const a = P[e.u];
  const b = P[e.v];
  const L = e.w * S;
  const chord = len(sub(b, a));
  const taut = smooth(0.965, 0.995, chord / L);
  if (chord >= L * 0.995) {
    const pts: V3[] = [];
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
    return { pts, taut: 1, chord, L };
  }
  // 桌面阶段的侧向：当前水平弦的垂线（和参考方向同侧）与参考方向按"水平弦有多长"混合
  const ref = REF_SIDE.get(e.key) as V3;
  const d = sub(b, a);
  const hl = Math.hypot(d[0], d[2]);
  let perp: V3 = hl > 1e-6 ? [-d[2] / hl, 0, d[0] / hl] : ref;
  if (perp[0] * ref[0] + perp[2] * ref[2] < 0) perp = [-perp[0], 0, -perp[2]];
  const wH = smooth(0.08, 0.5, hl / L);
  const tableSide = norm([perp[0] * wH + ref[0] * (1 - wH), 0, perp[2] * wH + ref[2] * (1 - wH)]);
  // 两端都离桌以后，侧向在 xz 平面里转到 HANG_SIDE（固定从 +z 一侧转过去，不会突然翻面）
  const lift = Math.min(a[1], b[1]) - R;
  const liftK = smooth(0, 0.45, lift);
  const a0 = Math.atan2(tableSide[2], tableSide[0]);
  const hang = HANG_ANGLE.get(e.key) as number;
  // 从 a0 转到 hang，统一经过 +z 一侧（朝镜头），不会在中途翻面
  let a1 = hang;
  if (hang === Math.PI && a0 < 0) a1 = -Math.PI;
  const ang = a0 + (a1 - a0) * liftK;
  const side: V3 = [Math.cos(ang), 0, Math.sin(ang)];
  // 重力在"垂直于弦"方向上的分量：桌上的绳子往下贴桌；挂起来以后主要往侧面弯（看得清哪根是松的）
  const c = norm(d);
  const gp: V3 = [c[1] * c[0], -1 + c[1] * c[1], c[1] * c[2]]; // (0,-1,0) - ((0,-1,0)·c) c
  const gpl = len(gp);
  const gpHat = gpl > 1e-6 ? norm(gp) : ([0, -1, 0] as V3);
  const k = (0.35 * (1 - liftK) + 0.12 * liftK) * gpl;
  const dir = norm([side[0] * (1 - k) + gpHat[0] * k, gpHat[1] * k, side[2] * (1 - k) + gpHat[2] * k]);
  let lo = 0;
  let hi = L;
  for (let it = 0; it < 26; it++) {
    const mid = (lo + hi) / 2;
    if (polyLen(curvePoints(a, b, dir, mid)) < L) lo = mid;
    else hi = mid;
  }
  return { pts: curvePoints(a, b, dir, lo), taut, chord, L };
};
