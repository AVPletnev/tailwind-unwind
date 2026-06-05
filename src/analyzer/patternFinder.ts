import type {
  ClassCombination,
  ClassNameOccurrence,
  CombinationLocation,
} from '../parser/types.js';
import { dedupeSubsetCombinations } from './dedupe.js';
import { generateCombinations, normalizeClasses } from './combiner.js';

const DEFAULT_MIN_COMBINATION_SIZE = 2;
const DEFAULT_MAX_COMBINATION_SIZE = 5;
const DEFAULT_MIN_OCCURRENCES = 5;
const DEFAULT_TOP_LIMIT = 10;

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

export interface PatternFinderOptions {
  minOccurrences?: number;
  minSize?: number;
  maxSize?: number;
  topLimit?: number;
  dedupeSubsets?: boolean;
}

interface FrequencyEntry {
  classes: string[];
  count: number;
  locations: CombinationLocation[];
}

function locationKey(location: CombinationLocation): string {
  return `${location.filePath}:${location.line ?? 0}`;
}

/**
 * From every className occurrence, enumerate class subsets,
 * count normalized combinations, and return the most frequent ones.
 */
export function findFrequentPatterns(
  occurrences: ClassNameOccurrence[],
  options: PatternFinderOptions = {},
): ClassCombination[] {
  const minOccurrences = options.minOccurrences ?? DEFAULT_MIN_OCCURRENCES;
  const minSize = options.minSize ?? DEFAULT_MIN_COMBINATION_SIZE;
  const maxSize = options.maxSize ?? DEFAULT_MAX_COMBINATION_SIZE;
  const topLimit = options.topLimit ?? DEFAULT_TOP_LIMIT;
  const dedupeSubsets = options.dedupeSubsets ?? true;

  const frequency = new Map<string, FrequencyEntry>();

  for (const occurrence of occurrences) {
    const uniqueInElement = [...new Set(occurrence.classes)];

    if (uniqueInElement.length < minSize) {
      continue;
    }

    const location: CombinationLocation = {
      filePath: occurrence.filePath,
      line: occurrence.line,
    };

    const cappedMaxSize = Math.min(maxSize, uniqueInElement.length);

    for (let size = minSize; size <= cappedMaxSize; size += 1) {
      const combos = generateCombinations(uniqueInElement, size);

      for (const combo of combos) {
        const normalized = normalizeClasses(combo);
        const existing = frequency.get(normalized);

        if (existing) {
          existing.count += 1;
          const key = locationKey(location);
          if (!existing.locations.some((loc) => locationKey(loc) === key)) {
            existing.locations.push(location);
          }
        } else {
          frequency.set(normalized, {
            classes: [...combo].sort(),
            count: 1,
            locations: [location],
          });
        }
      }
    }
  }

  let frequent = [...frequency.entries()]
    .filter(([, value]) => value.count > minOccurrences)
    .map(([normalized, value]) => ({
      normalized,
      classes: value.classes,
      occurrences: value.count,
      suggestion: suggestClassName(value.classes),
      locations: value.locations,
    }))
    .sort((a, b) => {
      if (b.occurrences !== a.occurrences) {
        return b.occurrences - a.occurrences;
      }
      return b.classes.length - a.classes.length;
    });

  if (dedupeSubsets) {
    frequent = dedupeSubsetCombinations(frequent);
  }

  return frequent.slice(0, topLimit);
}

/**
 * Estimate how much repeated utility usage could be collapsed into components.
 * Uses the best full combination: each redundant instance could replace N utilities with 1.
 */
export function calculatePotentialReduction(
  occurrences: ClassNameOccurrence[],
  topCombinations: ClassCombination[],
): number {
  const totalClassUsages = occurrences.reduce(
    (sum, occurrence) => sum + occurrence.classes.length,
    0,
  );

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
