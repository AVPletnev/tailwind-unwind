import babelTraverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type {
  CallExpression,
  Expression,
  Node,
  ObjectExpression,
  ObjectProperty,
  VariableDeclarator,
} from '@babel/types';
import { splitClassString } from '../analyzer/combiner.js';

/** Variant APIs that define reusable Tailwind class sets. */
export const VARIANT_CALLEES = new Set(['tv', 'cva']);

export function isVariantCallee(expression: Expression): boolean {
  if (expression.type === 'Identifier') {
    return VARIANT_CALLEES.has(expression.name);
  }

  if (
    expression.type === 'MemberExpression' &&
    expression.property.type === 'Identifier'
  ) {
    return VARIANT_CALLEES.has(expression.property.name);
  }

  return false;
}

function collectStringsFromObject(node: ObjectExpression): string[] {
  const classes: string[] = [];

  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement') {
      continue;
    }

    if (prop.type !== 'ObjectProperty') {
      continue;
    }

    collectStringsFromPropertyValue(prop, classes);
  }

  return classes;
}

function collectStringsFromPropertyValue(
  prop: ObjectProperty,
  classes: string[],
): void {
  const keyName =
    prop.key.type === 'Identifier'
      ? prop.key.name
      : prop.key.type === 'StringLiteral'
        ? prop.key.value
        : null;

  const { value } = prop;

  if (value.type === 'StringLiteral') {
    classes.push(...splitClassString(value.value));
    return;
  }

  if (value.type === 'ObjectExpression') {
    if (keyName === 'variants' || keyName === 'compoundVariants') {
      for (const nested of value.properties) {
        if (nested.type === 'ObjectProperty') {
          collectStringsFromPropertyValue(nested, classes);
        }
      }
      return;
    }

    classes.push(...collectStringsFromObject(value));
    return;
  }

  if (value.type === 'ArrayExpression') {
    for (const element of value.elements) {
      if (element === null || element.type === 'SpreadElement') {
        continue;
      }

      if (element.type === 'StringLiteral') {
        classes.push(...splitClassString(element.value));
      } else if (element.type === 'ObjectExpression') {
        classes.push(...collectStringsFromObject(element));
      }
    }
  }
}

/**
 * Extract Tailwind tokens from a cva()/tv() definition call.
 */
export function extractClassesFromVariantCall(
  call: CallExpression,
): string[] {
  const classes: string[] = [];

  for (const arg of call.arguments) {
    if (arg.type === 'SpreadElement' || arg.type === 'ArgumentPlaceholder') {
      continue;
    }

    if (arg.type === 'StringLiteral') {
      classes.push(...splitClassString(arg.value));
      continue;
    }

    if (arg.type === 'ObjectExpression') {
      classes.push(...collectStringsFromObject(arg));
    }
  }

  return [...new Set(classes)];
}

export type VariantRegistry = Map<string, string[]>;

type TraverseFn = (
  ast: Node,
  visitors: {
    VariableDeclarator?: (path: NodePath<VariableDeclarator>) => void;
  },
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

/**
 * Collect `const x = cva(...)` / `const x = tv(...)` definitions in a file.
 */
export function collectVariantRegistry(ast: Node): VariantRegistry {
  const registry: VariantRegistry = new Map();

  traverse(ast, {
    VariableDeclarator(path: NodePath<VariableDeclarator>) {
      registerVariantDeclarator(path.node, registry);
    },
  });

  return registry;
}

function registerVariantDeclarator(
  declarator: VariableDeclarator,
  registry: VariantRegistry,
): void {
  if (declarator.id.type !== 'Identifier' || declarator.init?.type !== 'CallExpression') {
    return;
  }

  const { init } = declarator;
  if (init.callee.type === 'V8IntrinsicIdentifier' || !isVariantCallee(init.callee)) {
    return;
  }

  const classes = extractClassesFromVariantCall(init);
  if (classes.length > 0) {
    registry.set(declarator.id.name, classes);
  }
}
