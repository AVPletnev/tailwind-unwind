import babelGenerate from '@babel/generator';
import babelTraverse from '@babel/traverse';
import * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';
import type {
  CallExpression,
  Expression,
  JSXAttribute,
  JSXElement,
  Node,
} from '@babel/types';
import { normalizeClasses } from '../analyzer/combiner.js';
import { replaceInExpression } from './expressionReplace.js';
import {
  CLASS_MERGE_CALLEES,
  extractClassesFromExpression,
} from '../parser/classHelpers.js';
import {
  extractFromJSXAttribute,
  isClassAttribute,
  parseSourceToAst,
} from '../parser/ast.js';
import { collectVariantRegistry } from '../parser/variantHelpers.js';

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
  partial?: boolean;
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

function isClassMergeCallee(expression: Expression): boolean {
  if (expression.type === 'Identifier') {
    return CLASS_MERGE_CALLEES.has(expression.name);
  }

  if (
    expression.type === 'MemberExpression' &&
    expression.property.type === 'Identifier'
  ) {
    return CLASS_MERGE_CALLEES.has(expression.property.name);
  }

  return false;
}

function isClassMergeCall(expression: Expression): expression is CallExpression {
  return (
    expression.type === 'CallExpression' &&
    expression.callee.type !== 'V8IntrinsicIdentifier' &&
    isClassMergeCallee(expression.callee)
  );
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

function setStringClassAttribute(attr: JSXAttribute, className: string): void {
  attr.value = t.stringLiteral(className);
}

interface MergeCallReplacement {
  expression: Expression;
  from: string;
  to: string;
  partial: boolean;
}

/**
 * Replace static utility groups inside cn()/clsx() while preserving dynamic args.
 */
function tryReplaceMergeCall(
  call: CallExpression,
  replacementMap: Map<string, string>,
): MergeCallReplacement | null {
  const staticClasses: string[] = [];
  const dynamicArgs: CallExpression['arguments'] = [];

  for (const arg of call.arguments) {
    if (arg.type === 'SpreadElement' || arg.type === 'ArgumentPlaceholder') {
      dynamicArgs.push(arg);
      continue;
    }

    const extracted = extractClassesFromExpression(arg);
    if (extracted.isDynamic) {
      dynamicArgs.push(arg);
      continue;
    }

    staticClasses.push(...extracted.classes);
  }

  const combinedKey = normalizeClasses([...new Set(staticClasses)]);
  const combinedReplacement = replacementMap.get(combinedKey);

  if (combinedReplacement && staticClasses.length > 0) {
    if (dynamicArgs.length === 0) {
      return {
        expression: t.stringLiteral(combinedReplacement),
        from: combinedKey,
        to: combinedReplacement,
        partial: false,
      };
    }

    return {
      expression: t.callExpression(call.callee, [
        t.stringLiteral(combinedReplacement),
        ...dynamicArgs,
      ]),
      from: combinedKey,
      to: combinedReplacement,
      partial: true,
    };
  }

  let replaced = false;
  let replacedTo = '';
  let replacedFrom = '';
  const newArgs = [...call.arguments];

  for (let index = 0; index < call.arguments.length; index += 1) {
    const arg = call.arguments[index];
    if (
      arg === undefined ||
      arg.type === 'SpreadElement' ||
      arg.type === 'ArgumentPlaceholder'
    ) {
      continue;
    }

    const extracted = extractClassesFromExpression(arg);
    if (extracted.isDynamic || extracted.classes.length === 0) {
      continue;
    }

    const argKey = normalizeClasses(extracted.classes);
    const replacement = replacementMap.get(argKey);
    if (!replacement) {
      continue;
    }

    newArgs[index] = t.stringLiteral(replacement);
    if (!replaced) {
      replacedFrom = argKey;
      replacedTo = replacement;
    }
    replaced = true;
  }

  if (!replaced) {
    return null;
  }

  return {
    expression: t.callExpression(call.callee, newArgs),
    from: replacedFrom,
    to: replacedTo,
    partial: true,
  };
}

function tryReplaceTemplateLiteral(
  attr: JSXAttribute,
  replacementMap: Map<string, string>,
  registry: ReturnType<typeof collectVariantRegistry>,
): MergeCallReplacement | null {
  const value = attr.value;
  if (value?.type !== 'JSXExpressionContainer') {
    return null;
  }

  const expression = value.expression;
  if (expression.type !== 'TemplateLiteral' || expression.expressions.length === 0) {
    return null;
  }

  const extracted = extractClassesFromExpression(expression, registry);
  if (extracted.classes.length === 0) {
    return null;
  }

  const key = normalizeClasses(extracted.classes);
  const replacement = replacementMap.get(key);
  if (!replacement) {
    return null;
  }

  const newQuasis = expression.quasis.map((quasi, index) => {
    if (index !== 0) {
      return quasi;
    }

    const prefix = expression.expressions.length > 0 ? `${replacement} ` : replacement;
    return t.templateElement(
      { raw: prefix, cooked: prefix },
      quasi.tail,
    );
  });

  return {
    expression: t.templateLiteral(newQuasis, [...expression.expressions]),
    from: key,
    to: replacement,
    partial: true,
  };
}

function tryReplaceClassAttribute(
  attr: JSXAttribute,
  replacementMap: Map<string, string>,
  registry: ReturnType<typeof collectVariantRegistry>,
): MergeCallReplacement | null {
  const value = attr.value;
  if (value?.type !== 'JSXExpressionContainer') {
    return null;
  }

  const expression = value.expression;
  if (expression.type === 'JSXEmptyExpression') {
    return null;
  }

  if (isClassMergeCall(expression)) {
    return tryReplaceMergeCall(expression, replacementMap);
  }

  const dynamicReplacement = replaceInExpression(expression, replacementMap);
  if (dynamicReplacement.changed) {
    return {
      expression: dynamicReplacement.node,
      from: dynamicReplacement.from,
      to: dynamicReplacement.to,
      partial: dynamicReplacement.partial,
    };
  }

  return tryReplaceTemplateLiteral(attr, replacementMap, registry);
}

/**
 * Replace exact matching className/class values with generated component classes.
 * Supports partial replacement inside cn()/clsx() when dynamic args are present.
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

  const variantRegistry = collectVariantRegistry(ast);

  traverse(ast, {
    JSXElement(path: NodePath<JSXElement>) {
      const opening = path.node.openingElement;

      for (const attr of opening.attributes) {
        if (attr.type !== 'JSXAttribute' || !isClassAttribute(attr)) {
          continue;
        }

        const extraction = extractFromJSXAttribute(attr, variantRegistry);
        if (!extraction) continue;

        const mergeReplacement = tryReplaceClassAttribute(
          attr,
          replacementMap,
          variantRegistry,
        );
        if (mergeReplacement) {
          if (mergeReplacement.expression.type === 'StringLiteral') {
            setStringClassAttribute(attr, mergeReplacement.expression.value);
          } else {
            attr.value = t.jsxExpressionContainer(mergeReplacement.expression);
          }

          replacements.push({
            filePath,
            line: extraction.line,
            from: mergeReplacement.from,
            to: mergeReplacement.to,
            partial: mergeReplacement.partial,
          });
          continue;
        }

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
