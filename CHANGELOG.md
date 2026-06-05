# Changelog

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
