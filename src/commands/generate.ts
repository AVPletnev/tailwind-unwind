import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import {
  buildComponents,
  buildComponentsFromCombinations,
} from '../core/buildComponents.js';
import { loadExtractableCombinations } from '../core/loadAnalyzeReport.js';
import { scanProject } from '../core/scanProject.js';
import type { AnalyzeOptions } from '../parser/types.js';
import {
  printGenerateJsonReport,
  type GenerateJsonReport,
} from '../reporters/operationJsonReporter.js';

export interface GenerateOptions extends AnalyzeOptions {
  output: string;
}

export interface GenerateResult {
  outputPath: string;
  componentsGenerated: number;
  components: Awaited<ReturnType<typeof buildComponents>>['components'];
  report: Awaited<ReturnType<typeof scanProject>>['report'] | null;
}

/**
 * Analyze a project and write @layer components CSS to the output file.
 */
export async function generateCommand(
  targetPath: string,
  options: GenerateOptions,
): Promise<GenerateResult> {
  let scanResult: Awaited<ReturnType<typeof scanProject>> | null = null;
  let components: GenerateResult['components'];
  let css: string;

  try {
    if (options.fromReport) {
      const loadedReport = await loadExtractableCombinations(options.fromReport, {
        extractableOnly: options.extractableOnly ?? true,
      });

      const built = buildComponentsFromCombinations(loadedReport.combinations, {
        sourcePath: loadedReport.targetPath || targetPath,
        prefix: options.prefix,
        names: options.names,
      });
      components = built.components;
      css = built.css;
    } else {
      scanResult = await scanProject({
        targetPath,
        include: options.include,
        exclude: options.exclude,
        changed: options.changed,
        extractableMinOccurrences: options.minOccurrences ?? 3,
      });

      if (options.extractableOnly) {
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
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  if (scanResult) {
    for (const warning of scanResult.warnings) {
      if (options.format !== 'json') {
        console.warn(chalk.yellow(`⚠ ${warning}`));
      }
    }
  }

  const outputPath = path.resolve(options.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, css, 'utf-8');

  const result: GenerateResult = {
    outputPath,
    componentsGenerated: components.length,
    components,
    report: scanResult?.report ?? null,
  };

  if (options.format === 'json') {
    printGenerateJsonReport({
      command: 'generate',
      outputPath,
      componentsGenerated: components.length,
      components,
      cssWritten: true,
    });
    return result;
  }

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
  return result;
}
