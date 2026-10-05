import { fetchJson } from "./fetch-json.mjs";

function originFor(baseUrl) {
  try {
    return new URL(baseUrl || "http://127.0.0.1:15721/v1").origin;
  } catch {
    return baseUrl || null;
  }
}

export async function queryGeneric({ baseUrl, apiKey }) {
  if (!baseUrl) {
    return {
      platform: "openai_compatible",
      ok: false,
      reason: "missing_base_url",
      message: "未找到 OpenAI-compatible base_url。",
    };
  }
  const origin = originFor(baseUrl);
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const candidates = [`${origin}/v1/models`, `${origin}/models`];
  let lastError = null;
  for (const url of candidates) {
    try {
      await fetchJson(url, headers);
      return {
        platform: "openai_compatible",
        ok: true,
        accountValid: true,
        message: "该兼容平台未提供标准余额接口；已成功连通 /models。",
      };
    } catch (error) {
      lastError = error;
    }
  }
  return {
    platform: "openai_compatible",
    ok: false,
    reason: "request_failed",
    message: `无法连通模型平台：${lastError?.message || "unknown"}`,
    detail: lastError?.body || null,
  };
}
