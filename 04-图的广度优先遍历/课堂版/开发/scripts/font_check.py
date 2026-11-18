# 字号检查（第三版）：页面里每画一段字都会记下"实际像素字号 / 字重 / 用途 / 位置"（window.__demo.fontDump()），
# 这里在 3D 和强制 2D 两种模式下把每一步放到动画结束，逐段检查：
#   - 所有学生看得到的字 ≥ 44px（右下角进度小字除外）；字重 ≥ 700（bold）；
#   - 标题 ≥ 72px，说明句 ≥ 56px，格子里的字（visited 的 T/F、队列积木、访问序列药丸、邻接表格子、圈号）≥ 56px，代码 ≥ 48px，顶点名字 ≥ 44px；
#   - 没有字出画面（1920×1080）；没有两段字互相压住（外框相交）。
# 输出：开发/字号检查.txt（结论 + 每一步每一段字的字号和字重）。用法：python -I font_check.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
HTML = next(p for p in DEV.parent.glob("图的*优先遍历.html"))
MIN = {"title": 72, "desc": 56, "cell": 56, "code": 48, "vname": 44, "label": 44, "toast": 44, "text": 44}
lines, bad = [], []


def boxes_hit(a, b):
    ax0, ax1, ay0, ay1 = a["x"], a["x"] + a["w"], a["y"] - 0.42 * a["h"], a["y"] + 0.42 * a["h"]
    bx0, bx1, by0, by1 = b["x"], b["x"] + b["w"], b["y"] - 0.42 * b["h"], b["y"] + 0.42 * b["h"]
    return min(ax1, bx1) - max(ax0, bx0) > 3 and min(ay1, by1) - max(ay0, by0) > 3


with sync_playwright() as p:
    br = p.chromium.launch(channel="msedge", headless=True)
    for mode in ("3d", "2d"):
        pg = br.new_page(viewport={"width": 1920, "height": 1080})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(HTML.as_uri() + "?record=1" + ("&mode=2d" if mode == "2d" else ""))
        pg.wait_for_function("window.__demoReady === true", timeout=20000)
        total = pg.evaluate("window.__demo.state().total")
        T = 1.0
        nsz, smin = 0, {}
        for i in range(total):
            pg.evaluate(f"window.__demo.goStep({i})"); T += 0.5; pg.evaluate(f"window.__demo.setTime({T})")
            st = pg.evaluate("window.__demo.state()")
            T += st["dur"] + 3.0; pg.evaluate(f"window.__demo.setTime({T})")
            items = [d for d in pg.evaluate("window.__demo.fontDump()") if d["alpha"] > 0.05]
            tag = f"[{mode}] 第 {i + 1} 步（{st['sec']} 段 {st['kind']} {st['n']}）"
            lines.append(f"\n{tag}")
            vis = [d for d in items if d["role"] != "progress"]
            for d in items:
                lines.append(f"    {d['size']:>5}px {d['weight']}  {d['role']:<6} {d['s']}")
                if d["role"] == "progress": continue
                nsz += 1
                smin[d["role"]] = min(smin.get(d["role"], 999), d["size"])
                need = MIN.get(d["role"], 44)
                if d["size"] + 0.05 < need: bad.append(f"{tag} 字号 {d['size']} < {need}（{d['role']}）：{d['s']}")
                if d["weight"] < 700: bad.append(f"{tag} 字重 {d['weight']}：{d['s']}")
                if d["x"] < -2 or d["x"] + d["w"] > 1922 or d["y"] - d["h"] / 2 < -2 or d["y"] + d["h"] / 2 > 1082:
                    bad.append(f"{tag} 出画面：{d['s']}（x {d['x']}..{d['x'] + d['w']}，y {d['y']}）")
            for a in range(len(vis)):
                for b in range(a + 1, len(vis)):
                    same = vis[a]["s"] == vis[b]["s"] and abs(vis[a]["x"] - vis[b]["x"]) < 3 and abs(vis[a]["y"] - vis[b]["y"]) < 3   # 同一段字原地重画（如描深的路），不算压字
                    if not same and vis[a]["alpha"] > 0.3 and vis[b]["alpha"] > 0.3 and boxes_hit(vis[a], vis[b]):
                        bad.append(f"{tag} 字压字：「{vis[a]['s']}」({vis[a]['x']},{vis[a]['y']}) 和「{vis[b]['s']}」({vis[b]['x']},{vis[b]['y']})")
        head = f"[{mode}] {total} 步，检查了 {nsz} 段字；各类最小字号：" + "，".join(f"{k} {v}px" for k, v in sorted(smin.items()))
        print(head); lines.insert(0, head)
        if errs: bad.append(f"[{mode}] 脚本错误：{errs[:3]}")
        pg.close()
    br.close()

rule = "规则：所有字 ≥ 44px 且 bold（≥ 700，右下角进度小字除外）；标题 ≥ 72，说明句 ≥ 56，格子里的字 ≥ 56，代码 ≥ 48，顶点名字 ≥ 44；不出画面；字不压字。"
res = "结论：全部符合" if not bad else f"结论：{len(bad)} 处不符合"
out = [rule, res] + [f"  {b}" for b in bad] + [""] + lines
(DEV / "字号检查.txt").write_text("\n".join(out) + "\n", encoding="utf-8")
print(res)
for b in bad[:60]: print("  " + b)
sys.exit(1 if bad else 0)
