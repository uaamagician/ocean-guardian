# Draws the shoreline used between sand and water sections into public/shore.
# Run: python3 scripts/make-shore.py public/shore
# A shoreline that tiles seamlessly: a sum of sines whose periods all divide
# the tile width, so both the height and the slope match at the seam.
import math
W, H, BASE = 1200, 46, 24
WAVES = [(1, 6.0, 0.0), (3, 4.0, 0.9), (5, 2.3, 2.3), (9, 1.3, 0.4), (17, 0.6, 1.7)]
WET = 7  # how far the wet sand reaches above the waterline
def y(x, off=0.0):
    # The wet line wanders a little on its own, as it does on a real beach.
    wobble = 1.6 * math.sin(2 * math.pi * 7 * x / W + 1.1) if off < 0 else 0
    return BASE + off + wobble + sum(a * math.sin(2 * math.pi * k * x / W + p) for k, a, p in WAVES)
def pts(off, step=12):
    return [(x, y(x, off)) for x in range(0, W + 1, step)]
def curve(points, step=12, off=0.0, move=True):
    d = f"M{points[0][0]} {points[0][1]:.1f}" if move else f"L{points[0][0]} {points[0][1]:.1f}"
    n = len(points)
    for i in range(n - 1):
        p1, p2 = points[i], points[i + 1]
        p0 = points[i - 1] if i > 0 else (2 * p1[0] - p2[0], 2 * p1[1] - p2[1])
        p3 = points[i + 2] if i + 2 < n else (2 * p2[0] - p1[0], 2 * p2[1] - p1[1])
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{c1[0]:.0f} {c1[1]:.1f} {c2[0]:.0f} {c2[1]:.1f} {p2[0]:.0f} {p2[1]:.1f}"
    return d
crest = curve(pts(0))
wet = curve(pts(-WET))
band = wet + curve(list(reversed(pts(0))), move=False) + "Z"
svg = lambda body: f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' preserveAspectRatio='none'>{body}</svg>\n"
foam = (
    f"<path d='{curve(pts(4))}' fill='none' stroke='#fff' stroke-opacity='.35' stroke-width='9' stroke-linecap='round'/>"
    f"<path d='{curve(pts(2))}' fill='none' stroke='#23727a' stroke-opacity='.16' stroke-width='2'/>"
    f"<path d='{crest}' fill='none' stroke='#fff' stroke-opacity='.97' stroke-width='3.2' stroke-linecap='round'/>"
    f"<path d='{curve(pts(8))}' fill='none' stroke='#fff' stroke-opacity='.8' stroke-width='3.4' stroke-linecap='round' stroke-dasharray='.1 9 .1 5 .1 14 .1 7'/>"
    f"<path d='{curve(pts(13))}' fill='none' stroke='#fff' stroke-opacity='.5' stroke-width='2.4' stroke-linecap='round' stroke-dasharray='.1 12 .1 6 .1 19'/>"
)
wet_layer = (
    f"<path d='{band}' fill='#d6bf8c'/>"
    f"<path d='{wet}' fill='none' stroke='#a8884f' stroke-opacity='.35' stroke-width='1.4'/>"
)
import sys, os
out = sys.argv[1]
files = {
    "water.svg": svg(f"<path d='{wet}V{H}H0Z'/>"),
    "foam.svg": svg(wet_layer + foam),
    "water-plain.svg": svg(f"<path d='{crest}V{H}H0Z'/>"),
    "foam-plain.svg": svg(foam),
}
for name, body in files.items():
    with open(os.path.join(out, name), "w") as f:
        f.write(body)
    print(name, len(body))
