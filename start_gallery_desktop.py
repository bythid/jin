#!/usr/bin/env python3
"""Start the Jin gallery as the Tauri desktop shell.

    python start_gallery_desktop.py            # the release shell, rebuilt when stale
    python start_gallery_desktop.py --rebuild  # force a release rebuild, then start
    python start_gallery_desktop.py --dev      # tauri dev with hot reload

This is the *desktop* checkpoint — the real window a WebView2 host shows.
The browser checkpoint has its own entry point, start_gallery_web.py; the
split exists so a script name says which surface it opens.

The default mode runs the release exe. A `tauri build` embeds the built
frontend into the binary, so the exe goes stale the moment a source file
changes; before launching, the frontend and Rust trees are compared against
the exe and a rebuild runs first when anything is newer. Opening a shell
that quietly shows yesterday's CSS is the exact trap this avoids — and where
antivirus breaks up cargo subprocess trees, starting the already-built exe is
the reliable path, which is also why dev mode is opt-in here rather than the
default.

Like the web launcher, it checks prerequisites first and kills the whole
process tree on exit.
"""

from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GALLERY = ROOT / "gallery"
SRC_TAURI = GALLERY / "src-tauri"
# The binary name is the [package] name in src-tauri/Cargo.toml; `tauri build`
# writes it here. `--no-bundle` skips the installers — this script wants the
# runnable shell, not an NSIS setup.
EXE = SRC_TAURI / "target" / "release" / "jin-gallery.exe"

# What the release exe embeds or compiles. The gallery consumes the library
# through a `file:` dependency compiled from source, so the library's own
# trees are frontend sources too. dist/ is deliberately absent: it is an
# output, and counting it would make the exe stale inside its own build step.
STALENESS_ROOTS = (
    GALLERY / "src",
    GALLERY / "index.html",
    GALLERY / "vite.config.ts",
    GALLERY / "package.json",
    ROOT / "src",
    ROOT / "themes",
    ROOT / "contracts",
    SRC_TAURI / "src",
    SRC_TAURI / "icons",
    SRC_TAURI / "Cargo.toml",
    SRC_TAURI / "tauri.conf.json",
)

# Set when a child is running so the signal handler can reach it.
_child: subprocess.Popen[str] | None = None


def say(message: str) -> None:
    print(f"\033[36m·\033[0m {message}", flush=True)


def ok(message: str) -> None:
    print(f"\033[32m✓\033[0m {message}", flush=True)


def fail(message: str, hint: str | None = None) -> None:
    print(f"\033[31m✗\033[0m {message}", file=sys.stderr)
    if hint:
        print(f"  {hint}", file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------------
# prerequisites
# --------------------------------------------------------------------------
def pnpm_command() -> str:
    """Resolve the pnpm executable once, for every call site.

    On Windows pnpm is `pnpm.cmd`, and CreateProcess does not append extensions,
    so a bare "pnpm" raises FileNotFoundError. Resolving it here keeps the
    check, the spawns and the install step from disagreeing with each other.
    """
    from shutil import which

    for candidate in ("pnpm.cmd", "pnpm") if os.name == "nt" else ("pnpm",):
        found = which(candidate)
        if found:
            return found
    fail("pnpm is not on PATH.", "Install Node.js 20+, then: corepack enable pnpm")
    raise SystemExit(1)  # unreachable; keeps type checkers happy


def pnpm_run(*args: str) -> list[str]:
    """A pnpm command line that survives a local pnpm older than the pin.

    `package.json` pins pnpm through `devEngines.packageManager`. A pnpm that
    wants to switch versions instead of running would try to fetch that exact
    build first, and on a machine where it cannot, the run dies before the
    build is ever reached. The scripts here only need a pnpm recent enough to
    read the lockfile, so the version check is told to warn rather than fail.
    """
    return [pnpm_command(), "--pm-on-fail=ignore", *args]


def cargo_available() -> bool:
    from shutil import which

    return which("cargo") is not None


def require() -> None:
    pnpm_command()  # exits with a clear message when pnpm is absent

    if not (GALLERY / "node_modules").is_dir():
        fail(
            "the gallery's dependencies are not installed.",
            f"Run:  cd {GALLERY} && pnpm install",
        )


# --------------------------------------------------------------------------
# staleness
# --------------------------------------------------------------------------
def exe_is_stale() -> bool:
    """True when the release exe is missing or older than any source."""
    if not EXE.is_file():
        return True
    built = EXE.stat().st_mtime
    for root in STALENESS_ROOTS:
        if root.is_file():
            candidates = [root]
        elif root.is_dir():
            candidates = root.rglob("*")
        else:
            continue
        for path in candidates:
            try:
                if path.is_file() and path.stat().st_mtime > built:
                    return True
            except OSError:
                continue
    return False


# --------------------------------------------------------------------------
# process control
# --------------------------------------------------------------------------
def spawn(command: list[str], cwd: Path) -> subprocess.Popen[str]:
    """Start a child in its own process group so the whole tree can be killed."""
    global _child
    env = {**os.environ, "FORCE_COLOR": "1"}
    kwargs: dict[str, object] = {
        "cwd": str(cwd),
        "env": env,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.STDOUT,
        "stdin": None,
        "text": True,
        "encoding": "utf-8",
        "errors": "replace",
        "bufsize": 1,
    }
    if os.name == "nt":
        # A new process group plus taskkill /T is what actually removes the
        # grandchild processes npm creates.
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True

    _child = subprocess.Popen(command, **kwargs)  # type: ignore[arg-type]
    return _child


def stop(child: subprocess.Popen[str] | None) -> None:
    """Terminate the child and everything it spawned."""
    if child is None or child.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(child.pid)],
            capture_output=True,
            check=False,
        )
    else:
        try:
            os.killpg(os.getpgid(child.pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            child.terminate()
    try:
        child.wait(timeout=10)
    except subprocess.TimeoutExpired:
        child.kill()


def _on_signal(signum: int, _frame: object) -> None:
    print()
    say("shutting down...")
    stop(_child)
    sys.exit(0)


def stream(child: subprocess.Popen[str]) -> int:
    """Print the child's output until it exits. Returns its exit code.

    Output is pumped on a background thread and the main thread waits in a
    short sleep loop. That matters: a blocking read on the child's stdout would
    sit in a syscall where Python cannot run its signal handler, so Ctrl+C
    would do nothing whenever the child went quiet — exactly when a user
    reaches for it.
    """
    assert child.stdout is not None

    def pump() -> None:
        try:
            for line in child.stdout:  # type: ignore[union-attr]
                print(line, end="", flush=True)
        except (ValueError, OSError):
            # The pipe closed underneath us during shutdown; nothing to report.
            pass

    reader = threading.Thread(target=pump, name="output", daemon=True)
    reader.start()

    try:
        while child.poll() is None:
            time.sleep(0.2)
    except KeyboardInterrupt:
        pass
    finally:
        stop(child)

    reader.join(timeout=2)
    return child.returncode or 0


# --------------------------------------------------------------------------
# actions
# --------------------------------------------------------------------------
def run_release(force_rebuild: bool) -> int:
    """Rebuild the release shell when it is behind the sources, then run it."""
    require()
    if force_rebuild or exe_is_stale():
        if not cargo_available():
            fail(
                "cargo is not on PATH, so the shell cannot be built.",
                "Install Rust: https://rustup.rs",
            )
        if not EXE.is_file():
            say("building the release shell (the first build takes a while)")
        else:
            say("sources are newer than the release exe; rebuilding it")
        build = subprocess.run(pnpm_run("exec", "tauri", "build", "--no-bundle"), cwd=str(GALLERY))
        if build.returncode != 0:
            fail("the release build failed. Its output is above.")
    ok(f"starting the desktop shell: {EXE}")
    child = spawn([str(EXE)], GALLERY)
    return stream(child)


def run_dev() -> int:
    """A debug build with hot reload — for working on the gallery, not for
    verifying what a real window shows."""
    require()
    if not cargo_available():
        fail(
            "cargo is not on PATH, so the dev shell cannot be built.",
            "Install Rust: https://rustup.rs",
        )
    say("building and starting the dev shell (the first build takes a while)")
    child = spawn(pnpm_run("run", "tauri:dev"), GALLERY)
    return stream(child)


# --------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        prog="start_gallery_desktop.py",
        description="Start the Jin gallery as the Tauri desktop shell.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python start_gallery_desktop.py            # release shell, rebuilt when stale\n"
            "  python start_gallery_desktop.py --rebuild  # force a release rebuild, then start\n"
            "  python start_gallery_desktop.py --dev      # tauri dev with hot reload\n"
        ),
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="debug build with hot reload instead of the release exe",
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="rebuild the release shell even when it looks current",
    )
    # pnpm forwards a literal `--` to the script, so `pnpm run gallery:desktop
    # -- --rebuild` would otherwise reach argparse as `-- --rebuild` and fail.
    args = parser.parse_args([a for a in sys.argv[1:] if a != "--"])

    if sys.version_info < (3, 9):
        fail(f"Python 3.9+ is required (found {sys.version.split()[0]}).")

    if not GALLERY.is_dir():
        fail(f"expected the gallery at {GALLERY}")

    signal.signal(signal.SIGINT, _on_signal)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _on_signal)
    # Windows raises SIGBREAK for Ctrl+Break; registering it makes the cleanup
    # path reachable from both console interrupt keys, not just Ctrl+C.
    if hasattr(signal, "SIGBREAK"):
        signal.signal(signal.SIGBREAK, _on_signal)

    if args.dev:
        return run_dev()
    return run_release(args.rebuild)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        stop(_child)
        sys.exit(130)
