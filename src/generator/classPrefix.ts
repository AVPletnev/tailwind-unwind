/** Default namespace for generated component classes. */
export const DEFAULT_CLASS_PREFIX = 'twu-';

/** Normalize prefix so generated classes are clearly namespaced. */
export function normalizeClassPrefix(prefix?: string): string {
  if (!prefix || prefix.trim().length === 0) {
    return DEFAULT_CLASS_PREFIX;
  }

  const trimmed = prefix.trim();
  return trimmed.endsWith('-') ? trimmed : `${trimmed}-`;
}

/** Attach a namespace prefix to a base component class name. */
export function withClassPrefix(baseName: string, prefix?: string): string {
  const normalizedPrefix = normalizeClassPrefix(prefix);

  if (baseName.startsWith(normalizedPrefix)) {
    return baseName;
  }

  return `${normalizedPrefix}${baseName}`;
}
