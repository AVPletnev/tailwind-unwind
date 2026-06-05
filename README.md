# tailwind-unwind

Analyze Tailwind CSS class usage patterns in React and Next.js projects. Find repeated utility combinations and opportunities to extract reusable component classes.

**Repository:** [github.com/AVPletnev/tailwind-unwind](https://github.com/AVPletnev/tailwind-unwind)

## Installation

```bash
npm install -g tailwind-unwind
# or run without installing
npx tailwind-unwind analyze ./src
```

## Usage

```bash
npx tailwind-unwind analyze <path>
```

### CLI options

| Flag | Default | Description |
|------|---------|-------------|
| `--min-occurrences <n>` | `5` | Minimum occurrences for a combination |
| `--min-size <n>` | `2` | Minimum classes per combination |
| `--max-size <n>` | `5` | Maximum classes per combination |
| `--top <n>` | `10` | Number of top combinations to show |
| `--format <type>` | `console` | Output format: `console` or `json` |
| `--no-dedupe-subsets` | — | Include subset combinations in results |

```bash
# JSON report for CI
npx tailwind-unwind analyze ./src --format json

# Stricter filters
npx tailwind-unwind analyze ./src --min-occurrences 10 --top 5
```

Scan a directory recursively for `.tsx`, `.jsx`, `.ts`, and `.js` files. The tool ignores `node_modules`, `.next`, `dist`, `build`, and `.git`.

### Generate CSS

Extract **exact duplicate className strings** into reusable component classes:

```bash
npx tailwind-unwind generate ./src --output styles.css
# Custom namespace (default: twu-)
npx tailwind-unwind generate ./src --output styles.css --prefix app-
```

Unlike `analyze` (which finds frequent subsets), `generate` looks for identical full class lists on JSX elements. Default `--min-occurrences` is `3`.

Example output file:

```css
@layer components {
  .twu-toolbar {
    @apply flex items-center justify-between p-4;
  }

  .twu-media-cover {
    @apply w-full h-auto object-cover rounded-lg;
  }
}
```

Import the generated file in your global CSS (e.g. `globals.css`), then replace repeated `className` strings with the new classes.

Supports filter flags: `--min-occurrences`, `--min-size`, `--max-size`, `--top`.

### Apply (replace className in source)

Generate CSS **and** replace matching `className` strings in your `.tsx`/`.jsx` files:

```bash
# Preview changes without writing files
npx tailwind-unwind apply ./src --output styles.css --dry-run

# Apply replacements and write styles.css
npx tailwind-unwind apply ./src --output styles.css
```

Only **exact static matches** are replaced (string literals and static `cn()`/`clsx()` calls). Dynamic expressions are left unchanged.

### Example output

```
📊 Tailwind Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files scanned: 5
Components with className: 18
Unique class combinations: 4

🏆 Top 10 most frequent combinations:

1. "flex items-center justify-between p-4"
   Occurrences: 8
   Suggestion: .flex-items-center-justify-between

2. "w-full h-auto object-cover rounded-lg"
   Occurrences: 7
   Suggestion: .w-full-h-auto-object-cover

💡 Potential code reduction: 42%
💡 Generate CSS: npx tailwind-unwind generate <path> --output styles.css
```

## What it analyzes

- **Static strings:** `className="flex p-4"` and `class="flex p-4"`
- **Template literals:** `className={\`flex p-4 ${active ? 'bg-blue' : ''}\`}` — static segments extracted
- **Class merge utilities:** `cn()`, `clsx()`, `classnames()`, `twMerge()`, `cx()` — string arguments and conditionals extracted
- **Fully dynamic expressions:** `className={getClasses()}` — skipped with a warning

Class combinations are normalized (order-independent): `flex p-4` and `p-4 flex` count as the same pattern.

Subset combinations are deduplicated by default (e.g. `flex p-4` is hidden when `flex items-center p-4` is present). Each result includes file locations.

## Programmatic API

```typescript
import {
  analyzeCommand,
  walkSourceFiles,
  parseFile,
  findFrequentPatterns,
  normalizeClasses,
} from 'tailwind-unwind';

const files = await walkSourceFiles('./src');
const result = await parseFile(files[0]);
const extraction = result.extractions[0];

const patterns = findFrequentPatterns([
  {
    classes: extraction.classes,
    filePath: files[0],
    line: extraction.line,
  },
]);
```

## Development

```bash
npm install
npm run build
npm test
node bin/index.js analyze ./test-project
node bin/index.js generate ./test-project --output styles.css
node bin/index.js apply ./test-project --output styles.css --dry-run
```

## License

MIT — see [LICENSE](LICENSE).
