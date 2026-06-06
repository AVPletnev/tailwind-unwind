import chalk from 'chalk';
import type { SkippedReplacement } from '../codemod/replaceClassNames.js';

export interface SkippedSummary {
  reason: string;
  count: number;
  items: SkippedReplacement[];
}

export function groupSkippedByReason(
  skipped: SkippedReplacement[],
): SkippedSummary[] {
  const groups = new Map<string, SkippedReplacement[]>();

  for (const item of skipped) {
    const bucket = groups.get(item.reason) ?? [];
    bucket.push(item);
    groups.set(item.reason, bucket);
  }

  return [...groups.entries()]
    .map(([reason, items]) => ({
      reason,
      count: items.length,
      items,
    }))
    .sort((left, right) => right.count - left.count);
}

export function printSkippedReport(
  skipped: SkippedReplacement[],
  options: { verbose?: boolean } = {},
): void {
  if (skipped.length === 0) {
    return;
  }

  const groups = groupSkippedByReason(skipped);

  console.log('');
  console.log(chalk.bold.yellow(`Skipped (${skipped.length}):`));

  if (options.verbose) {
    for (const item of skipped) {
      const line = item.line ? `:${item.line}` : '';
      console.log(
        chalk.gray(`  ${item.filePath}${line}`) +
          chalk.yellow(` [${item.reason}]`) +
          chalk.dim(` "${item.classes.join(' ')}"`),
      );
    }
    return;
  }

  for (const group of groups) {
    console.log(
      chalk.yellow(`  ${group.reason}: `) + chalk.white(String(group.count)),
    );
    const preview = group.items.slice(0, 2);
    for (const item of preview) {
      const line = item.line ? `:${item.line}` : '';
      console.log(
        chalk.gray(`    ${item.filePath}${line}`) +
          chalk.dim(` "${item.classes.join(' ')}"`),
      );
    }
    if (group.items.length > 2) {
      console.log(
        chalk.dim(`    (+${group.items.length - 2} more with same reason)`),
      );
    }
  }

  console.log(chalk.dim('  Use --verbose-skipped to list every skipped location.'));
}
