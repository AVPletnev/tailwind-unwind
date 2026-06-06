import fs from 'node:fs/promises';
import type { ClassCombination } from '../parser/types.js';
import type { AnalysisReport } from '../parser/types.js';

function isAnalysisReport(value: unknown): value is AnalysisReport {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const report = value as AnalysisReport;
  return (
    typeof report.targetPath === 'string' &&
    typeof report.stats === 'object' &&
    Array.isArray(report.stats.topCombinations)
  );
}

export interface LoadedAnalyzeReport {
  targetPath: string;
  combinations: ClassCombination[];
}

/**
 * Load an analyze JSON report and return extractable combinations for generate.
 */
export async function loadExtractableCombinations(
  reportPath: string,
  options: { extractableOnly?: boolean } = {},
): Promise<LoadedAnalyzeReport> {
  const raw = await fs.readFile(reportPath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;

  if (!isAnalysisReport(parsed)) {
    throw new Error(`Invalid analyze report: ${reportPath}`);
  }

  const combinations = parsed.stats.topCombinations.filter((combo) =>
    options.extractableOnly === false ? true : combo.extractable === true,
  );

  if (combinations.length === 0) {
    throw new Error(
      'No extractable combinations found in report. Re-run analyze or use --extractable-only=false.',
    );
  }

  return {
    targetPath: parsed.targetPath,
    combinations,
  };
}
