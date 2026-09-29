#!/usr/bin/env python3
"""Contrast audit for every theme file.

Body text must reach 4.5:1 and keyboard focus indicators 3:1. Colour choices
are easy to get almost right, and "almost" is exactly the failure mode that
ships: a muted grey at 4.4:1 looks fine to everyone involved and is still a
WCAG failure.

This script reads the theme CSS directly — no browser, no build — and reports
every pair that misses its target. Run it with `python tools/check_contrast.py`
or as part of `pnpm run check`.

Two rules it applies that a naive checker gets wrong:

  * Status tints are translucent in dark themes, so they are composited over
    the surface they actually sit on before measuring. Comparing against the
    raw rgba() triple reports failures that do not exist.
  * --jin-accent-active is used only as a *fill*, so what must stay readable is
    --jin-text-on-accent on top of it, not the fill against the page.

Exit code 0 = every pair passes.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEMES = ROOT / "themes"

RED = "\033[31m"
GREEN = "\033[32m"
DIM = "\033[2m"
RESET = "\033[0m"

# (token, minimum ratio) pairs measured against each surface.
TEXT_ON_SURFACE = [
    ("--jin-text", 4.5),
    ("--jin-text-muted", 4.5),
    ("--jin-text-subtle", 4.5),
]
FOCUS_ON_SURFACE = ("--jin-focus-ring-color", 3.0)
ACCENT_ON_SURFACE = [("--jin-accent", 4.5)]
# Status text sits on a tint over a raised panel, which is where alerts and
# toasts live. The fill itself is an icon carrier, so it needs 3:1.
STATUS = [("danger", 4.5), ("warning", 4.5), ("success", 4.5), ("info", 4.5)]


def parse_tokens(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    return {name: value.strip() for name, value in re.findall(r"^\s*(--jin-[a-z0-9-]+)\s*:\s*([^;]+);", text, re.M)}


def parse_color(raw: str) -> tuple[int, int, int, float] | None:
    value = raw.strip()
    match = re.fullmatch(r"#([0-9a-fA-F]{6})", value)
    if match:
        h = match.group(1)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
    match = re.fullmatch(r"#([0-9a-fA-F]{3})", value)
    if match:
        h = match.group(1)
        return tuple(int(c * 2, 16) for c in h) + (1.0,)  # type: ignore[return-value]
    match = re.fullmatch(r"rgba?\(([^)]+)\)", value)
    if match:
        parts = [p.strip() for p in match.group(1).split(",")]
        alpha = float(parts[3]) if len(parts) > 3 else 1.0
        return (int(float(parts[0])), int(float(parts[1])), int(float(parts[2])), alpha)
    return None


def composite(foreground: tuple[int, int, int, float], background: tuple[int, int, int]) -> tuple[int, int, int]:
    alpha = foreground[3]
    return tuple(round(foreground[i] * alpha + background[i] * (1 - alpha)) for i in range(3))  # type: ignore[return-value]


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    def channel(value: int) -> float:
        c = value / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = relative_luminance(a), relative_luminance(b)
    high, low = max(la, lb), min(la, lb)
    return (high + 0.05) / (low + 0.05)


def audit(path: Path) -> list[str]:
    tokens = parse_tokens(path)
    failures: list[str] = []

    def color(token: str) -> tuple[int, int, int, float] | None:
        raw = tokens.get(token)
        return parse_color(raw) if raw else None

    def check(label: str, foreground, background, minimum: float) -> float | None:
        if foreground is None or background is None:
            failures.append(f"{path.name}: {label} could not be measured (unparsed colour)")
            return None
        ratio = contrast(foreground[:3], background[:3])
        if ratio < minimum:
            failures.append(f"{path.name}: {label} = {ratio:.2f}:1, needs {minimum}:1")
        return ratio

    surfaces = []
    for token, name in [
        ("--jin-bg", "bg"),
        ("--jin-surface", "surface"),
        ("--jin-surface-raised", "raised"),
        ("--jin-surface-sunken", "sunken"),
    ]:
        value = color(token)
        if value is None:
            failures.append(f"{path.name}: {token} is missing")
            continue
        surfaces.append((name, value[:3]))

    for name, surface in surfaces:
        for token, minimum in TEXT_ON_SURFACE:
            check(f"{token} on {name}", color(token), surface, minimum)  # type: ignore[arg-type]
        check(f"{FOCUS_ON_SURFACE[0]} on {name}", color(FOCUS_ON_SURFACE[0]), surface, FOCUS_ON_SURFACE[1])  # type: ignore[arg-type]
        for token, minimum in ACCENT_ON_SURFACE:
            check(f"{token} on {name}", color(token), surface, minimum)  # type: ignore[arg-type]

    # A filled control: the text on top of the accent must be readable, and that
    # includes the pressed state, which the library uses only as a fill.
    for fill_token in ("--jin-accent", "--jin-accent-hover", "--jin-accent-active"):
        check(
            f"--jin-text-on-accent over {fill_token}",
            color("--jin-text-on-accent"),
            color(fill_token),
            4.5,
        )

    raised = next((s for n, s in surfaces if n == "raised"), None)
    for group, minimum in STATUS:
        tint = color(f"--jin-{group}-bg")
        text = color(f"--jin-{group}-text")
        fill = color(f"--jin-{group}")
        if raised is not None and tint is not None:
            # Translucent tints are composited onto the surface they sit on.
            background = composite(tint, raised) if tint[3] < 1 else tint[:3]
            check(f"--jin-{group}-text on its tint", text, background, minimum)
            check(f"--jin-{group} fill on raised (icon 3:1)", fill, raised, 3.0)

    return failures


def main() -> int:
    theme_files = sorted(THEMES.glob("*.css"))
    if not theme_files:
        print(f"{RED}No theme files found in {THEMES}{RESET}")
        return 1

    all_failures: list[str] = []
    for path in theme_files:
        failures = audit(path)
        status = f"{GREEN}ok{RESET}" if not failures else f"{RED}{len(failures)} problem(s){RESET}"
        print(f"  {DIM}{path.name}{RESET}: {status}")
        all_failures.extend(failures)

    if all_failures:
        print()
        for failure in all_failures:
            print(f"{RED}FAIL{RESET} {failure}")
        print(f"\n{RED}{len(all_failures)} contrast problem(s) found{RESET}")
        return 1

    print(f"\n{GREEN}All contrast targets met.{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
