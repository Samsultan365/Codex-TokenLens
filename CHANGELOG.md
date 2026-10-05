# Changelog

## [1.0.1] - 2026-10-05

### Changed
- Widget hides when Codex is not the foreground application
- Widget reappears automatically when Codex regains focus

## [1.0.0] - 2026-10-05

### Added
- Codex marketplace plugin with MCP server and skill
- Local JSONL token/context source with App Server fallback
- Balance adapters: DeepSeek, OpenAI, OpenRouter, OpenAI-compatible
- CC Switch local credential fallback for DeepSeek
- Always-on-top Windows desktop widget
- Session hooks to sync the active thread for the widget
- Windows auto-start shortcut installer

### Changed
- Widget polls usage every 1 second and balance every 10 seconds
- Widget waits for Codex before showing

### Fixed
- UTF-8 parsing in the widget
- Inherited CODEX_THREAD_ID lock in the widget
- JSON files saved without BOM for marketplace compatibility