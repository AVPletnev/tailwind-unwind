import { describe, expect, it } from 'vitest';
import { findRepeatedClassSets } from '../src/analyzer/patternFinder.js';
import type { ClassNameOccurrence } from '../src/parser/types.js';

function occurrence(
  classes: string[],
  filePath: string,
): ClassNameOccurrence {
  return { classes, filePath, line: 1 };
}

describe('findRepeatedClassSets', () => {
  it('finds exact duplicate className sets, not subsets', () => {
    const occurrences = [
      ...Array.from({ length: 8 }, (_, i) =>
        occurrence(
          ['flex', 'items-center', 'justify-between', 'p-4'],
          `header-${i}.tsx`,
        ),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        occurrence(
          ['w-full', 'h-auto', 'object-cover', 'rounded-lg'],
          `media-${i}.tsx`,
        ),
      ),
    ];

    const sets = findRepeatedClassSets(occurrences, {
      minOccurrences: 3,
      topLimit: 10,
    });

    expect(sets).toHaveLength(2);
    expect(sets[0]?.classes).toEqual([
      'flex',
      'items-center',
      'justify-between',
      'p-4',
    ]);
    expect(sets[0]?.occurrences).toBe(8);
    expect(sets[1]?.classes).toEqual([
      'h-auto',
      'object-cover',
      'rounded-lg',
      'w-full',
    ]);
    expect(sets[1]?.occurrences).toBe(3);
  });

  it('includes long className sets when maxSize is not set', () => {
    const buttonClasses = [
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'rounded-md',
      'px-4',
      'py-2',
      'text-sm',
      'font-medium',
      'transition-colors',
    ];

    const occurrences = Array.from({ length: 4 }, (_, i) =>
      occurrence(buttonClasses, `button-${i}.tsx`),
    );

    const sets = findRepeatedClassSets(occurrences, {
      minOccurrences: 3,
    });

    expect(sets).toHaveLength(1);
    expect(sets[0]?.classes).toEqual([...buttonClasses].sort());
    expect(sets[0]?.occurrences).toBe(4);
  });
});
