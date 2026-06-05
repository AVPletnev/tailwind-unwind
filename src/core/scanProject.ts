import fs from 'node:fs/promises';
import path from 'node:path';
import {
  calculatePotentialReduction,
  findFrequentPatterns,
  type PatternFinderOptions,
} from '../analyzer/patternFinder.js';
import { normalizeClasses } from '../analyzer/combiner.js';
import { parseFile } from '../parser/jsxParser.js';
import type {
  AnalysisReport,
  ClassNameOccurrence,
} from '../parser/types.js';
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

  const files = await walkSourceFiles(resolvedPath);

  if (files.length === 0) {
    throw new Error(
      `No source files (.tsx, .jsx, .ts, .js) found in: ${resolvedPath}`,
    );
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

  const topCombinations = findFrequentPatterns(occurrences, {
    minOccurrences: options.minOccurrences,
    minSize: options.minSize,
    maxSize: options.maxSize,
    topLimit: options.topLimit,
    dedupeSubsets: options.dedupeSubsets,
  });

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
