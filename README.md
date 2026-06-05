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
💡 Upgrade to premium: npx tailwind-unwind generate <path> --output styles.css
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
```

## License

MIT — see [LICENSE](LICENSE).

### Disclaimer

This tool is provided **as is**, without warranty of any kind. It only **reads** your source files and prints a report; it does not modify your project.

- Analysis results are heuristic suggestions, not guaranteed refactorings.
- The authors are not liable for any damages arising from the use of this software.
- Use at your own risk. Review suggestions before applying changes to your codebase.
