#!/usr/bin/env python3
"""Start the Jin gallery with one command.

    python start_gallery.py            # browser at http://localhost:5180
    python start_gallery.py --tauri    # the Tauri desktop shell
    python start_gallery.py --build    # production build, then serve it

Three things this does that a bare `pnpm run dev` does not:

  * checks the prerequisites first and says which one is missing, instead of
    letting pnpm fail with an error about a file nobody can find;
  * notices that a gallery is already running on the port and simply opens the
    browser, rather than starting a second server;
  * kills the whole process tree on exit. `pnpm` spawns `node`, which spawns
    `vite`: killing only the parent leaves an orphan holding the port, which is
    why the next start then fails with "port already in use".
"""

from __future__ import annotations

import argparse
import os
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GALLERY = ROOT / "gallery"
DEFAULT_PORT = 5180
READY_TIMEOUT = 60.0

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
    build first, and on a machine where it cannot, the run dies before vite is
    ever reached. The scripts here only need a pnpm recent enough to read the
    lockfile, so the version check is told to warn rather than fail.
    """
    return [pnpm_command(), "--pm-on-fail=ignore", *args]


def cargo_available() -> bool:
    from shutil import which

    return which("cargo") is not None


def require() -> None:
    """Fail early, with the actual missing piece named."""
    pnpm_command()  # exits with a clear message when pnpm is absent

    if not (ROOT / "node_modules").is_dir():
        fail(
            "the library's dependencies are not installed.",
            f"Run:  cd {ROOT} && pnpm install",
        )
    if not (GALLERY / "node_modules").is_dir():
        fail(
            "the gallery's dependencies are not installed.",
            f"Run:  cd {GALLERY} && pnpm install",
        )
    if not (GALLERY / "src-tauri").is_dir():
        fail("gallery/src-tauri is missing, so --tauri cannot run.")


# --------------------------------------------------------------------------
# port handling
# --------------------------------------------------------------------------
def port_is_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex((host, port)) == 0


def is_our_gallery(port: int, timeout: float = 1.5) -> bool:
    """True when something on this port is serving the Jin gallery."""
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/", timeout=timeout) as response:
            body = response.read(4096).decode("utf-8", "replace")
    except (urllib.error.URLError, OSError, ValueError):
        return False
    return "Component Gallery" in body or "Jin" in body


def free_port(start: int) -> int:
    for candidate in range(start, start + 50):
        if not port_is_open(candidate):
            return candidate
    fail(f"no free port in {start}..{start + 50}.")


def wait_until_ready(port: int, child: subprocess.Popen[str], timeout: float = READY_TIMEOUT) -> bool:
    """Poll until the server answers, or the child dies while we wait."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if child.poll() is not None:
            return False
        if port_is_open(port):
            return True
        time.sleep(0.25)
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
    say("shutting down…")
    stop(_child)
    sys.exit(0)


def stream(child: subprocess.Popen[str]) -> int:
    """Print the child's output until it exits. Returns its exit code.

    Output is pumped on a background thread and the main thread waits in a
    short sleep loop. That matters: a blocking read on the child's stdout would
    sit in a syscall where Python cannot run its signal handler, so Ctrl+C
    would do nothing whenever the server went quiet — exactly when a user
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
def check_and_start_browser(port: int) -> tuple[subprocess.Popen[str] | None, int]:
    """Handle the port, start the dev server, and return (child, port).

    A None child means "a server was already running", which the caller reports
    rather than pretending to have started something.
    """
    if port_is_open(port):
        if is_our_gallery(port):
            return None, port
        say(f"port {port} is taken by something else; looking for a free one")
        port = free_port(port + 1)

    child = spawn([*pnpm_run("run", "dev"), "--", "--port", str(port), "--strictPort"], GALLERY)
    if not wait_until_ready(port, child):
        if child.poll() is not None:
            fail("the dev server exited before it was ready.", "Its output is above.")
        fail(f"the dev server did not answer on port {port} within {READY_TIMEOUT:.0f}s.")
    return child, port


def run_dev(port: int, open_browser: bool) -> int:
    url = f"http://localhost:{port}/"
    child, port = check_and_start_browser(port)
    url = f"http://localhost:{port}/"

    if child is None:
        # Something is already serving this port and it is our gallery. Take
        # that as success: the user asked for a running gallery, not for a
        # second one.
        ok(f"a gallery is already running at {url}")
        if open_browser:
            say("reusing it and opening the browser")
            webbrowser.open(url)
        else:
            say("reusing the running server (nothing was started)")
        return 0

    ok(f"gallery ready at {url}")
    if open_browser:
        webbrowser.open(url)
    say("press Ctrl+C to stop\n")
    return stream(child)


def run_tauri(port: int) -> int:
    require()
    if not cargo_available():
        fail("cargo is not on PATH, so the Tauri shell cannot be built.", "Install Rust: https://rustup.rs")
    say("building and starting the desktop shell (the first build takes a while)")
    child = spawn(pnpm_run("run", "tauri:dev"), GALLERY)
    return stream(child)


def run_build(port: int, open_browser: bool) -> int:
    say("building the gallery for production")
    build = subprocess.run(
        pnpm_run("run", "build"),
        cwd=str(GALLERY),
        check=False,
    )
    if build.returncode != 0:
        fail("the production build failed.")

    say("serving the build")
    child = spawn([*pnpm_run("run", "preview"), "--", "--port", str(port), "--strictPort"], GALLERY)
    if not wait_until_ready(port, child):
        fail(f"the preview server did not answer on port {port}.")
    url = f"http://localhost:{port}/"
    ok(f"built gallery served at {url}")
    if open_browser:
        webbrowser.open(url)
    say("press Ctrl+C to stop\n")
    return stream(child)


# --------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        prog="start_gallery.py",
        description="Start the Jin gallery (browser or desktop shell).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python start_gallery.py                 # dev server, opens the browser\n"
            "  python start_gallery.py --no-browser    # dev server only\n"
            "  python start_gallery.py --port 5300     # a different port\n"
            "  python start_gallery.py --tauri         # desktop shell\n"
            "  python start_gallery.py --build         # production build, served\n"
        ),
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"port to use (default {DEFAULT_PORT})")
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser window")
    parser.add_argument("--tauri", action="store_true", help="start the Tauri desktop shell instead")
    parser.add_argument("--build", action="store_true", help="build for production, then serve the build")
    args = parser.parse_args()

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

    require()

    if not (GALLERY / "node_modules" / ".bin").is_dir():
        say("gallery dependencies look incomplete; running pnpm install first")
        install = subprocess.run(pnpm_run("install"), cwd=str(GALLERY), check=False)
        if install.returncode != 0:
            fail("pnpm install failed.")

    if args.tauri:
        return run_tauri(args.port)
    if args.build:
        return run_build(args.port, not args.no_browser)
    return run_dev(args.port, not args.no_browser)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        stop(_child)
        sys.exit(130)
