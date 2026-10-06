/**
 * Filter decisions for a type-to-filter list. Pure text math: no Vue, no DOM,
 * no knowledge of what the entries are — callers hand over labels and get
 * indices back, so the same functions filter a listbox, a menu or a tree.
 *
 * Matching is case-insensitive and diacritic-insensitive: "Café" matches a
 * query of "cafe" and the other way around. The query is trimmed; a
 * whitespace-only query matches everything, which is what an unfiltered
 * popup should show.
 */

export interface FilterSegment {
  text: string
  matched: boolean
}

/**
 * The folded form of `text` used for matching. Folding can change length
 * ("é" folds to "e"), so `ends[i]` records the index in the original just
 * past the character that produced `text[i]`: one entry per code unit of the
 * result, which lets slices land back on original character boundaries.
 */
interface FoldedText {
  text: string
  ends: number[]
}

function foldMapped(source: string): FoldedText {
  let text = ''
  const ends: number[] = []
  for (let index = 0; index < source.length; index += 1) {
    const piece = source
      .charAt(index)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
    for (let offset = 0; offset < piece.length; offset += 1) {
      text += piece.charAt(offset)
      ends.push(index + 1)
    }
  }
  return { text, ends }
}

/** Lower-case and diacritic-stripped form, for comparing text caselessly. */
export function foldText(text: string): string {
  return foldMapped(text).text
}

/**
 * Indices into `labels` of every label containing the query, in original
 * order. A whitespace-only query selects everything.
 */
export function filterIndices(labels: readonly string[], query: string): number[] {
  const needle = foldText(query.trim())
  if (!needle) return labels.map((_, index) => index)
  const indices: number[] = []
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index]
    if (label !== undefined && foldText(label).includes(needle)) indices.push(index)
  }
  return indices
}

/**
 * Split `label` into matched and unmatched segments around every
 * non-overlapping occurrence of the query — the input for rendering a match
 * highlight. Null when there is nothing to highlight: no match, or a
 * whitespace-only query.
 */
export function matchSegments(label: string, query: string): FilterSegment[] | null {
  const needle = foldText(query.trim())
  if (!needle) return null
  const { text, ends } = foldMapped(label)

  const segments: FilterSegment[] = []
  let from = 0
  let fromOriginal = 0
  for (;;) {
    const at = text.indexOf(needle, from)
    if (at === -1) break
    const start = at > 0 ? (ends[at - 1] ?? 0) : 0
    const end = ends[at + needle.length - 1] ?? label.length
    if (start > fromOriginal) segments.push({ text: label.slice(fromOriginal, start), matched: false })
    segments.push({ text: label.slice(start, end), matched: true })
    from = at + needle.length
    fromOriginal = end
  }
  if (segments.length === 0) return null
  if (fromOriginal < label.length) segments.push({ text: label.slice(fromOriginal), matched: false })
  return segments
}
