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
import { scanProject } from '../core/scanProject.js';
import type { AnalyzeOptions } from '../parser/types.js';
import {
  printApplyJsonReport,
  type ApplyJsonReport,
} from '../reporters/operationJsonReporter.js';

export interface ApplyOptions extends AnalyzeOptions {
  output: string;
  dryRun?: boolean;
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
}

/**
 * Generate component CSS and replace matching className strings in source files.
 */
export async function applyCommand(
  targetPath: string,
  options: ApplyOptions,
): Promise<ApplyResult> {
  let scanResult: Awaited<ReturnType<typeof scanProject>>;

  try {
    scanResult = await scanProject({
      targetPath,
      include: options.include,
      exclude: options.exclude,
      extractableMinOccurrences: options.minOccurrences ?? 3,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  for (const warning of scanResult.warnings) {
    if (options.format !== 'json') {
      console.warn(chalk.yellow(`⚠ ${warning}`));
    }
  }

  let components: ApplyResult['components'];
  let css: string;
  let replacementMap: Map<string, string>;

  try {
    if (options.fromReport) {
      const loadedReport = await loadExtractableCombinations(options.fromReport, {
        extractableOnly: options.extractableOnly ?? true,
      });
      const built = buildComponentsFromCombinations(loadedReport.combinations, {
        sourcePath: scanResult.resolvedPath,
        prefix: options.prefix,
        names: options.names,
      });
      components = built.components;
      css = built.css;
      replacementMap = built.replacementMap;
    } else if (options.extractableOnly) {
      const combinations = scanResult.report.stats.topCombinations.filter(
        (combo) => combo.extractable,
      );
      const built = buildComponentsFromCombinations(combinations, {
        sourcePath: scanResult.resolvedPath,
        prefix: options.prefix,
        names: options.names,
      });
      components = built.components;
      css = built.css;
      replacementMap = built.replacementMap;
    } else {
      const built = buildComponents(scanResult.occurrences, {
        sourcePath: scanResult.resolvedPath,
        minOccurrences: options.minOccurrences ?? 3,
        minSize: options.minSize,
        maxSize: options.maxSize,
        topLimit: options.top,
        prefix: options.prefix,
        names: options.names,
      });
      components = built.components;
      css = built.css;
      replacementMap = built.replacementMap;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  if (components.length === 0) {
    console.error(
      chalk.yellow(
        'No repeated className sets found. Try lowering --min-occurrences.',
      ),
    );
    process.exit(1);
  }

  const outputPath = path.resolve(options.output);
  let filesModified = 0;
  let replacementsTotal = 0;
  const allReplacements: ApplyResult['replacements'] = [];
  const allSkipped: ApplyResult['skipped'] = [];
  const modifiedSources = new Map<string, string>();
  const modifiedFiles: string[] = [];

  for (const file of scanResult.files) {
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

  let prettierFormatted: string[] = [];

  if (!options.dryRun && options.prettier && modifiedFiles.length > 0) {
    const formatResult = await formatModifiedFiles(
      modifiedFiles,
      modifiedSources,
      process.cwd(),
    );
    prettierFormatted = formatResult.formatted;
  }

  if (!options.dryRun) {
    for (const file of modifiedFiles) {
      const source = modifiedSources.get(file);
      if (source) {
        await fs.writeFile(file, source, 'utf-8');
      }
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, css, 'utf-8');
  }

  const result: ApplyResult = {
    filesModified,
    replacementsTotal,
    outputPath,
    componentsGenerated: components.length,
    components,
    replacements: allReplacements,
    skipped: allSkipped,
    prettierFormatted,
  };

  if (options.format === 'json') {
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
    });
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

  if (allSkipped.length > 0) {
    console.log('');
    console.log(chalk.bold.yellow(`Skipped (${allSkipped.length}):`));
    for (const item of allSkipped) {
      const line = item.line ? `:${item.line}` : '';
      const classes = item.classes.join(' ');
      console.log(
        chalk.gray(`  ${item.filePath}${line}`) +
          chalk.yellow(` [${item.reason}]`) +
          chalk.dim(` "${classes}"`),
      );
    }
  }

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
