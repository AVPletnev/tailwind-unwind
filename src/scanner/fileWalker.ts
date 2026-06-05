import fg from 'fast-glob';
import path from 'node:path';
import { IGNORE_PATTERNS } from './ignore.js';

const SOURCE_EXTENSIONS = ['tsx', 'jsx', 'ts', 'js'] as const;

export interface WalkSourceFilesOptions {
  include?: string[];
  exclude?: string[];
}

function toAbsolutePattern(basePath: string, pattern: string): string {
  const normalized = pattern.replace(/\\/g, '/');
  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.join(basePath, normalized).replace(/\\/g, '/');
}

function buildIncludePatterns(
  basePath: string,
  include?: string[],
): string[] {
  if (include && include.length > 0) {
    return include.map((pattern) => toAbsolutePattern(basePath, pattern));
  }

  return SOURCE_EXTENSIONS.map((ext) =>
    path.join(basePath, `**/*.${ext}`).replace(/\\/g, '/'),
  );
}

function buildIgnorePatterns(exclude?: string[]): string[] {
  const userExcludes = (exclude ?? []).map((pattern) => {
    const normalized = pattern.replace(/\\/g, '/');
    if (normalized.startsWith('**')) {
      return normalized;
    }
    return `**/${normalized}`;
  });

  return [...IGNORE_PATTERNS, ...userExcludes];
}

/**
 * Recursively collect source files under `targetPath`, skipping common build/cache dirs.
 */
export async function walkSourceFiles(
  targetPath: string,
  options: WalkSourceFilesOptions = {},
): Promise<string[]> {
  const absolutePath = path.resolve(targetPath);
  const patterns = buildIncludePatterns(absolutePath, options.include);
  const ignore = buildIgnorePatterns(options.exclude);

  const files = await fg(patterns, {
    absolute: true,
    onlyFiles: true,
    unique: true,
    ignore,
    dot: false,
  });

  return files.sort();
}
