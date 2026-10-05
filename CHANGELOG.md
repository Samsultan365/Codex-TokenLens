# Changelog

## [1.0.0] - 2026-10-05

### Added
- Codex marketplace plugin with MCP server and skill
- Local JSONL token/context source with App Server fallback
- Balance adapters: DeepSeek, OpenAI, OpenRouter, OpenAI-compatible
- CC Switch local credential fallback for DeepSeek
- Always-on-top Windows desktop widget
- Session hooks to sync the active thread for the widget

### Changed
- Widget polls usage every 1s and balance every 10s
- Simplified widget UI: current conversation, tokens used, context %, balance

### Fixed
- UTF-8 parsing in the widget
- Inherited `CODEX_THREAD_ID` lock in the widget
- JSON files saved without BOM for marketplace compatibility
