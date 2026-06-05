import { describe, expect, it } from 'vitest';
import { findFrequentPatterns } from '../src/analyzer/patternFinder.js';
import type { ClassNameOccurrence } from '../src/parser/types.js';

function occurrence(
  classes: string[],
  filePath: string,
  line = 1,
): ClassNameOccurrence {
  return { classes, filePath, line };
}

describe('patternFinder', () => {
  const repeated: ClassNameOccurrence[] = Array.from({ length: 8 }, (_, i) =>
    occurrence(
      ['flex', 'items-center', 'justify-between', 'p-4'],
      `file-${i}.tsx`,
      i + 1,
    ),
  );

  it('finds frequent combinations above threshold', () => {
    const patterns = findFrequentPatterns(repeated, {
      minOccurrences: 5,
      dedupeSubsets: false,
    });

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]?.occurrences).toBe(8);
  });

  it('deduplicates subset combinations by default', () => {
    const patterns = findFrequentPatterns(repeated, {
      minOccurrences: 5,
      dedupeSubsets: true,
    });

    const hasSubsetOnly = patterns.every(
      (pattern) => pattern.classes.length >= 3,
    );
    expect(hasSubsetOnly).toBe(true);
    expect(patterns[0]?.classes).toEqual([
      'flex',
      'items-center',
      'justify-between',
      'p-4',
    ]);
  });

  it('tracks file locations for each combination', () => {
    const patterns = findFrequentPatterns(repeated, {
      minOccurrences: 5,
      dedupeSubsets: true,
      topLimit: 1,
    });

    expect(patterns[0]?.locations.length).toBeGreaterThan(0);
    expect(patterns[0]?.locations[0]?.filePath).toMatch(/^file-\d+\.tsx$/);
  });

  it('respects min-size and max-size filters', () => {
    const patterns = findFrequentPatterns(repeated, {
      minOccurrences: 5,
      minSize: 4,
      maxSize: 4,
      dedupeSubsets: false,
      topLimit: 5,
    });

    expect(patterns.every((pattern) => pattern.classes.length === 4)).toBe(true);
  });
});
