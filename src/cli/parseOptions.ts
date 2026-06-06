import { loadCommandOptions } from '../config/loadConfig.js';
import type { CliCommand } from '../config/types.js';
import type { AnalyzeOptions } from '../parser/types.js';

function splitPatterns(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface RawCliOptions {
  config?: string;
  minOccurrences?: string | number;
  minSize?: string | number;
  maxSize?: string | number;
  top?: string | number;
  prefix?: string;
  dedupeSubsets?: boolean;
  include?: string;
  exclude?: string;
  output?: string;
  format?: string;
  dryRun?: boolean;
  prettier?: boolean;
  fromReport?: string;
  extractableOnly?: boolean;
}

function cliNumber(
  value: string | number | undefined,
  fallback: number,
): number {
  const parsed = optionalNumber(value);
  return parsed ?? fallback;
}

/**
 * Merge config file values with CLI flags (CLI wins).
 */
export async function resolveCommandOptions(
  command: CliCommand,
  opts: RawCliOptions,
  targetPath?: string,
): Promise<
  AnalyzeOptions & { output?: string; dryRun?: boolean; names?: Record<string, string> }
> {
  const resolved = await loadCommandOptions(
    command,
    {
      configPath: opts.config,
      minOccurrences: optionalNumber(opts.minOccurrences),
      minSize: optionalNumber(opts.minSize),
      maxSize: optionalNumber(opts.maxSize),
      top: optionalNumber(opts.top),
      prefix: opts.prefix,
      dedupeSubsets: opts.dedupeSubsets,
      include: splitPatterns(opts.include),
      exclude: splitPatterns(opts.exclude),
      output: opts.output,
    dryRun: opts.dryRun,
    prettier: opts.prettier,
    fromReport: opts.fromReport,
    extractableOnly: opts.extractableOnly,
  },
    { targetPath },
  );

  return {
    minOccurrences: resolved.minOccurrences,
    minSize: resolved.minSize,
    maxSize: resolved.maxSize,
    top: resolved.top,
    prefix: resolved.prefix,
    dedupeSubsets: resolved.dedupeSubsets,
    include: resolved.include,
    exclude: resolved.exclude,
    configPath: resolved.configPath,
    output: resolved.output,
    names: resolved.names,
    format: opts.format === 'json' ? 'json' : 'console',
    dryRun: opts.dryRun ?? resolved.dryRun,
    prettier: opts.prettier ?? resolved.prettier,
    fromReport: opts.fromReport ?? resolved.fromReport,
    extractableOnly: opts.extractableOnly ?? resolved.extractableOnly,
  };
}

export function withNumericDefaults(
  resolved: Awaited<ReturnType<typeof resolveCommandOptions>>,
  opts: RawCliOptions,
  defaults: {
    minOccurrences: number;
    minSize: number;
    maxSize: number;
    top: number;
    prefix?: string;
  },
) {
  return {
    ...resolved,
    minOccurrences:
      resolved.minOccurrences ??
      cliNumber(opts.minOccurrences, defaults.minOccurrences),
    minSize: resolved.minSize ?? cliNumber(opts.minSize, defaults.minSize),
    maxSize: resolved.maxSize ?? cliNumber(opts.maxSize, defaults.maxSize),
    top: resolved.top ?? cliNumber(opts.top, defaults.top),
    prefix: resolved.prefix ?? opts.prefix ?? defaults.prefix,
  };
}

/** @deprecated Use resolveCommandOptions */
export const resolveAnalyzeOptions = (
  opts: RawCliOptions,
  targetPath?: string,
) => resolveCommandOptions('analyze', opts, targetPath);
