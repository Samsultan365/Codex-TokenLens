import readline from "node:readline";
import { loadPluginConfig, resolvePlatform, maskSecret } from "./lib/config.mjs";
import { latestLocalUsage, availableSessionCount } from "./lib/codex-source.mjs";
import { queryBalance, apiKeyFor, apiKeySourceFor } from "./lib/adapters/index.mjs";
import { renderUsageMarkdown, renderBalanceMarkdown, renderCombined } from "./lib/render.mjs";

const SERVER_NAME = "codex-usage-panel";
const SERVER_VERSION = "0.1.0";

const TOOLS = [
  {
    name: "codex_usage_panel",
    description:
      "Show the latest Codex thread token usage, context occupancy, and rate-limit status from local Codex session logs. Read-only and local.",
    inputSchema: {
      type: "object",
      properties: {
        thread_id: {
          type: "string",
          description: "Optional Codex thread id. Defaults to CODEX_THREAD_ID or the latest session.",
        },
        format: {
          type: "string",
          enum: ["markdown", "json"],
          default: "markdown",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "codex_balance_panel",
    description:
      "Query the balance of the currently detected LLM provider (DeepSeek, OpenAI, OpenRouter, or OpenAI-compatible). Uses API keys from environment variables only.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["deepseek", "openai", "openrouter", "openai_compatible"],
          description: "Optional platform override. Defaults to auto-detection from Codex config.",
        },
        format: {
          type: "string",
          enum: ["markdown", "json"],
          default: "markdown",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "codex_usage_and_balance",
    description:
      "Show Codex usage and provider balance together in one inline panel.",
    inputSchema: {
      type: "object",
      properties: {
        thread_id: {
          type: "string",
          description: "Optional Codex thread id.",
        },
        platform: {
          type: "string",
          enum: ["deepseek", "openai", "openrouter", "openai_compatible"],
          description: "Optional platform override for the balance query.",
        },
        format: {
          type: "string",
          enum: ["markdown", "json"],
          default: "markdown",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "codex_usage_diagnostics",
    description:
      "Show the resolved platform, data source, and which balance API keys are configured. Secrets are masked.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

function write(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function result(id, value) {
  return { jsonrpc: "2.0", id, result: value };
}

function error(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function usageSnapshot(args = {}) {
  const threadId = args.thread_id || process.env.CODEX_THREAD_ID || null;
  const platform = resolvePlatform();
  const usage = latestLocalUsage(threadId);
  return { usage, platform, threadId };
}

async function balanceSnapshot(args = {}) {
  const platformInfo = resolvePlatform();
  if (args.platform) platformInfo.platform = args.platform;
  const pluginConfig = loadPluginConfig();
  const balance = await queryBalance(platformInfo, pluginConfig);
  return { balance, platform: platformInfo, pluginConfig };
}

function textContent(text) {
  return { content: [{ type: "text", text }] };
}

function withStructured(text, structured) {
  return { content: [{ type: "text", text }], structuredContent: structured };
}

async function handleTool(name, args) {
  const format = args?.format || "markdown";
  if (name === "codex_usage_panel") {
    const { usage, platform } = await usageSnapshot(args);
    const markdown = renderUsageMarkdown(usage, platform);
    return format === "json"
      ? withStructured(JSON.stringify({ usage, platform: { ...platform, auth: undefined } }, null, 2), { usage, platform: { ...platform, auth: undefined } })
      : withStructured(markdown, { usage, platform: { ...platform, auth: undefined } });
  }

  if (name === "codex_balance_panel") {
    const { balance, platform } = await balanceSnapshot(args);
    const markdown = renderBalanceMarkdown(balance);
    return format === "json"
      ? withStructured(JSON.stringify({ balance, platform: { ...platform, auth: undefined } }, null, 2), { balance, platform: { ...platform, auth: undefined } })
      : withStructured(markdown, { balance });
  }

  if (name === "codex_usage_and_balance") {
    const [{ usage, platform }, { balance }] = await Promise.all([
      usageSnapshot(args),
      balanceSnapshot(args),
    ]);
    const markdown = renderCombined(usage, balance, platform);
    return format === "json"
      ? withStructured(
          JSON.stringify({ usage, balance, platform: { ...platform, auth: undefined } }, null, 2),
          { usage, balance, platform: { ...platform, auth: undefined } },
        )
      : withStructured(markdown, { usage, balance });
  }

  if (name === "codex_usage_diagnostics") {
    const platform = resolvePlatform();
    const pluginConfig = loadPluginConfig();
    const keyStatus = {};
    const keySource = {};
    for (const p of ["deepseek", "openai", "openrouter"]) {
      keyStatus[p] = Boolean(apiKeyFor(p, pluginConfig));
      keySource[p] = apiKeySourceFor(p, pluginConfig);
    }
    const diagnostics = {
      codexHome: platform.codexHome,
      model: platform.model,
      provider: platform.provider,
      baseUrl: platform.baseUrl,
      platform: platform.platform,
      displayName: platform.displayName,
      sessionFiles: availableSessionCount(),
      apiKeyConfigured: keyStatus,
      apiKeySource: keySource,
      authType: platform.auth?.OPENAI_API_KEY ? "api_key" : "unknown",
      openaiKeyMasked: maskSecret(platform.auth?.OPENAI_API_KEY),
      note: "本地读取 `.codex/sessions`；余额密钥只从环境变量或本机 CC Switch 读取，不会写入仓库。",
    };
    return withStructured(
      `## Codex Usage Panel 诊断\n\n\`\`\`json\n${JSON.stringify(diagnostics, null, 2)}\n\`\`\``,
      diagnostics,
    );
  }

  throw new Error(`Unknown tool: ${name}`);
}

function handleRequest(request) {
  const id = request?.id ?? null;
  const method = request?.method;

  if (method === "initialize") {
    return result(id, {
      protocolVersion: request.params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    });
  }
  if (method === "notifications/initialized") return null;
  if (method === "ping") return result(id, {});
  if (method === "tools/list") {
    return result(id, { tools: TOOLS });
  }
  if (method === "tools/call") {
    const params = request.params || {};
    const name = params.name;
    return handleTool(name, params.arguments || {}).then(
      (value) => result(id, value),
      (err) => result(id, { isError: true, content: [{ type: "text", text: err.message }] }),
    );
  }
  if (id == null) return null;
  return error(id, -32601, `Method not found: ${method}`);
}

async function runStdio() {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      write(error(null, -32700, "Parse error"));
      continue;
    }
    const response = await handleRequest(request);
    if (response) write(response);
  }
}

async function runSmoke() {
  const platform = resolvePlatform();
  const usage = latestLocalUsage();
  const balance = await queryBalance(platform, loadPluginConfig());
  process.stdout.write(`${renderCombined(usage, balance, platform)}\n`);
}

if (process.argv.includes("--smoke")) {
  runSmoke().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exitCode = 1;
  });
} else {
  runStdio().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exitCode = 1;
  });
}


