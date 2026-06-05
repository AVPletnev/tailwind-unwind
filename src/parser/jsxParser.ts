import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type { JSXAttribute, JSXElement, Node } from '@babel/types';
import fs from 'node:fs/promises';
import type { ClassNameExtraction, ParseResult } from './types.js';
import { extractClassesFromExpression } from './classHelpers.js';

type TraverseFn = (
  ast: Node,
  visitors: { JSXElement?: (path: NodePath<JSXElement>) => void },
) => void;

function resolveTraverse(module: unknown): TraverseFn {
  if (typeof module === 'function') {
    return module as TraverseFn;
  }

  const withDefault = module as { default?: unknown };
  if (typeof withDefault.default === 'function') {
    return withDefault.default as TraverseFn;
  }

  throw new Error('Failed to load @babel/traverse');
}

const traverse = resolveTraverse(babelTraverse);

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

const CLASS_ATTRIBUTES = new Set(['className', 'class']);

function getAttributeName(attr: JSXAttribute): string | null {
  if (attr.name.type === 'JSXIdentifier') {
    return attr.name.name;
  }
  return null;
}

function isClassAttribute(attr: JSXAttribute): boolean {
  const name = getAttributeName(attr);
  return name !== null && CLASS_ATTRIBUTES.has(name);
}

function extractFromJSXAttribute(
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

function isJSXElementWithClassAttribute(path: NodePath<JSXElement>): boolean {
  const opening = path.node.openingElement;
  return opening.attributes.some(
    (attr) => attr.type === 'JSXAttribute' && isClassAttribute(attr),
  );
}

function collectExtractionsFromAst(
  ast: Node,
  filePath: string,
): { extractions: ClassNameExtraction[]; warnings: string[] } {
  const extractions: ClassNameExtraction[] = [];
  const warnings: string[] = [];

  traverse(ast, {
    JSXElement(path: NodePath<JSXElement>) {
      if (!isJSXElementWithClassAttribute(path)) {
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

  return { extractions, warnings };
}

/**
 * Parse in-memory source (used by tests and parseFile).
 */
export function parseSource(
  source: string,
  filePath = 'unknown',
): ParseResult {
  const extractions: ClassNameExtraction[] = [];
  const warnings: string[] = [];

  try {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: [...PARSER_PLUGINS],
      errorRecovery: true,
      allowReturnOutsideFunction: true,
      ranges: false,
      tokens: false,
    });

    const collected = collectExtractionsFromAst(ast, filePath);
    extractions.push(...collected.extractions);
    warnings.push(...collected.warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Failed to parse ${filePath}: ${message}`);
  }

  return { filePath, extractions, warnings };
}

/**
 * Parse a single source file and collect all className/class values from JSX.
 */
export async function parseFile(filePath: string): Promise<ParseResult> {
  const source = await fs.readFile(filePath, 'utf-8');
  return parseSource(source, filePath);
}
