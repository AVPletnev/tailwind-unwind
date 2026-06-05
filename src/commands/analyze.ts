import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import {
  calculatePotentialReduction,
  findFrequentPatterns,
} from '../analyzer/patternFinder.js';
import { normalizeClasses } from '../analyzer/combiner.js';
import { parseFile } from '../parser/jsxParser.js';
import type { AnalysisReport } from '../parser/types.js';
import { walkSourceFiles } from '../scanner/fileWalker.js';
import { printConsoleReport } from '../reporters/consoleReporter.js';

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
export async function analyzeCommand(targetPath: string): Promise<void> {
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

  const classSets: string[][] = [];
  const allWarnings: string[] = [];
  let componentsWithClassName = 0;

  for (const file of files) {
    const result = await parseFile(file);
    allWarnings.push(...result.warnings);

    for (const extraction of result.extractions) {
      if (extraction.classes.length > 0) {
        componentsWithClassName += 1;
        classSets.push(extraction.classes);
      }
    }
  }

  for (const warning of allWarnings) {
    console.warn(chalk.yellow(`⚠ ${warning}`));
  }

  const uniqueCombinationKeys = new Set(
    classSets.map((set) => normalizeClasses([...new Set(set)])),
  );

  const topCombinations = findFrequentPatterns(classSets);
  const potentialReductionPercent = calculatePotentialReduction(
    classSets,
    topCombinations,
  );

  const report: AnalysisReport = {
    targetPath: resolvedPath,
    stats: {
      filesScanned: files.length,
      componentsWithClassName,
      uniqueCombinations: uniqueCombinationKeys.size,
      totalClassUsages: classSets.reduce((sum, set) => sum + set.length, 0),
      topCombinations,
      potentialReductionPercent,
    },
    parseWarnings: allWarnings,
  };

  printConsoleReport(report);
}
