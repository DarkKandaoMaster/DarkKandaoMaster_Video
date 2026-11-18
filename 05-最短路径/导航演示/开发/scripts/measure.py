# 路网测量：顶点 / 路段在 2023 年《体育场地分布图》上描（像素坐标），
# 用几个地标做仿射变换对齐到《总平面图》，在总平面图上按比例尺量长度（米）。
# 另外用 OpenStreetMap 的路网坐标做交叉验证（开发/work/osm.json，可选）。
# 输出：开发/data/network.json（页面和 verify.py 用）、开发/核对图/*.jpg（叠回原图的核对图）、开发/测量结果.txt
# 用法：python -I measure.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
import json, math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
DEV = Path(__file__).resolve().parents[1]
MAPS = DEV.parents[1] / "地图"
OUT_DATA = DEV / "data"; OUT_DATA.mkdir(exist_ok=True)
OUT_IMG = DEV / "核对图"; OUT_IMG.mkdir(exist_ok=True)
FONT = r"C:\Windows\Fonts\msyh.ttc"

# ---------------------------------------------------------------------------
# 1. 地标（体育场地分布图像素  ↔  总平面图像素  ↔  OSM 局部米坐标，可缺）
#    OSM 局部坐标：以 (30.8750N, 120.1270E) 为原点，x 向东、y 向南，单位米
# ---------------------------------------------------------------------------
LANDMARKS = [
    # 名字,                    体育场地分布图,     总平面图,        OSM
    ("数字图书馆（楼中心）",    (3802, 2018), (4764, 3338), (-174.5, 79.0)),
    ("和润楼/1号食堂（楼中心）", (4845, 1278), (6352, 2021), (246.5, -275.5)),
    ("会堂（楼中心）",          (3458, 2221), (4208, 3735), (-310.0, 174.5)),
    ("32号公共教学楼（楼中心）", (4023, 1550), (5103, 2545), (-79.5, -131.0)),
    ("鹊望亭",                  (4496, 1746), (5827, 2844), None),
    ("安吉园圆形广场",          (4688, 1909), (6121, 3146), None),
    ("明达路×梁希路",           (4300, 1602), (5534, 2644), (33.0, -115.0)),
    ("明达路×郑凝路",           (3857, 1666), (4840, 2696), (-151.0, -81.0)),
    ("北门（梁希路北口）",       (4203, 1326), (5405, 2190), (-13.5, -248.5)),
]

# ---------------------------------------------------------------------------
# 2. 顶点与路段（体育场地分布图像素坐标）
#    name: 页面上显示的名字（起终点用楼名，其它用字母）；bld: 可以点选的楼名（None = 纯路口）
# ---------------------------------------------------------------------------
# id: 内部代号；letter: 页面上的字母编号；bld / short: 可以点选的楼（None = 纯路口），short 用在表格里
V = {
    "W":  dict(xy=(3600, 1665), letter="A", bld="明达楼", short="明达楼", note="明达路 × 胡瑗路，明达楼东北"),
    "LN": dict(xy=(3862, 1850), letter="B", bld=None, short=None, note="郑凝路南口 × 图书馆北路"),
    "X":  dict(xy=(3862, 1666), letter="C", bld="32号教学楼", short="32号楼", note="明达路 × 郑凝路，32 号公共教学楼西南角"),
    "L":  dict(xy=(4030, 1912), letter="D", bld="数字图书馆", short="图书馆", note="图书馆东广场北口（鸿鹄路）"),
    "N":  dict(xy=(4203, 1326), letter="E", bld="北门", short="北门", note="梁希路北口，北门"),
    "M":  dict(xy=(4300, 1602), letter="F", bld=None, short=None, note="明达路 × 梁希路"),
    "J":  dict(xy=(4350, 1885), letter="G", bld="生命科学学院", short="生科院", note="梁希路南口，生命科学学院西北角"),
    "C":  dict(xy=(4810, 1470), letter="H", bld="和润楼", short="和润楼", note="明达路上，和润楼（东区食堂）南面广场前"),
}

E = [
    # (u, v, 路名, 折线（含两端点，体育场地分布图像素）)
    ("C", "M", "明达路", [(4810, 1470), (4715, 1495), (4600, 1524), (4500, 1550), (4400, 1578), (4300, 1602)]),
    ("M", "X", "明达路", [(4300, 1602), (4200, 1619), (4100, 1637), (4000, 1650), (3862, 1666)]),
    ("X", "W", "明达路", [(3862, 1666), (3700, 1665), (3600, 1665)]),
    ("M", "N", "梁希路（北段）", [(4300, 1602), (4272, 1520), (4238, 1420), (4203, 1326)]),
    ("M", "J", "梁希路（南段）", [(4300, 1602), (4290, 1700), (4318, 1800), (4350, 1885)]),
    ("J", "L", "工学院南侧路", [(4350, 1885), (4300, 1888), (4200, 1895), (4100, 1902), (4060, 1907), (4030, 1912)]),
    ("X", "LN", "郑凝路", [(3862, 1666), (3862, 1760), (3862, 1850)]),
    ("W", "LN", "胡瑗路 + 图书馆北路", [(3600, 1665), (3600, 1845), (3700, 1846), (3862, 1850)]),
    ("LN", "L", "鸿鹄路（图书馆东北角）", [(3862, 1850), (3900, 1866), (3950, 1880), (3990, 1897), (4030, 1912)]),
]

# 量过、但没放进图里的路（README 里说明为什么不要）
EXTRA = [
    ("C", "K", "湖东步道", [(4810, 1470), (4814, 1500), (4830, 1516), (4871, 1530), (4907, 1541)]),
    ("K", "P", "湖东步道—九曲桥—安吉园", [(4907, 1541), (4910, 1545), (4912, 1605), (4894, 1609), (4871, 1614), (4848, 1627), (4830, 1655),
                                (4825, 1682), (4830, 1718), (4848, 1736), (4871, 1748), (4848, 1777), (4800, 1790), (4781, 1815),
                                (4769, 1842), (4746, 1862), (4715, 1866), (4688, 1909)]),
    ("J", "P", "湖南岸栈道（鹊望亭—安吉园）", [(4350, 1885), (4420, 1855), (4481, 1815), (4512, 1822), (4535, 1848), (4570, 1850), (4600, 1880),
                           (4650, 1898), (4688, 1909)]),
    ("C", "A", "明达路（和润楼—学生公寓）", [(4810, 1470), (4946, 1432), (5078, 1400)]),
]

# 显示用的权值：实测取整到 10 米；下面两条为了"最短路唯一、锁定顺序不歧义"微调（幅度 ≤ 10%，README 里列出）
TWEAK = {("M", "J"): 120, ("W", "LN"): 170}
DEFAULT = ("J", "X")   # 默认起点 生命科学学院 → 终点 32 号教学楼


def fit_affine(src, dst):
    A = np.array([[x, y, 1] for x, y in src], float)
    B = np.array(dst, float)
    M, *_ = np.linalg.lstsq(A, B, rcond=None)
    return M  # 3×2


def apply(M, pts):
    P = np.array([[x, y, 1] for x, y in pts], float)
    return P @ M


def polylen(pts):
    return float(sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)))


def scalebar():
    """在总平面图左上角的比例尺上量出 100 米 = 多少像素。
    比例尺两行黑白相间（0–10、10–50、50–100、100–200 米），在 y = 466 和 478 两行上找黑白交界，
    得到 0 / 10 / 50 / 100 / 200 米刻度的 x 像素，最小二乘拟合直线。"""
    im = np.asarray(Image.open(MAPS / "总平面图.jpg").crop((6000, 440, 6950, 500)).convert("L"), float)
    ticks = {}
    for yy in (26, 38):
        d = im[yy] < 110
        xs = [6000 + i for i in range(1, len(d)) if d[i] != d[i - 1]]
        # 去掉外框 1 像素的双交界
        xs2 = []
        for x in xs:
            if xs2 and x - xs2[-1] <= 1: xs2[-1] = (xs2[-1] + x) / 2; continue
            xs2.append(x)
        for m, x in zip((0, 10, 50, 100, 200), xs2): ticks.setdefault(m, []).append(x)
    ms = sorted(ticks); px = [sum(ticks[m]) / len(ticks[m]) for m in ms]
    k, b = np.polyfit(ms, px, 1)
    return k, {m: p for m, p in zip(ms, px)}


def main():
    log = []
    def say(*a):
        s = " ".join(str(x) for x in a); print(s); log.append(s)

    k_pm, ticks = scalebar()
    say(f"比例尺刻度（总平面图 x 像素）: " + "，".join(f"{m} m → {p:.1f}" for m, p in ticks.items()))
    say(f"拟合：1 米 = {k_pm:.4f} 像素，100 米 = {100 * k_pm:.1f} 像素（1:2000）")

    # ---- 仿射：体育场地分布图 → 总平面图 ----
    src = [l[1] for l in LANDMARKS]; dst = [l[2] for l in LANDMARKS]
    Mp = fit_affine(src, dst)
    pred = apply(Mp, src)
    say("\n仿射变换（体育场地分布图 → 总平面图），地标残差（总平面图像素 / 米）：")
    for (nm, s_, d_, _), q in zip(LANDMARKS, pred):
        e = math.dist(q, d_)
        say(f"  {nm:<16} 实际 {d_}  预测 ({q[0]:.0f}, {q[1]:.0f})  残差 {e:.0f} px = {e / k_pm:.1f} m")
    rms = math.sqrt(sum(math.dist(q, d_) ** 2 for q, d_ in zip(pred, dst)) / len(dst))
    say(f"  RMS 残差 {rms:.0f} px = {rms / k_pm:.1f} m")
    a, b_, c, d = Mp[0, 0], Mp[1, 0], Mp[0, 1], Mp[1, 1]
    say(f"  线性部分 [[{a:.3f}, {b_:.3f}], [{c:.3f}, {d:.3f}]]：体育场地分布图 1 像素 ≈ 横 {math.hypot(a, c) / k_pm:.3f} m、竖 {math.hypot(b_, d) / k_pm:.3f} m")

    # ---- 仿射：体育场地分布图 → OSM 米（交叉验证用） ----
    lo = [l for l in LANDMARKS if l[3] is not None]
    Mo = fit_affine([l[1] for l in lo], [l[3] for l in lo])
    po = apply(Mo, [l[1] for l in lo])
    say("\n仿射变换（体育场地分布图 → OSM 米坐标），地标残差：")
    for l, q in zip(lo, po):
        say(f"  {l[0]:<16} 残差 {math.dist(q, l[3]):.1f} m")

    # ---- 路段长度 ----
    say("\n路段长度（米）：总平面图按比例尺量 / OSM 仿射交叉验证")
    edges = []
    for u, v, road, pts in E:
        assert tuple(pts[0]) == tuple(V[u]["xy"]) and tuple(pts[-1]) == tuple(V[v]["xy"]), (u, v)
        pp = apply(Mp, pts); Lp = polylen(pp) / k_pm
        Lo = polylen(apply(Mo, pts))
        edges.append(dict(u=u, v=v, road=road, pts=pts, plan=[[round(x, 1), round(y, 1)] for x, y in pp], m_plan=Lp, m_osm=Lo))
        say(f"  {u:>2}–{v:<2} {road:<10} 总平面图 {Lp:6.1f} m   OSM {Lo:6.1f} m   差 {100 * (Lo - Lp) / Lp:+5.1f}%")
    say("\n量过但没放进图里的路：")
    for u, v, road, pts in EXTRA:
        say(f"  {u:>2}–{v:<2} {road:<16} 总平面图 {polylen(apply(Mp, pts)) / k_pm:6.1f} m   OSM {polylen(apply(Mo, pts)):6.1f} m")

    # ---- 显示权值 ----
    say("\n显示用的权值（米）：")
    for e in edges:
        r10 = int(round(e["m_plan"] / 10) * 10)
        wd = TWEAK.get((e["u"], e["v"]), TWEAK.get((e["v"], e["u"]), r10))
        e["w_round"] = r10; e["w"] = wd
        tag = f"   ← 微调 {100 * (wd - e['m_plan']) / e['m_plan']:+.1f}%（取整本为 {r10}）" if wd != r10 else ""
        say(f"  {V[e['u']]['letter']}–{V[e['v']]['letter']} ({e['u']}–{e['v']}) {e['road']:<14} 实测 {e['m_plan']:6.1f} → 显示 {wd}{tag}")
        assert abs(wd - e["m_plan"]) / e["m_plan"] <= 0.10

    # ---- 独立核对：OSM 上本来就有的路，直接沿 OSM 折线量（不经过仿射） ----
    osm_direct(Mo, say)

    overlay(Mp, edges)
    net = dict(
        source="体育场地分布图（2023 年 9 月修订）像素坐标；长度在总平面图（1:2000）上按比例尺量",
        k_px_per_m=k_pm,
        vertices=[dict(id=k, **{kk: (list(vv) if kk == "xy" else vv) for kk, vv in v.items()}) for k, v in V.items()],
        edges=[dict(u=e["u"], v=e["v"], road=e["road"], pts=[list(q) for q in e["pts"]], m_plan=round(e["m_plan"], 1),
                    m_osm=round(e["m_osm"], 1), w_round=e["w_round"], w=e["w"]) for e in edges],
        default=dict(start=DEFAULT[0], end=DEFAULT[1]),
    )
    (OUT_DATA / "network.json").write_text(json.dumps(net, ensure_ascii=False, indent=1), encoding="utf-8")
    (DEV / "测量结果.txt").write_text("\n".join(log) + "\n", encoding="utf-8")
    return dict(k_pm=k_pm, ticks=ticks, Mp=Mp, Mo=Mo, edges=edges, say=say, log=log)


def osm_direct(Mo, say):
    """OSM 里有的三条路（明达路、梁希路、郑凝路），把顶点用仿射放到 OSM 坐标里，投影到 OSM 折线上，沿折线量。"""
    p = DEV / "work" / "osm.json"
    if not p.exists():
        say("（没有 work/osm.json，跳过 OSM 直接量）"); return
    d = json.loads(p.read_text(encoding="utf-8"))
    lat0, lon0 = 30.8750, 120.1270
    kx = math.cos(math.radians(lat0)) * 111320; ky = 110540
    ways = {}
    for el in d["elements"]:
        t = el.get("tags", {}); g = el.get("geometry")
        if g and t.get("name") in ("明达路", "梁希路", "郑凝路"):
            ways.setdefault(t["name"], []).append([((q["lon"] - lon0) * kx, -(q["lat"] - lat0) * ky) for q in g])

    def proj(pl, pt):  # 折线上离 pt 最近的点的弧长
        best = (1e9, 0); acc = 0
        for i in range(len(pl) - 1):
            a, b = np.array(pl[i]), np.array(pl[i + 1]); ab = b - a; L = np.linalg.norm(ab)
            t = 0 if L == 0 else max(0, min(1, np.dot(np.array(pt) - a, ab) / L / L))
            q = a + t * ab; dd = np.linalg.norm(np.array(pt) - q)
            if dd < best[0]: best = (dd, acc + t * L)
            acc += L
        return best

    def along(name, u, v):
        pu, pv = apply(Mo, [V[u]["xy"]])[0], apply(Mo, [V[v]["xy"]])[0]
        res = []
        for pl in ways[name]:
            du, su = proj(pl, pu); dv, sv = proj(pl, pv)
            if du < 25 and dv < 25: res.append(abs(sv - su))
        return res

    # 明达路在 OSM 里分成好几段，M、X、W 都落在中间那一段（way 359358359）上，逐段试
    say("\nOSM 直接量（沿 OSM 道路折线，独立于总平面图）：")
    for (u, v, name) in [("M", "X", "明达路"), ("X", "W", "明达路"), ("M", "J", "梁希路"), ("M", "N", "梁希路"), ("X", "LN", "郑凝路")]:
        r = along(name, u, v)
        say(f"  {u}–{v} {name}: " + (" / ".join(f"{x:.1f} m" for x in r) if r else "（端点离 OSM 折线太远，没量）"))


COLORS = [(230, 30, 30), (20, 90, 230), (0, 150, 60), (200, 0, 200), (230, 120, 0), (0, 160, 170), (120, 60, 0)]


def draw_net(img, box, tf, edges, verts, scale, lw):
    """img: 原图（PIL），box: 裁剪框，tf: 体育场地分布图坐标 → 该图坐标"""
    x0, y0, x1, y1 = box
    im = img.crop(box).convert("RGB")
    im = im.resize((round((x1 - x0) * scale), round((y1 - y0) * scale)), Image.LANCZOS)
    dr = ImageDraw.Draw(im, "RGBA")
    f = ImageFont.truetype(FONT, 22)
    T = lambda p: ((p[0] - x0) * scale, (p[1] - y0) * scale)
    for i, e in enumerate(edges):
        pts = [T(q) for q in tf(e["pts"])]
        dr.line(pts, fill=COLORS[i % len(COLORS)] + (210,), width=lw, joint="curve")
    for k, v in verts.items():
        x, y = T(tf([v["xy"]])[0])
        dr.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=3)
        dr.text((x + 11, y - 30), k, fill=(0, 0, 0), font=f, stroke_width=3, stroke_fill=(255, 255, 255))
    return im


def overlay(Mp, edges):
    sp = Image.open(MAPS / "体育场地分布图.jpg")
    tp = Image.open(MAPS / "总平面图.jpg")
    ident = lambda pts: [tuple(q) for q in pts]
    toplan = lambda pts: [tuple(q) for q in apply(Mp, pts)]
    draw_net(sp, (3450, 1250, 5250, 2050), ident, edges, V, 1.0, 5).save(OUT_IMG / "核对-体育场地分布图.jpg", quality=90)
    draw_net(tp, (4500, 2000, 7300, 3300), toplan, edges, V, 0.66, 5).save(OUT_IMG / "核对-总平面图.jpg", quality=90)


if __name__ == "__main__":
    R = main()
