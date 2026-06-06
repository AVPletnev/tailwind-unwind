# Changelog

## 0.6.2

### Fixed
- `check` no longer runs subset analysis or a second full project scan for the apply preview
- `generate` / `apply` skip subset analysis (only exact duplicates are needed)
- Subset dedupe in `analyze` caps candidates before O(n²) dedupe — large repos finish in seconds

### Changed
- `check` spinner phases: `Scanning project` → `Computing patterns` (only when subset analysis runs)

## 0.6.1

### Fixed
- `init` / `analyze` no longer appear to hang after the last file on large projects — subset analysis defaults to `maxSize: 5` again
- Spinner shows `Computing patterns...` after file parsing completes
- `init` skips expensive subset search and builds `names` from extractable exact duplicates

## 0.6.0

### Added
- NavLink-style `className` functions — shared classes in ternary branches are counted and replaced (remainder stays per branch)
- Block-bodied arrow `className` functions (`() => { return ... }`)
- Terminal spinner on all commands (`--no-progress` to disable; auto-off in CI / `--format json`)
- Expanded `test-project` with buttons, badges, nav links, `cn` panels, and other demo patterns

### Changed
- Removed default `maxSize` limit (was 5) — long duplicate class strings are now eligible for extraction
- `generate` / `apply` with `extractableOnly` use the full extractable scan (`extractableCombinations`), not only patterns in the analyze top list

### Fixed
- `check` preview and `generate` no longer return 0 components when extractable duplicates exist but do not appear in analyze subset rankings

## 0.5.0

### Added
- `check` command — extractable duplicates + apply dry-run preview in one step
- `--fail-on-extractable <n>` for CI gates
- `--verbose-skipped` on `apply` and `check`
- Default scan path `.` and CSS output `styles.css` when flags are omitted
- `extractablePatternCount` and threshold metadata in analyze JSON

### Changed
- `analyze` marks extractable patterns using generate `min-occurrences` (default 3)
- Skipped replacements grouped by reason in console output (compact by default)
- README and `init` next steps centered on `check`

### Removed
- `tailwind-unwind.config.example.ts` (duplicate of JSON example)
- `.github/workflows/tailwind-unwind-example.yml` (broken/redundant demo workflow)

## 0.4.0

### Added
- `init` command — generates `tailwind-unwind.config.json` from project scan
- `--changed [ref]` — scan only git-changed files (incremental mode)
- Savings report in `apply` (utility tokens before/after, % reduction)
- `tailwind-unwind.config.ts` support via `jiti`
- GitHub Action (`action.yml`) for CI workflows
- Example workflow for analyze + apply dry-run in PRs

## 0.3.0

### Added
- `--format json` for `generate` and `apply` commands
- `--prettier` on `apply` to format modified files when Prettier is available
- `--from-report <file>` to generate/apply from analyze JSON output
- `--extractable-only` to align generate/apply with analyze extractable patterns
- Partial replacement in template literals with dynamic expressions
- `cva()` / `tv()` parser support with variant registry
- `buildComponentsFromCombinations` API for report-driven workflows

## 0.2.0

### Added
- Config file support (`tailwind-unwind.config.json`, `.js`, `.tailwind-unwindrc`)
- Per-command config sections: `analyze`, `generate`, `apply`
- Custom class naming via `names` in config
- `--config`, `--include`, `--exclude` CLI flags
- Partial replacement in `cn()` / `clsx()` when dynamic args remain
- `extractable` markers in `analyze` output (ready for generate/apply vs subset-only)
- Skipped replacements report in `apply`
- E2E test for scan → generate → apply pipeline
- `tailwind-unwind.config.example.json`

### Fixed
- CLI version synced with `package.json`

## 0.1.1

- README updates, `twu-` prefix

## 0.1.0

- Initial release: `analyze`, `generate`, `apply` commands
