import { describe, expect, it } from 'vitest';
import {
  dedupeSubsetCombinations,
  isStrictSubset,
} from '../src/analyzer/dedupe.js';
import type { ClassCombination } from '../src/parser/types.js';

function combo(
  classes: string[],
  occurrences: number,
): ClassCombination {
  return {
    normalized: classes.join(' '),
    classes,
    occurrences,
    suggestion: '.test',
    locations: [],
  };
}

describe('dedupe', () => {
  it('detects strict subsets', () => {
    expect(isStrictSubset(['flex', 'p-4'], ['flex', 'p-4', 'gap-2'])).toBe(
      true,
    );
    expect(isStrictSubset(['flex', 'p-4'], ['flex', 'p-4'])).toBe(false);
  });

  it('removes subset combinations when a superset is present', () => {
    const input = [
      combo(['flex', 'items-center', 'p-4'], 8),
      combo(['flex', 'p-4'], 8),
      combo(['w-full', 'h-auto'], 6),
    ];

    const result = dedupeSubsetCombinations(input);
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.normalized)).toEqual([
      'flex items-center p-4',
      'w-full h-auto',
    ]);
  });
});
