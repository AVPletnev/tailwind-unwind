import { describe, expect, it } from 'vitest';
import { createSpinner, isInteractiveTerminal } from '../src/cli/spinner.js';

describe('spinner', () => {
  it('disables itself when enabled option is false', () => {
    const writes: string[] = [];
    const stream = {
      isTTY: true,
      write: (chunk: string) => {
        writes.push(chunk);
        return true;
      },
    } as NodeJS.WriteStream;

    const spinner = createSpinner({ enabled: false, stream });
    spinner.start('Working');
    spinner.update('Working 1/10');
    spinner.stop('Done');

    expect(writes).toEqual([]);
    expect(spinner.enabled).toBe(false);
  });

  it('renders and clears a spinner line when enabled', () => {
    const writes: string[] = [];
    const stream = {
      isTTY: true,
      write: (chunk: string) => {
        writes.push(chunk);
        return true;
      },
    } as NodeJS.WriteStream;

    const spinner = createSpinner({ enabled: true, stream });
    spinner.start('Scanning source files');
    spinner.update('Scanning source files... 3/10');
    spinner.stop();

    expect(writes.some((line) => line.includes('Scanning source files'))).toBe(true);
    expect(writes.at(-1)).toBe('\r\x1b[K');
  });

  it('treats CI environments as non-interactive', () => {
    const previous = process.env.CI;
    process.env.CI = 'true';

    try {
      expect(
        isInteractiveTerminal({
          isTTY: true,
          write: () => true,
        } as NodeJS.WriteStream),
      ).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = previous;
      }
    }
  });
});
