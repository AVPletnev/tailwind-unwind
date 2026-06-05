import babelGenerate from '@babel/generator';
import babelTraverse from '@babel/traverse';
import * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';
import type { JSXAttribute, JSXElement, Node } from '@babel/types';
import { normalizeClasses } from '../analyzer/combiner.js';
import {
  extractFromJSXAttribute,
  isClassAttribute,
  parseSourceToAst,
} from '../parser/ast.js';

type TraverseFn = (
  ast: Node,
  visitors: { JSXElement?: (path: NodePath<JSXElement>) => void },
) => void;

type GenerateFn = (
  ast: Node,
  options?: { retainLines?: boolean },
  source?: string,
) => { code: string };

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

function resolveGenerator(module: unknown): GenerateFn {
  if (typeof module === 'function') {
    return module as GenerateFn;
  }

  const withDefault = module as { default?: unknown };
  if (typeof withDefault.default === 'function') {
    return withDefault.default as GenerateFn;
  }

  throw new Error('Failed to load @babel/generator');
}

const traverse = resolveTraverse(babelTraverse);
const generate = resolveGenerator(babelGenerate);

export interface ClassReplacement {
  filePath: string;
  line?: number;
  from: string;
  to: string;
}

export interface SkippedReplacement {
  filePath: string;
  line?: number;
  reason: string;
  classes: string[];
}

export interface ReplaceClassNamesResult {
  source: string;
  replacements: ClassReplacement[];
  skipped: SkippedReplacement[];
  changed: boolean;
}

function lookupReplacement(
  extraction: { classes: string[]; isDynamic: boolean },
  replacementMap: Map<string, string>,
): string | null {
  if (extraction.isDynamic || extraction.classes.length === 0) {
    return null;
  }

  const key = normalizeClasses([...new Set(extraction.classes)]);
  return replacementMap.get(key) ?? null;
}

function setStringClassAttribute(
  attr: JSXAttribute,
  className: string,
): void {
  attr.value = t.stringLiteral(className);
}

/**
 * Replace exact matching className/class values with generated component classes.
 */
export function replaceClassNamesInSource(
  source: string,
  replacementMap: Map<string, string>,
  filePath: string,
): ReplaceClassNamesResult {
  const replacements: ClassReplacement[] = [];
  const skipped: SkippedReplacement[] = [];

  if (replacementMap.size === 0) {
    return { source, replacements, skipped, changed: false };
  }

  let ast: Node;

  try {
    ast = parseSourceToAst(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${filePath}: ${message}`);
  }

  traverse(ast, {
    JSXElement(path: NodePath<JSXElement>) {
      const opening = path.node.openingElement;

      for (const attr of opening.attributes) {
        if (attr.type !== 'JSXAttribute' || !isClassAttribute(attr)) {
          continue;
        }

        const extraction = extractFromJSXAttribute(attr);
        if (!extraction) continue;

        const replacement = lookupReplacement(extraction, replacementMap);

        if (!replacement) {
          if (extraction.classes.length > 0) {
            const key = normalizeClasses([...new Set(extraction.classes)]);
            if (replacementMap.size > 0 && !replacementMap.has(key)) {
              if (extraction.isDynamic) {
                skipped.push({
                  filePath,
                  line: extraction.line,
                  reason: 'dynamic className',
                  classes: extraction.classes,
                });
              }
            }
          }
          continue;
        }

        const from = normalizeClasses([...new Set(extraction.classes)]);
        setStringClassAttribute(attr, replacement);

        replacements.push({
          filePath,
          line: extraction.line,
          from,
          to: replacement,
        });
      }
    },
  });

  if (replacements.length === 0) {
    return { source, replacements, skipped, changed: false };
  }

  const output = generate(ast, { retainLines: true }, source);
  return {
    source: output.code,
    replacements,
    skipped,
    changed: true,
  };
}
