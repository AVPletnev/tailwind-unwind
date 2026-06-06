#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from '../commands/analyze.js';
import { applyCommand } from '../commands/apply.js';
import { checkCommand } from '../commands/check.js';
import { generateCommand } from '../commands/generate.js';
import { initCommand } from '../commands/init.js';
import {
  ANALYZE_DEFAULTS,
  DEFAULT_TARGET_PATH,
  GENERATE_DEFAULTS,
  resolveOutputPath,
  resolveTargetPath,
} from './defaults.js';
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
    )
    .option('--no-progress', 'Disable terminal progress spinner');
}

function optionalCliNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

addSharedOptions(
  program
    .command('init')
    .description('Create a starter tailwind-unwind.config.json from project scan')
    .argument('[path]', 'Project directory', DEFAULT_TARGET_PATH)
    .option('--output <file>', 'Config output path')
    .option('--force', 'Overwrite existing config file')
    .option('--min-occurrences <n>', 'Minimum occurrences threshold')
    .option('--top <n>', 'Number of patterns to include in names')
    .option('--prefix <name>', 'Namespace prefix for generated classes'),
).action(async (targetPath: string, opts) => {
    try {
      const scanPath = resolveTargetPath(targetPath);
      const resolved = withNumericDefaults(
        await resolveCommandOptions('init', opts, scanPath),
        opts,
        ANALYZE_DEFAULTS,
      );

      await initCommand(scanPath, {
        output: opts.output ?? resolved.output,
        force: Boolean(opts.force || resolved.force),
        minOccurrences: resolved.minOccurrences,
        top: resolved.top,
        prefix: resolved.prefix ?? GENERATE_DEFAULTS.prefix,
        include: resolved.include,
        exclude: resolved.exclude,
        noProgress: Boolean(opts.noProgress),
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
    .argument('[path]', 'Directory to analyze', DEFAULT_TARGET_PATH)
    .option('--min-occurrences <n>', 'Minimum occurrences threshold')
    .option('--min-size <n>', 'Minimum classes per combination')
    .option('--max-size <n>', 'Maximum classes per combination')
    .option('--top <n>', 'Number of top combinations to show')
    .option('--format <type>', 'Output format: console or json', 'console')
    .option('--no-dedupe-subsets', 'Include subset combinations in results'),
).action(async (targetPath: string, opts) => {
  try {
    const scanPath = resolveTargetPath(targetPath);
    const resolved = withNumericDefaults(
      await resolveCommandOptions('analyze', { ...opts, changed: resolveChangedFlag(opts) }, scanPath),
      opts,
      ANALYZE_DEFAULTS,
    );
    const generateResolved = withNumericDefaults(
      await resolveCommandOptions('generate', { ...opts, changed: resolveChangedFlag(opts) }, scanPath),
      opts,
      GENERATE_DEFAULTS,
    );

    await analyzeCommand(scanPath, {
      minOccurrences: resolved.minOccurrences,
      extractableMinOccurrences: generateResolved.minOccurrences,
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
      noProgress: Boolean(opts.noProgress),
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
    .argument('[path]', 'Directory to scan', DEFAULT_TARGET_PATH)
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
    const scanPath = resolveTargetPath(targetPath);
    const resolved = withNumericDefaults(
      await resolveCommandOptions('generate', { ...opts, changed: resolveChangedFlag(opts) }, scanPath),
      opts,
      GENERATE_DEFAULTS,
    );
    const output = resolveOutputPath(opts.output, resolved.output);

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
      noProgress: Boolean(opts.noProgress),
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
    .argument('[path]', 'Directory to modify', DEFAULT_TARGET_PATH)
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
    .option('--verbose-skipped', 'List every skipped replacement location')
    .option('--prefix <name>', 'Namespace prefix for generated classes'),
).action(async (targetPath: string, opts) => {
  try {
    const scanPath = resolveTargetPath(targetPath);
    const resolved = withNumericDefaults(
      await resolveCommandOptions('apply', { ...opts, changed: resolveChangedFlag(opts) }, scanPath),
      opts,
      GENERATE_DEFAULTS,
    );
    const output = resolveOutputPath(opts.output, resolved.output);

    await applyCommand(scanPath, {
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
      verboseSkipped: Boolean(opts.verboseSkipped),
      noProgress: Boolean(opts.noProgress),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', message);
    process.exit(1);
  }
});

addSharedOptions(
  program
    .command('check')
    .description('Scan for extractable duplicates and preview apply (dry-run)')
    .argument('[path]', 'Directory to scan', DEFAULT_TARGET_PATH)
    .option('--output <file>', 'CSS output path used in the apply preview')
    .option('--format <type>', 'Output format: console or json', 'console')
    .option('--min-occurrences <n>', 'Minimum occurrences for the analyze list')
    .option('--top <n>', 'Number of extractable patterns to show')
    .option('--fail-on-extractable <n>', 'Exit 1 when extractable patterns exceed n')
    .option('--verbose-skipped', 'List every skipped replacement location')
    .option('--prefix <name>', 'Namespace prefix for generated classes'),
).action(async (targetPath: string, opts) => {
  try {
    const scanPath = resolveTargetPath(targetPath);
    const analyzeResolved = withNumericDefaults(
      await resolveCommandOptions('analyze', { ...opts, changed: resolveChangedFlag(opts) }, scanPath),
      opts,
      ANALYZE_DEFAULTS,
    );
    const generateResolved = withNumericDefaults(
      await resolveCommandOptions('generate', { ...opts, changed: resolveChangedFlag(opts) }, scanPath),
      opts,
      GENERATE_DEFAULTS,
    );
    const output = resolveOutputPath(opts.output, generateResolved.output);
    const failOnExtractable = process.argv.includes('--fail-on-extractable')
      ? optionalCliNumber(opts.failOnExtractable) ?? 0
      : undefined;

    await checkCommand(scanPath, {
      minOccurrences: analyzeResolved.minOccurrences,
      extractableMinOccurrences: generateResolved.minOccurrences,
      minSize: analyzeResolved.minSize,
      maxSize: analyzeResolved.maxSize,
      top: analyzeResolved.top,
      prefix: generateResolved.prefix,
      include: analyzeResolved.include,
      exclude: analyzeResolved.exclude,
      changed: analyzeResolved.changed,
      configPath: analyzeResolved.configPath ?? generateResolved.configPath,
      names: generateResolved.names,
      output,
      format: opts.format === 'json' ? 'json' : 'console',
      failOnExtractable,
      verboseSkipped: Boolean(opts.verboseSkipped),
      noProgress: Boolean(opts.noProgress),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', message);
    process.exit(1);
  }
});

program.parse();
