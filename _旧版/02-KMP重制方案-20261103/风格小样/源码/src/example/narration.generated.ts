// 由 _tools/tts.py 生成，勿手改。时刻单位：秒（相对该条旁白开始）
export type Seg = { text: string; t: number };
export type Sub = { text: string; t: number; en?: string };
export type Clip = { id: string; scene: string; speak: string; src: string; seconds: number; frames: number;
  onset: number; end: number; segs: Seg[]; subs: Sub[] };
export const CLIPS: Clip[] = [
  { id: "s1a", scene: "1 示例", speak: "这张表有个小秘密：沿对角线对折，两边一模一样。", src: "example/audio/s1a.mp3", seconds: 4.899, frames: 147, onset: 0.02, end: 4.86, segs: [{"text": "这张表有个小秘密：", "t": 0.02}, {"text": "沿对角线对折，", "t": 1.92}, {"text": "两边一模一样。", "t": 3.52}], subs: [{"text": "这张表有个小秘密：沿对角线对折，两边一模一样。", "t": 0.02, "en": "This table has a little secret: fold it along the diagonal, and the two halves match."}] },
];
