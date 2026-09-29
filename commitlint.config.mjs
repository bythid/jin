// Commit messages follow `type(scope): summary`. The conventional set of
// types is the one AGENTS.md names (feat, fix, docs, chore) plus the rest of
// the standard list (ci, test, refactor, perf, build, revert, style), which
// costs nothing and keeps the door open for tooling commits like this one.
export default {
  extends: ['@commitlint/config-conventional'],
}
