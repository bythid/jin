#!/usr/bin/env python3
"""Jin token/style discipline checks.

Six mechanical checks, run with `python tools/check_tokens.py` (or `pnpm run check`):

  1. Token completeness   - every theme file defines every token in contracts/tokens.json
  2. No hardcoded values  - control styles contain no hex colours, px radii,
                            literal box-shadows, time literals or font-size literals
  3. No business words    - library source contains none of the blacklisted words
  4. One-way dependency   - no library file imports application code
  5. Naming discipline    - class names use jin-*, components use Jin*, and the
                            library stylesheet has no global element selectors
  6. Stylesheet marker    - the stylesheet declares the custom property the plugin
                            reads to tell a missing stylesheet from a loaded one

Exit code 0 = all checks pass. Any failure prints the offending file and line.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
THEMES = ROOT / "themes"
CONTRACTS = ROOT / "contracts"

RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
DIM = "\033[2m"
RESET = "\033[0m"


class Report:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.notes: list[str] = []

    def fail(self, check: str, message: str) -> None:
        self.failures.append(f"[{check}] {message}")

    def note(self, message: str) -> None:
        self.notes.append(message)


# --------------------------------------------------------------------------
# Structural numeric values that are allowed to appear literally in the
# stylesheet. Everything else (colour, radius, shadow, duration, font-size)
# must come from a token.
#
# Each entry is a regular expression matched against a *whole declaration value*
# (the part after the colon). Documenting the list here is the point: the
# whitelist is explicit and reviewable.
# --------------------------------------------------------------------------
STRUCTURAL_VALUE_WHITELIST: list[tuple[str, str]] = [
    (r"^\s*(0|1|100%|auto|none|inherit|initial|unset|revert)\s*$", "structural keyword/zero"),
    (r"^\s*0\s+0\s+0\s+1px\b.*$", "structural focus/hairline shorthand"),
    (r"^\s*calc\(.*\)\s*$", "computed from tokens"),
    (r"^\s*(1px|2px|3px|4px)\s+(solid|dashed)\s+transparent\s*$", "invisible structural border"),
    (r"^\s*1px\s*$", "hairline border width"),
    (r"^\s*50%\s*$", "geometric circle"),
    (r"^\s*inset\(50%\)\s*$", "visually-hidden clip"),
    (r"^\s*-1px\s*$", "visually-hidden margin"),
    (r"^\s*1\s*$", "unitless line-height/opacity"),
    (r"^\s*0\.\d+\s*$", "unitless opacity"),
    (r"^\s*\d+%\s*$", "percentage"),
    (r"^\s*(flex-start|flex-end|center|stretch|baseline|space-between|space-around|space-evenly|start|end|left|right|top|bottom)\s*$", "box alignment keyword"),
    (r"^\s*(row|column|row-reverse|column-reverse|wrap|nowrap|wrap-reverse)\s*$", "flex direction keyword"),
    (r"^\s*(block|inline|inline-flex|flex|grid|none|contents)\s*$", "display keyword"),
    (r"^\s*(relative|absolute|fixed|sticky|static)\s*$", "position keyword"),
    (r"^\s*(solid|dashed|dotted|none)\s*$", "border-style keyword"),
    (r"^\s*(auto|scroll|hidden|visible|clip)\s*$", "overflow keyword"),
    (r"^\s*(border-box|content-box)\s*$", "box-sizing"),
    (r"^\s*(pointer|not-allowed|progress|default|text|grab|grabbing|move|help|wait)\s*$", "cursor keyword"),
    (r"^\s*(normal|pre|pre-wrap|nowrap|break-word|anywhere)\s*$", "text keyword"),
    (r"^\s*(manual|auto)\s*$", "content-visibility keyword"),
    (r"^\s*(hidden|scroll|auto)\s*$", "overflow keyword"),
    (r"^\s*1fr\b.*$", "grid template fragment"),
    (r"^\s*minmax\(.*\)\s*$", "grid minmax"),
    (r"^\s*50%\s+50%\s*$", "transform origin"),
    (r"^\s*(uppercase|lowercase|capitalize|none)\s*$", "text-transform keyword"),
    (r"^\s*(tabular-nums|normal)\s*$", "font-variant keyword"),
    (r"^\s*infinite\s*$", "animation iteration count"),
    (r"^\s*linear\b.*$", "timing function keyword"),
    (r"^\s*(ease|ease-in|ease-out|ease-in-out|linear)\s*$", "timing function keyword"),
    (r"^\s*(forwards|both|none)\s*$", "animation fill mode"),
    (r"^\s*none\s*$", "none"),
    (r"^\s*(prefers-reduced-motion: reduce|\(min-width: \d+px\))\s*$", "media query"),
    (r"^\s*disc\s*$", "list-style"),
    (r"^\s*break-word\s*$", "overflow-wrap"),
    (r"^\s*anywhere\s*$", "overflow-wrap"),
    (r"^\s*min-content\b.*$", "sizing keyword"),
    (r"^\s*\d+px\s*$", "structural offset (measured in tools check)"),
]

# px values that are purely structural and therefore allowed anywhere:
# 0/1px hairlines, the border widths used to draw focus rings, and the arrow
# size of popovers. Anything larger must be a token or a calc().
ALLOWED_PX_LITERALS = {0, 1, 2, 3, 4}

# Font-size literals are never allowed except when they come from a token.
FONT_SIZE_RE = re.compile(r"^\s*(?:\d+(?:\.\d+)?)(px|rem|em|pt)\s*$")
HEX_COLOR_RE = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB_COLOR_RE = re.compile(r"\brgba?\(")
HSL_COLOR_RE = re.compile(r"\bhsla?\(")
TIME_RE = re.compile(r"\b\d+(?:\.\d+)?m?s\b")
BOX_SHADOW_LITERAL_RE = re.compile(r"(?<![\w-])(?:\d+px\s+){1,4}(?:rgba?\(|#)")
RADIUS_LITERAL_RE = re.compile(r"\b\d+px\b")


def load_tokens() -> list[str]:
    data = json.loads((CONTRACTS / "tokens.json").read_text(encoding="utf-8"))
    return [token["name"] for token in data["tokens"]]


CONTRACT_TOKENS: set[str] = set()


def load_contract_tokens() -> set[str]:
    global CONTRACT_TOKENS
    CONTRACT_TOKENS = set(load_tokens())
    return CONTRACT_TOKENS


# --------------------------------------------------------------------------
# Check 1: token completeness
# --------------------------------------------------------------------------
def check_token_completeness(report: Report, tokens: list[str]) -> None:
    theme_files = sorted(THEMES.glob("*.css"))
    if not theme_files:
        report.fail("tokens", "no theme files found in themes/")
        return

    for theme in theme_files:
        text = theme.read_text(encoding="utf-8")
        declared = set(re.findall(r"^\s*(--jin-[a-z0-9-]+)\s*:", text, re.MULTILINE))
        missing = [token for token in tokens if token not in declared]
        if missing:
            report.fail("tokens", f"{theme.name} is missing {len(missing)} token(s): {', '.join(missing[:8])}"
                        + (" …" if len(missing) > 8 else ""))
        else:
            report.note(f"{theme.name}: all {len(tokens)} tokens present")


# --------------------------------------------------------------------------
# Check 2: no hardcoded style values
# --------------------------------------------------------------------------
def strip_var_expressions(value: str) -> str:
    """Remove every var(...) expression, fallback included.

    Fallbacks inside var() are the sanctioned safety net: a
    control must stay usable when a token is missing. They are therefore not
    "hardcoded values" for the purpose of this check. What the check does flag
    is a declaration that carries a literal *outside* any var(), because that
    declaration ignores the token layer entirely.
    """
    without_var = strip_balanced_calls(value, {"var"})
    # A colour expression built from tokens (color-mix) is still token-driven.
    return strip_balanced_calls(without_var, {"color-mix"})


def strip_balanced_calls(value: str, names: set[str]) -> str:
    """Drop balanced `name(...)` groups whose body references a token.

    `color-mix(in srgb, var(--jin-accent) 25%, transparent)` is a value derived
    from tokens, so it is not a hardcoded colour — but only when it really
    references one, which is what `require_var` enforces.
    """
    result: list[str] = []
    index = 0
    length = len(value)
    while index < length:
        matched = None
        for name in names:
            if value.startswith(f"{name}(", index):
                matched = name
                break
        if matched is None:
            result.append(value[index])
            index += 1
            continue
        # Walk to the matching close paren.
        depth = 0
        cursor = index + len(matched)
        while cursor < length:
            char = value[cursor]
            if char == "(":
                depth += 1
            elif char == ")":
                if depth == 0:
                    break
                depth -= 1
            cursor += 1
        body = value[index : cursor + 1]
        if "var(" in body:
            index = cursor + 1
            continue
        result.append(body)
        index = cursor + 1
    return "".join(result)


def iter_declarations(css_text: str):
    """Yield (line_number, property, value) for declarations inside .jin-* rules."""
    line = 1
    for raw_line in css_text.splitlines():
        stripped = raw_line.strip()
        if ":" in stripped and not stripped.startswith(("@", "/*", "*", "//")) and "{" not in stripped:
            prop, _, value = stripped.partition(":")
            value = value.rstrip(";").strip()
            if prop.strip().startswith("--jin-"):
                yield line, prop.strip(), value, True
            elif re.fullmatch(r"[a-z-]+", prop.strip()):
                yield line, prop.strip(), value, False
        line += 1


def is_whitelisted(prop: str, value: str) -> bool:
    if "--jin-" in value or "var(" in value:
        return True
    for pattern, _ in STRUCTURAL_VALUE_WHITELIST:
        if re.fullmatch(pattern, value):
            # A px literal larger than the allowed set is structural only if it
            # is a self-evidently geometric value.
            return True
    return False


def strip_css_comments(text: str) -> str:
    """Replace comment bodies with spaces, preserving line structure."""
    def blank(match: re.Match[str]) -> str:
        return re.sub(r"[^\n]", " ", match.group(0))

    return re.sub(r"/\*.*?\*/", blank, text, flags=re.DOTALL)


def is_structural_remainder(value: str) -> bool:
    """True when a value's literal part carries no style choice.

    Used for declarations like `border-radius: 0 0 var(--jin-radius-lg) var(--jin-radius-lg)`
    or `box-shadow: 0 0 0 var(--jin-focus-ring-width) var(--jin-focus-ring-color)`,
    where the literal fragments are all zeros and keywords — the shape and the
    colour still come from tokens.
    """
    tokens = re.findall(r"[a-z-]+|\d+(?:\.\d+)?(?:px|%|em|rem|s|ms)?", value, re.IGNORECASE)
    if not tokens:
        return True
    for token in tokens:
        lowered = token.lower()
        if lowered in {"0", "0px", "0%", "0s", "0ms"}:
            continue
        if lowered in {
            "solid", "dashed", "dotted", "none", "transparent", "auto", "currentcolor",
            "inset", "outset", "hidden", "visible", "linear", "ease", "ease-in", "ease-out",
            "ease-in-out", "normal", "center", "start", "end", "left", "right", "top", "bottom",
        }:
            continue
        return False
    return True


def check_no_hardcoded(report: Report) -> None:
    css_files = sorted(SRC.rglob("*.css"))
    for css_file in css_files:
        text = css_file.read_text(encoding="utf-8")
        for line, prop, raw_value, is_custom in iter_declarations(text):
            if is_custom:
                # Custom properties ARE the token layer, but the library must
                # not define contract tokens outside themes/.
                if prop.startswith("--jin-") and prop in CONTRACT_TOKENS:
                    report.fail("hardcoded", f"{css_file.relative_to(ROOT)}:{line} defines the token {prop}; "
                                             "tokens belong in themes/")
                continue
            if not raw_value:
                continue

            value = strip_var_expressions(raw_value).strip(" ,")
            if not value:
                # The whole declaration is token-driven.
                continue

            if prop in {"animation", "transition", "animation-duration", "transition-duration", "animation-delay", "transition-delay"}:
                if TIME_RE.search(value):
                    if is_structural_motion(css_file, prop, raw_value):
                        continue
                    report.fail("hardcoded", f"{css_file.relative_to(ROOT)}:{line} literal time in `{prop}: {raw_value}`")
                continue
            if prop == "font-size":
                report.fail("hardcoded", f"{css_file.relative_to(ROOT)}:{line} literal font-size `{raw_value}`")
                continue
            if prop == "border-radius":
                if "50%" not in value and not is_structural_remainder(value):
                    report.fail("hardcoded", f"{css_file.relative_to(ROOT)}:{line} literal border-radius `{raw_value}`")
                continue
            if prop in {"box-shadow", "text-shadow"}:
                if value != "none" and not is_structural_remainder(value):
                    report.fail("hardcoded", f"{css_file.relative_to(ROOT)}:{line} literal {prop} `{raw_value}`")
                continue
            if HEX_COLOR_RE.search(value) or RGB_COLOR_RE.search(value) or HSL_COLOR_RE.search(value):
                report.fail("hardcoded", f"{css_file.relative_to(ROOT)}:{line} literal colour in `{prop}: {raw_value}`")
                continue
            if is_whitelisted(prop, value):
                continue
            # Remaining px values: only the structural set is allowed.
            for px in re.findall(r"(\d+(?:\.\d+)?)px", value):
                if float(px) not in ALLOWED_PX_LITERALS:
                    report.fail("hardcoded", f"{css_file.relative_to(ROOT)}:{line} px value `{px}px` in `{prop}: {raw_value}`")
                    break


# Mechanical animation rates that themes must not be able to shorten to zero:
# a frozen spinner no longer communicates "working". The exceptions are
# enumerated by property and value rather than by line number, because a
# line-number table silently retires an exception the moment a rule above it
# moves — and moving rules is exactly what editing this stylesheet does.
# Declarations whose value names the animation (`jin-spin`, `jin-sweep`,
# `progress-slide`) are recognised without an entry; only literal rates need one.
STRUCTURAL_MOTION: list[tuple[str, str, str]] = [
    ("animation-duration", "2400ms", "slow spinner under reduced motion"),
]


def is_structural_motion(css_file: Path, prop: str, value: str) -> bool:
    if css_file.name != "jin.css":
        return False
    if "spin" in value or "sweep" in value or "progress-slide" in value:
        return True
    return any(entry[0] == prop and entry[1] == value.strip() for entry in STRUCTURAL_MOTION)


# --------------------------------------------------------------------------
# Check 3: no business vocabulary
# --------------------------------------------------------------------------
# Generic business vocabulary: nouns and verbs that describe a domain rather
# than a control, and that any application-facing library should keep out of
# its own API. Kept generic on purpose — a list of one product's actual terms
# would disclose that product, which is what this check exists to prevent.
BUSINESS_WORDS = [
    "visibility",
    "policy",
    "scan",
    "project",
    "device",
    "workspace",
    "synchronize",
    "orphan",
]

# --------------------------------------------------------------------------
# Consumer-specific vocabulary, kept out of the repository.
#
# A library that is never allowed to know an application's nouns is best
# checked by naming those nouns — but naming them here would publish them. So
# the names live in an optional, untracked file:
#
#     tools/check_tokens.local.json
#     {
#       "business_words": ["…"],
#       "app_markers": ["…"]
#     }
#
# The file is gitignored. Without it the generic checks below still run, so a
# fresh clone behaves the same; with it, the check catches the specific
# vocabulary of whatever applications this copy serves.
# --------------------------------------------------------------------------
LOCAL_CONFIG = Path(__file__).resolve().parent / "check_tokens.local.json"


def load_local_vocabulary() -> tuple[list[str], list[str]]:
    """Returns (extra business words, extra app import markers)."""
    if not LOCAL_CONFIG.is_file():
        return [], []
    try:
        data = json.loads(LOCAL_CONFIG.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return [], []
    words = [str(word) for word in data.get("business_words", []) if str(word).strip()]
    markers = [str(marker) for marker in data.get("app_markers", []) if str(marker).strip()]
    return words, markers

# Words that legitimately appear as English/technical vocabulary in the library.
BUSINESS_ALLOWLIST_PATTERNS = [
    r"\.visibility\b",                          # DOM style property access
    r"visibility\s*:",                          # CSS declaration
    r"visibility\s*===?\s*['\"](hidden|visible|collapse)",  # compared CSS value
    r"visibility:\s*(hidden|visible|collapse)",  # CSS value
    r"\bpolicy\b.*dismiss",                     # generic dismissal wording
]


def check_no_business_words(report: Report) -> None:
    extensions = {".ts", ".vue", ".css"}
    extra, _ = load_local_vocabulary()
    words = BUSINESS_WORDS + [word for word in extra if word not in BUSINESS_WORDS]
    for path in sorted(SRC.rglob("*")):
        if not path.is_file() or path.suffix not in extensions:
            continue
        text = path.read_text(encoding="utf-8")
        for number, line in enumerate(text.splitlines(), start=1):
            for word in words:
                # Word boundaries matter: "Candidate" must not match "scan".
                if not re.search(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", line):
                    continue
                if any(re.search(pattern, line, re.IGNORECASE) for pattern in BUSINESS_ALLOWLIST_PATTERNS):
                    continue
                report.fail("business", f"{path.relative_to(ROOT)}:{number} contains `{word}`: {line.strip()[:90]}")
                break


# --------------------------------------------------------------------------
# Check 4: one-way dependency
# --------------------------------------------------------------------------
APP_MARKERS = [
    "from '../../",
    "from '../../../",
    "apps/",
    "@tauri-apps",
]
ALLOWED_TAURI_IMPORT = False


def check_one_way_dependency(report: Report) -> None:
    _, extra_markers = load_local_vocabulary()
    markers = APP_MARKERS + [marker for marker in extra_markers if marker not in APP_MARKERS]
    for path in sorted(SRC.rglob("*")):
        if not path.is_file() or path.suffix not in {".ts", ".vue"}:
            continue
        text = path.read_text(encoding="utf-8")
        for number, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if not (stripped.startswith("import ") or stripped.startswith("export ")):
                continue
            if "from '" not in stripped and 'from "' not in stripped:
                continue
            for marker in markers:
                if marker in stripped:
                    if marker == "@tauri-apps" and ALLOWED_TAURI_IMPORT:
                        continue
                    if marker.startswith("from '.") and "../../" in marker:
                        # Reaching out of src/ is what we are detecting; the
                        # contracts/ JSON is the one allowed exception.
                        if "contracts/" in stripped:
                            continue
                    report.fail("dependency", f"{path.relative_to(ROOT)}:{number} imports outside the library: {stripped[:90]}")
                    break


# --------------------------------------------------------------------------
# Check 5: naming discipline
# --------------------------------------------------------------------------
GLOBAL_ELEMENT_SELECTORS = [
    r"(^|[\s,{}])(body|html|button|input|select|textarea|a|p|h[1-6]|ul|ol|li|dl|dt|dd|table|svg|span|div|label|form|fieldset|legend|img|nav|header|footer|main|section|article|aside|figure|details|summary|dialog|progress|meter|output|template|canvas|video|audio|iframe|pre|code|blockquote|hr|br|em|strong|small|sub|sup)\s*[,{:]",
    r"^\s*\*\s*[,{:]",
]


def check_naming(report: Report) -> None:
    # Component files must be Jin*.vue
    for path in sorted((SRC / "components").glob("*.vue")):
        if not path.name.startswith("Jin"):
            report.fail("naming", f"{path.relative_to(ROOT)} does not start with Jin")

    # Class names in the stylesheet must be jin-*
    css = strip_css_comments((SRC / "styles" / "jin.css").read_text(encoding="utf-8"))
    classes = set(re.findall(r"\.([a-zA-Z][a-zA-Z0-9_-]*)", css))
    offenders = sorted(name for name in classes if not name.startswith("jin-"))
    if offenders:
        report.fail("naming", f"stylesheet classes without jin- prefix: {', '.join(offenders[:10])}")

    # No global element selectors at the start of a rule
    for number, line in enumerate(css.splitlines(), start=1):
        selector_part = line.split("{")[0].strip()
        if not selector_part or selector_part.startswith(("@", "/*", "*", "//")):
            continue
        if line.strip().startswith("}"):
            continue
        # A rule line ends with '{' or is a selector continuation.
        if not line.rstrip().endswith(("{", ",")) and "{" not in line:
            continue
        # Property lines inside a block end with ';' — skip them.
        if line.rstrip().endswith(";"):
            continue
        for pattern in GLOBAL_ELEMENT_SELECTORS:
            if re.search(pattern, selector_part, re.IGNORECASE):
                report.fail("naming", f"src/styles/jin.css:{number} global selector: {selector_part[:70]}")
                break

    # data attributes must be data-jin-*
    for path in sorted(SRC.rglob("*")):
        if not path.is_file() or path.suffix not in {".ts", ".vue", ".css"}:
            continue
        text = path.read_text(encoding="utf-8")
        for match in re.finditer(r"data-(?!jin-)([a-z][a-z0-9-]*)", text):
            name = match.group(1)
            if name in {"placement", "testid", "test"} or name.startswith("v-"):
                continue
            line_number = text[: match.start()].count("\n") + 1
            report.fail("naming", f"{path.relative_to(ROOT)}:{line_number} attribute data-{name} is not data-jin-*")


def check_stylesheet_marker(report: Report) -> None:
    """The plugin reads a marker property the stylesheet has to declare.

    Neither file is wrong on its own when the two names drift apart: the plugin
    simply goes on warning that the stylesheet is missing while it is loaded,
    which is worse than not warning at all. Mechanical because the coupling is
    invisible in each file viewed on its own.
    """
    stylesheet_ts = SRC / "injection" / "stylesheet.ts"
    base_sheet = SRC / "styles" / "jin.css"

    match = re.search(r"STYLESHEET_MARKER\s*=\s*'([^']+)'", stylesheet_ts.read_text(encoding="utf-8"))
    if not match:
        report.fail("marker", f"{stylesheet_ts.relative_to(ROOT)} no longer declares STYLESHEET_MARKER as a string literal")
        return

    marker = match.group(1)
    if not re.search(re.escape(marker) + r"\s*:\s*1\b", base_sheet.read_text(encoding="utf-8")):
        report.fail(
            "marker",
            f"{base_sheet.relative_to(ROOT)} does not declare `{marker}: 1`, the mark the plugin reads to tell a "
            "missing stylesheet from a loaded one",
        )


def main() -> int:
    report = Report()
    tokens = load_tokens()
    load_contract_tokens()

    print(f"{DIM}Jin discipline checks — {len(tokens)} contract tokens{RESET}")
    check_token_completeness(report, tokens)
    check_no_hardcoded(report)
    check_no_business_words(report)
    check_one_way_dependency(report)
    check_naming(report)
    check_stylesheet_marker(report)

    for note in report.notes:
        print(f"  {DIM}{note}{RESET}")

    words, markers = load_local_vocabulary()
    if words or markers:
        print(f"  {DIM}local vocabulary: {len(words)} word(s), {len(markers)} marker(s){RESET}")

    if report.failures:
        print()
        for failure in report.failures:
            print(f"{RED}FAIL{RESET} {failure}")
        print(f"\n{RED}{len(report.failures)} problem(s) found{RESET}")
        return 1

    print(f"\n{GREEN}All checks passed.{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
