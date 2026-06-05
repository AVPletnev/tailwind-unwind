import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSource } from '../src/parser/jsxParser.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

async function readFixture(name: string): Promise<string> {
  return readFile(path.join(fixturesDir, name), 'utf-8');
}

describe('jsxParser', () => {
  it('extracts static className strings', async () => {
    const source = await readFixture('static.tsx');
    const result = parseSource(source, 'static.tsx');

    expect(result.warnings).toHaveLength(0);
    expect(result.extractions).toHaveLength(2);
    expect(result.extractions[0]?.classes).toContain('rounded');
    expect(result.extractions[1]?.classes).toContain('flex');
  });

  it('extracts static parts from template literals', async () => {
    const source = await readFixture('template-literal.tsx');
    const result = parseSource(source, 'template-literal.tsx');

    expect(result.extractions[0]?.classes).toEqual(['flex', 'p-4']);
    expect(result.extractions[0]?.isDynamic).toBe(true);
  });

  it('extracts cn/clsx/classnames calls', async () => {
    const source = await readFixture('cn-clsx.tsx');
    const result = parseSource(source, 'cn-clsx.tsx');

    expect(result.extractions).toHaveLength(3);
    expect(result.extractions[0]?.classes).toEqual(['flex', 'items-center', 'p-4']);
    expect(result.extractions[1]?.classes).toEqual(['flex', 'gap-2', 'p-4', 'p-2']);
    expect(result.extractions[2]?.classes).toEqual(['w-full', 'h-auto']);
  });

  it('supports the class attribute', async () => {
    const source = await readFixture('class-attr.tsx');
    const result = parseSource(source, 'class-attr.tsx');

    expect(result.extractions[0]?.classes).toEqual(['flex', 'p-4', 'text-sm']);
  });

  it('warns on fully dynamic className expressions', async () => {
    const source = await readFixture('dynamic-unresolved.tsx');
    const result = parseSource(source, 'dynamic-unresolved.tsx');

    expect(result.extractions).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('Dynamic className skipped'))).toBe(
      true,
    );
  });
});
