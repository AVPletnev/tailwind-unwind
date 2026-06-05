import { findRepeatedClassSets } from '../analyzer/patternFinder.js';
import {
  assignComponentClassNames,
  generateComponentCss,
  type GeneratedComponent,
} from '../generator/cssGenerator.js';
import type { ClassNameOccurrence } from '../parser/types.js';
import type { PatternFinderOptions } from '../analyzer/patternFinder.js';

export interface BuildComponentsOptions extends PatternFinderOptions {
  sourcePath: string;
  prefix?: string;
}

export interface BuildComponentsResult {
  components: GeneratedComponent[];
  css: string;
  replacementMap: Map<string, string>;
}

/** Build component classes, CSS, and a normalized-class → name lookup map. */
export function buildComponents(
  occurrences: ClassNameOccurrence[],
  options: BuildComponentsOptions,
): BuildComponentsResult {
  const combinations = findRepeatedClassSets(occurrences, {
    minOccurrences: options.minOccurrences,
    minSize: options.minSize,
    maxSize: options.maxSize,
    topLimit: options.topLimit,
  });

  const { css, components } = generateComponentCss({
    sourcePath: options.sourcePath,
    combinations,
    prefix: options.prefix,
  });

  const replacementMap = new Map<string, string>();

  for (const component of components) {
    const key = [...component.classes].sort().join(' ');
    replacementMap.set(key, component.className);
  }

  return { components, css, replacementMap };
}
