import { describe, expect, it } from 'vitest';
import {
  generateCombinations,
  normalizeClasses,
  splitClassString,
} from '../src/analyzer/combiner.js';

describe('combiner', () => {
  it('normalizes class order', () => {
    expect(normalizeClasses(['flex', 'p-4'])).toBe('flex p-4');
    expect(normalizeClasses(['p-4', 'flex'])).toBe('flex p-4');
  });

  it('splits class strings', () => {
    expect(splitClassString('  flex   p-4  ')).toEqual(['flex', 'p-4']);
  });

  it('generates combinations of a given size', () => {
    const combos = generateCombinations(['a', 'b', 'c'], 2);
    expect(combos).toHaveLength(3);
    expect(combos).toContainEqual(['a', 'b']);
    expect(combos).toContainEqual(['a', 'c']);
    expect(combos).toContainEqual(['b', 'c']);
  });
});
