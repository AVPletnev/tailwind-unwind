import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { replaceClassNamesInSource } from '../src/codemod/replaceClassNames.js';
import { parseSource } from '../src/parser/jsxParser.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

describe('className function expressions', () => {
  it('extracts classes from NavLink-style arrow functions', async () => {
    const source = await readFile(
      path.join(fixturesDir, 'className-function.tsx'),
      'utf-8',
    );
    const result = parseSource(source, 'className-function.tsx');

    expect(result.warnings).toHaveLength(0);
    expect(result.extractions).toHaveLength(4);

    const dynamic = result.extractions.filter((item) => item.isDynamic);
    const staticCommon = result.extractions.filter((item) => !item.isDynamic);

    expect(dynamic).toHaveLength(2);
    expect(staticCommon).toHaveLength(2);

    const navLink = dynamic.find((item) => item.classes.includes('text-accent'));
    expect(navLink?.classes).toEqual(
      expect.arrayContaining([
        'no-underline',
        'text-accent',
        'text-light-text',
      ]),
    );

    const navCommon = staticCommon.find((item) =>
      item.classes.includes('no-underline'),
    );
    expect(navCommon?.classes).toEqual(
      expect.arrayContaining([
        'no-underline',
        'text-lg',
        'whitespace-no-wrap',
        'flex',
        'px-[10px]',
        'py-[2px]',
      ]),
    );
    expect(navCommon?.classes).not.toContain('text-accent');
    expect(navCommon?.classes).not.toContain('text-light-text');

    const blockBody = dynamic.find((item) => item.classes.includes('bg-blue'));
    expect(blockBody?.classes).toEqual(
      expect.arrayContaining(['bg-blue', 'flex', 'p-4']),
    );
  });

  it('replaces shared branch prefixes in NavLink-style ternaries', () => {
    const shared =
      'flex no-underline px-[10px] py-[2px] text-lg whitespace-no-wrap';
    const source = `<a className={({ isActive }) =>
      isActive
        ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
        : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
    }>x</a>`;
    const replacementMap = new Map([[shared, 'twu-nav']]);
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Nav.tsx',
    );

    expect(result.changed).toBe(true);
    expect(result.replacements[0]?.partial).toBe(true);
    expect(result.source).toContain('twu-nav text-accent');
    expect(result.source).toContain('twu-nav text-light-text');
  });

  it('replaces exact matches inside function/ternary branches', () => {
    const source = `<a className={({ isActive }) => (isActive ? 'flex p-4' : 'flex p-4')}>x</a>`;
    const replacementMap = new Map([['flex p-4', 'twu-stack']]);
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Link.tsx',
    );

    expect(result.changed).toBe(true);
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0]?.partial).toBe(true);
    expect(result.source).toContain('twu-stack');
    expect(result.source).toContain('isActive');
  });

  it('replaces only matching branch literals when branches differ', () => {
    const source = `<a className={({ isActive }) => isActive ? 'flex p-4 bg-blue' : 'flex p-4 bg-red'}>x</a>`;
    const replacementMap = new Map([['bg-blue flex p-4', 'twu-active']]);
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Link.tsx',
    );

    expect(result.changed).toBe(true);
    expect(result.source).toContain('twu-active');
    expect(result.source).toContain('bg-red');
  });

  it('replaces literals in block-bodied className functions', () => {
    const source = `<a className={({ isActive }) => { return isActive ? 'flex p-4' : 'flex p-4'; }}>x</a>`;
    const replacementMap = new Map([['flex p-4', 'twu-stack']]);
    const result = replaceClassNamesInSource(
      source,
      replacementMap,
      'Link.tsx',
    );

    expect(result.changed).toBe(true);
    expect(result.source).toContain('twu-stack');
  });
});
