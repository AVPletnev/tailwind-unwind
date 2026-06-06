#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from '../commands/analyze.js';
import { applyCommand } from '../commands/apply.js';
import { generateCommand } from '../commands/generate.js';
import { initCommand } from '../commands/init.js';
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
    )
    .option(
      '--changed [ref]',
      'Only scan git-changed files (optional ref, default: working tree vs HEAD)',
    );
}

function resolveChangedFlag(opts: { changed?: string | boolean }): boolean | string | undefined {
  if (!process.argv.includes('--changed')) {
    return undefined;
  }

  if (typeof opts.changed === 'string' && opts.changed.length > 0) {
    return opts.changed;
  }

  return true;
}

program
  .name('tailwind-unwind')
  .description('Analyze Tailwind CSS class usage in React/Next.js projects')
  .version(CLI_VERSION);

program
  .command('init')
  .description('Create a starter tailwind-unwind.config.json from project scan')
  .argument('<path>', 'Project directory')
  .option('--output <file>', 'Config output path')
  .option('--force', 'Overwrite existing config file')
  .option('--min-occurrences <n>', 'Minimum occurrences threshold')
  .option('--top <n>', 'Number of patterns to include in names')
  .option('--prefix <name>', 'Namespace prefix for generated classes')
  .action(async (targetPath: string, opts) => {
    try {
      const resolved = withNumericDefaults(
        await resolveCommandOptions('init', opts, targetPath),
        opts,
        ANALYZE_DEFAULTS,
      );

      await initCommand(targetPath, {
        output: opts.output ?? resolved.output,
        force: Boolean(opts.force || resolved.force),
        minOccurrences: resolved.minOccurrences,
        top: resolved.top,
        prefix: resolved.prefix ?? GENERATE_DEFAULTS.prefix,
        include: resolved.include,
        exclude: resolved.exclude,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

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
      await resolveCommandOptions('analyze', { ...opts, changed: resolveChangedFlag(opts) }, targetPath),
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
      changed: resolved.changed,
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
    .argument('[path]', 'Directory to analyze')
    .option('--output <file>', 'Output CSS file path')
    .option('--from-report <file>', 'Generate from analyze JSON report')
    .option('--extractable-only', 'Only generate extractable patterns from analyze')
    .option('--format <type>', 'Output format: console or json', 'console')
    .option('--min-occurrences <n>', 'Minimum occurrences threshold')
    .option('--min-size <n>', 'Minimum classes per combination')
    .option('--max-size <n>', 'Maximum classes per combination')
    .option('--top <n>', 'Number of combinations to generate')
    .option('--prefix <name>', 'Namespace prefix for generated classes'),
).action(async (targetPath: string | undefined, opts) => {
  try {
    const resolved = withNumericDefaults(
      await resolveCommandOptions('generate', { ...opts, changed: resolveChangedFlag(opts) }, targetPath),
      opts,
      GENERATE_DEFAULTS,
    );
    const output = opts.output ?? resolved.output;
    const scanPath = targetPath ?? '.';

    if (!output) {
      console.error(chalk.red('Error: --output is required'));
      process.exit(1);
    }

    if (!opts.fromReport && !resolved.fromReport && !targetPath) {
      console.error(chalk.red('Error: <path> is required without --from-report'));
      process.exit(1);
    }

    await generateCommand(scanPath, {
      output,
      minOccurrences: resolved.minOccurrences,
      minSize: resolved.minSize,
      maxSize: resolved.maxSize,
      top: resolved.top,
      prefix: resolved.prefix,
      include: resolved.include,
      exclude: resolved.exclude,
      changed: resolved.changed,
      configPath: resolved.configPath,
      names: resolved.names,
      format: resolved.format,
      fromReport: opts.fromReport ?? resolved.fromReport,
      extractableOnly: Boolean(opts.extractableOnly || resolved.extractableOnly),
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
    .option('--output <file>', 'Output CSS file path')
    .option('--from-report <file>', 'Use component list from analyze JSON report')
    .option('--extractable-only', 'Only apply extractable patterns from analyze')
    .option('--format <type>', 'Output format: console or json', 'console')
    .option('--prettier', 'Format modified files with Prettier when available')
    .option('--min-occurrences <n>', 'Minimum occurrences threshold')
    .option('--min-size <n>', 'Minimum classes per combination')
    .option('--max-size <n>', 'Maximum classes per combination')
    .option('--top <n>', 'Number of component classes to use')
    .option('--dry-run', 'Preview replacements without writing files')
    .option('--prefix <name>', 'Namespace prefix for generated classes'),
).action(async (targetPath: string, opts) => {
  try {
    const resolved = withNumericDefaults(
      await resolveCommandOptions('apply', { ...opts, changed: resolveChangedFlag(opts) }, targetPath),
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
      changed: resolved.changed,
      configPath: resolved.configPath,
      names: resolved.names,
      format: resolved.format,
      fromReport: opts.fromReport ?? resolved.fromReport,
      extractableOnly: Boolean(opts.extractableOnly || resolved.extractableOnly),
      dryRun: process.argv.includes('--dry-run')
        ? true
        : Boolean(resolved.dryRun),
      prettier: Boolean(opts.prettier || resolved.prettier),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', message);
    process.exit(1);
  }
});

program.parse();
