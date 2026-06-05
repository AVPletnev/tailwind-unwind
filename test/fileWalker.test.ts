import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { walkSourceFiles } from '../src/scanner/fileWalker.js';

describe('walkSourceFiles', () => {
  it('honors include and exclude glob patterns', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-walk-'));
    const srcDir = path.join(tempDir, 'src');
    await mkdir(srcDir, { recursive: true });

    await writeFile(path.join(srcDir, 'Button.tsx'), 'export {};\n', 'utf-8');
    await writeFile(path.join(srcDir, 'Button.test.tsx'), 'export {};\n', 'utf-8');
    await writeFile(path.join(tempDir, 'legacy.js'), 'export {};\n', 'utf-8');

    const files = await walkSourceFiles(tempDir, {
      include: ['src/**/*.tsx'],
      exclude: ['**/*.test.tsx'],
    });

    expect(files).toHaveLength(1);
    expect(files[0]).toContain('Button.tsx');
    expect(files[0]).not.toContain('Button.test.tsx');
  });
});
