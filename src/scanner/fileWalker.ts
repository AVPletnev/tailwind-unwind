import fg from 'fast-glob';
import path from 'node:path';
import { IGNORE_PATTERNS } from './ignore.js';

const SOURCE_EXTENSIONS = ['tsx', 'jsx', 'ts', 'js'] as const;

/**
 * Recursively collect source files under `targetPath`, skipping common build/cache dirs.
 */
export async function walkSourceFiles(targetPath: string): Promise<string[]> {
  const absolutePath = path.resolve(targetPath);

  const patterns = SOURCE_EXTENSIONS.map((ext) =>
    path.join(absolutePath, `**/*.${ext}`).replace(/\\/g, '/'),
  );

  const files = await fg(patterns, {
    absolute: true,
    onlyFiles: true,
    unique: true,
    ignore: IGNORE_PATTERNS,
    dot: false,
  });

  return files.sort();
}
