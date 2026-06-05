import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { buildComponents } from '../core/buildComponents.js';
import { scanProject } from '../core/scanProject.js';
import type { AnalyzeOptions } from '../parser/types.js';

export interface GenerateOptions extends AnalyzeOptions {
  output: string;
}

export interface GenerateResult {
  outputPath: string;
  componentsGenerated: number;
  report: Awaited<ReturnType<typeof scanProject>>['report'];
}

/**
 * Analyze a project and write @layer components CSS to the output file.
 */
export async function generateCommand(
  targetPath: string,
  options: GenerateOptions,
): Promise<GenerateResult> {
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

  const { css, components } = buildComponents(scanResult.occurrences, {
    sourcePath: scanResult.resolvedPath,
    minOccurrences: options.minOccurrences ?? 3,
    minSize: options.minSize,
    maxSize: options.maxSize,
    topLimit: options.top,
    prefix: options.prefix,
    names: options.names,
  });

  const outputPath = path.resolve(options.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, css, 'utf-8');

  console.log('');
  console.log(chalk.bold.green('✅ CSS generated successfully'));
  console.log(chalk.gray(`   Output: `) + chalk.white(outputPath));
  console.log(
    chalk.gray(`   Components: `) + chalk.white(String(components.length)),
  );

  if (components.length > 0) {
    console.log('');
    console.log(chalk.bold('Generated classes:'));
    for (const component of components) {
      console.log(
        chalk.green(`  .${component.className}`) +
          chalk.gray(` — ${component.occurrences} occurrences, `) +
          chalk.dim(component.classes.join(' ')),
      );
    }
    console.log('');
    console.log(
      chalk.cyan(
        'Run apply to replace className strings: npx tailwind-unwind apply <path> --output styles.css',
      ),
    );
  } else {
    console.log(
      chalk.yellow(
        '\nNo repeated className sets matched the filters. Try lowering --min-occurrences.',
      ),
    );
  }

  console.log('');

  return {
    outputPath,
    componentsGenerated: components.length,
    report: scanResult.report,
  };
}
