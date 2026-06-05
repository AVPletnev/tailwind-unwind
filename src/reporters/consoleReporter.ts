import chalk from 'chalk';
import type { AnalysisReport } from '../parser/types.js';
import { normalizeClasses } from '../analyzer/combiner.js';

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function formatLocations(
  locations: AnalysisReport['stats']['topCombinations'][number]['locations'],
): string {
  const preview = locations.slice(0, 3).map((loc) => {
    const line = loc.line ? `:${loc.line}` : '';
    return `${loc.filePath}${line}`;
  });

  const suffix =
    locations.length > 3 ? ` (+${locations.length - 3} more)` : '';

  return preview.join(', ') + suffix;
}

interface ConsoleReportOptions {
  topLimit?: number;
}

/**
 * Render the analysis report to stdout with colors and the layout from the spec.
 */
export function printConsoleReport(
  report: AnalysisReport,
  options: ConsoleReportOptions = {},
): void {
  const { stats } = report;
  const topLimit = options.topLimit ?? 10;

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
        'No frequent class combinations found matching the current filters.',
      ),
    );
  } else {
    console.log(
      chalk.bold.green(`🏆 Top ${Math.min(topLimit, stats.topCombinations.length)} most frequent combinations:`),
    );
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
      console.log(
        chalk.gray(`   Found in: `) + chalk.dim(formatLocations(combo.locations)),
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
