# Codex TokenLens

A small, local Codex plugin and always-on-top widget for **token usage**, **context occupancy**, **rate-limit status**, and **provider balance**.

> Third-party project. Not an OpenAI product. Session content is never uploaded.

## Features

- Read the current Codex thread token usage and context occupancy.
- Show 5-hour / weekly rate-limit status when the account provides it.
- Query provider balance with auto-detection:
  - DeepSeek
  - OpenAI
  - OpenRouter
  - OpenAI-compatible providers
- Reuse a local CC Switch profile to read the current DeepSeek key.
- Run a compact Windows widget that stays near Codex.
- Start automatically at Windows login and wait for Codex to appear.

## Repository layout

```text
.
鈹溾攢鈹€ .agents/plugins/marketplace.json
鈹溾攢鈹€ plugins/codex-usage-panel/
鈹?  鈹溾攢鈹€ .codex-plugin/plugin.json
鈹?  鈹溾攢鈹€ .mcp.json
鈹?  鈹溾攢鈹€ mcp/
鈹?  鈹?  鈹溾攢鈹€ launcher.cmd
鈹?  鈹?  鈹溾攢鈹€ server.mjs
鈹?  鈹?  鈹溾攢鈹€ cli.mjs
鈹?  鈹?  鈹斺攢鈹€ lib/
鈹?  鈹斺攢鈹€ skills/codex-usage-panel/SKILL.md
鈹溾攢鈹€ widget/
鈹?  鈹溾攢鈹€ CodexUsageWidget.ps1
鈹?  鈹斺攢鈹€ Launch-Widget.vbs
鈹溾攢鈹€ scripts/
鈹?  鈹斺攢鈹€ Install-Autostart.ps1
鈹溾攢鈹€ docs/design.md
鈹斺攢鈹€ README.md
```

## Install the Codex plugin

```powershell
codex plugin marketplace add Samsultan365/Codex-TokenLens
codex plugin list --marketplace codex-usage-panel-marketplace --available --json
codex plugin add codex-usage-panel --marketplace codex-usage-panel-marketplace
```

Then ask Codex:

```text
Show my Codex usage and balance.
```

## Run the desktop widget

Double-click:

```text
widget\Launch-Widget.vbs
```

The widget:

- stays visible only while Codex is the foreground app
- has no taskbar entry
- can be dragged to any position
- refreshes usage every 1 second
- refreshes balance every 10 seconds
- shows the current conversation, tokens used, context percentage, and balance

## Auto-start at Windows login

Install the startup shortcut:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Install-Autostart.ps1"
```

Remove it:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Install-Autostart.ps1" -Remove
```

The widget starts at login and waits for Codex to open before showing its window.

## Configure balance keys

Set the required environment variable for the provider you use:

```powershell
$env:DEEPSEEK_API_KEY = "sk-..."
$env:OPENAI_API_KEY = "sk-..."
$env:OPENROUTER_API_KEY = "sk-or-..."
```

The plugin never writes keys into the repository.

## Platform detection

- Model name or `base_url` contains `deepseek` -> DeepSeek
- `base_url` contains `openrouter.ai` -> OpenRouter
- `base_url` contains `api.openai.com` or `openai.com` -> OpenAI
- Otherwise -> OpenAI-compatible

## DeepSeek and local proxy

The DeepSeek adapter calls `{origin}/user/balance`.

If `base_url` is a local proxy that does not expose a balance route, configure a direct balance URL in `~/.codex/codex-usage-panel.config.json`:

```json
{
  "providers": {
    "deepseek": {
      "api_key_env": "DEEPSEEK_API_KEY",
      "balance_url": "https://api.deepseek.com/user/balance"
    }
  }
}
```

You can also set `DEEPSEEK_BALANCE_URL`.

## Data sources

1. Codex App Server:
   - `account/read`
   - `account/usage/read`
   - `account/rateLimits/read`
2. Local fallback:
   - `~/.codex/sessions/**/*.jsonl`
   - latest `token_count` event

If App Server is unavailable, the plugin falls back to local JSONL.

## Privacy

- Does not upload session JSONL content.
- Balance requests go only to the detected provider endpoint.
- Diagnostics mask API keys.

## Known limitations

- Codex does not expose a native third-party side panel. This project uses an always-on-top companion widget.
- Codex does not expose a reliable event for selecting an existing conversation without activity. The widget follows the latest active thread after activity.
- OpenAI Platform does not publish a public balance API.

## License

MIT License.