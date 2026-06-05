export { analyzeCommand } from './commands/analyze.js';
export {
  calculatePotentialReduction,
  findFrequentPatterns,
} from './analyzer/patternFinder.js';
export {
  dedupeSubsetCombinations,
  isStrictSubset,
} from './analyzer/dedupe.js';
export {
  generateCombinations,
  normalizeClasses,
  splitClassString,
} from './analyzer/combiner.js';
export {
  CLASS_MERGE_CALLEES,
  extractClassesFromExpression,
} from './parser/classHelpers.js';
export { parseFile, parseSource } from './parser/jsxParser.js';
export { walkSourceFiles } from './scanner/fileWalker.js';
export { printConsoleReport } from './reporters/consoleReporter.js';
export { printJsonReport } from './reporters/jsonReporter.js';
export { IGNORED_DIRECTORIES, IGNORE_PATTERNS } from './scanner/ignore.js';
export type {
  AnalysisReport,
  AnalysisStats,
  AnalyzeOptions,
  ClassCombination,
  ClassNameExtraction,
  ClassNameOccurrence,
  CombinationLocation,
  ParseResult,
} from './parser/types.js';
