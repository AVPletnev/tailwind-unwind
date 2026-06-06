import chalk from 'chalk';
import type { ApplyResult } from '../commands/apply.js';
import type { AnalysisReport } from '../parser/types.js';
import { normalizeClasses } from '../analyzer/combiner.js';
import { printSkippedReport } from './skippedReporter.js';

export interface CheckJsonReport {
  command: 'check';
  passed: boolean;
  outputPath: string;
  extractablePatternCount: number;
  analyzeMinOccurrences: number;
  extractableMinOccurrences: number;
  report: AnalysisReport;
  preview: {
    componentsGenerated: number;
    filesModified: number;
    replacementsTotal: number;
    skippedTotal: number;
    savings: ApplyResult['savings'];
  } | null;
}

export function printCheckJsonReport(report: CheckJsonReport): void {
  console.log(JSON.stringify(report, null, 2));
}

interface CheckConsoleOptions {
  outputPath: string;
  topLimit?: number;
  preview?: ApplyResult | null;
  verboseSkipped?: boolean;
  passed: boolean;
}

export function printCheckConsoleReport(
  analysisReport: AnalysisReport,
  options: CheckConsoleOptions,
): void {
  const { stats } = analysisReport;
  const topLimit = options.topLimit ?? 5;
  const extractableInTop = stats.topCombinations.filter(
    (combo) => combo.extractable,
  ).length;

  console.log('');
  console.log(chalk.bold.cyan('✓ Tailwind check'));
  console.log(chalk.cyan('━'.repeat(41)));
  console.log(`Files scanned: ${chalk.white(String(stats.filesScanned))}`);
  console.log(
    `Extractable patterns: ${chalk.white(String(stats.extractablePatternCount))}` +
      chalk.gray(' (exact duplicates ready for generate/apply)'),
  );

  if (stats.analyzeMinOccurrences !== stats.extractableMinOccurrences) {
    console.log('');
    console.log(
      chalk.yellow(
        `Note: analyze lists patterns with ≥${stats.analyzeMinOccurrences} occurrences; ` +
          `generate/apply extract exact duplicates with ≥${stats.extractableMinOccurrences}.`,
      ),
    );
    if (stats.extractablePatternCount > extractableInTop) {
      console.log(
        chalk.yellow(
          `      ${stats.extractablePatternCount - extractableInTop} more extractable pattern(s) exist below the analyze threshold.`,
        ),
      );
    }
  }

  if (stats.extractablePatternCount === 0) {
    console.log('');
    console.log(
      chalk.green('No extractable duplicates found. Nothing to refactor right now.'),
    );
    console.log('');
    console.log(options.passed ? chalk.green('Check passed.') : chalk.red('Check failed.'));
    console.log('');
    return;
  }

  const previewCount = Math.min(topLimit, stats.topCombinations.length);
  if (previewCount > 0) {
    console.log('');
    console.log(chalk.bold('Top extractable patterns:'));
    for (const combo of stats.topCombinations
      .filter((item) => item.extractable)
      .slice(0, topLimit)) {
      console.log(
        chalk.white(`  • "${normalizeClasses(combo.classes)}"`) +
          chalk.gray(` — ${combo.occurrences}× → `) +
          chalk.green(combo.suggestion),
      );
    }
  }

  if (options.preview) {
    const preview = options.preview;
    console.log('');
    console.log(chalk.bold('Apply preview (dry-run):'));
    console.log(
      chalk.gray('   CSS output: ') + chalk.white(options.outputPath),
    );
    console.log(
      chalk.gray('   Component classes: ') +
        chalk.white(String(preview.componentsGenerated)),
    );
    console.log(
      chalk.gray('   Files to modify: ') +
        chalk.white(String(preview.filesModified)),
    );
    console.log(
      chalk.gray('   Replacements: ') +
        chalk.white(String(preview.replacementsTotal)),
    );

    if (preview.savings.replacementCount > 0) {
      console.log(
        chalk.gray('   Token reduction: ') +
          chalk.green(`${preview.savings.percentReduction}%`),
      );
    }

    printSkippedReport(preview.skipped, {
      verbose: options.verboseSkipped,
    });
  }

  console.log('');
  if (options.passed) {
    console.log(chalk.green('Check passed.'));
  } else {
    console.log(chalk.red('Check failed.'));
  }

  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.white('  npx tailwind-unwind generate'));
  console.log(chalk.white('  npx tailwind-unwind apply --dry-run'));
  console.log('');
}
