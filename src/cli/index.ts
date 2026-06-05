#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from '../commands/analyze.js';
import { applyCommand } from '../commands/apply.js';
import { generateCommand } from '../commands/generate.js';
import { ANALYZE_DEFAULTS, GENERATE_DEFAULTS } from './defaults.js';
import { resolveCommandOptions, withNumericDefaults } from './parseOptions.js';
import { CLI_VERSION } from './version.js';

const program = new Command();

function addSharedOptions(command: Command): Command {
  return command
    .option('--config <file>', 'Path to tailwind-unwind config file')
    .option(
      '--include <patterns>',
      'Comma-separated glob include patterns (e.g. "src/**/*.tsx")',
    )
    .option(
      '--exclude <patterns>',
      'Comma-separated glob exclude patterns (e.g. "**/*.test.tsx")',
    );
}

program
  .name('tailwind-unwind')
  .description('Analyze Tailwind CSS class usage in React/Next.js projects')
  .version(CLI_VERSION);

addSharedOptions(
  program
    .command('analyze')
    .description('Scan a directory and report frequent Tailwind class combinations')
    .argument('<path>', 'Directory to analyze')
    .option('--min-occurrences <n>', 'Minimum occurrences threshold')
    .option('--min-size <n>', 'Minimum classes per combination')
    .option('--max-size <n>', 'Maximum classes per combination')
    .option('--top <n>', 'Number of top combinations to show')
    .option('--format <type>', 'Output format: console or json', 'console')
    .option('--no-dedupe-subsets', 'Include subset combinations in results'),
).action(async (targetPath: string, opts) => {
  try {
    const resolved = withNumericDefaults(
      await resolveCommandOptions('analyze', opts, targetPath),
      opts,
      ANALYZE_DEFAULTS,
    );

    await analyzeCommand(targetPath, {
      minOccurrences: resolved.minOccurrences,
      minSize: resolved.minSize,
      maxSize: resolved.maxSize,
      top: resolved.top,
      format: resolved.format,
      dedupeSubsets: process.argv.includes('--no-dedupe-subsets')
        ? false
        : (resolved.dedupeSubsets ?? true),
      include: resolved.include,
      exclude: resolved.exclude,
      configPath: resolved.configPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', message);
    process.exit(1);
  }
});

addSharedOptions(
  program
    .command('generate')
    .description('Generate @layer components CSS from repeated className sets')
    .argument('<path>', 'Directory to analyze')
    .requiredOption('--output <file>', 'Output CSS file path')
    .option('--min-occurrences <n>', 'Minimum occurrences threshold')
    .option('--min-size <n>', 'Minimum classes per combination')
    .option('--max-size <n>', 'Maximum classes per combination')
    .option('--top <n>', 'Number of combinations to generate')
    .option('--prefix <name>', 'Namespace prefix for generated classes'),
).action(async (targetPath: string, opts) => {
  try {
    const resolved = withNumericDefaults(
      await resolveCommandOptions('generate', opts, targetPath),
      opts,
      GENERATE_DEFAULTS,
    );
    const output = opts.output ?? resolved.output;

    if (!output) {
      console.error(chalk.red('Error: --output is required'));
      process.exit(1);
    }

    await generateCommand(targetPath, {
      output,
      minOccurrences: resolved.minOccurrences,
      minSize: resolved.minSize,
      maxSize: resolved.maxSize,
      top: resolved.top,
      prefix: resolved.prefix,
      include: resolved.include,
      exclude: resolved.exclude,
      configPath: resolved.configPath,
      names: resolved.names,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', message);
    process.exit(1);
  }
});

addSharedOptions(
  program
    .command('apply')
    .description('Replace repeated className strings with generated component classes')
    .argument('<path>', 'Directory to modify')
    .requiredOption('--output <file>', 'Output CSS file path')
    .option('--min-occurrences <n>', 'Minimum occurrences threshold')
    .option('--min-size <n>', 'Minimum classes per combination')
    .option('--max-size <n>', 'Maximum classes per combination')
    .option('--top <n>', 'Number of component classes to use')
    .option('--dry-run', 'Preview replacements without writing files')
    .option('--prefix <name>', 'Namespace prefix for generated classes'),
).action(async (targetPath: string, opts) => {
  try {
    const resolved = withNumericDefaults(
      await resolveCommandOptions('apply', opts, targetPath),
      opts,
      GENERATE_DEFAULTS,
    );
    const output = opts.output ?? resolved.output;

    if (!output) {
      console.error(chalk.red('Error: --output is required'));
      process.exit(1);
    }

    await applyCommand(targetPath, {
      output,
      minOccurrences: resolved.minOccurrences,
      minSize: resolved.minSize,
      maxSize: resolved.maxSize,
      top: resolved.top,
      prefix: resolved.prefix,
      include: resolved.include,
      exclude: resolved.exclude,
      configPath: resolved.configPath,
      names: resolved.names,
      dryRun: Boolean(resolved.dryRun),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', message);
    process.exit(1);
  }
});

program.parse();
