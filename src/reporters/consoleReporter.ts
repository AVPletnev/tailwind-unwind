import chalk from 'chalk';
import type { AnalysisReport } from '../parser/types.js';
import { normalizeClasses } from '../analyzer/combiner.js';

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Render the analysis report to stdout with colors and the layout from the spec.
 */
export function printConsoleReport(report: AnalysisReport): void {
  const { stats } = report;

  console.log('');
  console.log(chalk.bold.cyan('📊 Tailwind Analysis Report'));
  console.log(chalk.cyan('━'.repeat(41)));
  console.log(`Files scanned: ${chalk.white(formatNumber(stats.filesScanned))}`);
  console.log(
    `Components with className: ${chalk.white(formatNumber(stats.componentsWithClassName))}`,
  );
  console.log(
    `Unique class combinations: ${chalk.white(formatNumber(stats.uniqueCombinations))}`,
  );
  console.log('');

  if (stats.topCombinations.length === 0) {
    console.log(
      chalk.yellow(
        'No frequent class combinations found (need > 5 occurrences, 2–5 classes each).',
      ),
    );
  } else {
    console.log(chalk.bold.green('🏆 Top 10 most frequent combinations:'));
    console.log('');

    stats.topCombinations.forEach((combo, index) => {
      const displayClasses = normalizeClasses(combo.classes);
      console.log(
        chalk.white(`${index + 1}. `) +
          chalk.yellow(`"${displayClasses}"`),
      );
      console.log(
        chalk.gray(`   Occurrences: `) + chalk.white(String(combo.occurrences)),
      );
      console.log(
        chalk.gray(`   Suggestion: `) + chalk.green(combo.suggestion),
      );
      console.log('');
    });
  }

  console.log(
    chalk.magenta(
      `💡 Potential code reduction: ${stats.potentialReductionPercent}%`,
    ),
  );
  console.log(
    chalk.magenta(
      '💡 Upgrade to premium: npx tailwind-unwind generate <path> --output styles.css',
    ),
  );
  console.log('');
}
