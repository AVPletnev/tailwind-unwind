import type {
  ArrayExpression,
  ArrowFunctionExpression,
  CallExpression,
  ConditionalExpression,
  Expression,
  FunctionExpression,
  LogicalExpression,
  TemplateLiteral,
} from '@babel/types';
import { splitClassString } from '../analyzer/combiner.js';
import {
  type VariantRegistry,
  extractClassesFromVariantCall,
  isVariantCallee,
} from './variantHelpers.js';

/** Utilities commonly used to merge Tailwind class strings. */
export const CLASS_MERGE_CALLEES = new Set([
  'cn',
  'clsx',
  'classnames',
  'classNames',
  'twMerge',
  'cx',
]);

export interface ExtractedClasses {
  classes: string[];
  isDynamic: boolean;
}

function mergeExtractions(parts: ExtractedClasses[]): ExtractedClasses {
  const classes = [...new Set(parts.flatMap((part) => part.classes))];
  const isDynamic = parts.some((part) => part.isDynamic);

  return { classes, isDynamic };
}

function extractFromStringLiteral(value: string): ExtractedClasses {
  return {
    classes: splitClassString(value),
    isDynamic: false,
  };
}

function extractFromTemplateLiteral(node: TemplateLiteral): ExtractedClasses {
  const parts: string[] = [];

  for (const quasi of node.quasis) {
    if (quasi.value.cooked) {
      parts.push(quasi.value.cooked);
    }
  }

  const combined = parts.join(' ').trim();

  return {
    classes: combined ? splitClassString(combined) : [],
    isDynamic: node.expressions.length > 0,
  };
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

function extractFromCallArguments(
  args: CallExpression['arguments'],
  registry?: VariantRegistry,
): ExtractedClasses {
  const parts: ExtractedClasses[] = [];

  for (const arg of args) {
    if (arg.type === 'SpreadElement' || arg.type === 'ArgumentPlaceholder') {
      parts.push({ classes: [], isDynamic: true });
      continue;
    }

    parts.push(extractClassesFromExpression(arg, registry));
  }

  return mergeExtractions(parts);
}

/**
 * Recursively pull static Tailwind tokens from JSX className expressions.
 * Unknown/dynamic fragments set `isDynamic: true` but may still yield partial classes.
 */
function extractFromVariantCall(
  call: CallExpression,
  registry?: VariantRegistry,
): ExtractedClasses {
  const { callee } = call;

  if (callee.type !== 'V8IntrinsicIdentifier' && isVariantCallee(callee)) {
    const classes = extractClassesFromVariantCall(call);
    const hasDynamicArgs = call.arguments.some(
      (arg) =>
        arg.type === 'SpreadElement' || arg.type === 'ArgumentPlaceholder',
    );

    return { classes, isDynamic: hasDynamicArgs };
  }

  if (callee.type === 'Identifier' && registry?.has(callee.name)) {
    const classes = registry.get(callee.name) ?? [];
    const hasArgs = call.arguments.length > 0;
    return { classes, isDynamic: hasArgs };
  }

  return { classes: [], isDynamic: true };
}

export function extractClassesFromExpression(
  expression: Expression,
  registry?: VariantRegistry,
): ExtractedClasses {
  switch (expression.type) {
    case 'StringLiteral':
      return extractFromStringLiteral(expression.value);

    case 'TemplateLiteral':
      return extractFromTemplateLiteral(expression);

    case 'CallExpression': {
      const { callee } = expression;
      if (callee.type !== 'V8IntrinsicIdentifier' && isClassMergeCallee(callee)) {
        return extractFromCallArguments(expression.arguments, registry);
      }

      const variantExtraction = extractFromVariantCall(expression, registry);
      if (variantExtraction.classes.length > 0 || !variantExtraction.isDynamic) {
        return variantExtraction;
      }

      return { classes: [], isDynamic: true };
    }

    case 'ConditionalExpression': {
      const merged = mergeExtractions([
        extractClassesFromExpression(expression.consequent, registry),
        extractClassesFromExpression(expression.alternate, registry),
      ]);
      return { ...merged, isDynamic: true };
    }

    case 'LogicalExpression': {
      const merged = mergeExtractions([
        extractClassesFromExpression(expression.left, registry),
        extractClassesFromExpression(expression.right, registry),
      ]);
      return { ...merged, isDynamic: true };
    }

    case 'ArrayExpression':
      return extractFromArrayExpression(expression, registry);

    case 'ObjectExpression':
      // clsx object form: { 'p-4': isActive } — keys are potential classes
      return extractFromObjectExpression(expression);

    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return extractFromFunctionExpression(expression, registry);

    default:
      return { classes: [], isDynamic: true };
  }
}

function unwrapExpression(expression: Expression): Expression {
  if (expression.type === 'ParenthesizedExpression') {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function collectFunctionReturnExpressions(
  body: ArrowFunctionExpression['body'] | FunctionExpression['body'],
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
 * NavLink-style className={({ isActive }) => isActive ? '...' : '...'}
 */
function extractFromFunctionExpression(
  node: ArrowFunctionExpression | FunctionExpression,
  registry?: VariantRegistry,
): ExtractedClasses {
  const returnExpressions = collectFunctionReturnExpressions(node.body);

  if (returnExpressions.length === 0) {
    return { classes: [], isDynamic: true };
  }

  const merged = mergeExtractions(
    returnExpressions.map((expression) =>
      extractClassesFromExpression(expression, registry),
    ),
  );

  return { ...merged, isDynamic: true };
}

function extractFromArrayExpression(
  node: ArrayExpression,
  registry?: VariantRegistry,
): ExtractedClasses {
  const parts: ExtractedClasses[] = [];

  for (const element of node.elements) {
    if (element === null || element.type === 'SpreadElement') {
      parts.push({ classes: [], isDynamic: true });
      continue;
    }

    parts.push(extractClassesFromExpression(element, registry));
  }

  return mergeExtractions(parts);
}

function extractFromObjectExpression(
  node: import('@babel/types').ObjectExpression,
): ExtractedClasses {
  const classes: string[] = [];
  let isDynamic = false;

  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement') {
      isDynamic = true;
      continue;
    }

    if (prop.type !== 'ObjectProperty') {
      isDynamic = true;
      continue;
    }

    const key = prop.key;
    if (key.type === 'StringLiteral') {
      classes.push(...splitClassString(key.value));
    } else if (key.type === 'Identifier') {
      classes.push(...splitClassString(key.name));
    }

    if (prop.value.type !== 'BooleanLiteral' || prop.value.value !== true) {
      isDynamic = true;
    }
  }

  return {
    classes: [...new Set(classes)],
    isDynamic,
  };
}
