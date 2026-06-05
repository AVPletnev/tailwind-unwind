# tailwind-unwind

Analyze Tailwind CSS class usage patterns in React and Next.js projects. Find repeated utility combinations and opportunities to extract reusable component classes.

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

- **Static strings:** `className="flex p-4"`
- **Template literals:** `className={\`flex p-4 ${active ? 'bg-blue' : ''}\`}` — static segments are extracted; dynamic expressions are noted with a warning
- **Dynamic expressions:** `className={cn('flex', isActive && 'p-4')}` — skipped with a warning (MVP)

Class combinations are normalized (order-independent): `flex p-4` and `p-4 flex` count as the same pattern.

The analyzer reports combinations of **2–5 classes** that appear more than **5 times**.

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
const patterns = findFrequentPatterns([result.extractions[0].classes]);
```

## Development

```bash
npm install
npm run build
node bin/index.js analyze ./test-project
```

## License

MIT
