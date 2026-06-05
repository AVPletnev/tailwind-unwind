/**
 * Normalize a class list so order does not affect identity.
 * "flex p-4" and "p-4 flex" produce the same key.
 */
export function normalizeClasses(classes: string[]): string {
  return [...classes].sort().join(' ');
}

/** Split a className string into individual Tailwind tokens. */
export function splitClassString(classString: string): string[] {
  return classString
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Generate every combination of size `size` from `classes` (order preserved in output,
 * but callers should normalize before counting).
 */
export function generateCombinations(
  classes: string[],
  size: number,
): string[][] {
  if (size < 1 || size > classes.length) {
    return [];
  }

  const results: string[][] = [];

  const backtrack = (start: number, current: string[]): void => {
    if (current.length === size) {
      results.push([...current]);
      return;
    }

    for (let i = start; i <= classes.length - (size - current.length); i += 1) {
      const item = classes[i];
      if (item !== undefined) {
        current.push(item);
        backtrack(i + 1, current);
        current.pop();
      }
    }
  };

  backtrack(0, []);
  return results;
}
