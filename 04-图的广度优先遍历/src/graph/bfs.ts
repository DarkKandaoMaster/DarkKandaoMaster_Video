// BFS 回放：脚本算好的事件序列（visit / deq / enq / check / done）+ 每个事件的帧号 → 某一帧的画面状态。
// 状态和 traverse.ts 的 TState 同形（GraphView、ArrayView、SeqRow 直接用），另外多一个队列 queue（给 QueueView）。
// 教材算法 7.6：入队时就置 visited、访问（写进序列）；出队 u，依次看 u 的邻接点。
import { EASE_CAMERA, progress } from "../base/anim";
import { bump } from "./Kit";
import type { QueueIt } from "./Structures";
import type { Cell, ES, Probe, Ptr, SeqIt, TState, VS } from "./traverse";

export type BEvent = {
  t: "visit" | "deq" | "enq" | "check" | "done";
  v: number;
  from: number | null;
  arc: number | null;
  layer: number;
  queue: number[];
  visited: boolean[];
  seq: number[];
};

/** 单个入队事件的分动作时刻覆盖：lit = 顶点点亮，mark = visited 置 T，push = 落进队尾，seq = 写进序列 */
export type BOverride = { lit?: number; mark?: number; push?: number; seq?: number };

export type BfsOpts = {
  color: string;
  /** 入队时边从 u 描向 w 的帧数 */
  move?: number;
  /** 探一下已访问邻接点的帧数 */
  probe?: number;
  overrides?: Record<number, BOverride>;
  /** 从这一帧起整遍淡回初始状态（换下一遍时用）；序列行不受影响 */
  resetAt?: number;
  resetDur?: number;
};

export type BState = TState & { queue: QueueIt[]; deqAt: number[] };

const linear = (t: number) => t;

/** 时刻校验：只有 check 可以省略（null = 不演）；非 null 的时刻不能倒退 */
export const checkBTimes = (events: BEvent[], times: (number | null)[], name: string): void => {
  if (events.length !== times.length) throw new Error(`${name}：事件 ${events.length} 个，时刻 ${times.length} 个`);
  let last = -Infinity;
  times.forEach((t, i) => {
    if (t === null) {
      if (events[i].t !== "check") throw new Error(`${name}：#${i} 是 ${events[i].t}，不能省略时刻`);
      return;
    }
    if (t < last) throw new Error(`${name}：#${i} 的时刻 ${t} 早于前一个 ${last}`);
    last = t;
  });
};

export const bfsAt = (f: number, events: BEvent[], times: (number | null)[], o: BfsOpts): BState => {
  const move = o.move ?? 12;
  const probeDur = o.probe ?? 14;
  const fade = o.resetAt !== undefined ? progress(f, o.resetAt, o.resetDur ?? 18) : 0;
  const keep = 1 - fade;
  const v: Record<number, VS> = {};
  const e: ES[] = [];
  const probes: Probe[] = [];
  const cells: Record<number, Cell> = {};
  const seq: SeqIt[] = [];
  const queue: QueueIt[] = [];
  const deqAt: number[] = [];
  let ptr: Ptr | null = null;
  let order = 0;

  const enter = (w: number, from: number | null, T: number, ov: BOverride) => {
    order++;
    const arrive = from === null ? T : T + move;
    const litAt = ov.lit ?? arrive - 3;
    v[w] = { lit: progress(f, litAt, 10) * keep, done: 0, order, litAt };
    if (from !== null) e.push({ a: from, b: w, grow: progress(f, T, move, EASE_CAMERA) * keep, done: 0 });
    const markAt = ov.mark ?? arrive + 1;
    cells[w] = { on: progress(f, markAt, 8) * keep, flash: bump(f, markAt, 14) };
    const pushAt = ov.push ?? arrive + 3;
    queue.push({ v: w, inAt: pushAt });
    seq.push({ v: w, at: ov.seq ?? pushAt + 2 });
  };

  events.forEach((ev, i) => {
    const T = times[i];
    if (T === null) return;
    const ov = o.overrides?.[i] ?? {};
    if (ev.t === "visit") enter(ev.v, null, T, ov);
    else if (ev.t === "enq") enter(ev.v, ev.from, T, ov);
    else if (ev.t === "deq") {
      const it = queue.find((q) => q.v === ev.v && q.outAt === undefined);
      if (it) it.outAt = T;
      deqAt.push(T);
      if (v[ev.v]) v[ev.v].done = progress(f, T + 4, 12);
      // 指针：套在正在处理的顶点上（BFS 不沿边走，换顶点时淡入）
      if (f >= T) ptr = { a: ev.v, b: ev.v, t: 1, vis: progress(f, T, 8) };
      // 这个顶点入队时描的那条边，出队后变浅
      const ed = e.find((x) => x.b === ev.v);
      if (ed) ed.done = progress(f, T + 4, 12);
    } else if (ev.t === "check") {
      if (ev.from !== null && f >= T && f <= T + probeDur) {
        probes.push({ a: ev.from, b: ev.v, k: Math.sin(Math.PI * progress(f, T, probeDur, linear)) });
      }
      const c = cells[ev.v];
      if (c) c.flash = Math.max(c.flash, bump(f, T + probeDur * 0.3, 14));
    } else if (f >= T && ptr) {
      ptr = { ...ptr, vis: 1 - progress(f, T + 4, 10) };
    }
  });

  const p = ptr as Ptr | null;
  if (p) p.vis *= keep;
  return { color: o.color, v, e, probes, ptr: p, stack: [], cells, seq, fade, at: p ? p.b : null, queue, deqAt };
};

/** 只点亮一些顶点（不带队列 / visited），例如分层那一镜：第 i 项在 at 点亮，from 给了就先从 from 描一条边过来 */
export type LitItem = { v: number; at: number; from?: number };
export const litState = (f: number, items: LitItem[], color: string, o: { move?: number; fadeAt?: number; doneAt?: number } = {}): TState => {
  const move = o.move ?? 10;
  const keep = o.fadeAt === undefined ? 1 : 1 - progress(f, o.fadeAt, 16);
  const done = o.doneAt === undefined ? 0 : progress(f, o.doneAt, 14);
  const v: Record<number, VS> = {};
  const e: ES[] = [];
  items.forEach((it, i) => {
    const arrive = it.from === undefined ? it.at : it.at + move;
    v[it.v] = { lit: progress(f, arrive - 3, 10) * keep, done, order: i + 1, litAt: arrive - 3 };
    if (it.from !== undefined) e.push({ a: it.from, b: it.v, grow: progress(f, it.at, move, EASE_CAMERA) * keep, done });
  });
  return { color, v, e, probes: [], ptr: null, stack: [], cells: {}, seq: [], fade: 1 - keep, at: null };
};
