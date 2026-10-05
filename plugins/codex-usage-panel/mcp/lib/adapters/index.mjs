import { loadPluginConfig } from "../config.mjs";
import { resolveFallbackApiKey } from "../credentials.mjs";
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
  if (envName && process.env[envName]) return process.env[envName];
  return resolveFallbackApiKey(platform);
}

export async function queryBalance(platformInfo, pluginConfig) {
  const { platform, baseUrl } = platformInfo;
  const providerConfig = pluginConfig?.providers?.[platform] || {};
  const apiKey = apiKeyFor(platform, pluginConfig);
  const balanceUrl = providerConfig.balance_url || providerConfig.balanceUrl || null;
  switch (platform) {
    case "deepseek":
      return queryDeepSeek({ baseUrl, apiKey, balanceUrl });
    case "openai":
      return queryOpenAI({ baseUrl, apiKey });
    case "openrouter":
      return queryOpenRouter({ apiKey, balanceUrl });
    default:
      return queryGeneric({ baseUrl, apiKey, balanceUrl });
  }
}

export function apiKeySourceFor(platform, pluginConfig) {
  const override = pluginConfig?.providers?.[platform]?.api_key_env;
  const envName = override || DEFAULT_ENV[platform];
  if (envName && process.env[envName]) return "env";
  if (resolveFallbackApiKey(platform)) return "cc-switch";
  return null;
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



