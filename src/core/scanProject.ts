import fs from 'node:fs/promises';
import path from 'node:path';
import {
  calculatePotentialReduction,
  findFrequentPatterns,
  findRepeatedClassSets,
  type PatternFinderOptions,
} from '../analyzer/patternFinder.js';
import { normalizeClasses } from '../analyzer/combiner.js';
import { parseFile } from '../parser/jsxParser.js';
import type {
  AnalysisReport,
  ClassNameOccurrence,
} from '../parser/types.js';
import { getChangedFilesInScope } from '../scanner/gitChanged.js';
import { walkSourceFiles } from '../scanner/fileWalker.js';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export interface ScanProjectOptions extends PatternFinderOptions {
  targetPath: string;
  include?: string[];
  exclude?: string[];
  /** Threshold used to mark combinations as extractable by generate/apply */
  extractableMinOccurrences?: number;
  /** Scan only git-changed files; string value is the git ref to diff against */
  changed?: boolean | string;
}

export interface ScanProjectResult {
  resolvedPath: string;
  files: string[];
  occurrences: ClassNameOccurrence[];
  warnings: string[];
  report: AnalysisReport;
}

/**
 * Scan a directory, parse className usage, and build an analysis report.
 */
export async function scanProject(
  options: ScanProjectOptions,
): Promise<ScanProjectResult> {
  const resolvedPath = path.resolve(options.targetPath);

  if (!(await pathExists(resolvedPath))) {
    throw new Error(`Path does not exist: ${resolvedPath}`);
  }

  let files: string[];

  if (options.changed !== undefined) {
    const ref = typeof options.changed === 'string' ? options.changed : 'HEAD';
    files = await getChangedFilesInScope(resolvedPath, ref);
  } else {
    files = await walkSourceFiles(resolvedPath, {
      include: options.include,
      exclude: options.exclude,
    });
  }

  if (files.length === 0) {
    const hint =
      options.changed !== undefined
        ? 'No changed source files found for the current git diff.'
        : `No source files (.tsx, .jsx, .ts, .js) found in: ${resolvedPath}`;
    throw new Error(hint);
  }

  const occurrences: ClassNameOccurrence[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    const result = await parseFile(file);
    warnings.push(...result.warnings);

    for (const extraction of result.extractions) {
      if (extraction.classes.length > 0) {
        occurrences.push({
          classes: extraction.classes,
          filePath: file,
          line: extraction.line,
        });
      }
    }
  }

  const uniqueCombinationKeys = new Set(
    occurrences.map((occurrence) =>
      normalizeClasses([...new Set(occurrence.classes)]),
    ),
  );

  const frequentCombinations = findFrequentPatterns(occurrences, {
    minOccurrences: options.minOccurrences,
    minSize: options.minSize,
    maxSize: options.maxSize,
    topLimit: options.topLimit,
    dedupeSubsets: options.dedupeSubsets,
  });

  const extractableSets = findRepeatedClassSets(occurrences, {
    minOccurrences: options.extractableMinOccurrences ?? 3,
    minSize: options.minSize,
    maxSize: options.maxSize,
    topLimit: Number.POSITIVE_INFINITY,
  });
  const extractableKeys = new Set(
    extractableSets.map((combo) => combo.normalized),
  );

  const topCombinations = frequentCombinations.map((combo) => ({
    ...combo,
    extractable: extractableKeys.has(combo.normalized),
  }));

  const potentialReductionPercent = calculatePotentialReduction(
    occurrences,
    topCombinations,
  );

  const report: AnalysisReport = {
    targetPath: resolvedPath,
    stats: {
      filesScanned: files.length,
      componentsWithClassName: occurrences.length,
      uniqueCombinations: uniqueCombinationKeys.size,
      totalClassUsages: occurrences.reduce(
        (sum, occurrence) => sum + occurrence.classes.length,
        0,
      ),
      topCombinations,
      potentialReductionPercent,
    },
    parseWarnings: warnings,
  };

  return {
    resolvedPath,
    files,
    occurrences,
    warnings,
    report,
  };
}
