import { fetchJson } from "./fetch-json.mjs";

function originFor(baseUrl) {
  try {
    const url = new URL(baseUrl || "https://api.deepseek.com/v1");
    return url.origin;
  } catch {
    return "https://api.deepseek.com";
  }
}

function isLocalHost(hostname) {
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

function officialOrigin() {
  return "https://api.deepseek.com";
}

export async function queryDeepSeek({ baseUrl, apiKey, balanceUrl }) {
  const resolvedBalanceUrl =
    balanceUrl || process.env.DEEPSEEK_BALANCE_URL || null;

  if (!apiKey && !resolvedBalanceUrl) {
    let hostname = "unknown";
    try {
      hostname = new URL(baseUrl || "https://api.deepseek.com/v1").hostname;
    } catch {
      // ignore
    }
    const local = isLocalHost(hostname);
    return {
      platform: "deepseek",
      ok: false,
      reason: "missing_api_key",
      message: local
        ? "本地代理未代理 `/user/balance`。请设置 `DEEPSEEK_API_KEY` 查询官方 DeepSeek 余额，或在 `codex-usage-panel.config.json` 中配置本地 `balance_url`。"
        : "未配置 DEEPSEEK_API_KEY。",
      suggestedFixes: local
        ? [
            "export DEEPSEEK_API_KEY=<your key>",
            'configure providers.deepseek.balance_url in ~/.codex/codex-usage-panel.config.json',
          ]
        : ["export DEEPSEEK_API_KEY=<your key>"],
    };
  }

  let url = resolvedBalanceUrl;
  if (!url) {
    let hostname = "api.deepseek.com";
    try {
      hostname = new URL(baseUrl || "https://api.deepseek.com/v1").hostname;
    } catch {
      // ignore
    }
    const origin = isLocalHost(hostname)
      ? officialOrigin()
      : originFor(baseUrl);
    url = `${origin}/user/balance`;
  }

  try {
    const data = await fetchJson(url, { Authorization: `Bearer ${apiKey}` });
    const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
    const info = infos[0] || data?.balance_info || {};
    const isAvailable =
      typeof data?.is_available === "boolean" ? data.is_available : infos.length > 0;
    return {
      platform: "deepseek",
      ok: isAvailable,
      isAvailable,
      probedUrl: url,
      currency: info.currency || "CNY",
      totalBalance: info.total_balance ?? null,
      grantedBalance: info.granted_balance ?? null,
      toppedUpBalance: info.topped_up_balance ?? null,
      message: isAvailable ? null : "DeepSeek 余额接口返回 is_available=false。",
    };
  } catch (error) {
    return {
      platform: "deepseek",
      ok: false,
      reason: "request_failed",
      probedUrl: url,
      message: `DeepSeek 余额查询失败：${error.message}`,
      detail: error.body || null,
      suggestedFixes: [
        "确认 DEEPSEEK_API_KEY 有效",
        "确认 balance_url 可达且返回 DeepSeek 格式",
      ],
    };
  }
}
