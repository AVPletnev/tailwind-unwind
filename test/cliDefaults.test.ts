import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_TARGET_PATH,
  resolveOutputPath,
  resolveTargetPath,
} from '../src/cli/defaults.js';

describe('cli defaults', () => {
  it('uses project root when path is omitted', () => {
    expect(resolveTargetPath()).toBe(DEFAULT_TARGET_PATH);
    expect(resolveTargetPath('')).toBe(DEFAULT_TARGET_PATH);
    expect(resolveTargetPath('  ')).toBe(DEFAULT_TARGET_PATH);
  });

  it('keeps explicit scan path', () => {
    expect(resolveTargetPath('./src')).toBe('./src');
  });

  it('prefers CLI output over config and built-in default', () => {
    expect(resolveOutputPath()).toBe(DEFAULT_OUTPUT_PATH);
    expect(resolveOutputPath(undefined, 'src/styles.css')).toBe('src/styles.css');
    expect(resolveOutputPath('out.css', 'src/styles.css')).toBe('out.css');
  });
});
