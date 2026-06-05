export interface ClassNameExtraction {
  classes: string[];
  isDynamic: boolean;
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
