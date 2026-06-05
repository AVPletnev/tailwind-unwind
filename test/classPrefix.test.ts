import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLASS_PREFIX,
  normalizeClassPrefix,
  withClassPrefix,
} from '../src/generator/classPrefix.js';

describe('classPrefix', () => {
  it('uses twu- as default prefix', () => {
    expect(DEFAULT_CLASS_PREFIX).toBe('twu-');
    expect(normalizeClassPrefix()).toBe('twu-');
  });

  it('normalizes prefix without trailing dash', () => {
    expect(normalizeClassPrefix('tw')).toBe('tw-');
  });

  it('applies prefix to base class names', () => {
    expect(withClassPrefix('toolbar')).toBe('twu-toolbar');
    expect(withClassPrefix('toolbar', 'app-')).toBe('app-toolbar');
  });

  it('does not double-prefix', () => {
    expect(withClassPrefix('twu-toolbar', 'twu-')).toBe('twu-toolbar');
  });
});
