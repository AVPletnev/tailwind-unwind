import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { replaceClassNamesInSource } from '../codemod/replaceClassNames.js';
import { buildComponents } from '../core/buildComponents.js';
import { scanProject } from '../core/scanProject.js';
import type { AnalyzeOptions } from '../parser/types.js';

export interface ApplyOptions extends AnalyzeOptions {
  output: string;
  dryRun?: boolean;
}

export interface ApplyResult {
  filesModified: number;
  replacementsTotal: number;
  outputPath: string;
  componentsGenerated: number;
}

/**
 * Generate component CSS and replace matching className strings in source files.
 */
export async function applyCommand(
  targetPath: string,
  options: ApplyOptions,
): Promise<ApplyResult> {
  let scanResult;

  try {
    scanResult = await scanProject({
      targetPath,
      include: options.include,
      exclude: options.exclude,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  for (const warning of scanResult.warnings) {
    console.warn(chalk.yellow(`⚠ ${warning}`));
  }

  const { components, css, replacementMap } = buildComponents(
    scanResult.occurrences,
    {
      sourcePath: scanResult.resolvedPath,
      minOccurrences: options.minOccurrences ?? 3,
      minSize: options.minSize,
      maxSize: options.maxSize,
      topLimit: options.top,
      prefix: options.prefix,
      names: options.names,
    },
  );

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
  const allReplacements: Array<{
    filePath: string;
    line?: number;
    from: string;
    to: string;
    partial?: boolean;
  }> = [];
  const allSkipped: Array<{
    filePath: string;
    line?: number;
    reason: string;
    classes: string[];
  }> = [];

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
      if (!options.dryRun) {
        await fs.writeFile(file, result.source, 'utf-8');
      }
    }
  }

  if (!options.dryRun) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, css, 'utf-8');
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
    console.log(
      chalk.bold.yellow(`Skipped (${allSkipped.length}):`),
    );
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

  return {
    filesModified,
    replacementsTotal,
    outputPath,
    componentsGenerated: components.length,
  };
}
