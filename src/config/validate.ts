import type { CustomNamesConfig, TailwindUnwindConfigFile } from './types.js';

const CLASS_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const KNOWN_ROOT_KEYS = new Set([
  'include',
  'exclude',
  'names',
  'prefix',
  'output',
  'minOccurrences',
  'minSize',
  'maxSize',
  'top',
  'dedupeSubsets',
  'dryRun',
  'prettier',
  'fromReport',
  'extractableOnly',
  'analyze',
  'generate',
  'apply',
]);

const KNOWN_COMMAND_KEYS = new Set([
  'minOccurrences',
  'minSize',
  'maxSize',
  'top',
  'prefix',
  'output',
  'dedupeSubsets',
  'dryRun',
  'prettier',
  'fromReport',
  'extractableOnly',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertPositiveNumber(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    errors.push(`${path} must be a positive number`);
  }
}

function assertBoolean(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'boolean') {
    errors.push(`${path} must be a boolean`);
  }
}

function assertStringArray(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (value === undefined) {
    return;
  }

  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string' && item.length > 0)
  ) {
    errors.push(`${path} must be an array of non-empty strings`);
  }
}

function validateCommandSection(
  value: unknown,
  section: string,
  errors: string[],
): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    errors.push(`${section} must be an object`);
    return;
  }

  for (const key of Object.keys(value)) {
    if (!KNOWN_COMMAND_KEYS.has(key)) {
      errors.push(`Unknown key "${key}" in ${section}`);
    }
  }

  assertPositiveNumber(value.minOccurrences, `${section}.minOccurrences`, errors);
  assertPositiveNumber(value.minSize, `${section}.minSize`, errors);
  assertPositiveNumber(value.maxSize, `${section}.maxSize`, errors);
  assertPositiveNumber(value.top, `${section}.top`, errors);
  assertBoolean(value.dedupeSubsets, `${section}.dedupeSubsets`, errors);
  assertBoolean(value.dryRun, `${section}.dryRun`, errors);
  assertBoolean(value.prettier, `${section}.prettier`, errors);
  assertBoolean(value.extractableOnly, `${section}.extractableOnly`, errors);

  if (
    value.fromReport !== undefined &&
    (typeof value.fromReport !== 'string' || value.fromReport.length === 0)
  ) {
    errors.push(`${section}.fromReport must be a non-empty string`);
  }

  if (
    value.prefix !== undefined &&
    (typeof value.prefix !== 'string' || value.prefix.length === 0)
  ) {
    errors.push(`${section}.prefix must be a non-empty string`);
  }

  if (
    value.output !== undefined &&
    (typeof value.output !== 'string' || value.output.length === 0)
  ) {
    errors.push(`${section}.output must be a non-empty string`);
  }
}

function validateNames(value: unknown, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    errors.push('names must be an object of "utility string": "class-name" pairs');
    return;
  }

  for (const [utilities, name] of Object.entries(value)) {
    if (typeof utilities !== 'string' || utilities.trim().length === 0) {
      errors.push('names keys must be non-empty utility strings');
      continue;
    }

    if (typeof name !== 'string' || !CLASS_NAME_PATTERN.test(name)) {
      errors.push(
        `names["${utilities}"] must be a valid class name (letters, numbers, hyphens)`,
      );
    }
  }
}

/**
 * Validate a parsed config object and throw with all errors at once.
 */
export function validateConfigFile(raw: unknown, configPath: string): void {
  if (!isRecord(raw)) {
    throw new Error(`Invalid config in ${configPath}: root value must be an object`);
  }

  const source = isRecord(raw.default) ? raw.default : raw;
  const errors: string[] = [];

  for (const key of Object.keys(source)) {
    if (!KNOWN_ROOT_KEYS.has(key)) {
      errors.push(`Unknown config key "${key}"`);
    }
  }

  assertStringArray(source.include, 'include', errors);
  assertStringArray(source.exclude, 'exclude', errors);
  assertPositiveNumber(source.minOccurrences, 'minOccurrences', errors);
  assertPositiveNumber(source.minSize, 'minSize', errors);
  assertPositiveNumber(source.maxSize, 'maxSize', errors);
  assertPositiveNumber(source.top, 'top', errors);
  assertBoolean(source.dedupeSubsets, 'dedupeSubsets', errors);
  assertBoolean(source.dryRun, 'dryRun', errors);
  assertBoolean(source.prettier, 'prettier', errors);
  assertBoolean(source.extractableOnly, 'extractableOnly', errors);

  if (
    source.fromReport !== undefined &&
    (typeof source.fromReport !== 'string' || source.fromReport.length === 0)
  ) {
    errors.push('fromReport must be a non-empty string');
  }

  validateNames(source.names, errors);
  validateCommandSection(source.analyze, 'analyze', errors);
  validateCommandSection(source.generate, 'generate', errors);
  validateCommandSection(source.apply, 'apply', errors);

  if (
    source.prefix !== undefined &&
    (typeof source.prefix !== 'string' || source.prefix.length === 0)
  ) {
    errors.push('prefix must be a non-empty string');
  }

  if (
    source.output !== undefined &&
    (typeof source.output !== 'string' || source.output.length === 0)
  ) {
    errors.push('output must be a non-empty string');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid config in ${configPath}:\n${errors.map((error) => `  - ${error}`).join('\n')}`,
    );
  }
}

export function normalizeNamesConfig(
  names: CustomNamesConfig | undefined,
): Map<string, string> {
  const map = new Map<string, string>();

  if (!names) {
    return map;
  }

  for (const [utilities, baseName] of Object.entries(names)) {
    const tokens = utilities
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 0);
    const key = [...tokens].sort().join(' ');
    map.set(key, baseName);
  }

  return map;
}
