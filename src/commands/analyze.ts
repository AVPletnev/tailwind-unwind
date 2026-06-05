import chalk from 'chalk';
import { scanProject } from '../core/scanProject.js';
import type { AnalysisReport, AnalyzeOptions } from '../parser/types.js';
import { printConsoleReport } from '../reporters/consoleReporter.js';
import { printJsonReport } from '../reporters/jsonReporter.js';

/**
 * Run the full analyze pipeline: scan → parse → find patterns → report.
 */
export async function analyzeCommand(
  targetPath: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisReport> {
  let scanResult;

  try {
    scanResult = await scanProject({
      targetPath,
      minOccurrences: options.minOccurrences,
      minSize: options.minSize,
      maxSize: options.maxSize,
      topLimit: options.top,
      dedupeSubsets: options.dedupeSubsets,
      include: options.include,
      exclude: options.exclude,
      extractableMinOccurrences: 3,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  if (options.format !== 'json') {
    for (const warning of scanResult.warnings) {
      console.warn(chalk.yellow(`⚠ ${warning}`));
    }
  }

  const report = scanResult.report;

  if (options.format === 'json') {
    printJsonReport(report);
  } else {
    printConsoleReport(report, { topLimit: options.top });
  }

  return report;
}
