# Step 1 of 2 for the animals in components/Life.jsx: cut the drawings in
# art/creatures out of their white paper.
# Run (needs pillow, numpy, scipy):
#   python3 scripts/cut-creatures.py art/creatures /tmp/cutouts
#   python3 scripts/split-creatures.py /tmp/cutouts src/assets/life
# Cut each drawing out of its white paper: remove only the white that is
# connected to the image edge (so white highlights inside, like an eye, stay),
# then soften the rim by turning leftover whiteness into transparency.
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
NAMES = ["sun", "starfish", "turtle", "shell", "fish-blue", "crab", "fish-pink", "fish-orange"]

def cutout(path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lo = rgb.min(axis=2)
    spread = rgb.max(axis=2) - lo
    paper = (lo > 228) & (spread < 22)
    labels, _ = ndimage.label(paper)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, edge[edge > 0])
    # Rim: the few pixels of drawing that touch the paper keep a soft edge.
    dist = ndimage.distance_transform_edt(~bg)
    alpha = np.ones(lo.shape, np.float32)
    rim = (dist > 0) & (dist <= 2.5)
    alpha[rim] = np.clip((255 - lo[rim]) / 70, 0, 1)
    alpha[bg] = 0
    # Un-mix the white paper out of the rim colours.
    a = np.maximum(alpha, 1e-3)[..., None]
    color = np.clip((rgb - (1 - a) * 255) / a, 0, 255)
    rgba = np.dstack([color, alpha * 255]).astype(np.uint8)
    ys, xs = np.nonzero(alpha > 0.02)
    pad = 6
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, rgb.shape[1]), min(ys.max() + pad + 1, rgb.shape[0]))
    return Image.fromarray(rgba, "RGBA").crop(box), box

for name in NAMES:
    img, box = cutout(os.path.join(SRC, f"{name}.jpg"))
    img.save(os.path.join(OUT, f"{name}.png"))
    print(name, img.size, box)
