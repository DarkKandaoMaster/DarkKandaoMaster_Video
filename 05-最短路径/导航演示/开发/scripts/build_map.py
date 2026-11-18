# 从 2023 年《体育场地分布图》生成导航风格的矢量底图（SVG，坐标 = 体育场地分布图像素）。
#   绿地、水面：按颜色取掩膜 → 闭运算去掉图上的文字 → 轮廓 → 折线化；
#   楼：在白色区域里按"种子点"取连通块（楼的描边把它和道路隔开），图书馆的描边有缺口，手描；
#   学府路以北（校外）铺浅灰；明达路画成主干道。
# 输出：开发/data/basemap.svg、开发/核对图/底图预览.png
# 用法：python -I build_map.py
import sys; sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
DEV = Path(__file__).resolve().parents[1]
MAPS = DEV.parents[1] / "地图"
X0, Y0, X1, Y1 = 3440, 1200, 5020, 2180      # 取样窗口（体育场地分布图像素）

COL = dict(
    road="#FFFFFF", green="#DCEFD3", water="#A9D3F6", water_edge="#8CC2EE",
    bld="#E9E5DE", bld_edge="#CFC7BA", outside="#ECEEF1", main="#FBE3A6", main_edge="#E3C26E",
)

# 楼的种子点（落在楼的白色区域里）
BLD_SEEDS = {
    "38": (3700, 1462), "20": (4000, 1432), "32": (3890, 1600), "30/31": (4500, 1440), "北楼": (4400, 1320),
    "和润楼": (4850, 1300), "工学院": (4105, 1745), "25": (4085, 1862), "28/29": (4400, 1965),
    "36": (3515, 1750), "35": (3515, 1885), "27": (4280, 2168), "37": (3470, 2170),
}
# 图书馆（33）手描：主体 + 东侧门廊
LIBRARY = [(3705, 1929), (3925, 1929), (3925, 1935), (3946, 1935), (3946, 1962), (3926, 1968), (3926, 2072), (3946, 2080),
           (3946, 2100), (3925, 2100), (3925, 2108), (3705, 2108), (3705, 2050), (3678, 2050), (3678, 1975), (3705, 1975)]
# 学府路北边线（校外一侧），从图上按列找黑线得到
XUEFU_N = [(3440, 1388), (3560, 1387), (3620, 1385), (3680, 1380), (3740, 1375), (3800, 1368), (3860, 1360), (3920, 1351),
           (3980, 1341), (4040, 1330), (4100, 1317), (4160, 1302), (4220, 1288), (4280, 1271), (4340, 1252), (4400, 1232),
           (4460, 1211), (4520, 1189), (4580, 1165), (4640, 1140), (4700, 1112), (4760, 1085)]
XUEFU_S = [(3440, 1413), (3560, 1410), (3620, 1407), (3680, 1403), (3740, 1398), (3800, 1393), (3860, 1386), (3920, 1378),
           (3980, 1368), (4040, 1358), (4100, 1345), (4160, 1333), (4220, 1318), (4280, 1302), (4340, 1285), (4400, 1265),
           (4460, 1245), (4520, 1223), (4580, 1200), (4640, 1175), (4700, 1148), (4760, 1120)]
# 明达路中线
MINGDA = [(3400, 1665), (3600, 1665), (3862, 1666), (4000, 1650), (4100, 1637), (4200, 1619), (4300, 1602), (4400, 1578),
          (4500, 1550), (4600, 1524), (4715, 1495), (4810, 1470), (4946, 1432), (5080, 1398)]


def load():
    im = np.asarray(Image.open(MAPS / "体育场地分布图.jpg").crop((X0, Y0, X1, Y1)).convert("RGB")).astype(np.int16)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    hsv = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.int16)
    S = hsv[..., 1]
    water = (b > 180) & (b - r > 60) & (S > 80)
    green = (g - r > 25) & (g - b > 5) & ~water
    gray = (abs(r - g) < 12) & (abs(g - b) < 12) & (r > 80) & (r < 150)
    return im, water, green, gray


def close(m, k):
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))) > 0


def opening(m, k):
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))) > 0


def paths_of(mask, eps=1.1, min_area=40):
    """掩膜 → SVG path（含洞，evenodd），坐标换回体育场地分布图像素"""
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in cs:
        if cv2.contourArea(c) < min_area: continue
        a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(a) < 3: continue
        parts.append("M" + "L".join(f"{x + X0:.0f} {y + Y0:.0f}" for x, y in a) + "Z")
    return "".join(parts)


def fill_small_holes(mask, max_area):
    """把掩膜里面积小于 max_area 的洞填上（图上的文字、图标留下的洞）"""
    m = mask.astype(np.uint8)
    inv = (1 - m).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    out = mask.copy()
    H, W = mask.shape
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < max_area and x > 0 and y > 0 and x + w < W and y + h < H:
            out |= lab == i
    return out


def poly_d(pts):
    return "M" + "L".join(f"{x} {y}" for x, y in pts) + "Z"


def line_d(pts):
    return "M" + "L".join(f"{x} {y}" for x, y in pts)


def main():
    im, water, green, gray = load()
    # 文字（湖名、楼号、园名……）落在绿地 / 水面上会留下洞：闭运算补上
    water2 = fill_small_holes(opening(close(water, 9), 3), 1500)
    green2 = opening(close(green & ~water2, 5), 3)
    # 地下通道标志（左边那个黑色椭圆）盖住的是绿地
    patch = np.zeros(green2.shape, np.uint8)
    cv2.rectangle(patch, (0, 1518 - Y0), (3566 - X0, 1642 - Y0), 1, -1)
    green2 |= patch > 0
    green2 = fill_small_holes(green2, 900)
    # 楼：白色连通块（深色描边当墙），按种子点挑
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = (r + g + b) / 3
    barrier = ((lum < 200) & ~green & ~water) | ((g - r > 25) & (lum < 140))
    barrier = cv2.dilate(barrier.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2)
    free = ((~green) & (~water) & (barrier == 0)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(free, connectivity=4)
    bld = np.zeros(free.shape, bool)
    for name, (sx, sy) in BLD_SEEDS.items():
        i = lab[sy - Y0, sx - X0]
        if i == 0 or st[i, 4] > 60000:
            print("种子没落在楼里：", name, (sx, sy), "area", st[i, 4] if i else 0); continue
        bld |= lab == i
        print(f"楼 {name:<6} 面积 {st[i, 4]}")
    bld = cv2.dilate(bld.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=3) > 0
    bld = fill_small_holes(close(bld, 5), 2500)
    lib = np.zeros(free.shape, np.uint8)
    cv2.fillPoly(lib, [np.array([(x - X0, y - Y0) for x, y in LIBRARY], np.int32)], 1)
    bld |= lib > 0
    green2 &= ~bld

    outside = XUEFU_N + [(X1 + 50, XUEFU_N[-1][1] - 200), (X1 + 50, Y0 - 300), (X0 - 50, Y0 - 300), (X0 - 50, XUEFU_N[0][1])]
    W, H = X1 - X0, Y1 - Y0
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{X0} {Y0} {W} {H}" width="{W}" height="{H}" shape-rendering="geometricPrecision">',
           f'<rect x="{X0}" y="{Y0}" width="{W}" height="{H}" fill="{COL["road"]}"/>',
           f'<path d="{paths_of(green2)}" fill="{COL["green"]}" fill-rule="evenodd"/>',
           f'<path d="{paths_of(water2)}" fill="{COL["water"]}" stroke="{COL["water_edge"]}" stroke-width="1.5" fill-rule="evenodd"/>',
           f'<path d="{poly_d(outside)}" fill="{COL["outside"]}"/>',
           f'<path d="{line_d(XUEFU_N)}" fill="none" stroke="#D5D9DF" stroke-width="2"/>',
           f'<path d="{line_d(XUEFU_S)}" fill="none" stroke="#D5D9DF" stroke-width="2"/>',
           f'<path d="{paths_of(bld, eps=1.4, min_area=200)}" fill="{COL["bld"]}" stroke="{COL["bld_edge"]}" stroke-width="2" fill-rule="evenodd"/>',
           f'<path d="{line_d(MINGDA)}" fill="none" stroke="{COL["main_edge"]}" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>',
           f'<path d="{line_d(MINGDA)}" fill="none" stroke="{COL["main"]}" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/>',
           '</svg>']
    s = "\n".join(svg)
    (DEV / "data").mkdir(exist_ok=True)
    (DEV / "data" / "basemap.svg").write_text(s, encoding="utf-8")
    print("basemap.svg", len(s), "bytes")
    # 预览
    try:
        import subprocess  # noqa
    except Exception:
        pass


if __name__ == "__main__":
    main()
