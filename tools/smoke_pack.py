"""Smoke-test the packed package the way an outside consumer receives it.

Nothing here trusts the repository. The library is built, packed, extracted into
a scratch project's `node_modules` as a real directory (not a symlink), and built
by a Vite config that knows nothing about this checkout: no aliases, no `source`
condition, no `*.vue` shim. That is the only way to catch an `exports` map that
lies, a stylesheet that never reaches the bundle, a `files` list that drops
something the map points at, or declarations whose specifiers do not resolve.

Run with `pnpm run smoke`. The scratch project is left in place when a step fails,
because that is when it is worth reading.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRATCH = ROOT / ".smoke"

RED = "\033[31m"
GREEN = "\033[32m"
DIM = "\033[2m"
RESET = "\033[0m"

# What a consumer's import map points at, and therefore what the tarball owes it.
REQUIRED_IN_TARBALL = [
    "package/dist/jin.js",
    # Declarations ship as one api-extractor bundle; there is no per-module
    # tree to assert on. The scratch project's own typecheck below is what
    # proves the bundle is complete.
    "package/dist/index.d.ts",
    "package/styles.css.d.ts",
    "package/src/styles/jin.css",
    "package/themes/jin.css",
    "package/themes/jin.dark.css",
    "package/contracts/tokens.json",
    "package/contracts/strings.json",
    "package/LICENSE",
    "package/package.json",
]

CONSUMER_MAIN = """\
// An outside consumer: every specifier resolves through @bythid/jin's own `exports`.
import { createApp, h } from 'vue'
import { JinUI, JinButton } from '@bythid/jin'
import tokens from '@bythid/jin/contracts/tokens.json'
import '@bythid/jin/styles.css'
import '@bythid/jin/themes/jin.css'
import '@bythid/jin/themes/jin.dark.css'

createApp({
  render: () => h(JinButton, { variant: 'primary' }, () => `${Object.keys(tokens).length} groups`),
})
  // No options argument: the install signature has to allow it.
  .use(JinUI)
  .mount('#app')
"""

CONSUMER_VITE_CONFIG = """\
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Deliberately minimal: whatever an outside consumer has to configure, this
// file has to configure too.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue'] },
  build: { outDir: 'dist', emptyOutDir: true, target: 'esnext' },
  clearScreen: false,
  logLevel: 'warn',
})
"""

CONSUMER_HTML = """\
<!doctype html>
<html data-jin-style="jin" data-jin-mode="dark">
  <head><meta charset="utf-8" /><title>@bythid/jin smoke</title></head>
  <body><div id="app"></div><script type="module" src="./main.ts"></script></body>
</html>
"""

CONSUMER_TSCONFIG = {
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "strict": True,
        "noEmit": True,
        "skipLibCheck": True,
        "resolveJsonModule": True,
        "verbatimModuleSyntax": True,
        "types": ["vite/client"],
    },
    "include": ["main.ts", "vite.config.ts"],
}


def binary(name: str) -> str:
    """The repository's own copy of a CLI, so nothing is fetched from a registry."""
    suffix = ".cmd" if os.name == "nt" else ""
    return str(ROOT / "node_modules" / ".bin" / f"{name}{suffix}")


def run(label: str, command: list[str], cwd: Path, timeout: int = 300) -> subprocess.CompletedProcess[str]:
    print(f"  {DIM}{label}{RESET}")
    # Encoding pinned deliberately: `text=True` alone decodes with the locale
    # codec, which is GBK on a Chinese Windows and mangles any non-ASCII byte a
    # child prints. The decode then raises inside the reader thread, so the
    # failure surfaces as a hang rather than as an error worth reading.
    #
    # The whole tree is killed on timeout, not just the direct child: on Linux
    # a step can leave a live grandchild (the first CI run sat 20 minutes in
    # `vite build` with `sh -> node` both alive) holding the captured pipes,
    # and communicate() waits on the pipes until every writer closes — killing
    # only `sh` would keep the hang. start_new_session makes the killpg below
    # cover the whole tree; on Windows taskkill /T does the same.
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=True,
        start_new_session=os.name == "posix",
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        if os.name == "posix":
            os.killpg(process.pid, signal.SIGKILL)
        else:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)], capture_output=True)
        stdout, stderr = process.communicate()
        print(f"{RED}FAIL{RESET} {label} — timed out after {timeout}s; output so far:")
        for stream in (stdout, stderr):
            for line in (stream or "").splitlines():
                if line.strip():
                    print(f"    {line}")
        return subprocess.CompletedProcess(command, 124, stdout, stderr)
    if process.returncode != 0:
        print(f"{RED}FAIL{RESET} {label}")
        for stream in (stdout, stderr):
            for line in (stream or "").splitlines():
                if line.strip():
                    print(f"    {line}")
    return subprocess.CompletedProcess(command, process.returncode, stdout, stderr)


def fail(message: str) -> int:
    print(f"{RED}FAIL{RESET} {message}")
    print(f"{DIM}scratch project kept at {SCRATCH}{RESET}")
    return 1


def archive_name_for(package: dict) -> str:
    """What npm calls the tarball: the scope keeps its name, loses its punctuation."""
    return f"{package['name'].lstrip('@').replace('/', '-')}-{package['version']}.tgz"


def main() -> int:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    tarball_name = archive_name_for(package)

    print(f"{DIM}{package['name']} package smoke test{RESET}")

    if run("build", [binary("vite"), "build"], ROOT).returncode != 0:
        return fail("the library does not build")

    if SCRATCH.exists():
        shutil.rmtree(SCRATCH)
    with tempfile.TemporaryDirectory() as pack_dir:
        # --ignore-scripts: the build above is the artifact under test.
        # --no-dry-run: npm passes its own config to child processes through the
        # environment, and `npm publish --dry-run` (this script is part of its
        # gate) would otherwise make this pack produce no tarball at all.
        packed = run(
            "pack",
            ["npm", "pack", "--ignore-scripts", "--no-dry-run", "--pack-destination", pack_dir],
            ROOT,
        )
        if packed.returncode != 0:
            return fail("npm pack failed")
        tarball = Path(pack_dir) / tarball_name
        if not tarball.exists():
            return fail(f"npm pack did not produce {tarball_name}")

        with tarfile.open(tarball) as archive:
            members = set(archive.getnames())
            missing = [member for member in REQUIRED_IN_TARBALL if member not in members]
            if missing:
                return fail(f"the tarball is missing: {', '.join(missing)}")

            # The consumer project: a real directory under node_modules, which is
            # what a registry or tarball install produces. A scoped name nests,
            # exactly as npm lays it out.
            vendor_root = SCRATCH / "node_modules"
            vendor_root.mkdir(parents=True)
            try:
                archive.extractall(vendor_root, filter="data")
            except TypeError:  # `filter` arrived in Python 3.12
                archive.extractall(vendor_root)
            vendor = vendor_root / package["name"]
            vendor.parent.mkdir(parents=True, exist_ok=True)
            (vendor_root / "package").rename(vendor)

    (SCRATCH / "main.ts").write_text(CONSUMER_MAIN, encoding="utf-8")
    (SCRATCH / "vite.config.ts").write_text(CONSUMER_VITE_CONFIG, encoding="utf-8")
    (SCRATCH / "index.html").write_text(CONSUMER_HTML, encoding="utf-8")
    (SCRATCH / "tsconfig.json").write_text(json.dumps(CONSUMER_TSCONFIG, indent=2) + "\n", encoding="utf-8")

    if run("vite build (consumer)", [binary("vite"), "build"], SCRATCH).returncode != 0:
        return fail("an outside consumer cannot build against the packed package")

    sheets = sorted((SCRATCH / "dist" / "assets").glob("*.css"))
    if not sheets:
        return fail("the consumer build emitted no stylesheet")
    css = "\n".join(sheet.read_text(encoding="utf-8") for sheet in sheets)
    rules = len(re.findall(r"\.jin-button", css))
    tokens = len(set(re.findall(r"--jin-[a-z-]+:", css)))
    if rules == 0:
        return fail("the base stylesheet did not reach the consumer's bundle")
    if tokens == 0:
        return fail("no theme tokens reached the consumer's bundle")

    if run("vue-tsc (consumer)", [binary("vue-tsc"), "--noEmit", "-p", "tsconfig.json"], SCRATCH).returncode != 0:
        return fail("the shipped declarations do not resolve for an outside consumer")

    shutil.rmtree(SCRATCH)
    print(
        f"{GREEN}Packed package verified:{RESET} {rules} component rules and {tokens} token "
        f"declarations in the consumer's CSS, declarations type-check clean."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
