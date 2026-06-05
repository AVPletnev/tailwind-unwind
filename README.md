# tailwind-unwind

[![npm version](https://img.shields.io/npm/v/tailwind-unwind.svg)](https://www.npmjs.com/package/tailwind-unwind)

CLI tool to analyze, extract, and refactor repeated Tailwind CSS utility patterns in React and Next.js projects.

**Repository:** [github.com/AVPletnev/tailwind-unwind](https://github.com/AVPletnev/tailwind-unwind)

## Features

- **analyze** — find frequent `className` patterns with file locations
- **generate** — create `@layer components` CSS with `@apply`
- **apply** — auto-replace repeated class strings in `.tsx`/`.jsx` source files
- Parses static strings, template literals, `cn()` / `clsx()` / `classnames()`
- Human-readable class names (`twu-page-header`, `twu-media-cover`) with `twu-` namespace prefix

## Installation

```bash
npm install -g tailwind-unwind

# or run without installing
npx tailwind-unwind analyze ./src
```

Requires **Node.js 18+**.

## Configuration

Copy [`tailwind-unwind.config.example.json`](tailwind-unwind.config.example.json) to your project root:

```bash
cp node_modules/tailwind-unwind/tailwind-unwind.config.example.json tailwind-unwind.config.json
```

Supported filenames: `tailwind-unwind.config.json`, `.tailwind-unwindrc`, `tailwind-unwind.config.js` / `.mjs` / `.cjs`.

```json
{
  "include": ["src/**/*.tsx"],
  "exclude": ["**/*.test.tsx", "**/*.stories.tsx"],
  "names": {
    "flex items-center justify-between p-4": "page-header",
    "w-full h-auto object-cover rounded-lg": "media-cover"
  },
  "analyze": {
    "minOccurrences": 5,
    "top": 10
  },
  "generate": {
    "minOccurrences": 3,
    "prefix": "twu-",
    "output": "src/styles/components.css"
  },
  "apply": {
    "output": "src/styles/components.css"
  }
}
```

| Key | Description |
|-----|-------------|
| `include` / `exclude` | Glob patterns for file scanning |
| `names` | Custom class names (utilities string → base name, prefix added automatically) |
| `analyze` / `generate` / `apply` | Per-command overrides (`minOccurrences`, `top`, `prefix`, `output`, …) |

Config is discovered from the current directory **and** ancestors of `<path>`. CLI flags override config values.

```bash
npx tailwind-unwind analyze ./src --config ./tailwind-unwind.config.json
npx tailwind-unwind generate ./src --include "src/components/**/*.tsx"
```

## Quick start

```bash
# 1. See what repeats in your project
npx tailwind-unwind analyze ./src

# 2. Generate component CSS
npx tailwind-unwind generate ./src --output styles.css

# 3. Import styles.css in your global CSS (e.g. globals.css), then apply replacements
npx tailwind-unwind apply ./src --output styles.css --dry-run   # preview
npx tailwind-unwind apply ./src --output styles.css             # write changes
```

---

## Commands

### `analyze`

Scan a directory and report the most frequent Tailwind class combinations.

```bash
npx tailwind-unwind analyze <path>
```

| Flag | Default | Description |
|------|---------|-------------|
| `--min-occurrences <n>` | `5` | Minimum occurrences (combinations must appear **more than** n times) |
| `--min-size <n>` | `2` | Minimum classes per combination |
| `--max-size <n>` | `5` | Maximum classes per combination |
| `--top <n>` | `10` | Number of top combinations to show |
| `--format <type>` | `console` | Output format: `console` or `json` |
| `--no-dedupe-subsets` | — | Include subset combinations in results |
| `--config <file>` | — | Path to config file |
| `--include <patterns>` | all `src` | Comma-separated glob include patterns |
| `--exclude <patterns>` | — | Comma-separated glob exclude patterns |

```bash
# JSON report for CI
npx tailwind-unwind analyze ./src --format json

# Stricter filters
npx tailwind-unwind analyze ./src --min-occurrences 10 --top 5
```

**Example output:**

```
📊 Tailwind Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files scanned: 47
Components with className: 312
Unique class combinations: 89

🏆 Top 10 most frequent combinations:

1. "flex items-center justify-between p-4"
   Occurrences: 24
   Suggestion: .page-header
   Extractable: yes — use generate/apply
   Found in: src/components/Header.tsx:12, src/layout/Toolbar.tsx:5 (+18 more)

💡 Potential code reduction: 38%
💡 Generate CSS: npx tailwind-unwind generate <path> --output styles.css
💡 Apply classes: npx tailwind-unwind apply <path> --output styles.css
```

`analyze` finds frequent **subsets** of classes (2–5 utilities) and deduplicates subsets by default.

---

### `generate`

Extract **exact duplicate `className` strings** into reusable component classes.

```bash
npx tailwind-unwind generate <path> --output <file.css>
```

| Flag | Default | Description |
|------|---------|-------------|
| `--output <file>` | *(required)* | Output CSS file path |
| `--min-occurrences <n>` | `3` | Minimum occurrences (must appear **≥ n** times) |
| `--min-size <n>` | `2` | Minimum classes per set |
| `--max-size <n>` | `5` | Maximum classes per set |
| `--top <n>` | `10` | Max number of component classes to generate |
| `--prefix <name>` | `twu-` | Namespace prefix for generated classes |

```bash
npx tailwind-unwind generate ./src --output styles.css
npx tailwind-unwind generate ./src --output styles.css --prefix app-
npx tailwind-unwind generate ./src --output styles.css --min-occurrences 2 --top 20
```

**Example output (`styles.css`):**

```css
/**
 * Generated by tailwind-unwind
 * Source: ./src
 * Class prefix: twu-
 */
@layer components {
  .twu-page-header {
    @apply flex items-center justify-between p-4;
  }

  .twu-media-cover {
    @apply w-full h-auto object-cover rounded-lg;
  }

  .twu-primary-button {
    @apply bg-blue-500 text-white px-4 py-2 rounded-lg;
  }
}
```

Import `styles.css` in your global CSS, then use the generated classes in JSX.

---

### `apply`

Generate CSS **and** replace matching `className` strings in source files.

```bash
npx tailwind-unwind apply <path> --output <file.css>
```

Supports the same flags as `generate`, plus:

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview replacements without writing files |

```bash
npx tailwind-unwind apply ./src --output styles.css --dry-run
npx tailwind-unwind apply ./src --output styles.css
```

**What gets replaced:**

| Pattern | Replaced? |
|---------|-----------|
| `className="flex items-center p-4"` | ✅ |
| `className={cn('flex', 'items-center', 'p-4')}` | ✅ (static args only) |
| `className={getClasses()}` | ❌ skipped |
| `` className={`flex ${active ? 'p-4' : ''}`} `` | ❌ skipped (dynamic) |

**Before → After:**

```tsx
// before
<div className="flex items-center justify-between p-4">Header</div>

// after
<div className="twu-page-header">Header</div>
```

---

## Class naming

Generated classes use a **`twu-` prefix** by default to avoid conflicts with existing project styles. Names are derived from semantic rules, not utility concatenation:

| Utilities | Generated class |
|-----------|-----------------|
| `flex items-center justify-between p-4` | `twu-page-header` |
| `w-full object-cover rounded-lg` | `twu-media-cover` |
| `bg-blue-500 px-4 py-2 rounded-lg` | `twu-primary-button` |
| `grid grid-cols-3 gap-4` | `twu-card-grid` |
| `fixed inset-0 bg-black/50` | `twu-backdrop` |

Customize with `--prefix app-` or the `names` field in config:

```json
{
  "names": {
    "flex items-center justify-between p-4": "page-header"
  },
  "generate": { "prefix": "app-" }
}
```

→ `.app-page-header`

---

## What gets parsed

Scans `.tsx`, `.jsx`, `.ts`, `.js` recursively. Ignores `node_modules`, `.next`, `dist`, `build`, `.git`.

- **Static strings:** `className="flex p-4"` / `class="flex p-4"`
- **Template literals:** static segments extracted; `${...}` expressions flagged
- **Merge utilities:** `cn()`, `clsx()`, `classnames()`, `twMerge()`, `cx()`
- **Dynamic expressions:** `className={getClasses()}` — warning, skipped

Class order is normalized: `flex p-4` and `p-4 flex` are treated as the same set.

---

## Programmatic API

```typescript
import {
  analyzeCommand,
  generateCommand,
  applyCommand,
  walkSourceFiles,
  parseFile,
  findFrequentPatterns,
  findRepeatedClassSets,
  buildComponents,
  normalizeClasses,
} from 'tailwind-unwind';

// Analyze
await analyzeCommand('./src', { format: 'json' });

// Build component map
const files = await walkSourceFiles('./src');
const result = await parseFile(files[0]);

const { components, css, replacementMap } = buildComponents(
  [{ classes: result.extractions[0].classes, filePath: files[0] }],
  { sourcePath: './src', prefix: 'twu-' },
);
```

---

## Development

```bash
git clone https://github.com/AVPletnev/tailwind-unwind.git
cd tailwind-unwind
npm install
npm run build    # required before running CLI locally
npm test

node bin/index.js analyze ./test-project
node bin/index.js generate ./test-project --output styles.css
node bin/index.js apply ./test-project --output styles.css --dry-run
```

> **Note:** `bin/index.js` runs compiled code from `dist/`. Always run `npm run build` after changing source files.

---

## License

MIT — see [LICENSE](LICENSE).
