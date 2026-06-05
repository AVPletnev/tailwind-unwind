import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readPackageVersion(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = path.join(currentDir, '../../package.json');
  const raw = readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(raw) as { version?: string };
  return pkg.version ?? '0.0.0';
}

export const CLI_VERSION = readPackageVersion();
