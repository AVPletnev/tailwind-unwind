import { describe, expect, it } from 'vitest';
import { calculateSavings } from '../src/analyzer/savings.js';

describe('calculateSavings', () => {
  it('computes token reduction from replacements', () => {
    const savings = calculateSavings([
      {
        filePath: 'A.tsx',
        from: 'flex items-center p-4',
        to: 'twu-toolbar',
      },
      {
        filePath: 'B.tsx',
        from: 'w-full h-auto object-cover',
        to: 'twu-media-cover',
      },
    ]);

    expect(savings.utilityTokensBefore).toBe(6);
    expect(savings.utilityTokensAfter).toBe(2);
    expect(savings.tokensSaved).toBe(4);
    expect(savings.percentReduction).toBe(67);
  });
});
