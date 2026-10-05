import { fetchJson } from "./fetch-json.mjs";

export async function queryOpenRouter({ apiKey }) {
  if (!apiKey) {
    return {
      platform: "openrouter",
      ok: false,
      reason: "missing_api_key",
      message: "未配置 OPENROUTER_API_KEY。",
    };
  }
  try {
    const data = await fetchJson("https://openrouter.ai/api/v1/credits", {
      Authorization: `Bearer ${apiKey}`,
    });
    const credits = data?.data || {};
    return {
      platform: "openrouter",
      ok: true,
      totalCredits: credits.total_credits ?? null,
      totalUsage: credits.total_usage ?? null,
    };
  } catch (error) {
    return {
      platform: "openrouter",
      ok: false,
      reason: "request_failed",
      message: `OpenRouter 余额查询失败：${error.message}`,
      detail: error.body || null,
    };
  }
}
