import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';

const testProjectDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../test-project',
);

describe('initCommand', () => {
  it('creates a config file from test-project scan', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-init-'));
    const configPath = path.join(tempDir, 'tailwind-unwind.config.json');

    const result = await initCommand(testProjectDir, {
      output: configPath,
      force: true,
      minOccurrences: 2,
      top: 5,
    });

    expect(result.configPath).toBe(configPath);
    expect(result.extractablePatterns).toBeGreaterThan(0);

    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as {
      analyze?: { minOccurrences?: number };
      generate?: { prefix?: string };
      names?: Record<string, string>;
    };

    expect(config.analyze?.minOccurrences).toBe(2);
    expect(config.generate?.prefix).toBe('twu-');
    expect(Object.keys(config.names ?? {}).length).toBeGreaterThan(0);
  });

  it('refuses to overwrite without --force', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-init-force-'));
    const configPath = path.join(tempDir, 'tailwind-unwind.config.json');
    await writeFile(configPath, '{}\n', 'utf-8');

    await expect(
      initCommand(testProjectDir, { output: configPath }),
    ).rejects.toThrow(/already exists/i);
  });
});
