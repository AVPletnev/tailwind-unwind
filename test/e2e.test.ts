import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildComponents } from '../src/core/buildComponents.js';
import { scanProject } from '../src/core/scanProject.js';
import { replaceClassNamesInSource } from '../src/codemod/replaceClassNames.js';

const testProjectDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../test-project',
);

describe('e2e pipeline', () => {
  it('scans, generates components, and applies replacements', async () => {
    const scanResult = await scanProject({
      targetPath: testProjectDir,
      minOccurrences: 3,
      topLimit: 10,
      extractableMinOccurrences: 3,
    });

    expect(scanResult.occurrences.length).toBeGreaterThan(0);
    expect(scanResult.report.stats.topCombinations.length).toBeGreaterThan(0);
    expect(
      scanResult.report.stats.topCombinations.some((combo) => combo.extractable),
    ).toBe(true);

    const { css, components, replacementMap } = buildComponents(
      scanResult.occurrences,
      {
        sourcePath: testProjectDir,
        minOccurrences: 3,
        topLimit: 10,
        prefix: 'twu-',
      },
    );

    expect(components.length).toBeGreaterThan(0);
    expect(css).toContain('@layer components');
    expect(css).toContain('.twu-');

    const layoutPath = path.join(testProjectDir, 'components/Layout.tsx');
    const layoutSource = await readFile(layoutPath, 'utf-8');
    const replaced = replaceClassNamesInSource(
      layoutSource,
      replacementMap,
      layoutPath,
    );

    expect(replaced.changed).toBe(true);
    expect(replaced.replacements.length).toBeGreaterThan(0);
    expect(replaced.source).toContain('twu-');
    expect(replaced.source).not.toContain(
      'flex items-center justify-between p-4',
    );
  });
});
