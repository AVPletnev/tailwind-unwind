import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCommandOptions } from '../src/config/loadConfig.js';
import { validateConfigFile } from '../src/config/validate.js';

describe('loadCommandOptions', () => {
  it('merges JSON config with CLI overrides', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-config-'));
    const configPath = path.join(tempDir, 'tailwind-unwind.config.json');

    await writeFile(
      configPath,
      JSON.stringify({
        minOccurrences: 4,
        prefix: 'app-',
        exclude: ['**/*.test.tsx'],
      }),
      'utf-8',
    );

    const resolved = await loadCommandOptions(
      'generate',
      {
        configPath,
        minOccurrences: 2,
        include: ['src/**/*.tsx'],
      },
      { cwd: tempDir },
    );

    expect(resolved.minOccurrences).toBe(2);
    expect(resolved.prefix).toBe('app-');
    expect(resolved.include).toEqual(['src/**/*.tsx']);
    expect(resolved.exclude).toEqual(['**/*.test.tsx']);
  });

  it('applies command-specific config sections', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-config-'));
    const configPath = path.join(tempDir, 'tailwind-unwind.config.json');

    await writeFile(
      configPath,
      JSON.stringify({
        prefix: 'global-',
        analyze: { minOccurrences: 8, top: 5 },
        generate: { minOccurrences: 2, prefix: 'twu-', output: 'out.css' },
        apply: { dryRun: true },
      }),
      'utf-8',
    );

    const analyze = await loadCommandOptions(
      'analyze',
      { configPath },
      { cwd: tempDir },
    );
    const generate = await loadCommandOptions(
      'generate',
      { configPath },
      { cwd: tempDir },
    );
    const apply = await loadCommandOptions(
      'apply',
      { configPath },
      { cwd: tempDir },
    );

    expect(analyze.minOccurrences).toBe(8);
    expect(analyze.top).toBe(5);
    expect(analyze.prefix).toBe('global-');

    expect(generate.minOccurrences).toBe(2);
    expect(generate.prefix).toBe('twu-');
    expect(generate.output).toBe('out.css');

    expect(apply.dryRun).toBe(true);
    expect(apply.prefix).toBe('global-');
  });

  it('discovers config from target path ancestors', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-config-'));
    const srcDir = path.join(tempDir, 'src', 'components');
    await mkdir(srcDir, { recursive: true });

    await writeFile(
      path.join(tempDir, 'tailwind-unwind.config.json'),
      JSON.stringify({ generate: { prefix: 'app-' } }),
      'utf-8',
    );

    const resolved = await loadCommandOptions(
      'generate',
      {},
      { cwd: os.tmpdir(), targetPath: srcDir },
    );

    expect(resolved.prefix).toBe('app-');
    expect(resolved.configPath).toContain('tailwind-unwind.config.json');
  });

  it('loads custom names mapping', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'twu-config-'));
    const configPath = path.join(tempDir, 'tailwind-unwind.config.json');

    await writeFile(
      configPath,
      JSON.stringify({
        names: {
          'flex items-center p-4': 'toolbar',
        },
      }),
      'utf-8',
    );

    const resolved = await loadCommandOptions(
      'generate',
      { configPath },
      { cwd: tempDir },
    );

    expect(resolved.names).toEqual({
      'flex items-center p-4': 'toolbar',
    });
  });
});

describe('validateConfigFile', () => {
  it('throws with helpful errors for invalid config', () => {
    expect(() =>
      validateConfigFile(
        {
          unknownKey: true,
          names: { 'flex p-4': 'bad name!' },
          analyze: { minOccurrences: 0 },
        },
        'test.json',
      ),
    ).toThrow(/Unknown config key "unknownKey"/);

    expect(() =>
      validateConfigFile(
        {
          names: { 'flex p-4': 'bad name!' },
        },
        'test.json',
      ),
    ).toThrow(/valid class name/);
  });
});
