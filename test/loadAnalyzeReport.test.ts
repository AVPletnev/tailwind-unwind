import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadExtractableCombinations } from '../src/core/loadAnalyzeReport.js';

describe('loadExtractableCombinations', () => {
  it('loads extractable combinations from analyze JSON', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-report-'));
    const reportPath = path.join(tempDir, 'report.json');

    await writeFile(
      reportPath,
      JSON.stringify({
        targetPath: '/project/src',
        stats: {
          filesScanned: 10,
          componentsWithClassName: 20,
          uniqueCombinations: 5,
          totalClassUsages: 100,
          potentialReductionPercent: 12,
          topCombinations: [
            {
              normalized: 'flex items-center p-4',
              classes: ['flex', 'items-center', 'p-4'],
              occurrences: 8,
              suggestion: '.page-header',
              locations: [],
              extractable: true,
            },
            {
              normalized: 'flex p-4',
              classes: ['flex', 'p-4'],
              occurrences: 10,
              suggestion: '.toolbar',
              locations: [],
              extractable: false,
            },
          ],
        },
        parseWarnings: [],
      }),
      'utf-8',
    );

    const loaded = await loadExtractableCombinations(reportPath);

    expect(loaded.targetPath).toBe('/project/src');
    expect(loaded.combinations).toHaveLength(1);
    expect(loaded.combinations[0]?.normalized).toBe('flex items-center p-4');
  });
});
