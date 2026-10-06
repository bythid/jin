import { describe, expect, it } from 'vitest'

import { filterIndices, foldText, matchSegments } from '../src/core/filter'

describe('foldText', () => {
  it('lower-cases', () => {
    expect(foldText('CaskaydiaCove')).toBe('caskaydiacove')
  })

  it('strips diacritics', () => {
    expect(foldText('Café')).toBe('cafe')
  })

  it('leaves text without accents alone', () => {
    expect(foldText('Consolas 42')).toBe('consolas 42')
  })
})

describe('filterIndices', () => {
  const labels = ['Arial', 'Cascadia Code', 'CaskaydiaCove Nerd Font', 'Consolas']

  it('matches a substring case-insensitively and keeps order', () => {
    expect(filterIndices(labels, 'cask')).toEqual([2])
    expect(filterIndices(labels, 'CA')).toEqual([1, 2])
    expect(filterIndices(labels, 'ARIA')).toEqual([0])
  })

  it('matches anywhere in the label, not just at the start', () => {
    expect(filterIndices(labels, 'nerd')).toEqual([2])
  })

  it('ignores surrounding whitespace in the query', () => {
    expect(filterIndices(labels, '  cask ')).toEqual([2])
  })

  it('selects everything for a whitespace-only query', () => {
    expect(filterIndices(labels, '')).toEqual([0, 1, 2, 3])
    expect(filterIndices(labels, '   ')).toEqual([0, 1, 2, 3])
  })

  it('is diacritic-insensitive in both directions', () => {
    const accented = ['Café', 'Creme', 'Déjà Vu']
    expect(filterIndices(accented, 'cafe')).toEqual([0])
    expect(filterIndices(accented, 'café')).toEqual([0])
    expect(filterIndices(accented, 'deja')).toEqual([2])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterIndices(labels, 'mono')).toEqual([])
  })
})

describe('matchSegments', () => {
  it('splits a label around the first match', () => {
    expect(matchSegments('CaskaydiaCove Nerd Font', 'cove')).toEqual([
      { text: 'Caskaydia', matched: false },
      { text: 'Cove', matched: true },
      { text: ' Nerd Font', matched: false },
    ])
  })

  it('marks every non-overlapping occurrence', () => {
    expect(matchSegments('abcabc', 'b')).toEqual([
      { text: 'a', matched: false },
      { text: 'b', matched: true },
      { text: 'ca', matched: false },
      { text: 'b', matched: true },
      { text: 'c', matched: false },
    ])
  })

  it('slices the original label, not the folded one', () => {
    // The match sits on folded characters that came from one accented original.
    expect(matchSegments('Café au lait', 'fe')).toEqual([
      { text: 'Ca', matched: false },
      { text: 'fé', matched: true },
      { text: ' au lait', matched: false },
    ])
  })

  it('returns a whole-label single segment for a full match', () => {
    expect(matchSegments('Arial', 'arial')).toEqual([{ text: 'Arial', matched: true }])
  })

  it('returns null when there is nothing to highlight', () => {
    expect(matchSegments('Arial', 'mono')).toBeNull()
    expect(matchSegments('Arial', '')).toBeNull()
    expect(matchSegments('Arial', '   ')).toBeNull()
  })

  it('matches case- and diacritic-insensitively but keeps original casing in segments', () => {
    expect(matchSegments('Cascadia Code', 'CODE')).toEqual([
      { text: 'Cascadia ', matched: false },
      { text: 'Code', matched: true },
    ])
  })
})
