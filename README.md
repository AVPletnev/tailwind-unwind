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

```bash
# 1. See what repeats
npx tailwind-unwind analyze ./src

# 2. Generate CSS
npx tailwind-unwind generate ./src --output styles.css

# 3. Import styles.css in globals.css, then replace in source files
npx tailwind-unwind apply ./src --output styles.css --dry-run   # preview first
npx tailwind-unwind apply ./src --output styles.css             # write changes
```

Install globally (optional):

```bash
npm install -g tailwind-unwind
```

## How the three commands differ

| Command | What it does |
|---------|--------------|
| `analyze` | Shows which class combinations repeat and where. Safe — read-only. |
| `generate` | Creates a CSS file with `@layer components` + `@apply`. Does not touch your `.tsx` files. |
| `apply` | Does what `generate` does **and** rewrites matching `className` in source files. |

**Important:** `analyze` looks for frequent patterns (including subsets). `generate` and `apply` only work with **exact duplicate** class strings that appear multiple times.

In the analyze report, look for `Extractable: yes` — those patterns can be passed to `generate` / `apply`.

## Typical workflow

```bash
# Optional: create config from your project
npx tailwind-unwind init ./src

# Analyze → save report
npx tailwind-unwind analyze ./src --format json > report.json

# Generate only extractable patterns from the report
npx tailwind-unwind generate --from-report report.json --output src/styles/components.css

# Preview replacements, then apply
npx tailwind-unwind apply ./src --output src/styles/components.css --dry-run
npx tailwind-unwind apply ./src --output src/styles/components.css --prettier
```

## Configuration

Create `tailwind-unwind.config.json` manually or run `init`:

```bash
npx tailwind-unwind init ./src
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
| `className={getClasses()}` | No — skipped |

Parsed: `cn`, `clsx`, `classnames`, `twMerge`, `cva`, `tv`, template literals.  
Class order does not matter (`flex p-4` = `p-4 flex`).

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
| `--dry-run` | apply | Preview without writing files |
| `--prettier` | apply | Format changed files with Prettier |
| `--format json` | analyze, generate, apply | Output for CI / scripts |
| `--changed [ref]` | all | Only git-changed files |
| `--from-report <file>` | generate, apply | Use analyze JSON output |
| `--extractable-only` | generate, apply | Only patterns marked extractable |
| `--config <file>` | all | Custom config path |
| `--include` / `--exclude` | all | Filter files by glob |

### Defaults

| | analyze | generate / apply |
|--|---------|------------------|
| `--min-occurrences` | 5 | 3 |
| `--prefix` | — | `twu-` |

## Programmatic API

```typescript
import { analyzeCommand, generateCommand, applyCommand, buildComponents } from 'tailwind-unwind';

await analyzeCommand('./src', { format: 'json' });
```

Full exports: `walkSourceFiles`, `parseFile`, `findRepeatedClassSets`, `buildComponents`, `loadCommandOptions`, and more.

## GitHub Action

```yaml
- uses: AVPletnev/tailwind-unwind@v0.4.0
  with:
    command: analyze
    path: ./src
    format: json
```

See [`action.yml`](action.yml) for inputs.

## Development

```bash
git clone https://github.com/AVPletnev/tailwind-unwind.git
cd tailwind-unwind && npm install && npm run build && npm test
```

## License

MIT — see [LICENSE](LICENSE).
