# 代价函数原型（numpy）：在导出的 800x420 计算图上试不同参数，画出点击序列得到的轮廓，方便挑参数。
# 用法：python -I proto_cost.py <check.json> <out.png> [key=value ...]
import sys; sys.stdout.reconfigure(encoding="utf-8")  # -I 模式下 PYTHONIOENCODING 不生效
import json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

d = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
P = dict(sigma=1.0, lsigma=1.0, wG=0.72, wZ=0.28, wD=0.0, pct=98.5, gamma=1.0, zgate=0.0)
for kv in sys.argv[3:]:
    k, v = kv.split("="); P[k] = float(v)
w, h = d["cw"], d["ch"]
rgba = np.array(d["rgba"], dtype=np.float64).reshape(h, w, 4)[..., :3]

def binom_blur(a, sigma):
    return ndimage.gaussian_filter(a, sigma, mode="nearest") if sigma > 0 else a

ch = [binom_blur(rgba[..., c], P["sigma"]) for c in range(3)]
gx2 = np.zeros((h, w)); gy2 = np.zeros((h, w)); gxy = np.zeros((h, w))
mag2 = np.zeros((h, w))
for a in ch:
    gx = ndimage.sobel(a, axis=1, mode="nearest"); gy = ndimage.sobel(a, axis=0, mode="nearest")
    mag2 += gx * gx + gy * gy
    gx2 += gx * gx; gy2 += gy * gy; gxy += gx * gy
mag = np.sqrt(mag2)
L = 0.299 * rgba[..., 0] + 0.587 * rgba[..., 1] + 0.114 * rgba[..., 2]
Lb = binom_blur(L, P["lsigma"])
lap = ndimage.laplace(Lb, mode="nearest")
zc = np.zeros((h, w), bool)
for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
    nb = np.roll(np.roll(lap, -dy, 0), -dx, 1)
    zc |= (lap * nb < 0) & (np.abs(lap) <= np.abs(nb))
gref = np.percentile(mag[::1, ::1].ravel()[::3], P["pct"])
gN = np.minimum(1, mag / gref)
if P["zgate"] > 0: zc &= gN > P["zgate"]
# 结构张量方向：|cos| of edge direction with horizontal / vertical links
den = np.maximum(gx2 + gy2, 1e-9)
hor = gy2 / den   # 横向移动和边方向一致的程度（梯度竖直 → 横边）
ver = gx2 / den
cost = P["wG"] * (1 - gN) ** P["gamma"] + P["wZ"] * (1 - zc)
cR = (cost[:, :-1] + cost[:, 1:]) / 2 + P["wD"] * (1 - (hor[:, :-1] + hor[:, 1:]) / 2)
cD = (cost[:-1, :] + cost[1:, :]) / 2 + P["wD"] * (1 - (ver[:-1, :] + ver[1:, :]) / 2)
tot = P["wG"] + P["wZ"] + P["wD"]
q = lambda c: 1 + np.rint(8 * np.clip(c / tot, 0, 1)).astype(np.int64)
wR = q(cR); wD = q(cD)
idx = np.arange(w * h).reshape(h, w)
rows = np.concatenate([idx[:, :-1].ravel(), idx[:-1, :].ravel()]); cols = np.concatenate([idx[:, 1:].ravel(), idx[1:, :].ravel()])
vals = np.concatenate([wR.ravel(), wD.ravel()]).astype(float)
G = coo_matrix((vals, (rows, cols)), shape=(w * h, w * h)).tocsr()
clicks = [tuple(s) for s in d["seeds"]]
img = Image.fromarray(rgba.astype(np.uint8)).resize((w * 2, h * 2), Image.NEAREST)
dr = ImageDraw.Draw(img)
seq = clicks + [clicks[0]]
total = 0
for a, b in zip(seq, seq[1:]):
    s = a[1] * w + a[0]; t = b[1] * w + b[0]
    dist, pred = dijkstra(G, directed=False, indices=s, return_predecessors=True)
    path = []; v = t
    while v != s and v >= 0: path.append(v); v = pred[v]
    path.append(s); path.reverse()
    pts = [((p % w) * 2 + 1, (p // w) * 2 + 1) for p in path]
    dr.line(pts, fill=(255, 90, 0), width=3)
    total += dist[t]
    print(a, b, "cost", int(dist[t]), "len", len(path), "avg", round(dist[t] / max(1, len(path) - 1), 2))
for c in clicks: dr.ellipse([c[0] * 2 - 4, c[1] * 2 - 4, c[0] * 2 + 4, c[1] * 2 + 4], outline=(255, 255, 255), width=2)
img.save(out)
dbg = Image.fromarray((255 * (np.minimum(wR[:-1, :], wD[:, :-1]) - 1) / 8).astype(np.uint8))
dbg.save(out.replace(".png", "-w.png"))
print("hist", np.bincount(wR.ravel(), minlength=10)[1:])
