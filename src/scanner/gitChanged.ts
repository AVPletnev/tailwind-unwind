import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { IGNORE_PATTERNS } from './ignore.js';

const execFileAsync = promisify(execFile);

const SOURCE_EXTENSIONS = new Set(['.tsx', '.jsx', '.ts', '.js']);

function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SOURCE_EXTENSIONS.has(ext);
}

function isIgnoredPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return IGNORE_PATTERNS.some((pattern) => {
    const dir = pattern.replace('/**', '').replace('**/', '');
    return normalized.includes(`/${dir}/`);
  });
}

async function runGit(
  cwd: string,
  args: string[],
): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd });
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function resolveAbsoluteFiles(
  files: string[],
  rootPath: string,
): string[] {
  const absoluteRoot = path.resolve(rootPath);

  return [...new Set(
    files
      .map((file) => path.resolve(absoluteRoot, file))
      .filter((file) => file.startsWith(absoluteRoot))
      .filter(isSourceFile)
      .filter((file) => !isIgnoredPath(path.relative(absoluteRoot, file))),
  )].sort();
}

/**
 * List source files changed relative to a git ref (default: working tree vs HEAD).
 */
export async function getChangedSourceFiles(
  rootPath: string,
  ref = 'HEAD',
): Promise<string[]> {
  const cwd = path.resolve(rootPath);

  const unstaged = await runGit(cwd, ['diff', '--name-only', ref]);
  const staged = await runGit(cwd, ['diff', '--cached', '--name-only', ref]);
  const untracked = await runGit(cwd, [
    'ls-files',
    '--others',
    '--exclude-standard',
  ]);

  return resolveAbsoluteFiles(
    [...unstaged, ...staged, ...untracked],
    cwd,
  );
}

export async function findGitRoot(startPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd: path.resolve(startPath) },
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function isGitRepository(rootPath: string): Promise<boolean> {
  return (await findGitRoot(rootPath)) !== null;
}

/**
 * Changed source files under `scopePath`, resolved to absolute paths.
 */
export async function getChangedFilesInScope(
  scopePath: string,
  ref = 'HEAD',
): Promise<string[]> {
  const gitRoot = await findGitRoot(scopePath);
  if (!gitRoot) {
    throw new Error('Not a git repository. Remove --changed or run inside a git repo.');
  }

  const absoluteScope = path.resolve(scopePath);
  const changed = await getChangedSourceFiles(gitRoot, ref);

  return changed.filter(
    (file) => file === absoluteScope || file.startsWith(`${absoluteScope}${path.sep}`),
  );
}
