"""Regenerate assets/jin-icon.svg from the icon's construction parameters.

The icon is three overlapping scale shards. Each shard is one SVG path:
a major elliptical arc for the strongly curved rim, then a three-point
quadratic Bezier for the shallow inner edge. The recipe, including how the
three transforms were derived and how the shadow and optical centre were
chosen, is docs/icon.md.

    python tools/make_icon.py [output.svg]

The default output is assets/jin-icon.svg. The script is dependency-free and
does not read the source artwork; it is the fallback if the SVG is lost.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

# ---------------------------------------------------------------- palette
BG = "#F9F7E4"       # paper plate and the 16 px reveals
RED = "#A33729"
ORANGE = "#C57724"
GREEN = "#386754"
SPIKE = "#F5DEB4"    # warm cream spines
SHADOW = "#4B2817"

# ------------------------------------------------------- the base shard
L = 372.4            # tip-to-tip chord
RX = 218.0           # outer ellipse radii
RY = 187.0
PHI = -25.0          # outer ellipse rotation
QX = 208.6           # inner quadratic control, red / base frame
QY = 186.1
GAP = 16.0           # visible cream reveal
SHADOW_OPACITY = 0.40
SHADOW_DX = 8.0      # screen-space shadow offset
SHADOW_DY = 12.0

# The final optical-centre translation. docs/icon.md explains the measurement.
CENTER = (-22.12, 33.49)

# Tip position, group rotation, scale, inner control point (local, pre-scaled).
# The back scales were pulled onto a 16 px offset of the front rim; that is why
# their scales are slightly below their source sizes.
LAYOUT = {
    "green":  {"A": (559.30, 299.46), "rotate": -30.749, "scale": 0.68221, "q": (111.48, 124.48)},
    "orange": {"A": (389.24, 378.90), "rotate": -29.454, "scale": 0.87635, "q": (170.97, 157.58)},
    "red":    {"A": (219.00, 472.00), "rotate": -30.200, "scale": 1.0,     "q": (208.60, 186.10)},
}
COLORS = {"green": GREEN, "orange": ORANGE, "red": RED}

# (outer end, inner point, base width) as fractions of L, in the local frame.
SPINES = [
    ((0.502, 0.102), (0.442, 0.154), 0.0085),
    ((0.554, 0.147), (0.457, 0.213), 0.0145),
    ((0.600, 0.202), (0.486, 0.261), 0.0194),
    ((0.636, 0.270), (0.508, 0.313), 0.0194),
    ((0.664, 0.348), (0.518, 0.375), 0.0189),
    ((0.676, 0.427), (0.521, 0.438), 0.0194),
    ((0.673, 0.500), (0.549, 0.497), 0.0120),
]

# Approved local shadow suppression at the red's left tip. Screen coordinates;
# feathered so it is an occlusion, not a cut. See docs/icon.md.
HOLE = (139.0, 458.0, 247.0, 136.0)
HOLE_FEATHER = 10.0


def f(value: float) -> str:
    return f"{value:.2f}"


def rotate(point: tuple[float, float], degrees: float) -> tuple[float, float]:
    radians = math.radians(degrees)
    c, s = math.cos(radians), math.sin(radians)
    return (c * point[0] - s * point[1], s * point[0] + c * point[1])


def body_d(item: dict) -> str:
    s = item["scale"]
    qx, qy = item["q"]
    return (
        f"M0 0 A{f(RX * s)} {f(RY * s)} {PHI:g} 1 1 0 {f(L * s)} "
        f"Q{f(qx)} {f(qy)} 0 0 Z"
    )


def rim_d(item: dict) -> str:
    s = item["scale"]
    return f"M0 0 A{f(RX * s)} {f(RY * s)} {PHI:g} 1 1 0 {f(L * s)}"


def spine_d(item: dict) -> str:
    s = item["scale"]
    parts: list[str] = []
    for outer, inner, width in SPINES:
        p0 = (outer[0] * L * s, outer[1] * L * s)
        p1 = (inner[0] * L * s, inner[1] * L * s)
        ux, uy = p1[0] - p0[0], p1[1] - p0[1]
        length = math.hypot(ux, uy)
        ux, uy = ux / length, uy / length
        nx, ny = -uy, ux
        radius = width * 1.12 * L * s / 2
        cap = (p0[0] - ux * radius, p0[1] - uy * radius)
        base_l = (cap[0] + nx * radius, cap[1] + ny * radius)
        base_r = (cap[0] - nx * radius, cap[1] - ny * radius)
        mid = ((p1[0] + cap[0]) / 2, (p1[1] + cap[1]) / 2)
        bow = width * 1.12 * L * s * 0.30
        ctrl_l = (mid[0] + nx * bow, mid[1] + ny * bow)
        ctrl_r = (mid[0] - nx * bow, mid[1] - ny * bow)
        parts.append(
            f"M{f(p1[0])} {f(p1[1])} "
            f"Q{f(ctrl_l[0])} {f(ctrl_l[1])} {f(base_l[0])} {f(base_l[1])} "
            f"A{f(radius)} {f(radius)} 0 0 1 {f(base_r[0])} {f(base_r[1])} "
            f"Q{f(ctrl_r[0])} {f(ctrl_r[1])} {f(p1[0])} {f(p1[1])} Z"
        )
    return " ".join(parts)


def build() -> str:
    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-labelledby="t d">',
        '  <title id="t">Overlapping scales</title>',
        '  <desc id="d">Three overlapping scales. Each rim is one elliptical arc, each inner edge is a three-point quadratic Bezier; the cream gaps are a constant 16 px; every scale casts a hard offset shadow, and the artwork is optically centred by its ink mass.</desc>',
        f'  <rect width="1024" height="1024" fill="{BG}"/>',
        '  <defs>',
    ]
    for name, item in LAYOUT.items():
        lines.append(f'    <clipPath id="clip-{name}"><path d="{body_d(item)}"/></clipPath>')
    lines += [
        f'    <filter id="holeBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{HOLE_FEATHER:g}"/></filter>',
        '    <mask id="redBoxHole" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">',
        '      <rect width="1024" height="1024" fill="#fff"/>',
        f'      <rect x="{HOLE[0]:g}" y="{HOLE[1]:g}" width="{HOLE[2]:g}" height="{HOLE[3]:g}" fill="#000" filter="url(#holeBlur)"/>',
        '    </mask>',
        '  </defs>',
        f'  <g transform="translate({CENTER[0]:.2f} {CENTER[1]:.2f})">',
    ]
    for name in ("green", "orange", "red"):
        item = LAYOUT[name]
        ax, ay = item["A"]
        ox, oy = rotate((SHADOW_DX, SHADOW_DY), -item["rotate"])
        transform = f'translate({ax:.2f} {ay:.2f}) rotate({item["rotate"]:.3f})'
        lines += ["", f"  <!-- {name} -->"]
        if name == "red":
            # Split so the background reveal can sit over the previous scale,
            # the shadow over the reveal, and the colour over both.
            lines += [
                f'  <g transform="{transform}">',
                f'    <path d="{rim_d(item)}" fill="none" stroke="{BG}" stroke-width="{GAP * 2:g}" stroke-linecap="butt"/>',
                '  </g>',
                '  <g mask="url(#redBoxHole)">',
                f'    <g transform="{transform}">',
                f'      <path d="{body_d(item)}" fill="{SHADOW}" opacity="{SHADOW_OPACITY}" transform="translate({ox:.2f} {oy:.2f})"/>',
                '    </g>',
                '  </g>',
                f'  <g transform="{transform}">',
                f'    <path d="{body_d(item)}" fill="{COLORS[name]}"/>',
                f'    <path d="{spine_d(item)}" fill="{SPIKE}" clip-path="url(#clip-{name})"/>',
                '  </g>',
            ]
        else:
            lines += [
                f'  <g transform="{transform}">',
                f'    <path d="{rim_d(item)}" fill="none" stroke="{BG}" stroke-width="{GAP * 2:g}" stroke-linecap="butt"/>',
                f'    <path d="{body_d(item)}" fill="{SHADOW}" opacity="{SHADOW_OPACITY}" transform="translate({ox:.2f} {oy:.2f})"/>',
                f'    <path d="{body_d(item)}" fill="{COLORS[name]}"/>',
                f'    <path d="{spine_d(item)}" fill="{SPIKE}" clip-path="url(#clip-{name})"/>',
                '  </g>',
            ]
    lines += ['  </g>', '</svg>']
    return "\n".join(lines) + "\n"


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "assets" / "jin-icon.svg"
    output.write_text(build(), encoding="utf-8")
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
