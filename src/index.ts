export { analyzeCommand } from './commands/analyze.js';
export {
  calculatePotentialReduction,
  findFrequentPatterns,
} from './analyzer/patternFinder.js';
export {
  generateCombinations,
  normalizeClasses,
  splitClassString,
} from './analyzer/combiner.js';
export { parseFile } from './parser/jsxParser.js';
export { walkSourceFiles } from './scanner/fileWalker.js';
export { printConsoleReport } from './reporters/consoleReporter.js';
export { IGNORED_DIRECTORIES, IGNORE_PATTERNS } from './scanner/ignore.js';
export type {
  AnalysisReport,
  AnalysisStats,
  ClassCombination,
  ClassNameExtraction,
  ParseResult,
} from './parser/types.js';
