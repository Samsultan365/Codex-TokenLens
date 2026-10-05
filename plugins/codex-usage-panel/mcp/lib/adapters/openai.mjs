import { fetchJson } from "./fetch-json.mjs";

function originFor(baseUrl) {
  try {
    const url = new URL(baseUrl || "https://api.openai.com/v1");
    return url.origin;
  } catch {
    return "https://api.openai.com";
  }
}

export async function queryOpenAI({ baseUrl, apiKey }) {
  if (!apiKey) {
    return {
      platform: "openai",
      ok: false,
      reason: "missing_api_key",
      message: "未配置 OPENAI_API_KEY。",
    };
  }
  const origin = originFor(baseUrl);
  try {
    await fetchJson(`${origin}/v1/models`, { Authorization: `Bearer ${apiKey}` });
    return {
      platform: "openai",
      ok: true,
      accountValid: true,
      message: "OpenAI Platform 不提供公开的账户余额接口；API Key 验证成功，请前往 platform.openai.com 查看余额与用量。",
    };
  } catch (error) {
    return {
      platform: "openai",
      ok: false,
      reason: "request_failed",
      message: `OpenAI API Key 验证失败：${error.message}`,
      detail: error.body || null,
    };
  }
}
