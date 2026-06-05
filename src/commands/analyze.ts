import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import {
  calculatePotentialReduction,
  findFrequentPatterns,
} from '../analyzer/patternFinder.js';
import { normalizeClasses } from '../analyzer/combiner.js';
import { parseFile } from '../parser/jsxParser.js';
import type {
  AnalysisReport,
  AnalyzeOptions,
  ClassNameOccurrence,
} from '../parser/types.js';
import { walkSourceFiles } from '../scanner/fileWalker.js';
import { printConsoleReport } from '../reporters/consoleReporter.js';
import { printJsonReport } from '../reporters/jsonReporter.js';

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Run the full analyze pipeline: scan → parse → find patterns → report.
 */
export async function analyzeCommand(
  targetPath: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisReport> {
  const resolvedPath = path.resolve(targetPath);

  if (!(await pathExists(resolvedPath))) {
    console.error(chalk.red(`Error: Path does not exist: ${resolvedPath}`));
    process.exit(1);
  }

  const files = await walkSourceFiles(resolvedPath);

  if (files.length === 0) {
    console.error(
      chalk.yellow(
        `No source files (.tsx, .jsx, .ts, .js) found in: ${resolvedPath}`,
      ),
    );
    process.exit(1);
  }

  const occurrences: ClassNameOccurrence[] = [];
  const allWarnings: string[] = [];

  for (const file of files) {
    const result = await parseFile(file);
    allWarnings.push(...result.warnings);

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

  if (options.format !== 'json') {
    for (const warning of allWarnings) {
      console.warn(chalk.yellow(`⚠ ${warning}`));
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
    topLimit: options.top,
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
    parseWarnings: allWarnings,
  };

  if (options.format === 'json') {
    printJsonReport(report);
  } else {
    printConsoleReport(report, { topLimit: options.top });
  }

  return report;
}
