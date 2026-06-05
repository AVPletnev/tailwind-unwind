export const ANALYZE_DEFAULTS = {
  minOccurrences: 5,
  minSize: 2,
  maxSize: 5,
  top: 10,
} as const;

export const GENERATE_DEFAULTS = {
  minOccurrences: 3,
  minSize: 2,
  maxSize: 5,
  top: 10,
  prefix: 'twu-',
} as const;
