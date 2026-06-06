import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSourceToAst } from '../src/parser/ast.js';
import { parseSource } from '../src/parser/jsxParser.js';
import {
  collectVariantRegistry,
  extractClassesFromVariantCall,
} from '../src/parser/variantHelpers.js';
import * as t from '@babel/types';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

describe('variantHelpers', () => {
  it('extracts classes from cva() definitions', () => {
    const call = t.callExpression(t.identifier('cva'), [
      t.stringLiteral('flex items-center px-4'),
      t.objectExpression([
        t.objectProperty(
          t.identifier('variants'),
          t.objectExpression([
            t.objectProperty(
              t.identifier('primary'),
              t.stringLiteral('bg-blue-500 text-white'),
            ),
          ]),
        ),
      ]),
    ]);

    const classes = extractClassesFromVariantCall(call);
    expect(classes).toContain('flex');
    expect(classes).toContain('bg-blue-500');
  });

  it('parses className={buttonVariants()} from cva fixture', async () => {
    const source = await readFile(path.join(fixturesDir, 'cva.tsx'), 'utf-8');
    const result = parseSource(source, 'cva.tsx');

    expect(result.extractions.length).toBeGreaterThanOrEqual(2);
    const staticCall = result.extractions.find(
      (item) => item.classes.includes('flex') && !item.isDynamic,
    );
    expect(staticCall).toBeDefined();
    expect(staticCall?.classes).toContain('px-4');

    const dynamicCall = result.extractions.find((item) => item.isDynamic);
    expect(dynamicCall).toBeDefined();
  });

  it('collects variant registry from AST', async () => {
    const source = await readFile(path.join(fixturesDir, 'cva.tsx'), 'utf-8');
    const ast = parseSourceToAst(source);
    const registry = collectVariantRegistry(ast);

    expect(registry.has('buttonVariants')).toBe(true);
    expect(registry.get('buttonVariants')).toContain('rounded-lg');
  });
});
