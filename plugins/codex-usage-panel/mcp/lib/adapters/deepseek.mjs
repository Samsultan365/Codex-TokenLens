import { fetchJson } from "./fetch-json.mjs";

function originFor(baseUrl) {
  try {
    const url = new URL(baseUrl || "https://api.deepseek.com/v1");
    return url.origin;
  } catch {
    return "https://api.deepseek.com";
  }
}

export async function queryDeepSeek({ baseUrl, apiKey }) {
  if (!apiKey) {
    return {
      platform: "deepseek",
      ok: false,
      reason: "missing_api_key",
      message: "未配置 DEEPSEEK_API_KEY。",
    };
  }
  const url = `${originFor(baseUrl)}/user/balance`;
  try {
    const data = await fetchJson(url, { Authorization: `Bearer ${apiKey}` });
    const infos = Array.isArray(data?.balance_infos)
      ? data.balance_infos
      : [];
    const info = infos[0] || data?.balance_info || {};
    return {
      platform: "deepseek",
      ok: Boolean(data?.is_available),
      currency: info.currency || "CNY",
      totalBalance: info.total_balance ?? null,
      grantedBalance: info.granted_balance ?? null,
      toppedUpBalance: info.topped_up_balance ?? null,
      rawAvailable: Boolean(data?.is_available),
    };
  } catch (error) {
    return {
      platform: "deepseek",
      ok: false,
      reason: "request_failed",
      message: `DeepSeek 余额查询失败：${error.message}`,
      detail: error.body || null,
    };
  }
}
