import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export interface FormatSourceOptions {
  filePath: string;
  cwd?: string;
}

interface PrettierModule {
  format: (source: string, options?: Record<string, unknown>) => Promise<string>;
  resolveConfig: (
    filePath: string,
  ) => Promise<Record<string, unknown> | null>;
}

async function loadPrettier(): Promise<PrettierModule | null> {
  try {
    const prettier = await import('prettier');
    return prettier as unknown as PrettierModule;
  } catch {
    try {
      return require('prettier') as PrettierModule;
    } catch {
      return null;
    }
  }
}

/**
 * Format source with Prettier when available in the project.
 * Returns original source unchanged if Prettier is not installed.
 */
export async function formatSource(
  source: string,
  options: FormatSourceOptions,
): Promise<{ source: string; formatted: boolean }> {
  const prettier = await loadPrettier();
  if (!prettier) {
    return { source, formatted: false };
  }

  try {
    const config = await prettier.resolveConfig(options.filePath);
    const formatted = await prettier.format(source, {
      ...config,
      filepath: options.filePath,
    });

    return { source: formatted, formatted: true };
  } catch {
    return { source, formatted: false };
  }
}

export async function formatModifiedFiles(
  files: string[],
  sources: Map<string, string>,
  cwd = process.cwd(),
): Promise<{ formatted: string[]; skipped: string[] }> {
  const formatted: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const source = sources.get(file);
    if (!source) {
      skipped.push(file);
      continue;
    }

    const result = await formatSource(source, {
      filePath: path.resolve(cwd, file),
      cwd,
    });

    if (result.formatted) {
      sources.set(file, result.source);
      formatted.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { formatted, skipped };
}
