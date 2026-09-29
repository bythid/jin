let counter = 0

/** Monotonic id source for overlay / control instances. Deterministic per page load. */
export function createId(prefix = 'jin'): string {
  counter += 1
  return `${prefix}-${counter}`
}

/** Test helper: makes generated ids predictable again. */
export function resetIdCounter(): void {
  counter = 0
}
