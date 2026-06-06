export const DEFAULT_TARGET_PATH = '.' as const;
export const DEFAULT_OUTPUT_PATH = 'styles.css' as const;

export const ANALYZE_DEFAULTS = {
  minOccurrences: 5,
  minSize: 2,
  top: 10,
} as const;

export const GENERATE_DEFAULTS = {
  minOccurrences: 3,
  minSize: 2,
  top: 10,
  prefix: 'twu-',
  output: DEFAULT_OUTPUT_PATH,
} as const;

export function resolveTargetPath(targetPath?: string): string {
  if (typeof targetPath === 'string' && targetPath.trim().length > 0) {
    return targetPath;
  }

  return DEFAULT_TARGET_PATH;
}

export function resolveOutputPath(
  cliOutput?: string,
  configOutput?: string,
): string {
  return cliOutput ?? configOutput ?? DEFAULT_OUTPUT_PATH;
}
