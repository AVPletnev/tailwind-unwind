import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  CliCommand,
  CommandConfig,
  ResolvedCommandOptions,
  TailwindUnwindConfig,
  TailwindUnwindConfigFile,
} from './types.js';
import { normalizeNamesConfig, validateConfigFile } from './validate.js';

const CONFIG_FILENAMES = [
  'tailwind-unwind.config.js',
  'tailwind-unwind.config.mjs',
  'tailwind-unwind.config.cjs',
  'tailwind-unwind.config.json',
  '.tailwind-unwindrc',
  '.tailwind-unwindrc.json',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickNumber(
  source: Record<string, unknown>,
  key: keyof CommandConfig,
): number | undefined {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function pickCommandConfig(source: Record<string, unknown>): CommandConfig {
  const config: CommandConfig = {};

  const minOccurrences = pickNumber(source, 'minOccurrences');
  if (minOccurrences !== undefined) config.minOccurrences = minOccurrences;

  const minSize = pickNumber(source, 'minSize');
  if (minSize !== undefined) config.minSize = minSize;

  const maxSize = pickNumber(source, 'maxSize');
  if (maxSize !== undefined) config.maxSize = maxSize;

  const top = pickNumber(source, 'top');
  if (top !== undefined) config.top = top;

  if (typeof source.prefix === 'string' && source.prefix.length > 0) {
    config.prefix = source.prefix;
  }

  if (typeof source.output === 'string' && source.output.length > 0) {
    config.output = source.output;
  }

  if (typeof source.dedupeSubsets === 'boolean') {
    config.dedupeSubsets = source.dedupeSubsets;
  }

  if (typeof source.dryRun === 'boolean') {
    config.dryRun = source.dryRun;
  }

  return config;
}

function pickNames(
  source: Record<string, unknown>,
): TailwindUnwindConfig['names'] | undefined {
  if (!isRecord(source.names)) {
    return undefined;
  }

  const names: TailwindUnwindConfig['names'] = {};

  for (const [utilities, name] of Object.entries(source.names)) {
    if (typeof utilities === 'string' && typeof name === 'string') {
      names[utilities] = name;
    }
  }

  return Object.keys(names).length > 0 ? names : undefined;
}

function normalizeLoadedConfig(raw: unknown): TailwindUnwindConfigFile {
  if (!isRecord(raw)) {
    return {};
  }

  const source = isRecord(raw.default) ? raw.default : raw;
  const config: TailwindUnwindConfigFile = {
    ...pickCommandConfig(source),
  };

  const names = pickNames(source);
  if (names) {
    config.names = names;
  }

  if (Array.isArray(source.include)) {
    config.include = source.include.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
  }

  if (Array.isArray(source.exclude)) {
    config.exclude = source.exclude.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
  }

  if (isRecord(source.analyze)) {
    config.analyze = pickCommandConfig(source.analyze);
  }

  if (isRecord(source.generate)) {
    config.generate = pickCommandConfig(source.generate);
  }

  if (isRecord(source.apply)) {
    config.apply = pickCommandConfig(source.apply);
  }

  return config;
}

function mergeCommandConfig(
  command: CliCommand,
  fileConfig: TailwindUnwindConfigFile,
): TailwindUnwindConfig {
  const { analyze, generate, apply, ...root } = fileConfig;
  const commandSection =
    command === 'analyze' ? analyze : command === 'generate' ? generate : apply;

  return {
    ...root,
    ...commandSection,
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectSearchRoots(
  cwd: string,
  targetPath?: string,
): Promise<string[]> {
  const roots: string[] = [path.resolve(cwd)];

  if (!targetPath) {
    return roots;
  }

  let current = path.resolve(targetPath);

  try {
    const stat = await fs.stat(current);
    if (stat.isFile()) {
      current = path.dirname(current);
    }
  } catch {
    return roots;
  }

  while (true) {
    const resolved = path.resolve(current);
    if (!roots.includes(resolved)) {
      roots.push(resolved);
    }

    const parent = path.dirname(resolved);
    if (parent === resolved) {
      break;
    }
    current = parent;
  }

  return roots;
}

async function resolveConfigFile(
  explicitPath: string | undefined,
  searchRoots: string[],
): Promise<string | null> {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (!(await pathExists(resolved))) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    return resolved;
  }

  for (const root of searchRoots) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = path.join(root, filename);
      if (await pathExists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

async function importConfigModule(configPath: string): Promise<unknown> {
  const moduleUrl = pathToFileURL(configPath).href;
  const imported = await import(moduleUrl);
  return imported;
}

async function readJsonConfig(configPath: string): Promise<unknown> {
  const raw = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(raw) as unknown;
}

/**
 * Load tailwind-unwind config for a command and merge CLI overrides on top.
 */
export async function loadCommandOptions(
  command: CliCommand,
  cliOptions: ResolvedCommandOptions,
  options: { cwd?: string; targetPath?: string } = {},
): Promise<ResolvedCommandOptions> {
  const cwd = options.cwd ?? process.cwd();
  const searchRoots = await collectSearchRoots(cwd, options.targetPath);
  const configPath = await resolveConfigFile(cliOptions.configPath, searchRoots);

  if (!configPath) {
    return cliOptions;
  }

  const isJson =
    configPath.endsWith('.json') || configPath.endsWith('.tailwind-unwindrc');

  const loaded = isJson
    ? await readJsonConfig(configPath)
    : await importConfigModule(configPath);

  validateConfigFile(loaded, configPath);

  const fileConfig = mergeCommandConfig(command, normalizeLoadedConfig(loaded));
  const { configPath: _ignored, ...cliOverrides } = cliOptions;

  return {
    ...fileConfig,
    ...Object.fromEntries(
      Object.entries(cliOverrides).filter(([, value]) => value !== undefined),
    ),
    configPath,
  };
}
