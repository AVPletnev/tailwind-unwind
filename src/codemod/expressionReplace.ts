import * as t from '@babel/types';
import type {
  ArrowFunctionExpression,
  Expression,
  FunctionExpression,
} from '@babel/types';
import { normalizeClasses, splitClassString } from '../analyzer/combiner.js';
import {
  commonClassTokens,
  rebuildWithComponent,
  remainderClassTokens,
  unwrapExpression,
} from '../parser/branchClasses.js';

export interface ExpressionReplaceResult {
  node: Expression;
  changed: boolean;
  from: string;
  to: string;
  partial: boolean;
}

const unchanged = (node: Expression): ExpressionReplaceResult => ({
  node,
  changed: false,
  from: '',
  to: '',
  partial: false,
});

function replaceStringLiteral(
  node: t.StringLiteral,
  replacementMap: Map<string, string>,
): ExpressionReplaceResult {
  const key = normalizeClasses(splitClassString(node.value));
  const replacement = replacementMap.get(key);

  if (!replacement) {
    return unchanged(node);
  }

  return {
    node: t.stringLiteral(replacement),
    changed: true,
    from: key,
    to: replacement,
    partial: false,
  };
}

function mergeReplaceResults(
  left: ExpressionReplaceResult,
  right: ExpressionReplaceResult,
  build: (leftNode: Expression, rightNode: Expression) => Expression,
): ExpressionReplaceResult {
  if (!left.changed && !right.changed) {
    return unchanged(build(left.node, right.node));
  }

  return {
    node: build(left.node, right.node),
    changed: true,
    from: left.changed ? left.from : right.from,
    to: left.changed ? left.to : right.to,
    partial: true,
  };
}

function replaceInFunctionBody(
  body: ArrowFunctionExpression['body'] | FunctionExpression['body'],
  replacementMap: Map<string, string>,
): {
  node: ArrowFunctionExpression['body'] | FunctionExpression['body'];
  changed: boolean;
  from: string;
  to: string;
  partial: boolean;
} {
  if (body.type !== 'BlockStatement') {
    const result = replaceInExpression(unwrapExpression(body), replacementMap);
    return {
      node: result.node,
      changed: result.changed,
      from: result.from,
      to: result.to,
      partial: result.partial,
    };
  }

  let changed = false;
  let from = '';
  let to = '';
  const statements = body.body.map((statement) => {
    if (statement.type !== 'ReturnStatement' || !statement.argument) {
      return statement;
    }

    const result = replaceInExpression(statement.argument, replacementMap);
    if (!result.changed) {
      return statement;
    }

    changed = true;
    from = result.from;
    to = result.to;
    return t.returnStatement(result.node);
  });

  return {
    node: t.blockStatement(statements),
    changed,
    from,
    to,
    partial: changed,
  };
}

function tryReplaceConditionalCommonPrefix(
  expression: t.ConditionalExpression,
  replacementMap: Map<string, string>,
): ExpressionReplaceResult {
  if (
    expression.consequent.type !== 'StringLiteral' ||
    expression.alternate.type !== 'StringLiteral'
  ) {
    return unchanged(expression);
  }

  const common = commonClassTokens(
    expression.consequent.value,
    expression.alternate.value,
  );

  if (common.length < 2) {
    return unchanged(expression);
  }

  const key = normalizeClasses(common);
  const replacement = replacementMap.get(key);

  if (!replacement) {
    return unchanged(expression);
  }

  const consequentRemainder = remainderClassTokens(
    expression.consequent.value,
    common,
  );
  const alternateRemainder = remainderClassTokens(
    expression.alternate.value,
    common,
  );

  return {
    node: t.conditionalExpression(
      expression.test,
      t.stringLiteral(
        rebuildWithComponent(replacement, consequentRemainder),
      ),
      t.stringLiteral(
        rebuildWithComponent(replacement, alternateRemainder),
      ),
    ),
    changed: true,
    from: key,
    to: replacement,
    partial: true,
  };
}

/**
 * Replace exact class strings inside dynamic expressions (ternaries, className functions).
 */
export function replaceInExpression(
  expression: Expression,
  replacementMap: Map<string, string>,
): ExpressionReplaceResult {
  switch (expression.type) {
    case 'StringLiteral':
      return replaceStringLiteral(expression, replacementMap);

    case 'ConditionalExpression': {
      const commonPrefix = tryReplaceConditionalCommonPrefix(
        expression,
        replacementMap,
      );
      if (commonPrefix.changed) {
        return commonPrefix;
      }

      const consequent = replaceInExpression(expression.consequent, replacementMap);
      const alternate = replaceInExpression(expression.alternate, replacementMap);
      return mergeReplaceResults(consequent, alternate, (leftNode, rightNode) =>
        t.conditionalExpression(expression.test, leftNode, rightNode),
      );
    }

    case 'ParenthesizedExpression': {
      const inner = replaceInExpression(expression.expression, replacementMap);
      if (!inner.changed) {
        return unchanged(expression);
      }

      return {
        node: t.parenthesizedExpression(inner.node),
        changed: true,
        from: inner.from,
        to: inner.to,
        partial: true,
      };
    }

    case 'LogicalExpression': {
      const left = replaceInExpression(expression.left, replacementMap);
      const right = replaceInExpression(expression.right, replacementMap);
      return mergeReplaceResults(left, right, (leftNode, rightNode) =>
        t.logicalExpression(expression.operator, leftNode, rightNode),
      );
    }

    case 'ArrowFunctionExpression': {
      const body = replaceInFunctionBody(expression.body, replacementMap);
      if (!body.changed) {
        return unchanged(expression);
      }

      return {
        node: t.arrowFunctionExpression(
          expression.params,
          body.node,
          expression.async,
        ),
        changed: true,
        from: body.from,
        to: body.to,
        partial: true,
      };
    }

    case 'FunctionExpression': {
      const body = replaceInFunctionBody(expression.body, replacementMap);
      if (!body.changed) {
        return unchanged(expression);
      }

      return {
        node: t.functionExpression(
          expression.id,
          expression.params,
          body.node,
          expression.generator,
          expression.async,
        ),
        changed: true,
        from: body.from,
        to: body.to,
        partial: true,
      };
    }

    default:
      return unchanged(expression);
  }
}
