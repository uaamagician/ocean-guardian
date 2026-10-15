# Turns art/water/caustics.jpg into a light-only layer: the white lines of
# sunlight on the sea floor, as white with transparency, made seamless top to
# bottom so it can repeat down a section of any height. The water colour itself comes from a
# CSS gradient (pages/Home.css), so the sea stays clean and can deepen.
# Needs pillow and numpy:
#   python3 scripts/caustics.py art/water/caustics.jpg src/assets/water/caustics.webp
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
W = 1200
im = Image.open(src).convert("RGB")
im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
L = a @ np.array([0.299, 0.587, 0.114], np.float32)
# Painted water sits around 220-230; the lines climb to white.
alpha = np.clip((L - 228) / (252 - 228), 0, 1) ** 1.1

# Seamless top to bottom (the layer is stretched to the section's width, so it
# only ever repeats downward): blend with a copy shifted by half the height.
# The original keeps the middle and the copy takes over near the top and
# bottom edges, along a wandering line so no straight seam shows. Taking the
# brighter of the two where they meet adds a few lines, which a net of
# caustics hides well.
h, w = alpha.shape
y = np.linspace(0, 1, h)[:, None]
x = np.linspace(0, 1, w)[None, :]
ydist = np.minimum(y, 1 - y) * h
wander = 45 * np.sin(2 * np.pi * 2 * x + 0.7) + 22 * np.sin(2 * np.pi * 5 * x + 2.3) + 10 * np.sin(2 * np.pi * 11 * x)
keep = np.clip((ydist + wander - 110) / 130, 0, 1)
shifted = np.roll(alpha, h // 2, axis=0)
tile = np.maximum(alpha * keep, shifted * (1 - keep)) * 0.72

rgba = np.dstack([np.full_like(tile, 255)] * 3 + [tile * 255]).astype(np.uint8)
Image.fromarray(rgba, "RGBA").save(out, quality=80, alpha_quality=70, method=6)
print(out, rgba.shape, round(float(tile.mean()), 3))
