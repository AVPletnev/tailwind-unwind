import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkCommand } from '../src/commands/check.js';
import { groupSkippedByReason } from '../src/reporters/skippedReporter.js';

const testProjectDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../test-project',
);

describe('checkCommand', () => {
  it('reports extractable patterns and dry-run preview', async () => {
    const result = await checkCommand(testProjectDir, {
      minOccurrences: 2,
      extractableMinOccurrences: 2,
      top: 5,
      output: 'styles.css',
      format: 'json',
    });

    expect(result.passed).toBe(true);
    expect(result.extractablePatternCount).toBeGreaterThan(0);
    expect(result.preview).not.toBeNull();
    expect(result.preview?.replacementsTotal).toBeGreaterThan(0);
    expect(result.report.stats.extractablePatternCount).toBe(
      result.extractablePatternCount,
    );
  });

  it('fails when extractable patterns exceed the limit', async () => {
    const exit = process.exit;
    const exits: number[] = [];
    process.exit = ((code?: number) => {
      exits.push(code ?? 0);
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit;

    try {
      await expect(
        checkCommand(testProjectDir, {
          minOccurrences: 2,
          extractableMinOccurrences: 2,
          output: 'styles.css',
          format: 'json',
          failOnExtractable: 0,
        }),
      ).rejects.toThrow(/exit:1/);
      expect(exits).toEqual([1]);
    } finally {
      process.exit = exit;
    }
  });
});

describe('groupSkippedByReason', () => {
  it('groups skipped replacements by reason', () => {
    const groups = groupSkippedByReason([
      {
        filePath: 'a.tsx',
        reason: 'dynamic className',
        classes: ['flex'],
      },
      {
        filePath: 'b.tsx',
        reason: 'dynamic className',
        classes: ['p-4'],
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.reason).toBe('dynamic className');
    expect(groups[0]?.count).toBe(2);
  });
});
