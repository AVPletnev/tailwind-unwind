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
  .action(async (targetPath: string) => {
    try {
      await analyzeCommand(targetPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Unexpected error:', message);
      process.exit(1);
    }
  });

program.parse();
