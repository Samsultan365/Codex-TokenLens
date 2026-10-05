---
name: codex-usage-panel
description: Show current Codex token usage, context occupancy, rate-limit status, and provider balance. Use when the user asks about Codex usage, token usage, context window, 5h/weekly limits, remaining usage, provider balance, DeepSeek/OpenAI/OpenRouter credits, or wants a small inline usage panel.
---

# Codex Usage Panel

Use the MCP tools when available. They are read-only and prefer local data.

## Workflow

1. For token usage and context, call `codex_usage_panel`.
2. For balance, call `codex_balance_panel`.
3. To show both in one compact card, call `codex_usage_and_balance`.
4. If the user wants configuration details, call `codex_usage_diagnostics`.

Report the returned markdown card concisely. Explain which provider was auto-detected and, for balance, which environment variable must be set when the query is unavailable.

## Continuous Refresh

MCP tools are request/response. To refresh the panel, call the tool again. For a terminal watcher later, the plugin may add `scripts/watch.ps1` or a desktop widget.

## Data Sources

- Token usage comes from the latest `token_count` event in `~/.codex/sessions/**/*.jsonl`.
- Context occupancy is `last_token_usage.input_tokens / model_context_window`.
- Rate limits come from the same event when the account provides them.
- Balance is fetched from a provider adapter and is never read from Codex session content.

## Security

Never ask for or print a raw API key. Balance tools read keys from `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY`.
