// 遍历回放：脚本算好的事件序列（visit / check / back / done）+ 每个事件的帧号 → 某一帧的画面状态。
// 图（GraphView）、栈（StackView）、visited（ArrayView）、序列（SeqRow）都只读这里算出的状态，
// 所以画面和 scripts/check_numbers.py 的输出一一对应。BFS 可以复用 visit / check，另加入队 / 出队事件。
import { EASE_CAMERA, progress } from "../base/anim";
import { bump } from "./Kit";

export type TEvent = {
  t: "visit" | "check" | "back" | "done";
  v: number;
  from: number | null;
  arc: number | null;
  stack: number[];
  visited: boolean[];
  seq: number[];
};

/** 单个事件的分动作时刻覆盖（默认按到达时刻往后错几帧） */
export type Override = { mark?: number; push?: number; seq?: number; pop?: number };

export type TraverseOpts = {
  color: string;
  /** 前进时指针走一条边的帧数 */
  move?: number;
  /** 回退时指针走一条边的帧数 */
  back?: number;
  /** 探一下已访问邻接点的帧数 */
  probe?: number;
  overrides?: Record<number, Override>;
  /** 第一个事件之前就把指针圆环套在起点上（从这一帧开始淡入） */
  showPointerAt?: number;
  /** 从这一帧起整遍淡回初始状态（换下一遍时用）；序列行不受影响 */
  resetAt?: number;
  resetDur?: number;
};

export type VS = { lit: number; done: number; order: number; litAt: number };
/** a = 父顶点，b = 子顶点；grow 0→1 是指针走过去时边被描色的进度；done = 退回后变浅 */
export type ES = { a: number; b: number; grow: number; done: number };
export type Probe = { a: number; b: number; k: number };
/** 指针：从 a 往 b 走了 t（a = b 表示停在顶点上） */
export type Ptr = { a: number; b: number; t: number; vis: number };
export type StackIt = { v: number; depth: number; inK: number; outK: number; pushAt: number; popAt: number };
export type Cell = { on: number; flash: number };
export type SeqIt = { v: number; at: number };

export type TState = {
  color: string;
  v: Record<number, VS>;
  e: ES[];
  probes: Probe[];
  ptr: Ptr | null;
  stack: StackIt[];
  cells: Record<number, Cell>;
  seq: SeqIt[];
  fade: number;
  /** 当前所在顶点（指针停稳时）；走在边上时为 null */
  at: number | null;
};

const linear = (t: number) => t;

export const checkTimes = (events: TEvent[], times: (number | null)[], name: string): void => {
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

export const traverseAt = (f: number, events: TEvent[], times: (number | null)[], o: TraverseOpts): TState => {
  const move = o.move ?? 12;
  const backDur = o.back ?? 14;
  const probeDur = o.probe ?? 16;
  const fade = o.resetAt !== undefined ? progress(f, o.resetAt, o.resetDur ?? 18) : 0;
  const keep = 1 - fade;
  const v: Record<number, VS> = {};
  const e: ES[] = [];
  const probes: Probe[] = [];
  const items: StackIt[] = [];
  const open: number[] = [];
  const cells: Record<number, Cell> = {};
  const seq: SeqIt[] = [];
  let ptr: Ptr | null = null;
  let order = 0;

  if (o.showPointerAt !== undefined && events.length > 0 && f >= o.showPointerAt && (times[0] === null || f < (times[0] as number))) {
    ptr = { a: events[0].v, b: events[0].v, t: 1, vis: progress(f, o.showPointerAt, 10) };
  }

  events.forEach((ev, i) => {
    const T = times[i];
    if (T === null) return;
    const ov = o.overrides?.[i] ?? {};
    if (ev.t === "visit") {
      order++;
      const arrive = ev.from === null ? T : T + move;
      const litAt = arrive - 3;
      v[ev.v] = { lit: progress(f, litAt, 10) * keep, done: 0, order, litAt };
      if (ev.from !== null) e.push({ a: ev.from, b: ev.v, grow: progress(f, T, move, EASE_CAMERA) * keep, done: 0 });
      const markAt = ov.mark ?? arrive + 2;
      cells[ev.v] = { on: progress(f, markAt, 8) * keep, flash: bump(f, markAt, 14) };
      const pushAt = ov.push ?? arrive + 4;
      items.push({ v: ev.v, depth: open.length, inK: progress(f, pushAt, 10), outK: fade, pushAt, popAt: Infinity });
      open.push(items.length - 1);
      seq.push({ v: ev.v, at: ov.seq ?? arrive + 6 });
      if (f >= T) {
        ptr =
          ev.from === null
            ? { a: ev.v, b: ev.v, t: 1, vis: o.showPointerAt !== undefined ? 1 : progress(f, T, 8) }
            : { a: ev.from, b: ev.v, t: progress(f, T, move, EASE_CAMERA), vis: 1 };
      }
    } else if (ev.t === "check") {
      if (ev.from !== null && f >= T && f <= T + probeDur) {
        probes.push({ a: ev.from, b: ev.v, k: Math.sin(Math.PI * progress(f, T, probeDur, linear)) });
      }
      const c = cells[ev.v];
      if (c) c.flash = Math.max(c.flash, bump(f, T + probeDur * 0.3, 14));
    } else {
      const idx = open.pop();
      const popAt = ov.pop ?? T;
      if (idx !== undefined) {
        items[idx].popAt = popAt;
        items[idx].outK = Math.max(progress(f, popAt, 12), fade);
      }
      if (v[ev.v]) v[ev.v].done = progress(f, popAt, 12);
      if (ev.t === "back" && ev.from !== null) {
        const ed = e.find((x) => x.b === ev.v && x.a === ev.from);
        if (ed) ed.done = progress(f, T, 12);
        if (f >= T) ptr = { a: ev.v, b: ev.from, t: progress(f, T, backDur, EASE_CAMERA), vis: 1 };
      } else if (f >= T) {
        ptr = { a: ev.v, b: ev.v, t: 1, vis: 1 - progress(f, T + 6, 10) };
      }
    }
  });

  const p = ptr as Ptr | null;
  if (p) p.vis *= keep;
  const at = p && (p.a === p.b || p.t >= 1) ? p.b : null;
  return { color: o.color, v, e, probes, ptr: p, stack: items, cells, seq, fade, at };
};

/** 只点亮一条路径（不带栈 / visited），例如讲题时演示 v1→v2→v4：第 i 个顶点在 at + i·step 点亮 */
export const pathState = (f: number, path: number[], at: number, step: number, color: string, fadeAt?: number): TState => {
  const keep = fadeAt === undefined ? 1 : 1 - progress(f, fadeAt, 14);
  const v: Record<number, VS> = {};
  const e: ES[] = [];
  path.forEach((x, i) => {
    const t0 = at + i * step;
    v[x] = { lit: progress(f, t0 + (i === 0 ? 0 : step * 0.7), 10) * keep, done: 0, order: i + 1, litAt: t0 };
    if (i > 0) e.push({ a: path[i - 1], b: x, grow: progress(f, t0, step, EASE_CAMERA) * keep, done: 0 });
  });
  return { color, v, e, probes: [], ptr: null, stack: [], cells: {}, seq: [], fade: 1 - keep, at: null };
};

/** 栈里“现在有几层”（连续值，给栈顶标记做平滑移动用） */
export const stackDepth = (items: StackIt[]): number => items.reduce((s, it) => s + it.inK * (1 - it.outK), 0);

/** 当前栈顶（已压入、未弹出的最后一个） */
export const stackTop = (items: StackIt[]): StackIt | null => {
  for (let i = items.length - 1; i >= 0; i--) if (items[i].inK > 0.5 && items[i].outK < 0.5) return items[i];
  return null;
};
