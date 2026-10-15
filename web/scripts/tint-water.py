# Tints art/water/caustics.jpg to the sea colours used by .band-dark and
# .band-deep (pages/Home.css). Needs pillow and numpy:
#   python3 scripts/tint-water.py art/water/caustics.jpg src/assets/water/sea.webp c3e3e1 f4fbfa 1600
#   python3 scripts/tint-water.py art/water/caustics.jpg src/assets/water/sea-deep.webp b4d8d5 ecf7f5 1600
# Re-tint the painted water to the site's sea colour: the painted strokes keep
# their light and dark, but on the site's mint-blue, and the bright caustic
# lines are softened so text on top stays easy to read.
import sys
import numpy as np
from PIL import Image

src, out, dark, light, width = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
im = Image.open(src).convert("RGB")
im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
L = a @ np.array([0.299, 0.587, 0.114], np.float32)
# 0 = deepest painted water, 1 = brightest line
t = np.clip((L - 205) / (252 - 205), 0, 1) ** 1.15
d, l = hexrgb(dark), hexrgb(light)
rgb = d + (l - d) * t[..., None]
Image.fromarray(rgb.round().astype(np.uint8)).save(out, quality=82, method=6)
print(out, rgb.reshape(-1, 3).mean(0).round())
