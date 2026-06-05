import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type {
  Expression,
  JSXAttribute,
  JSXElement,
  Node,
  TemplateLiteral,
} from '@babel/types';

type TraverseFn = (
  ast: Node,
  visitors: { JSXElement?: (path: NodePath<JSXElement>) => void },
) => void;

interface BabelTraverseModule {
  default: TraverseFn;
}

// @babel/traverse is CJS; Node ESM exposes the callable on `.default`.
const traverse = (babelTraverse as unknown as BabelTraverseModule).default;
import fs from 'node:fs/promises';
import type { ClassNameExtraction, ParseResult } from './types.js';
import { splitClassString } from '../analyzer/combiner.js';

const PARSER_PLUGINS = [
  'jsx',
  'typescript',
  'decorators-legacy',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'dynamicImport',
  'importMeta',
] as const;

function extractFromStringLiteral(value: string): string[] {
  return splitClassString(value);
}

/**
 * Pull static string segments from template literals.
 * Dynamic expressions (`${...}`) are skipped — flagged as partially dynamic.
 */
function extractFromTemplateLiteral(node: TemplateLiteral): {
  classes: string[];
  hasExpressions: boolean;
} {
  const parts: string[] = [];
  let hasExpressions = node.expressions.length > 0;

  for (const quasi of node.quasis) {
    if (quasi.value.cooked) {
      parts.push(quasi.value.cooked);
    }
  }

  const combined = parts.join(' ').trim();
  return {
    classes: combined ? splitClassString(combined) : [],
    hasExpressions,
  };
}

function getAttributeName(attr: JSXAttribute): string | null {
  if (attr.name.type === 'JSXIdentifier') {
    return attr.name.name;
  }
  return null;
}

function extractClassesFromExpression(
  expression: Expression,
): { classes: string[]; isDynamic: boolean } | null {
  if (expression.type === 'StringLiteral') {
    return {
      classes: extractFromStringLiteral(expression.value),
      isDynamic: false,
    };
  }

  if (expression.type === 'TemplateLiteral') {
    const { classes, hasExpressions } = extractFromTemplateLiteral(expression);
    return { classes, isDynamic: hasExpressions };
  }

  // Conditional / call expressions like cn(), clsx() — dynamic for MVP
  return { classes: [], isDynamic: true };
}

function extractFromJSXAttribute(
  attr: JSXAttribute,
): ClassNameExtraction | null {
  const name = getAttributeName(attr);
  if (name !== 'className') {
    return null;
  }

  const line = attr.loc?.start.line;

  const value = attr.value;
  if (value == null) {
    return { classes: [], isDynamic: true, line };
  }

  if (value.type === 'StringLiteral') {
    return {
      classes: extractFromStringLiteral(value.value),
      isDynamic: false,
      line,
    };
  }

  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;

    if (expr.type === 'JSXEmptyExpression') {
      return { classes: [], isDynamic: true, line };
    }

    const result = extractClassesFromExpression(expr);
    if (!result) {
      return { classes: [], isDynamic: true, line };
    }

    return { classes: result.classes, isDynamic: result.isDynamic, line };
  }

  return { classes: [], isDynamic: true, line };
}

function isJSXElementWithClassName(path: NodePath<JSXElement>): boolean {
  const opening = path.node.openingElement;
  return opening.attributes.some((attr) => {
    if (attr.type !== 'JSXAttribute') return false;
    return getAttributeName(attr) === 'className';
  });
}

/**
 * Parse a single source file and collect all className values from JSX elements.
 */
export async function parseFile(filePath: string): Promise<ParseResult> {
  const source = await fs.readFile(filePath, 'utf-8');
  const extractions: ClassNameExtraction[] = [];
  const warnings: string[] = [];

  let ast;

  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: [...PARSER_PLUGINS],
      errorRecovery: true,
      allowReturnOutsideFunction: true,
      ranges: false,
      tokens: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Failed to parse ${filePath}: ${message}`);
    return { filePath, extractions, warnings };
  }

  traverse(ast, {
    JSXElement(path: NodePath<JSXElement>) {
      if (!isJSXElementWithClassName(path)) {
        return;
      }

      const opening = path.node.openingElement;

      for (const attr of opening.attributes) {
        if (attr.type !== 'JSXAttribute') continue;

        const extraction = extractFromJSXAttribute(attr);
        if (!extraction) continue;

        if (extraction.isDynamic && extraction.classes.length === 0) {
          const lineInfo = extraction.line ? `:${extraction.line}` : '';
          warnings.push(
            `Dynamic className skipped in ${filePath}${lineInfo}`,
          );
          continue;
        }

        if (extraction.classes.length > 0) {
          extractions.push(extraction);
        }
      }
    },
  });

  return { filePath, extractions, warnings };
}
