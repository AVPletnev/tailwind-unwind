import type { ClassReplacement } from '../codemod/replaceClassNames.js';

export interface SavingsReport {
  replacementCount: number;
  utilityTokensBefore: number;
  utilityTokensAfter: number;
  tokensSaved: number;
  percentReduction: number;
}

/**
 * Estimate utility-token savings from applied replacements.
 * Each replacement collapses N utilities into 1 component class.
 */
export function calculateSavings(
  replacements: ClassReplacement[],
): SavingsReport {
  if (replacements.length === 0) {
    return {
      replacementCount: 0,
      utilityTokensBefore: 0,
      utilityTokensAfter: 0,
      tokensSaved: 0,
      percentReduction: 0,
    };
  }

  let utilityTokensBefore = 0;

  for (const replacement of replacements) {
    utilityTokensBefore += replacement.from.split(/\s+/).filter(Boolean).length;
  }

  const utilityTokensAfter = replacements.length;
  const tokensSaved = Math.max(0, utilityTokensBefore - utilityTokensAfter);
  const percentReduction =
    utilityTokensBefore === 0
      ? 0
      : Math.round((tokensSaved / utilityTokensBefore) * 100);

  return {
    replacementCount: replacements.length,
    utilityTokensBefore,
    utilityTokensAfter,
    tokensSaved,
    percentReduction,
  };
}
