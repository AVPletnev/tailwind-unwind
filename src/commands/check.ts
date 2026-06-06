import chalk from 'chalk';
import { GENERATE_DEFAULTS } from '../cli/defaults.js';
import {
  createScanProgressHandler,
  createSpinner,
  scanProjectWithSpinner,
  shouldShowProgress,
} from '../cli/spinner.js';
import type { AnalyzeOptions } from '../parser/types.js';
import { applyCommand, type ApplyResult } from './apply.js';
import {
  printCheckConsoleReport,
  printCheckJsonReport,
  type CheckJsonReport,
} from '../reporters/checkReporter.js';

export interface CheckOptions extends AnalyzeOptions {
  output: string;
  /** Exit with code 1 when extractablePatternCount exceeds this value */
  failOnExtractable?: number;
  verboseSkipped?: boolean;
}

export interface CheckResult {
  passed: boolean;
  extractablePatternCount: number;
  report: Awaited<ReturnType<typeof scanProjectWithSpinner>>['report'];
  preview: ApplyResult | null;
}

/**
 * Scan for extractable duplicates and preview what apply would change (dry-run).
 */
export async function checkCommand(
  targetPath: string,
  options: CheckOptions,
): Promise<CheckResult> {
  const showProgress = shouldShowProgress(options);
  let scanResult: Awaited<ReturnType<typeof scanProjectWithSpinner>>;

  try {
    scanResult = await scanProjectWithSpinner(
      {
        targetPath,
        minOccurrences: options.minOccurrences,
        minSize: options.minSize,
        maxSize: options.maxSize,
        topLimit: options.top,
        dedupeSubsets: options.dedupeSubsets,
        include: options.include,
        exclude: options.exclude,
        changed: options.changed,
        extractableMinOccurrences: options.extractableMinOccurrences,
      },
      { showProgress },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }

  if (options.format !== 'json') {
    for (const warning of scanResult.warnings) {
      console.warn(chalk.yellow(`⚠ ${warning}`));
    }
  }

  const extractablePatternCount =
    scanResult.report.stats.extractablePatternCount;
  const failThreshold = options.failOnExtractable;
  const passed =
    failThreshold === undefined
      ? true
      : extractablePatternCount <= failThreshold;

  let preview: ApplyResult | null = null;

  if (extractablePatternCount > 0) {
    const previewSpinner = createSpinner({ enabled: showProgress });

    try {
      previewSpinner.start('Previewing replacements');
      preview = await applyCommand(targetPath, {
        output: options.output,
        minOccurrences:
          options.extractableMinOccurrences ?? GENERATE_DEFAULTS.minOccurrences,
        minSize: options.minSize,
        maxSize: options.maxSize,
        top: options.top,
        prefix: options.prefix,
        include: options.include,
        exclude: options.exclude,
        changed: options.changed,
        configPath: options.configPath,
        names: options.names,
        extractableOnly: true,
        dryRun: true,
        quiet: true,
        verboseSkipped: options.verboseSkipped,
        onParseProgress: showProgress
          ? createScanProgressHandler(previewSpinner, 'Previewing replacements')
          : options.onParseProgress,
      });
      previewSpinner.stop();
    } catch (error) {
      previewSpinner.stop();
      throw error;
    }
  }

  const result: CheckResult = {
    passed,
    extractablePatternCount,
    report: scanResult.report,
    preview,
  };

  if (options.format === 'json') {
    const jsonReport: CheckJsonReport = {
      command: 'check',
      passed,
      outputPath: options.output,
      extractablePatternCount,
      analyzeMinOccurrences: scanResult.report.stats.analyzeMinOccurrences,
      extractableMinOccurrences:
        scanResult.report.stats.extractableMinOccurrences,
      report: scanResult.report,
      preview: preview
        ? {
            componentsGenerated: preview.componentsGenerated,
            filesModified: preview.filesModified,
            replacementsTotal: preview.replacementsTotal,
            skippedTotal: preview.skipped.length,
            savings: preview.savings,
          }
        : null,
    };
    printCheckJsonReport(jsonReport);
  } else {
    printCheckConsoleReport(scanResult.report, {
      outputPath: options.output,
      topLimit: options.top,
      preview,
      verboseSkipped: options.verboseSkipped,
      passed,
    });
  }

  if (!passed) {
    console.error(
      chalk.red(
        `Found ${extractablePatternCount} extractable pattern(s); limit is ${failThreshold}.`,
      ),
    );
    process.exit(1);
  }

  return result;
}
