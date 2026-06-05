export interface ClassNameExtraction {
  classes: string[];
  isDynamic: boolean;
  line?: number;
}

export interface ClassNameOccurrence {
  classes: string[];
  filePath: string;
  line?: number;
}

export interface CombinationLocation {
  filePath: string;
  line?: number;
}

export interface ParseResult {
  filePath: string;
  extractions: ClassNameExtraction[];
  warnings: string[];
}

export interface ClassCombination {
  normalized: string;
  classes: string[];
  occurrences: number;
  suggestion: string;
  locations: CombinationLocation[];
}

export interface AnalysisStats {
  filesScanned: number;
  componentsWithClassName: number;
  uniqueCombinations: number;
  totalClassUsages: number;
  topCombinations: ClassCombination[];
  potentialReductionPercent: number;
}

export interface AnalysisReport {
  targetPath: string;
  stats: AnalysisStats;
  parseWarnings: string[];
}

export interface AnalyzeOptions {
  minOccurrences?: number;
  minSize?: number;
  maxSize?: number;
  top?: number;
  format?: 'console' | 'json';
  dedupeSubsets?: boolean;
  /** Namespace prefix for generated component classes (default: twu-) */
  prefix?: string;
}
