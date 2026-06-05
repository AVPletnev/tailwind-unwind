/** Directories excluded from recursive file scanning. */
export const IGNORED_DIRECTORIES = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
] as const;

/** fast-glob ignore patterns — match directories at any depth. */
export const IGNORE_PATTERNS: string[] = IGNORED_DIRECTORIES.map(
  (dir) => `**/${dir}/**`,
);
