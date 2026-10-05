import { loadPluginConfig } from "../config.mjs";
import { queryDeepSeek } from "./deepseek.mjs";
import { queryOpenAI } from "./openai.mjs";
import { queryOpenRouter } from "./openrouter.mjs";
import { queryGeneric } from "./generic.mjs";

const DEFAULT_ENV = {
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export function apiKeyFor(platform, pluginConfig) {
  const override = pluginConfig?.providers?.[platform]?.api_key_env;
  const envName = override || DEFAULT_ENV[platform];
  return envName ? process.env[envName] || null : null;
}

export async function queryBalance(platformInfo, pluginConfig) {
  const { platform, baseUrl } = platformInfo;
  const apiKey = apiKeyFor(platform, pluginConfig);
  switch (platform) {
    case "deepseek":
      return queryDeepSeek({ baseUrl, apiKey });
    case "openai":
      return queryOpenAI({ baseUrl, apiKey });
    case "openrouter":
      return queryOpenRouter({ apiKey });
    default:
      return queryGeneric({ baseUrl, apiKey });
  }
}

export function platformLabel(platform) {
  return (
    {
      deepseek: "DeepSeek",
      openai: "OpenAI",
      openrouter: "OpenRouter",
      openai_compatible: "OpenAI-compatible",
    }[platform] || platform
  );
}
