import { describe, expect, it } from 'vitest';
import { replaceClassNamesInSource } from '../src/codemod/replaceClassNames.js';

describe('replaceClassNamesInSource', () => {
  const replacementMap = new Map<string, string>([
    ['flex items-center justify-between p-4', 'twu-toolbar'],
    ['h-auto object-cover rounded-lg w-full', 'twu-media-cover'],
  ]);

  it('replaces static className strings', () => {
    const source = `<div className="flex items-center justify-between p-4">Header</div>`;
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Test.tsx',
    );

    expect(result.changed).toBe(true);
    expect(result.replacements).toHaveLength(1);
    expect(result.source).toContain('className="twu-toolbar"');
    expect(result.source).not.toContain('justify-between p-4');
  });

  it('replaces static cn() calls with a string className', () => {
    const source = `<div className={cn('flex', 'items-center', 'justify-between', 'p-4')}>A</div>`;
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Test.tsx',
    );

    expect(result.changed).toBe(true);
    expect(result.source).toContain('className="twu-toolbar"');
  });

  it('skips dynamic className expressions', () => {
    const source = `<div className={getClasses()}>A</div>`;
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Test.tsx',
    );

    expect(result.changed).toBe(false);
    expect(result.replacements).toHaveLength(0);
  });

  it('leaves non-matching class sets unchanged', () => {
    const source = `<div className="text-sm font-bold">Label</div>`;
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Test.tsx',
    );

    expect(result.changed).toBe(false);
    expect(result.source).toContain('text-sm font-bold');
  });
});
