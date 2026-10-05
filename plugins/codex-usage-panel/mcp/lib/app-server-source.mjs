import { spawn } from "node:child_process";
import { codexHome } from "./config.mjs";

function codexCli() {
  return process.env.CODEX_CLI_PATH || "codex";
}

function appServerEnv() {
  const env = { ...process.env };
  env.CODEX_HOME = env.CODEX_HOME || codexHome();
  return env;
}

export async function queryAppServer(method, params = {}, timeoutMs = 10000) {
  const command = codexCli();
  const args = ["app-server", "proxy"];
  const child = spawn(command, args, {
    env: appServerEnv(),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  const requestId = 1;
  const request = JSON.stringify({
    jsonrpc: "2.0",
    id: requestId,
    method,
    params,
  });

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch {
        // ignore
      }
      reject(new Error(`App Server request timed out: ${method}`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      for (const line of stdout.split(/\r?\n/)) {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.id === requestId) {
          if (settled) continue;
          settled = true;
          clearTimeout(timer);
          try {
            child.kill();
          } catch {
            // ignore
          }
          if (message.error) {
            reject(new Error(message.error.message || JSON.stringify(message.error)));
          } else {
            resolve(message.result);
          }
          return;
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`App Server exited with code ${code}: ${stderr.trim()}`));
    });

    child.stdin.write(`${request}\n`);
    child.stdin.end();
  });
}

function normalizeLimit(limit) {
  if (!limit || typeof limit !== "object") return null;
  const used = Number(limit.used_percent ?? limit.usedPercent ?? 0);
  return {
    usedPercent: used,
    remainingPercent: Math.max(0, Math.min(100, 100 - used)),
    resetsAt: limit.resets_at ? Number(limit.resets_at) : null,
    windowDurationMins: limit.window_duration_mins
      ? Number(limit.window_duration_mins)
      : null,
  };
}

function normalizeCredits(credits) {
  if (!credits || typeof credits !== "object") return null;
  return {
    balance: typeof credits.balance === "string" ? credits.balance : null,
    hasCredits: Boolean(credits.hasCredits),
    unlimited: Boolean(credits.unlimited),
  };
}

function normalizeRateLimits(rateLimits) {
  if (!rateLimits || typeof rateLimits !== "object") return null;
  const limitsByLimitId = rateLimits.rateLimitsByLimitId || {};
  const primaryBucket = rateLimits.rateLimits || {};
  const codexBucket = limitsByLimitId.codex || primaryBucket;
  return {
    limitId: codexBucket.limit_id ?? codexBucket.limitId ?? null,
    limitName: codexBucket.limit_name ?? codexBucket.limitName ?? null,
    planType: codexBucket.plan_type ?? codexBucket.planType ?? null,
    primary: normalizeLimit(codexBucket.primary),
    secondary: normalizeLimit(codexBucket.secondary),
    credits: normalizeCredits(codexBucket.credits),
    ordinaryUsageAllowed:
      typeof rateLimits.ordinaryUsageAllowed === "boolean"
        ? rateLimits.ordinaryUsageAllowed
        : null,
  };
}

function normalizeUsage(usage) {
  if (!usage || typeof usage !== "object") return null;
  const summary = usage.summary || {};
  return {
    lifetimeTokens: summary.lifetime_tokens ?? summary.lifetimeTokens ?? null,
    peakDailyTokens: summary.peak_daily_tokens ?? summary.peakDailyTokens ?? null,
    currentStreakDays: summary.current_streak_days ?? summary.currentStreakDays ?? null,
    longestStreakDays: summary.longest_streak_days ?? summary.longestStreakDays ?? null,
    longestRunningTurnSec:
      summary.longest_running_turn_sec ?? summary.longestRunningTurnSec ?? null,
    dailyUsageBuckets: Array.isArray(usage.dailyUsageBuckets)
      ? usage.dailyUsageBuckets
      : [],
  };
}

function normalizeAccount(account) {
  if (!account || typeof account !== "object") return null;
  return {
    type: account.account?.type || account.type || null,
    email: account.account?.email || account.email || null,
    planType: account.account?.planType || account.planType || null,
    requiresOpenaiAuth: Boolean(account.requiresOpenaiAuth),
  };
}

export async function queryAppServerSnapshot({ threadId = null } = {}) {
  const [accountResult, usageResult, rateLimitResult] = await Promise.allSettled([
    queryAppServer("account/read", {}),
    queryAppServer("account/usage/read", threadId ? { threadId } : {}),
    queryAppServer("account/rateLimits/read", { excludeResetCreditDetails: true }),
  ]);

  const account =
    accountResult.status === "fulfilled"
      ? normalizeAccount(accountResult.value)
      : null;
  const usage =
    usageResult.status === "fulfilled"
      ? normalizeUsage(usageResult.value)
      : null;
  const rateLimits =
    rateLimitResult.status === "fulfilled"
      ? normalizeRateLimits(rateLimitResult.value)
      : null;
  const errors = {
    account: accountResult.status === "rejected" ? accountResult.reason.message : null,
    usage: usageResult.status === "rejected" ? usageResult.reason.message : null,
    rateLimits: rateLimitResult.status === "rejected" ? rateLimitResult.reason.message : null,
  };

  if (!account && !usage && !rateLimits) {
    const firstError =
      errors.account || errors.usage || errors.rateLimits || "App Server unavailable";
    throw new Error(firstError);
  }

  return { source: "app_server", account, usage, rateLimits, errors };
}
