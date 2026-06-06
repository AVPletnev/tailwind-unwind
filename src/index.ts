export { loadCommandOptions } from './config/loadConfig.js';
export { validateConfigFile, normalizeNamesConfig } from './config/validate.js';
export type {
  CliCommand,
  CommandConfig,
  CustomNamesConfig,
  TailwindUnwindConfig,
  TailwindUnwindConfigFile,
} from './config/types.js';
export { analyzeCommand } from './commands/analyze.js';
export { applyCommand } from './commands/apply.js';
export { generateCommand } from './commands/generate.js';
export { scanProject } from './core/scanProject.js';
export {
  buildComponents,
  buildComponentsFromCombinations,
} from './core/buildComponents.js';
export { loadExtractableCombinations } from './core/loadAnalyzeReport.js';
export { formatSource, formatModifiedFiles } from './codemod/formatSource.js';
export {
  printGenerateJsonReport,
  printApplyJsonReport,
} from './reporters/operationJsonReporter.js';
export {
  VARIANT_CALLEES,
  collectVariantRegistry,
  extractClassesFromVariantCall,
  isVariantCallee,
} from './parser/variantHelpers.js';
export { replaceClassNamesInSource } from './codemod/replaceClassNames.js';
export {
  calculatePotentialReduction,
  findFrequentPatterns,
  findRepeatedClassSets,
} from './analyzer/patternFinder.js';
export { suggestClassName } from './analyzer/suggestions.js';
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
  assignComponentClassNames,
  generateComponentCss,
} from './generator/cssGenerator.js';
export {
  DEFAULT_CLASS_PREFIX,
  normalizeClassPrefix,
  withClassPrefix,
} from './generator/classPrefix.js';
export {
  CLASS_MERGE_CALLEES,
  extractClassesFromExpression,
} from './parser/classHelpers.js';
export {
  extractFromJSXAttribute,
  isClassAttribute,
  parseSourceToAst,
} from './parser/ast.js';
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
export type {
  CssGeneratorOptions,
  CssGeneratorResult,
  GeneratedComponent,
} from './generator/cssGenerator.js';
export type {
  GenerateOptions,
  GenerateResult,
} from './commands/generate.js';
export type { ApplyOptions, ApplyResult } from './commands/apply.js';
export type {
  ClassReplacement,
  ReplaceClassNamesResult,
  SkippedReplacement,
} from './codemod/replaceClassNames.js';
