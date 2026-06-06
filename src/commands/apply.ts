import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { formatModifiedFiles } from '../codemod/formatSource.js';
import { replaceClassNamesInSource } from '../codemod/replaceClassNames.js';
import {
  buildComponents,
  buildComponentsFromCombinations,
} from '../core/buildComponents.js';
import { loadExtractableCombinations } from '../core/loadAnalyzeReport.js';
import { calculateSavings, type SavingsReport } from '../analyzer/savings.js';
import {
  runWithSpinner,
  scanProjectWithSpinner,
  shouldShowProgress,
} from '../cli/spinner.js';
import { scanProject } from '../core/scanProject.js';
import type { AnalyzeOptions } from '../parser/types.js';
import {
  printApplyJsonReport,
  type ApplyJsonReport,
} from '../reporters/operationJsonReporter.js';
import { printSkippedReport } from '../reporters/skippedReporter.js';

export interface ApplyOptions extends AnalyzeOptions {
  output: string;
  dryRun?: boolean;
  verboseSkipped?: boolean;
  /** Suppress console/json output (for internal callers like check) */
  quiet?: boolean;
  /** Show per-file progress during replacement (used by check preview) */
  showReplacementProgress?: boolean;
}

export interface ApplyResult {
  filesModified: number;
  replacementsTotal: number;
  outputPath: string;
  componentsGenerated: number;
  components: Awaited<ReturnType<typeof buildComponents>>['components'];
  replacements: ApplyJsonReport['replacements'];
  skipped: ApplyJsonReport['skipped'];
  prettierFormatted: string[];
  savings: SavingsReport;
}

/**
 * Generate component CSS and replace matching className strings in source files.
 */
export async function applyCommand(
  targetPath: string,
  options: ApplyOptions,
): Promise<ApplyResult> {
  let scanResult: Awaited<ReturnType<typeof scanProject>>;
  const showProgress = shouldShowProgress(options);
  const useOwnSpinner = showProgress && !options.quiet && !options.scanResult;
  const showReplacementSpinner =
    (showProgress && !options.quiet) || Boolean(options.showReplacementProgress);

  try {
    if (options.scanResult) {
      scanResult = options.scanResult;
    } else if (useOwnSpinner) {
      scanResult = await scanProjectWithSpinner(
        {
          targetPath,
          include: options.include,
          exclude: options.exclude,
          changed: options.changed,
          extractableMinOccurrences: options.minOccurrences ?? 3,
          skipSubsetAnalysis: true,
        },
        { showProgress: true, label: 'Scanning project' },
      );
    } else {
      scanResult = await scanProject({
        targetPath,
        include: options.include,
        exclude: options.exclude,
        changed: options.changed,
        extractableMinOccurrences: options.minOccurrences ?? 3,
        skipSubsetAnalysis: options.quiet ? true : undefined,
        onParseProgress: options.onParseProgress,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  for (const warning of scanResult.warnings) {
    if (!options.quiet && options.format !== 'json') {
      console.warn(chalk.yellow(`⚠ ${warning}`));
    }
  }

  let components: ApplyResult['components'];
  let css: string;
  let replacementMap: Map<string, string>;

  try {
    const built = await runWithSpinner(
      useOwnSpinner,
      'Building components',
      async (update) => {
        update('Building components');

        if (options.fromReport) {
          const loadedReport = await loadExtractableCombinations(
            options.fromReport,
            {
              extractableOnly: options.extractableOnly ?? true,
            },
          );
          return buildComponentsFromCombinations(loadedReport.combinations, {
            sourcePath: scanResult.resolvedPath,
            prefix: options.prefix,
            names: options.names,
          });
        }

        if (options.extractableOnly) {
          const topLimit =
            options.top ?? scanResult.extractableCombinations.length;
          const combinations = scanResult.extractableCombinations.slice(
            0,
            topLimit,
          );
          return buildComponentsFromCombinations(combinations, {
            sourcePath: scanResult.resolvedPath,
            prefix: options.prefix,
            names: options.names,
          });
        }

        return buildComponents(scanResult.occurrences, {
          sourcePath: scanResult.resolvedPath,
          minOccurrences: options.minOccurrences ?? 3,
          minSize: options.minSize,
          maxSize: options.maxSize,
          topLimit: options.top,
          prefix: options.prefix,
          names: options.names,
        });
      },
    );
    components = built.components;
    css = built.css;
    replacementMap = built.replacementMap;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  if (components.length === 0) {
    if (!options.quiet) {
      console.error(
        chalk.yellow(
          'No repeated className sets found. Try lowering --min-occurrences.',
        ),
      );
      process.exit(1);
    }

    return {
      filesModified: 0,
      replacementsTotal: 0,
      outputPath: path.resolve(options.output),
      componentsGenerated: 0,
      components: [],
      replacements: [],
      skipped: [],
      prettierFormatted: [],
      savings: calculateSavings([]),
    };
  }

  const outputPath = path.resolve(options.output);
  let filesModified = 0;
  let replacementsTotal = 0;
  const allReplacements: ApplyResult['replacements'] = [];
  const allSkipped: ApplyResult['skipped'] = [];
  const modifiedSources = new Map<string, string>();
  const modifiedFiles: string[] = [];

  const replacementLabel = options.dryRun
    ? 'Previewing replacements'
    : 'Applying replacements';

  await runWithSpinner(showReplacementSpinner, replacementLabel, async (update) => {
    const files = scanResult.files;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      update(`${replacementLabel}... ${index + 1}/${files.length}`);

      const original = await fs.readFile(file, 'utf-8');
      const result = replaceClassNamesInSource(
        original,
        replacementMap,
        file,
      );

      replacementsTotal += result.replacements.length;
      allReplacements.push(...result.replacements);
      allSkipped.push(...result.skipped);

      if (result.changed) {
        filesModified += 1;
        modifiedSources.set(file, result.source);
        modifiedFiles.push(file);
      }
    }
  });

  let prettierFormatted: string[] = [];

  if (!options.dryRun && options.prettier && modifiedFiles.length > 0) {
    await runWithSpinner(useOwnSpinner, 'Formatting with Prettier', async (update) => {
      update('Formatting with Prettier');
      const formatResult = await formatModifiedFiles(
        modifiedFiles,
        modifiedSources,
        process.cwd(),
      );
      prettierFormatted = formatResult.formatted;
    });
  }

  if (!options.dryRun) {
    await runWithSpinner(useOwnSpinner, 'Writing files', async (update) => {
      update('Writing source files');
      for (const file of modifiedFiles) {
        const source = modifiedSources.get(file);
        if (source) {
          await fs.writeFile(file, source, 'utf-8');
        }
      }

      update('Writing CSS');
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, css, 'utf-8');
    });
  }

  const savings = calculateSavings(allReplacements);

  const result: ApplyResult = {
    filesModified,
    replacementsTotal,
    outputPath,
    componentsGenerated: components.length,
    components,
    replacements: allReplacements,
    skipped: allSkipped,
    prettierFormatted,
    savings,
  };

  if (options.format === 'json' && !options.quiet) {
    printApplyJsonReport({
      command: 'apply',
      dryRun: Boolean(options.dryRun),
      outputPath,
      filesModified,
      replacementsTotal,
      componentsGenerated: components.length,
      components,
      replacements: allReplacements,
      skipped: allSkipped,
      savings,
    });
    return result;
  }

  if (options.quiet) {
    return result;
  }

  console.log('');
  if (options.dryRun) {
    console.log(chalk.bold.yellow('🔍 Dry run — no files were modified'));
  } else {
    console.log(chalk.bold.green('✅ Classes applied successfully'));
  }

  console.log(chalk.gray(`   CSS output: `) + chalk.white(outputPath));
  console.log(
    chalk.gray(`   Component classes: `) + chalk.white(String(components.length)),
  );
  console.log(
    chalk.gray(`   Files modified: `) + chalk.white(String(filesModified)),
  );
  console.log(
    chalk.gray(`   Replacements: `) + chalk.white(String(replacementsTotal)),
  );

  if (prettierFormatted.length > 0) {
    console.log(
      chalk.gray(`   Prettier formatted: `) +
        chalk.white(String(prettierFormatted.length)),
    );
  }

  if (savings.replacementCount > 0) {
    console.log('');
    console.log(chalk.bold('Savings:'));
    console.log(
      chalk.gray('   Utility tokens before: ') +
        chalk.white(String(savings.utilityTokensBefore)),
    );
    console.log(
      chalk.gray('   Utility tokens after: ') +
        chalk.white(String(savings.utilityTokensAfter)),
    );
    console.log(
      chalk.gray('   Tokens saved: ') + chalk.green(String(savings.tokensSaved)),
    );
    console.log(
      chalk.gray('   Reduction: ') +
        chalk.green(`${savings.percentReduction}%`),
    );
  }

  if (allReplacements.length > 0) {
    console.log('');
    console.log(chalk.bold('Replacements:'));
    for (const item of allReplacements) {
      const line = item.line ? `:${item.line}` : '';
      const partialTag = item.partial ? chalk.dim(' (partial)') : '';
      console.log(
        chalk.gray(`  ${item.filePath}${line}`) +
          chalk.white(` "${item.from}" `) +
          chalk.cyan('→') +
          chalk.green(` "${item.to}"`) +
          partialTag,
      );
    }
  }

  printSkippedReport(allSkipped, { verbose: options.verboseSkipped });

  console.log('');
  if (!options.dryRun) {
    console.log(
      chalk.cyan(
        `Import ${path.basename(outputPath)} in your global CSS if you haven't already.`,
      ),
    );
    console.log('');
  }

  return result;
}
