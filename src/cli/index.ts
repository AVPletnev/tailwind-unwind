#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeCommand } from '../commands/analyze.js';

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

program.parse();
