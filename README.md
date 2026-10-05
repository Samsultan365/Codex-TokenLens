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

## 可选配置

把 `plugins/codex-usage-panel/codex-usage-panel.config.example.json` 复制为 `~/.codex/codex-usage-panel.config.json`，可覆盖密钥环境变量名和余额地址。

## 参考的同类项目

- [KNODEdev/codex-usage](https://github.com/KNODEdev/codex-usage)：本地 `token_count` 事件 + MCP 工具的 Codex 插件
- [lllybxgs/codex-usage-widget](https://github.com/lllybxgs/codex-usage-widget)：MCP 插件 + Windows 桌面小组件
- [Liuxiny/codex-usage-bar](https://github.com/Liuxiny/codex-usage-bar)：官方 App Server 与 CC Switch 数据源的自定义窗口

## 已知限制

- Codex 插件 manifest 目前可暴露 `skills` 与 `mcpServers`，无法嵌入原生常驻侧栏。本插件采用“对话内内联卡片 + 按需刷新”。
- OpenAI Platform 没有公开的余额查询 API，插件只做 API Key 校验并提示前往网页查看。
- 当前自定义 provider（如本地代理）若不代理余额接口，需要单独设置对应平台的 `*_API_KEY` 或配置 `balance_url`。

## 隐私

- 不写入或上传会话 JSONL 内容。
- 余额请求仅发往识别出的平台端点。
- 诊断输出会把密钥打码。
