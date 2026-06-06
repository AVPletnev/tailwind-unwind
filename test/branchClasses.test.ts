import { describe, expect, it } from 'vitest';
import {
  commonClassKey,
  commonClassTokens,
  extractStaticBranchLiterals,
  rebuildWithComponent,
  remainderClassTokens,
} from '../src/parser/branchClasses.js';
import { parseSource } from '../src/parser/jsxParser.js';
import { replaceClassNamesInSource } from '../src/codemod/replaceClassNames.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

describe('branchClasses', () => {
  it('finds shared classes between ternary branches', () => {
    const left =
      'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent';
    const right =
      'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text';

    const common = commonClassTokens(left, right);

    expect(common).toEqual(
      expect.arrayContaining([
        'no-underline',
        'text-lg',
        'whitespace-no-wrap',
        'flex',
        'px-[10px]',
        'py-[2px]',
      ]),
    );
    expect(common).not.toContain('text-accent');
    expect(commonClassKey(left, right)).toBe(
      'flex no-underline px-[10px] py-[2px] text-lg whitespace-no-wrap',
    );
  });

  it('rebuilds branch strings with a component class and remainder', () => {
    const left =
      'no-underline text-lg flex px-[10px] py-[2px] text-accent';
    const common = commonClassTokens(
      left,
      'no-underline text-lg flex px-[10px] py-[2px] text-light-text',
    );

    expect(
      rebuildWithComponent('twu-nav', remainderClassTokens(left, common)),
    ).toBe('twu-nav text-accent');
  });

  it('registers shared branch prefixes as static occurrences', async () => {
    const source = await readFile(
      path.join(fixturesDir, 'nav-links.tsx'),
      'utf-8',
    );
    const result = parseSource(source, 'nav-links.tsx');

    const staticCommon = result.extractions.filter(
      (item) =>
        !item.isDynamic &&
        item.classes.includes('flex') &&
        item.classes.includes('text-accent') === false,
    );

    expect(staticCommon.length).toBeGreaterThanOrEqual(3);
  });

  it('replaces only the shared prefix inside NavLink-style ternaries', () => {
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
    expect(result.source).not.toContain('whitespace-no-wrap flex px-[10px]');
  });
});
