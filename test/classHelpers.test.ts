import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';
import type { Expression } from '@babel/types';
import { extractClassesFromExpression } from '../src/parser/classHelpers.js';

function parseExpression(code: string): Expression {
  const ast = parse(`(${code})`, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const statement = ast.program.body[0];
  if (statement?.type !== 'ExpressionStatement') {
    throw new Error('Expected expression statement');
  }

  return statement.expression;
}

describe('classHelpers', () => {
  it('extracts string literals', () => {
    const result = extractClassesFromExpression(parseExpression("'flex p-4'"));
    expect(result.classes).toEqual(['flex', 'p-4']);
    expect(result.isDynamic).toBe(false);
  });

  it('extracts cn() arguments including conditionals', () => {
    const result = extractClassesFromExpression(
      parseExpression("cn('flex', 'items-center', active && 'p-4')"),
    );
    expect(result.classes).toEqual(['flex', 'items-center', 'p-4']);
    expect(result.isDynamic).toBe(true);
  });

  it('extracts clsx() ternary branches', () => {
    const result = extractClassesFromExpression(
      parseExpression("clsx('gap-2', active ? 'p-4' : 'p-2')"),
    );
    expect(result.classes).toEqual(['gap-2', 'p-4', 'p-2']);
    expect(result.isDynamic).toBe(true);
  });

  it('extracts classnames() string arguments', () => {
    const result = extractClassesFromExpression(
      parseExpression("classnames('w-full', 'h-auto')"),
    );
    expect(result.classes).toEqual(['w-full', 'h-auto']);
    expect(result.isDynamic).toBe(false);
  });

  it('marks unknown call expressions as dynamic', () => {
    const result = extractClassesFromExpression(
      parseExpression("getClasses('flex')"),
    );
    expect(result.classes).toEqual([]);
    expect(result.isDynamic).toBe(true);
  });
});
