# tailwind-unwind

[![npm version](https://img.shields.io/npm/v/tailwind-unwind.svg)](https://www.npmjs.com/package/tailwind-unwind)

**Find repeated Tailwind classes in your React code and turn them into reusable component classes.**

If you copy-paste the same `className="flex items-center p-4 ..."` across dozens of files, this tool helps you clean that up — without doing it by hand.

Works with React / Next.js projects. Node.js 18+.

## The problem it solves

```tsx
// Same utilities repeated everywhere
<div className="flex items-center justify-between p-4">...</div>
<div className="flex items-center justify-between p-4">...</div>
<div className="flex items-center justify-between p-4">...</div>
```

**tailwind-unwind** finds these duplicates and can replace them with one class:

```tsx
<div className="twu-page-header">...</div>
```

And generates the CSS for you:

```css
@layer components {
  .twu-page-header {
    @apply flex items-center justify-between p-4;
  }
}
```

## Quick start

Run from your project root — no paths required (defaults: scan `.`, CSS output `styles.css`):

```bash
# 1. Quick check — extractable duplicates + apply preview
npx tailwind-unwind check

# 2. Generate CSS
npx tailwind-unwind generate

# 3. Import styles.css in globals.css, then replace in source files
npx tailwind-unwind apply --dry-run   # preview first
npx tailwind-unwind apply             # write changes
```

Override defaults with flags (`./src`, `--output src/styles/components.css`) or `tailwind-unwind.config.json`.

Install globally (optional):

```bash
npm install -g tailwind-unwind
```

## Commands

| Command | What it does |
|---------|--------------|
| `check` | One-shot health check: extractable duplicates + apply dry-run preview. **Start here.** |
| `analyze` | Detailed report of frequent class combinations. Safe — read-only. |
| `generate` | Creates a CSS file with `@layer components` + `@apply`. Does not touch your `.tsx` files. |
| `apply` | Does what `generate` does **and** rewrites matching `className` in source files. |
| `init` | Generates `tailwind-unwind.config.json` from your project scan. |

**Important:** `analyze` looks for frequent patterns (including subsets) with `--min-occurrences 5` by default. `check`, `generate`, and `apply` extract **exact duplicate** class strings with `--min-occurrences 3`.

In the analyze report, look for `Extractable: yes` — those patterns can be passed to `generate` / `apply`.

### `check` — recommended entry point

```bash
npx tailwind-unwind check
```

All commands show a terminal spinner with progress in interactive mode (e.g. `Scanning source files... 42/180`, `Applying replacements... 10/42`). Disabled in CI, with `--format json`, or `--no-progress`.

For CI — fail when duplicates exceed a threshold:

```bash
npx tailwind-unwind check --fail-on-extractable 0   # fail if any extractable pattern exists
npx tailwind-unwind check --format json
```

## Typical workflow

```bash
# Optional: create config from your project
npx tailwind-unwind init

# Quick overview + dry-run preview
npx tailwind-unwind check

# Detailed report (optional)
npx tailwind-unwind analyze --format json > report.json

# Generate only extractable patterns from the report
npx tailwind-unwind generate --from-report report.json

# Preview replacements, then apply
npx tailwind-unwind apply --dry-run
npx tailwind-unwind apply --prettier
```

## Configuration

Create `tailwind-unwind.config.json` manually or run `init`:

```bash
npx tailwind-unwind init
```

Also supported: `.tailwind-unwindrc`, `tailwind-unwind.config.ts` / `.js`.

Example — see [`tailwind-unwind.config.example.json`](tailwind-unwind.config.example.json).

Key options:

- `include` / `exclude` — which files to scan
- `names` — map utilities to your class names (`"flex p-4"` → `"toolbar"`)
- `analyze` / `generate` / `apply` — per-command settings

CLI flags override config values.

## What `apply` can replace

| Pattern | Supported? |
|---------|------------|
| `className="flex p-4 bg-blue"` | Yes |
| `className={cn('flex', 'p-4')}` | Yes |
| `className={cn('flex p-4', isActive && 'bg-blue')}` | Yes (static part only) |
| `` className={`flex p-4 ${x}`} `` | Yes (static part only) |
| `className={buttonVariants()}` | Yes (cva/tv, no arguments) |
| `className={({ isActive }) => isActive ? 'flex p-4' : 'flex p-2'}` | Yes (per-branch exact match) |
| `className={({ isActive }) => isActive ? 'flex p-4 text-accent' : 'flex p-4 text-muted'}` | Yes (shared prefix → component class; branch-specific classes stay) |
| `className={getClasses()}` | No — skipped |

Parsed: `cn`, `clsx`, `classnames`, `twMerge`, `cva`, `tv`, template literals.  
Class order does not matter (`flex p-4` = `p-4 flex`).

Skipped locations are grouped by reason in the console; use `--verbose-skipped` for the full list.

## Generated class names

Default prefix is `twu-` to avoid clashes with your existing styles:

| Repeated utilities | Becomes |
|--------------------|---------|
| `flex items-center justify-between p-4` | `twu-page-header` |
| `w-full object-cover rounded-lg` | `twu-media-cover` |

Override with `--prefix app-` or the `names` field in config.

## Useful flags

| Flag | Commands | Purpose |
|------|----------|---------|
| `--no-progress` | all commands | Disable terminal spinner (auto-off in CI / `--format json`) |
| `--fail-on-extractable <n>` | check | Exit 1 when extractable patterns exceed `n` |
| `--verbose-skipped` | apply, check | List every skipped replacement (default: grouped summary) |
| `--dry-run` | apply | Preview without writing files |
| `--prettier` | apply | Format changed files with Prettier |
| `--format json` | analyze, check, generate, apply | Output for CI / scripts |
| `--changed [ref]` | all | Only git-changed files |
| `--from-report <file>` | generate, apply | Use analyze JSON output |
| `--extractable-only` | generate, apply | Only patterns marked extractable |
| `--config <file>` | all | Custom config path |
| `--include` / `--exclude` | all | Filter files by glob |

### Defaults

| | analyze | check / generate / apply |
|--|---------|--------------------------|
| scan path | `.` (project root) | `.` |
| `--output` | — | `styles.css` |
| `--min-occurrences` | 5 | 3 |
| `--prefix` | — | `twu-` |

Config file values override CLI defaults; explicit flags override config.

## Programmatic API

```typescript
import {
  checkCommand,
  analyzeCommand,
  generateCommand,
  applyCommand,
} from 'tailwind-unwind';

await checkCommand('.', { output: 'styles.css' });
await analyzeCommand('.', { format: 'json', extractableMinOccurrences: 3 });
```

Full exports: `walkSourceFiles`, `parseFile`, `findRepeatedClassSets`, `buildComponents`, `loadCommandOptions`, and more.

## CI

In your app repo — gate PRs on duplicate Tailwind patterns:

```bash
npx tailwind-unwind check --fail-on-extractable 0 --format json
```

GitHub Actions composite action — see [`action.yml`](action.yml):

```yaml
- uses: AVPletnev/tailwind-unwind@v0.5.0
  with:
    command: check
    format: json
    args: --fail-on-extractable 0
```

## Development

```bash
git clone https://github.com/AVPletnev/tailwind-unwind.git
cd tailwind-unwind && npm install && npm run build && npm test
```

CI in this repo also runs `check` against `test-project` as a smoke test.

## License

MIT — see [LICENSE](LICENSE).
