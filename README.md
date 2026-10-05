# Codex Usage Panel

一个精致小巧的 Codex 本地插件：在对话内查看当前 **token 用量**、**上下文占用**、**额度/重置时间**，并按当前模型自动识别平台查询 **余额**（DeepSeek / OpenAI / OpenRouter / OpenAI-compatible）。

> 本项目是第三方工具，不是 OpenAI 官方产品。插件只读取本机 Codex 数据和可选的环境变量密钥，不上传会话内容。

## 当前能力（v0.1 框架）

- `codex_usage_panel`：最新线程 token 用量 + 上下文占用 + rate-limit 状态
- `codex_balance_panel`：按平台自动查询余额
- `codex_usage_and_balance`：合并显示一张内联面板
- `codex_usage_diagnostics`：查看自动识别结果与密钥配置状态（密钥打码）

## 目录结构

```text
.
├── .agents/plugins/marketplace.json
├── plugins/codex-usage-panel/
│   ├── .codex-plugin/plugin.json
│   ├── .mcp.json
│   ├── mcp/
│   │   ├── launcher.cmd
│   │   ├── server.mjs
│   │   └── lib/
│   │       ├── config.mjs
│   │       ├── codex-source.mjs
│   │       ├── render.mjs
│   │       └── adapters/
│   └── skills/codex-usage-panel/SKILL.md
├── docs/design.md
└── README.md
```

## 安装

### 从 GitHub 安装 marketplace

```powershell
codex plugin marketplace add codex-usage-panel <你的仓库 Git URL>
codex plugin list --marketplace codex-usage-panel --available --json
codex plugin add codex-usage-panel --marketplace codex-usage-panel
```

### 本地安装 marketplace

```powershell
codex plugin marketplace add codex-usage-panel "C:\path\to\codex-usage-panel"
codex plugin add codex-usage-panel --marketplace codex-usage-panel
```

### 配置余额密钥

按需设置环境变量，插件不会把密钥写进仓库：

```powershell
$env:DEEPSEEK_API_KEY = "sk-..."
$env:OPENAI_API_KEY = "sk-..."
$env:OPENROUTER_API_KEY = "sk-or-..."
```

然后在 Codex 对话中说“显示我的 Codex 用量和余额”。

## 自动识别规则

- 模型名或 `base_url` 含 `deepseek` → DeepSeek
- `base_url` 含 `openrouter.ai` → OpenRouter
- `base_url` 含 `api.openai.com` / `openai.com`，或 `model_provider=openai` 且无 base_url → OpenAI
- 其余 → OpenAI-compatible

## DeepSeek / 本地代理余额说明

插件默认对 DeepSeek 使用 `{origin}/user/balance`。如果 `base_url` 是本地代理（例如 `http://127.0.0.1:15721/v1`）且该代理未代理余额接口，插件会给出明确提示。

可选方案：

1. 设置真实 DeepSeek Key 后查询官方余额：

```powershell
$env:DEEPSEEK_API_KEY = "sk-..."
```

2. 若本地代理暴露了余额端点，在 `~/.codex/codex-usage-panel.config.json` 中覆盖：

```json
{
  "providers": {
    "deepseek": {
      "api_key_env": "DEEPSEEK_API_KEY",
      "balance_url": "http://127.0.0.1:15721/your-balance-path"
    }
  }
}
```

3. 也可以使用环境变量 `DEEPSEEK_BALANCE_URL` 临时覆盖。

## 可选配置

把 `plugins/codex-usage-panel/codex-usage-panel.config.example.json` 复制为 `~/.codex/codex-usage-panel.config.json`，可覆盖密钥环境变量名和余额地址。

## 参考的同类项目

- [KNODEdev/codex-usage](https://github.com/KNODEdev/codex-usage)：本地 `token_count` 事件 + MCP 工具的 Codex 插件
- [lllybxgs/codex-usage-widget](https://github.com/lllybxgs/codex-usage-widget)：MCP 插件 + Windows 桌面小组件
- [Liuxiny/codex-usage-bar](https://github.com/Liuxiny/codex-usage-bar)：官方 App Server 与 CC Switch 数据源的自定义窗口

## 数据源优先级

1. 官方 App Server：`account/read`、`account/usage/read`、`account/rateLimits/read`
2. 本地回退：`~/.codex/sessions/**/*.jsonl` 的最新 `token_count`

如果 App Server 不可用（例如当前 CLI 未运行本地 daemon），插件会自动回退到本地 JSONL，不会中断查询。

## 已知限制

- Codex 插件 manifest 目前可暴露 `skills` 与 `mcpServers`，无法嵌入原生常驻侧栏。本插件采用“对话内内联卡片 + 按需刷新”。
- OpenAI Platform 没有公开的余额查询 API，插件只做 API Key 校验并提示前往网页查看。
- 当前自定义 provider（如本地代理）若不代理余额接口，需要单独设置对应平台的 `*_API_KEY` 或配置 `balance_url`。

## CC Switch 自动读取 DeepSeek 密钥

如果系统已安装 [CC Switch](https://github.com/cc-switch/cc-switch) 且当前 Codex provider 是 DeepSeek，插件会优先从 `~/.cc-switch/cc-switch.db` 自动读取密钥用于余额查询。该过程只在本机发生，密钥不会写入仓库、日志或聊天内容。

## 隐私

- 不写入或上传会话 JSONL 内容。
- 余额请求仅发往识别出的平台端点。
- 诊断输出会把密钥打码。



