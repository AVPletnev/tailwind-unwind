import { parse } from '@babel/parser';
import type { JSXAttribute, Node } from '@babel/types';
import type { ClassNameExtraction } from './types.js';
import { extractClassesFromExpression } from './classHelpers.js';

export const PARSER_PLUGINS = [
  'jsx',
  'typescript',
  'decorators-legacy',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'dynamicImport',
  'importMeta',
] as const;

const CLASS_ATTRIBUTES = new Set(['className', 'class']);

function getAttributeName(attr: JSXAttribute): string | null {
  if (attr.name.type === 'JSXIdentifier') {
    return attr.name.name;
  }
  return null;
}

export function isClassAttribute(attr: JSXAttribute): boolean {
  const name = getAttributeName(attr);
  return name !== null && CLASS_ATTRIBUTES.has(name);
}

/** Extract Tailwind classes from a className/class JSX attribute. */
export function extractFromJSXAttribute(
  attr: JSXAttribute,
): ClassNameExtraction | null {
  if (!isClassAttribute(attr)) {
    return null;
  }

  const line = attr.loc?.start.line;
  const value = attr.value;

  if (value == null) {
    return { classes: [], isDynamic: true, line };
  }

  if (value.type === 'StringLiteral') {
    const result = extractClassesFromExpression(value);
    return { classes: result.classes, isDynamic: result.isDynamic, line };
  }

  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;

    if (expr.type === 'JSXEmptyExpression') {
      return { classes: [], isDynamic: true, line };
    }

    const result = extractClassesFromExpression(expr);
    return { classes: result.classes, isDynamic: result.isDynamic, line };
  }

  return { classes: [], isDynamic: true, line };
}

export function parseSourceToAst(source: string): Node {
  return parse(source, {
    sourceType: 'module',
    plugins: [...PARSER_PLUGINS],
    errorRecovery: true,
    allowReturnOutsideFunction: true,
    ranges: false,
    tokens: false,
  });
}
