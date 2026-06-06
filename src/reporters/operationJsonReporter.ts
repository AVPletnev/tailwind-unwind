import type { GeneratedComponent } from '../generator/cssGenerator.js';
import type {
  ClassReplacement,
  SkippedReplacement,
} from '../codemod/replaceClassNames.js';

export interface GenerateJsonReport {
  command: 'generate';
  outputPath: string;
  componentsGenerated: number;
  components: GeneratedComponent[];
  cssWritten: boolean;
}

export interface ApplyJsonReport {
  command: 'apply';
  dryRun: boolean;
  outputPath: string;
  filesModified: number;
  replacementsTotal: number;
  componentsGenerated: number;
  components: GeneratedComponent[];
  replacements: ClassReplacement[];
  skipped: SkippedReplacement[];
}

export function printGenerateJsonReport(report: GenerateJsonReport): void {
  console.log(JSON.stringify(report, null, 2));
}

export function printApplyJsonReport(report: ApplyJsonReport): void {
  console.log(JSON.stringify(report, null, 2));
}
