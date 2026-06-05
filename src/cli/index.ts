#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeCommand } from '../commands/analyze.js';
import { applyCommand } from '../commands/apply.js';
import { generateCommand } from '../commands/generate.js';

const program = new Command();

program
  .name('tailwind-unwind')
  .description('Analyze Tailwind CSS class usage in React/Next.js projects')
  .version('0.1.0');

program
  .command('analyze')
  .description('Scan a directory and report frequent Tailwind class combinations')
  .argument('<path>', 'Directory to analyze')
  .option('--min-occurrences <n>', 'Minimum occurrences threshold', '5')
  .option('--min-size <n>', 'Minimum classes per combination', '2')
  .option('--max-size <n>', 'Maximum classes per combination', '5')
  .option('--top <n>', 'Number of top combinations to show', '10')
  .option('--format <type>', 'Output format: console or json', 'console')
  .option('--no-dedupe-subsets', 'Include subset combinations in results')
  .action(async (targetPath: string, opts) => {
    try {
      const format = opts.format === 'json' ? 'json' : 'console';

      await analyzeCommand(targetPath, {
        minOccurrences: Number(opts.minOccurrences),
        minSize: Number(opts.minSize),
        maxSize: Number(opts.maxSize),
        top: Number(opts.top),
        format,
        dedupeSubsets: opts.dedupeSubsets,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unexpected error:', message);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate @layer components CSS from repeated className sets')
  .argument('<path>', 'Directory to analyze')
  .requiredOption('--output <file>', 'Output CSS file path')
  .option('--min-occurrences <n>', 'Minimum occurrences threshold', '3')
  .option('--min-size <n>', 'Minimum classes per combination', '2')
  .option('--max-size <n>', 'Maximum classes per combination', '5')
  .option('--top <n>', 'Number of combinations to generate', '10')
  .option('--prefix <name>', 'Namespace prefix for generated classes', 'twu-')
  .action(async (targetPath: string, opts) => {
    try {
      await generateCommand(targetPath, {
        output: opts.output,
        minOccurrences: Number(opts.minOccurrences),
        minSize: Number(opts.minSize),
        maxSize: Number(opts.maxSize),
        top: Number(opts.top),
        prefix: opts.prefix,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unexpected error:', message);
      process.exit(1);
    }
  });

program
  .command('apply')
  .description('Replace repeated className strings with generated component classes')
  .argument('<path>', 'Directory to modify')
  .requiredOption('--output <file>', 'Output CSS file path')
  .option('--min-occurrences <n>', 'Minimum occurrences threshold', '3')
  .option('--min-size <n>', 'Minimum classes per combination', '2')
  .option('--max-size <n>', 'Maximum classes per combination', '5')
  .option('--top <n>', 'Number of component classes to use', '10')
  .option('--dry-run', 'Preview replacements without writing files')
  .option('--prefix <name>', 'Namespace prefix for generated classes', 'twu-')
  .action(async (targetPath: string, opts) => {
    try {
      await applyCommand(targetPath, {
        output: opts.output,
        minOccurrences: Number(opts.minOccurrences),
        minSize: Number(opts.minSize),
        maxSize: Number(opts.maxSize),
        top: Number(opts.top),
        prefix: opts.prefix,
        dryRun: Boolean(opts.dryRun),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unexpected error:', message);
      process.exit(1);
    }
  });

program.parse();
