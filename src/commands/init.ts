import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import {
  scanProjectWithSpinner,
  shouldShowProgress,
} from '../cli/spinner.js';
import type { ScanProjectResult } from '../core/scanProject.js';
import type { TailwindUnwindConfigFile } from '../config/types.js';
import type { AnalyzeOptions } from '../parser/types.js';

export interface InitOptions extends AnalyzeOptions {
  output?: string;
  force?: boolean;
}

export interface InitResult {
  configPath: string;
  extractablePatterns: number;
}

function suggestionToName(suggestion: string): string {
  return suggestion.replace(/^\./, '');
}

function detectIncludePattern(targetPath: string): string[] {
  const normalized = targetPath.replace(/\\/g, '/');
  if (normalized.endsWith('/src') || normalized === 'src') {
    return ['src/**/*.tsx', 'src/**/*.jsx'];
  }

  return ['**/*.tsx', '**/*.jsx'];
}

function buildConfigFromScan(
  scanResult: ScanProjectResult,
  targetPath: string,
  options: InitOptions,
): TailwindUnwindConfigFile {
  const extractable = scanResult.report.stats.topCombinations.filter(
    (combo) => combo.extractable,
  );

  const names: Record<string, string> = {};
  for (const combo of extractable.slice(0, options.top ?? 10)) {
    const utilities = [...combo.classes].sort().join(' ');
    names[utilities] = suggestionToName(combo.suggestion);
  }

  return {
    include: detectIncludePattern(targetPath),
    exclude: ['**/*.test.tsx', '**/*.stories.tsx'],
    names: Object.keys(names).length > 0 ? names : undefined,
    analyze: {
      minOccurrences: options.minOccurrences ?? 5,
      top: options.top ?? 10,
      dedupeSubsets: options.dedupeSubsets ?? true,
    },
    generate: {
      minOccurrences: 3,
      prefix: options.prefix ?? 'twu-',
      output: 'src/styles/components.css',
      top: 20,
      extractableOnly: true,
    },
    apply: {
      minOccurrences: 3,
      prefix: options.prefix ?? 'twu-',
      output: 'src/styles/components.css',
      prettier: true,
      extractableOnly: true,
    },
  };
}

/**
 * Scan a project and write a starter tailwind-unwind.config.json.
 */
export async function initCommand(
  targetPath: string,
  options: InitOptions = {},
): Promise<InitResult> {
  const resolvedPath = path.resolve(targetPath);
  const outputPath = path.resolve(
    options.output ?? path.join(resolvedPath, 'tailwind-unwind.config.json'),
  );

  if (!options.force && (await fileExists(outputPath))) {
    throw new Error(
      `Config already exists: ${outputPath}. Use --force to overwrite.`,
    );
  }

  const scanResult = await scanProjectWithSpinner(
    {
      targetPath: resolvedPath,
      minOccurrences: options.minOccurrences ?? 5,
      minSize: options.minSize,
      maxSize: options.maxSize,
      topLimit: options.top ?? 10,
      dedupeSubsets: options.dedupeSubsets ?? true,
      include: options.include,
      exclude: options.exclude,
      extractableMinOccurrences: 3,
    },
    {
      label: 'Analyzing project',
      showProgress: shouldShowProgress(options),
    },
  );

  const config = buildConfigFromScan(scanResult, resolvedPath, options);
  const json = `${JSON.stringify(config, null, 2)}\n`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, json, 'utf-8');

  const extractableCount = scanResult.report.stats.topCombinations.filter(
    (combo) => combo.extractable,
  ).length;

  console.log('');
  console.log(chalk.bold.green('✅ Config created'));
  console.log(chalk.gray('   Output: ') + chalk.white(outputPath));
  console.log(
    chalk.gray('   Extractable patterns: ') + chalk.white(String(extractableCount)),
  );
  console.log(
    chalk.gray('   Custom names: ') +
      chalk.white(String(Object.keys(config.names ?? {}).length)),
  );
  console.log('');
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.white('  npx tailwind-unwind check'));
  console.log(chalk.white('  npx tailwind-unwind generate'));
  console.log('');

  return {
    configPath: outputPath,
    extractablePatterns: extractableCount,
  };
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
