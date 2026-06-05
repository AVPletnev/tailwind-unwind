import type {
  ArrayExpression,
  CallExpression,
  ConditionalExpression,
  Expression,
  LogicalExpression,
  TemplateLiteral,
} from '@babel/types';
import { splitClassString } from '../analyzer/combiner.js';

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
): ExtractedClasses {
  const parts: ExtractedClasses[] = [];

  for (const arg of args) {
    if (arg.type === 'SpreadElement' || arg.type === 'ArgumentPlaceholder') {
      parts.push({ classes: [], isDynamic: true });
      continue;
    }

    parts.push(extractClassesFromExpression(arg));
  }

  return mergeExtractions(parts);
}

/**
 * Recursively pull static Tailwind tokens from JSX className expressions.
 * Unknown/dynamic fragments set `isDynamic: true` but may still yield partial classes.
 */
export function extractClassesFromExpression(
  expression: Expression,
): ExtractedClasses {
  switch (expression.type) {
    case 'StringLiteral':
      return extractFromStringLiteral(expression.value);

    case 'TemplateLiteral':
      return extractFromTemplateLiteral(expression);

    case 'CallExpression': {
      const { callee } = expression;
      if (callee.type !== 'V8IntrinsicIdentifier' && isClassMergeCallee(callee)) {
        return extractFromCallArguments(expression.arguments);
      }
      return { classes: [], isDynamic: true };
    }

    case 'ConditionalExpression': {
      const merged = mergeExtractions([
        extractClassesFromExpression(expression.consequent),
        extractClassesFromExpression(expression.alternate),
      ]);
      return { ...merged, isDynamic: true };
    }

    case 'LogicalExpression': {
      const merged = mergeExtractions([
        extractClassesFromExpression(expression.left),
        extractClassesFromExpression(expression.right),
      ]);
      return { ...merged, isDynamic: true };
    }

    case 'ArrayExpression':
      return extractFromArrayExpression(expression);

    case 'ObjectExpression':
      // clsx object form: { 'p-4': isActive } — keys are potential classes
      return extractFromObjectExpression(expression);

    default:
      return { classes: [], isDynamic: true };
  }
}

function extractFromArrayExpression(node: ArrayExpression): ExtractedClasses {
  const parts: ExtractedClasses[] = [];

  for (const element of node.elements) {
    if (element === null || element.type === 'SpreadElement') {
      parts.push({ classes: [], isDynamic: true });
      continue;
    }

    parts.push(extractClassesFromExpression(element));
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
