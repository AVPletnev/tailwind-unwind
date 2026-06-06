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
  /** True when generate/apply can extract this exact class set */
  extractable?: boolean;
}

export interface AnalysisStats {
  filesScanned: number;
  componentsWithClassName: number;
  uniqueCombinations: number;
  totalClassUsages: number;
  topCombinations: ClassCombination[];
  potentialReductionPercent: number;
  /** Exact duplicates eligible for generate/apply (not limited by --top) */
  extractablePatternCount: number;
  /** analyze min-occurrences used for the frequent-pattern list */
  analyzeMinOccurrences: number;
  /** threshold used to mark patterns as extractable */
  extractableMinOccurrences: number;
}

export interface AnalysisReport {
  targetPath: string;
  stats: AnalysisStats;
  parseWarnings: string[];
}

export interface AnalyzeOptions {
  minOccurrences?: number;
  /** Threshold for marking patterns as extractable (defaults to generate min-occurrences) */
  extractableMinOccurrences?: number;
  minSize?: number;
  maxSize?: number;
  top?: number;
  format?: 'console' | 'json';
  dedupeSubsets?: boolean;
  /** Namespace prefix for generated component classes (default: twu-) */
  prefix?: string;
  include?: string[];
  exclude?: string[];
  configPath?: string;
  /** Custom base class names keyed by space-separated utility strings */
  names?: Record<string, string>;
  prettier?: boolean;
  fromReport?: string;
  extractableOnly?: boolean;
  changed?: boolean | string;
  force?: boolean;
}
