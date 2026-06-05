import type { ClassCombination } from '../parser/types.js';

/** True when every class in `smaller` is also present in `larger`. */
export function isStrictSubset(smaller: string[], larger: string[]): boolean {
  if (smaller.length >= larger.length) {
    return false;
  }

  const largerSet = new Set(larger);
  return smaller.every((cls) => largerSet.has(cls));
}

/**
 * Drop subset combinations when a strict superset is already in the list
 * (e.g. drop "flex p-4" when "flex items-center p-4" is present).
 */
export function dedupeSubsetCombinations(
  combinations: ClassCombination[],
): ClassCombination[] {
  return combinations.filter((combo) => {
    return !combinations.some(
      (other) =>
        other.normalized !== combo.normalized &&
        isStrictSubset(combo.classes, other.classes),
    );
  });
}
