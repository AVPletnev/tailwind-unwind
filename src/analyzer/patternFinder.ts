import type { ClassCombination } from '../parser/types.js';
import { generateCombinations, normalizeClasses } from './combiner.js';

const MIN_COMBINATION_SIZE = 2;
const MAX_COMBINATION_SIZE = 5;
const MIN_OCCURRENCES = 5;
const TOP_LIMIT = 10;

/** Heuristic: turn a class combo into a suggested CSS class name. */
function suggestClassName(classes: string[]): string {
  const keywords = classes
    .map((cls) =>
      cls
        .replace(/^(sm|md|lg|xl|2xl):/g, '')
        .replace(/[^a-z0-9-]/gi, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean);

  const unique = [...new Set(keywords)].slice(0, 3);
  const base = unique.join('-') || 'component';
  return `.${base}`;
}

interface PatternFinderOptions {
  minOccurrences?: number;
  topLimit?: number;
}

/**
 * From every className occurrence, enumerate 2–5 class subsets,
 * count normalized combinations, and return the most frequent ones.
 */
export function findFrequentPatterns(
  classSets: string[][],
  options: PatternFinderOptions = {},
): ClassCombination[] {
  const minOccurrences = options.minOccurrences ?? MIN_OCCURRENCES;
  const topLimit = options.topLimit ?? TOP_LIMIT;

  const frequency = new Map<string, { classes: string[]; count: number }>();

  for (const classSet of classSets) {
    const uniqueInElement = [...new Set(classSet)];

    if (uniqueInElement.length < MIN_COMBINATION_SIZE) {
      continue;
    }

    const maxSize = Math.min(MAX_COMBINATION_SIZE, uniqueInElement.length);

    for (let size = MIN_COMBINATION_SIZE; size <= maxSize; size += 1) {
      const combos = generateCombinations(uniqueInElement, size);

      for (const combo of combos) {
        const normalized = normalizeClasses(combo);
        const existing = frequency.get(normalized);

        if (existing) {
          existing.count += 1;
        } else {
          frequency.set(normalized, {
            classes: [...combo].sort(),
            count: 1,
          });
        }
      }
    }
  }

  const frequent = [...frequency.entries()]
    .filter(([, value]) => value.count > minOccurrences)
    .map(([normalized, value]) => ({
      normalized,
      classes: value.classes,
      occurrences: value.count,
      suggestion: suggestClassName(value.classes),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, topLimit);

  return frequent;
}

/**
 * Estimate how much repeated utility usage could be collapsed into components.
 * Uses the best full combination: each redundant instance could replace N utilities with 1.
 */
export function calculatePotentialReduction(
  classSets: string[][],
  topCombinations: ClassCombination[],
): number {
  const totalClassUsages = classSets.reduce((sum, set) => sum + set.length, 0);

  if (totalClassUsages === 0 || topCombinations.length === 0) {
    return 0;
  }

  const best = [...topCombinations].sort((a, b) => {
    if (b.classes.length !== a.classes.length) {
      return b.classes.length - a.classes.length;
    }
    return b.occurrences - a.occurrences;
  })[0];

  if (!best || best.occurrences <= 1 || best.classes.length < 2) {
    return 0;
  }

  const redundantInstances = best.occurrences - 1;
  const utilitiesSavedPerInstance = best.classes.length - 1;
  const savable = redundantInstances * utilitiesSavedPerInstance;

  return Math.min(100, Math.round((savable / totalClassUsages) * 100));
}
