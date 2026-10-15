# Step 2 of 2: see scripts/cut-creatures.py. Pivots it prints go into
# components/Life.jsx.
# Split the cut-out drawings into the parts that move on their own. Every part
# is saved on the same canvas as the whole animal, so the layers stack back
# into the original drawing; pivots are given as % of that canvas.
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

LIFE, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
meta = {}

def load(name):
    im = Image.open(os.path.join(LIFE, name + ".png"))
    a = np.asarray(im).astype(np.float32)
    return im, a, a[..., 3] > 25

def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r

def nearest_fill(fg, seeds):
    """Give every foreground pixel the label of the nearest seed pixel."""
    _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
    out = seeds[iy, ix]
    out[~fg] = 0
    return out

def save(im, mask, name, longest):
    a = np.asarray(im).copy()
    a[..., 3] = np.where(mask, a[..., 3], 0)
    layer = Image.fromarray(a, "RGBA")
    s = longest / max(im.size)
    layer = layer.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    layer.save(os.path.join(OUT, name + ".webp"), quality=90, method=6)

def pct(pt, im):
    return [round(100 * pt[0] / im.width, 1), round(100 * pt[1] / im.height, 1)]

def pivot(part, other):
    """Where a part joins the rest: the middle of the seam between them."""
    seam = part & ndimage.binary_dilation(other, disk(3))
    ys, xs = np.nonzero(seam)
    return (xs.mean(), ys.mean())

# ---------- Turtle: shell, head and tail in one piece, four flippers ----------
im, a, fg = load("turtle")
g = a[..., 1]
dark = fg & (g < 132)
dark = ndimage.binary_opening(dark, disk(2))
lab, n = ndimage.label(dark)
shell = lab == (np.argmax(ndimage.sum(dark, lab, range(1, n + 1))) + 1)
shell = ndimage.binary_fill_holes(ndimage.binary_closing(shell, disk(4)))
shell = ndimage.binary_dilation(shell, disk(1)) & fg
rest = fg & ~shell
lab, n = ndimage.label(ndimage.binary_opening(rest, disk(1)))
sizes = ndimage.sum(rest, lab, range(1, n + 1))
cy, cx = ndimage.center_of_mass(shell)
parts = {}
for i, size in enumerate(sizes, 1):
    if size < 300:
        continue
    yy, xx = ndimage.center_of_mass(lab == i)
    if yy < cy - 0.25 * im.height and abs(xx - cx) < 0.15 * im.width:
        key = "head"
    elif abs(xx - cx) < 0.06 * im.width:
        key = "tail"
    else:
        key = ("front" if yy < cy else "back") + "-" + ("left" if xx < cx else "right")
    parts[key] = i
seeds = np.zeros(fg.shape, np.int32)
seeds[shell] = 1
names = ["body"]
for key, i in parts.items():
    if key in ("head", "tail"):
        seeds[lab == i] = 1
    else:
        names.append(key)
        seeds[lab == i] = len(names)
full = nearest_fill(fg, seeds)
meta["turtle"] = {"size": [im.width, im.height], "parts": {}}
for k, name in enumerate(names, 1):
    m = full == k
    save(im, m, f"turtle-{name}", 240)
    if name != "body":
        meta["turtle"]["parts"][name] = pct(pivot(m, full == 1), im)
print("turtle", names)

# ---------- Crab: body, two claws on their arms, two sets of legs ----------
im, a, fg = load("crab")
chunky = ndimage.binary_opening(fg, disk(9))
lab, n = ndimage.label(chunky)
sizes = ndimage.sum(chunky, lab, range(1, n + 1))
body_i = np.argmax(sizes) + 1
body = ndimage.binary_dilation(lab == body_i, disk(3)) & fg
by, bx = ndimage.center_of_mass(lab == body_i)
seeds = np.zeros(fg.shape, np.int32)
seeds[body] = 1
claws = []
for i, size in enumerate(sizes, 1):
    if i != body_i and size > 400:
        yy, xx = ndimage.center_of_mass(lab == i)
        claws.append((xx, i))
claws.sort()
for k, (_, i) in enumerate(claws):
    seeds[ndimage.binary_dilation(lab == i, disk(3)) & fg] = 2 + k
# Thin pieces: arms go with the claw above the body, legs below by side.
thin = fg & (seeds == 0)
tl, tn = ndimage.label(thin)
body_top = np.nonzero(body.any(axis=1))[0].min()
for i in range(1, tn + 1):
    yy, xx = ndimage.center_of_mass(tl == i)
    if yy < by - 0.12 * im.height:
        seeds[tl == i] = 2 if xx < bx else 3
    else:
        seeds[tl == i] = 4 if xx < bx else 5
full = nearest_fill(fg, seeds)
names = ["body", "claw-left", "claw-right", "legs-left", "legs-right"]
meta["crab"] = {"size": [im.width, im.height], "parts": {}}
for k, name in enumerate(names, 1):
    m = full == k
    save(im, m, f"crab-{name}", 240)
    if name != "body":
        meta["crab"]["parts"][name] = pct(pivot(m, full == 1), im)
print("crab", [(nm, int((full == k).sum())) for k, nm in enumerate(names, 1)])

# ---------- Fish: body and tail, cut where the body is narrowest ----------
for colour in ("blue", "pink", "orange"):
    im, a, fg = load(f"fish-{colour}")
    cols = fg.sum(axis=0)
    w = im.width
    lo, hi = int(0.68 * w), int(0.86 * w)
    joint = lo + int(np.argmin(cols[lo:hi]))
    ys = np.nonzero(fg[:, joint])[0]
    tail = fg.copy()
    tail[:, :joint] = False
    # keep the bottom fin and anything not attached to the tail on the body
    tl, tn = ndimage.label(tail)
    keep = tl == tl[int(ys.mean()), min(joint + 3, w - 1)]
    tail = keep
    body = fg & ~tail
    save(im, body, f"fish-{colour}-body", 200)
    save(im, tail, f"fish-{colour}-tail", 200)
    meta[f"fish-{colour}"] = {"size": [im.width, im.height], "parts": {"tail": pct((joint, ys.mean()), im)}}
    print("fish", colour, joint, w)

# ---------- Sun: the disc and its rays ----------
im, a, fg = load("sun")
disc = ndimage.binary_opening(fg, disk(14))
lab, n = ndimage.label(disc)
disc = lab == (np.argmax(ndimage.sum(disc, lab, range(1, n + 1))) + 1)
disc = ndimage.binary_dilation(disc, disk(14)) & fg
rays = fg & ~disc
cy, cx = ndimage.center_of_mass(disc)
save(im, disc, "sun-disc", 200)
save(im, rays, "sun-rays", 200)
meta["sun"] = {"size": [im.width, im.height], "parts": {"centre": pct((cx, cy), im)}}

# ---------- Whole: starfish, shell ----------
for name, longest in (("starfish", 140), ("shell", 150)):
    im, a, fg = load(name)
    save(im, fg, name, longest)
    meta[name] = {"size": [im.width, im.height]}

json.dump(meta, open(os.path.join(OUT, "parts.json"), "w"), indent=1)
print(json.dumps(meta))
