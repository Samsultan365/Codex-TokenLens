import { platformLabel } from "./adapters/index.mjs";

export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("en-US").format(number);
}

export function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toFixed(1)}%`;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function platformName(platform) {
  return platformLabel(platform);
}

export function renderUsageMarkdown(usage, platform) {
  if (!usage) {
    return "未找到本地 Codex `token_count` 记录。请先在 Codex 中发起一轮对话后重试。";
  }
  const last = usage.last;
  const total = usage.total;
  const primary = usage.rateLimits?.primary;
  const secondary = usage.rateLimits?.secondary;
  const credits = usage.rateLimits?.credits;
  const plan = usage.rateLimits?.planType || "自定义 provider";
  const context = usage.contextWindow
    ? `${formatNumber(last.inputTokens)} / ${formatNumber(usage.contextWindow)} tokens (${formatPercent(last.contextPercent)})`
    : `${formatNumber(last.inputTokens)} tokens`;

  const lines = [
    "## Codex 用量面板",
    "",
    `- 平台：${platformName(platform.platform)} · ${platform.displayName || platform.model || "unknown"}`,
    `- 当前上下文：${context}`,
    `- 本轮 token：输入 ${formatNumber(last.inputTokens)} · 缓存 ${formatNumber(last.cachedInputTokens)} · 输出 ${formatNumber(last.outputTokens)} · 推理 ${formatNumber(last.reasoningOutputTokens)} · 合计 ${formatNumber(last.totalTokens)}`,
    `- 会话累计：${formatNumber(total.totalTokens)} tokens`,
  ];

  if (primary || secondary) {
    if (primary) {
      lines.push(`- 主限额：${formatPercent(primary.usedPercent)} used / ${formatPercent(primary.remainingPercent)} remaining · 重置 ${formatDateTime(primary.resetsAt)}`);
    }
    if (secondary) {
      lines.push(`- 周限额：${formatPercent(secondary.usedPercent)} used / ${formatPercent(secondary.remainingPercent)} remaining · 重置 ${formatDateTime(secondary.resetsAt)}`);
    }
    lines.push(`- 套餐：${plan}`);
  } else {
    lines.push("- Codex 额度：当前账户未提供 `rate_limits`（自定义 provider 常见）。");
  }

  if (credits) {
    lines.push(`- Credits：${credits.unlimited ? "unlimited" : credits.balance || "—"}${credits.hasCredits ? "" : " · 无可用 credits"}`);
  }
  if (usage.observedAt) {
    lines.push(`- 采样时间：${usage.observedAt}`);
  }
  return lines.join("\n");
}

export function renderBalanceMarkdown(balance) {
  const lines = [`## 余额面板 · ${platformName(balance.platform)}`];
  if (!balance.ok) {
    lines.push("", balance.message || "余额查询失败。");
    if (balance.detail) lines.push("", "```", balance.detail, "```");
    return lines.join("\n");
  }
  switch (balance.platform) {
    case "deepseek":
      lines.push(
        "",
        `- 币种：${balance.currency || "—"}`,
        `- 总余额：${balance.totalBalance ?? "—"}`,
        `- 赠送余额：${balance.grantedBalance ?? "—"}`,
        `- 充值余额：${balance.toppedUpBalance ?? "—"}`,
      );
      break;
    case "openrouter":
      lines.push(
        "",
        `- 总 credits：${balance.totalCredits ?? "—"}`,
        `- 已用 credits：${balance.totalUsage ?? "—"}`,
      );
      break;
    case "openai":
    case "openai_compatible":
      lines.push("", balance.message);
      break;
    default:
      lines.push("", JSON.stringify(balance));
  }
  return lines.join("\n");
}

export function renderCombined(usage, balance, platform) {
  return `${renderUsageMarkdown(usage, platform)}\n\n${renderBalanceMarkdown(balance)}`;
}
