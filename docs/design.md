# Design notes

## Goals

1. Keep the plugin small and dependency-free.
2. Use official Codex local data first (`token_count` JSONL), with App Server methods as an upgrade path.
3. Make balance provider-neutral and auto-detected.

## Data sources

### Local JSONL (implemented)

The latest `token_count` event in `~/.codex/sessions/**/*.jsonl` contains:

- `info.last_token_usage`
- `info.total_token_usage`
- `info.model_context_window`
- `rate_limits` (nullable for custom providers)

The parser reads only the last 512 KiB of each file for speed and privacy.

### App Server (planned)

The generated App Server protocol exposes:

- `account/usage/read`
- `account/rateLimits/read`
- `thread/tokenUsage/updated`
- `account/rateLimits/updated`

These can be queried by spawning `codex app-server proxy`. They are more accurate for ChatGPT subscription accounts but may return empty for API-key/custom providers.

## Balance adapters

- DeepSeek: `GET {origin}/user/balance`, fields `balance_infos[0].total_balance`, `granted_balance`, `topped_up_balance`.
- OpenRouter: `GET https://openrouter.ai/api/v1/credits`, fields `data.total_credits`, `data.total_usage`.
- OpenAI: validate `/v1/models`; no public balance endpoint.
- Generic: validate `/v1/models` or `/models`; no standard balance endpoint.

## Secrets

- Keys are read from environment variables only.
- Optional config stores `api_key_env` names, never raw secrets.
- The repository must not contain `auth.json`, session JSONL, or `.env`.
