import type { ArrowFunctionExpression, Expression, JSXAttribute } from '@babel/types';
import { normalizeClasses, splitClassString } from '../analyzer/combiner.js';

export const MIN_COMMON_BRANCH_CLASSES = 2;

export function unwrapExpression(expression: Expression): Expression {
  if (expression.type === 'ParenthesizedExpression') {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function collectFunctionReturnExpressions(
  body: ArrowFunctionExpression['body'],
): Expression[] {
  if (body.type !== 'BlockStatement') {
    return [unwrapExpression(body)];
  }

  const expressions: Expression[] = [];

  for (const statement of body.body) {
    if (statement.type === 'ReturnStatement' && statement.argument) {
      expressions.push(statement.argument);
    }
  }

  return expressions;
}

/**
 * Read static string literals from both sides of a className ternary
 * (including NavLink-style arrow functions).
 */
export function extractStaticBranchLiterals(
  expression: Expression,
): { consequent: string; alternate: string } | null {
  const unwrapped = unwrapExpression(expression);

  if (
    unwrapped.type === 'ArrowFunctionExpression' ||
    unwrapped.type === 'FunctionExpression'
  ) {
    const returns = collectFunctionReturnExpressions(unwrapped.body);
    if (returns.length !== 1) {
      return null;
    }

    return extractStaticBranchLiterals(returns[0]!);
  }

  if (unwrapped.type === 'ConditionalExpression') {
    if (
      unwrapped.consequent.type === 'StringLiteral' &&
      unwrapped.alternate.type === 'StringLiteral'
    ) {
      return {
        consequent: unwrapped.consequent.value,
        alternate: unwrapped.alternate.value,
      };
    }
  }

  return null;
}

export function commonClassTokens(left: string, right: string): string[] {
  const rightTokens = new Set(splitClassString(right));

  return [
    ...new Set(splitClassString(left).filter((token) => rightTokens.has(token))),
  ];
}

export function remainderClassTokens(value: string, common: string[]): string[] {
  const commonSet = new Set(common);

  return splitClassString(value).filter((token) => !commonSet.has(token));
}

export function rebuildWithComponent(
  componentClass: string,
  remainder: string[],
): string {
  if (remainder.length === 0) {
    return componentClass;
  }

  return `${componentClass} ${remainder.join(' ')}`;
}

export function commonClassKey(left: string, right: string): string | null {
  const common = commonClassTokens(left, right);

  if (common.length < MIN_COMMON_BRANCH_CLASSES) {
    return null;
  }

  return normalizeClasses(common);
}

/** Shared static classes from both branches of a className function/ternary. */
export function extractBranchCommonPrefixFromAttribute(
  attr: JSXAttribute,
): string[] | null {
  const value = attr.value;
  if (value?.type !== 'JSXExpressionContainer') {
    return null;
  }

  const expression = value.expression;
  if (expression.type === 'JSXEmptyExpression') {
    return null;
  }

  const branches = extractStaticBranchLiterals(expression);
  if (!branches) {
    return null;
  }

  const common = commonClassTokens(branches.consequent, branches.alternate);

  return common.length >= MIN_COMMON_BRANCH_CLASSES ? common : null;
}
