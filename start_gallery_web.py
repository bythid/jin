#!/usr/bin/env python3
"""Start the Jin gallery in a browser with one command.

This is the *web* checkpoint — the gallery as a page in a browser tab. The
Tauri desktop shell has its own entry point, start_gallery_desktop.py; the
split exists so a script name says which surface it opens.

    python start_gallery_web.py            # browser at http://localhost:5180
    python start_gallery_web.py --build    # production build, then serve it

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


def vite_command(*args: str) -> list[str]:
    """直接调本地 vite，**不经过 pnpm**。

    为什么：pnpm 跑脚本命令时，中间会经过
    `DSH Desktop.exe`（运行时把它当 node 用 —— 那是个 **GUI 二进制**，不挂控制台）。
    它再去起 `cmd /c vite …` 时，Windows 会**新分配一个控制台**；Windows 11 把新控制台
    交给 Windows Terminal 打开，桌面上就冒出一个标题为 `C:\\WINDOWS\\system32\\cmd.exe`、
    内容空白的窗口（实测抓到过：`cmd /d /s /c vite preview --port 5180` 的父进程正是
    `DSH Desktop.exe … pnpm.mjs`）。

    直接起 `node_modules/.bin/vite` 就没有那一层，控制台沿用它爸的（我们那条 PTY），
    整条链一个窗口都不会多。pnpm 只留给真正需要它的地方（install）。
    """
    exe = GALLERY / "node_modules" / ".bin" / ("vite.cmd" if os.name == "nt" else "vite")
    return [str(exe), *args]


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
        #
        # CREATE_NO_WINDOW 是给"空 cmd 窗口"那件事的：这条链里会经过
        # `pnpm.cmd → DSH Desktop.exe（GUI 二进制当 node 用）`，GUI 进程不挂控制台，
        # 于是它再起的控制台子进程（`cmd /c vite …`）会被系统**新分配一个控制台**——
        # Windows 11 把新控制台交给 Windows Terminal 打开，桌面上就冒出一个
        # 标题为 `C:\WINDOWS\system32\cmd.exe`、内容空白的窗口（实测遇到过）。
        # 给子进程一个**没有窗口的控制台**，它的后代都继承它，整条链就不再弹窗。
        kwargs["creationflags"] = (
            subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
        )
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

    # 注意这里**没有** `"--"`：pnpm 会把多余的 `--` 原样转发给脚本，
    # 于是 `vite` 把它当成"选项结束"，`--port` 被忽略、去监听默认的 4173，
    # 而本函数等的是 5180 —— 结果必然是 60 秒后超时（实测踩过）。
    # 也不再经过 pnpm：见 `vite_command()` 的注释（那一层会多出一个空 cmd 窗口）。
    child = spawn([*vite_command("--port", str(port), "--strictPort")], GALLERY)
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


def run_build(port: int, open_browser: bool) -> int:
    say("building the gallery for production")
    # 构建也直接走本地 vite：经过 pnpm 那一层同样会多分配一个控制台（见 vite_command）。
    build = subprocess.run(
        vite_command("build"),
        cwd=str(GALLERY),
        check=False,
    )
    if build.returncode != 0:
        fail("the production build failed.")

    say("serving the build")
    # 同上：不经过 pnpm（见 vite_command 的注释），也不要 `"--"`。
    child = spawn([*vite_command("preview", "--port", str(port), "--strictPort")], GALLERY)
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
    # A Windows console defaults to a legacy code page (GBK on a Chinese
    # system), which cannot encode the ✓/✗ this script prints — the run died on
    # its first status line, after the child it started was already up, and the
    # orphaned server then held the port. Pin both streams to UTF-8.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(
        prog="start_gallery_web.py",
        description="Start the Jin gallery in a browser (the web checkpoint).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python start_gallery_web.py                 # dev server, opens the browser\n"
            "  python start_gallery_web.py --no-browser    # dev server only\n"
            "  python start_gallery_web.py --port 5300     # a different port\n"
            "  python start_gallery_web.py --build         # production build, served\n"
            "\n"
            "the Tauri desktop shell is start_gallery_desktop.py\n"
        ),
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"port to use (default {DEFAULT_PORT})")
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser window")
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

    if args.build:
        return run_build(args.port, not args.no_browser)
    return run_dev(args.port, not args.no_browser)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        stop(_child)
    except SystemExit:
        # `fail()` 走的是 `sys.exit()`（不是 KeyboardInterrupt）：不在这里收一次，
        # 已经起来的子进程就被留下了 —— 实测 preview 会绑在默认的 4173 上活一整晚，
        # 下一次点按钮只能看到端口被占 / "已经有一个画廊在跑"。
        stop(_child)
        raise
        sys.exit(130)
