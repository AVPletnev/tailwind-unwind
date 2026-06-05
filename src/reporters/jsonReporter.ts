import type { AnalysisReport } from '../parser/types.js';

/** Serialize the analysis report as formatted JSON. */
export function printJsonReport(report: AnalysisReport): void {
  console.log(JSON.stringify(report, null, 2));
}
