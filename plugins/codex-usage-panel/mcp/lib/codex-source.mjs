import fs from "node:fs";
import path from "node:path";
import { codexHome } from "./config.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  DatabaseSync = null;
}

const SESSION_ROOT = path.join(codexHome(), "sessions");
const SESSION_INDEX = path.join(codexHome(), "session_index.jsonl");
const STATE_DB_DIR = codexHome();
const TAIL_BYTES = 512 * 1024;

function collectJsonl(root) {
  const files = [];
  const walk = (directory) => {
    let entries = [];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        try {
          files.push({ path: full, mtimeMs: fs.statSync(full).mtimeMs });
        } catch {
          // Ignore files that disappear while scanning.
        }
      }
    }
  };
  walk(root);
  return files.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function readTail(file) {
  const stat = fs.statSync(file);
  const length = Math.min(stat.size, TAIL_BYTES);
  const buffer = Buffer.alloc(length);
  const handle = fs.openSync(file, "r");
  try {
    fs.readSync(handle, buffer, 0, length, stat.size - length);
  } finally {
    fs.closeSync(handle);
  }
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/);
  // If the file is larger than the tail window, the first line is partial.
  if (stat.size > TAIL_BYTES) lines.shift();
  return lines;
}

function loadThreadNames() {
  const names = new Map();
  try {
    const lines = fs.readFileSync(SESSION_INDEX, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.id && entry.thread_name) names.set(entry.id, entry.thread_name);
      } catch {
        // ignore malformed lines
      }
    }
  } catch {
    // index may not exist yet
  }
  return names;
}

function newestStateDb() {
  try {
    const entries = fs.readdirSync(STATE_DB_DIR).filter((name) => /^state_\d+\.sqlite$/.test(name));
    if (entries.length === 0) return null;
    entries.sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\\d+/)[0]));
    return path.join(STATE_DB_DIR, entries[0]);
  } catch {
    return null;
  }
}

const ACTIVE_THREAD_FILE = path.join(codexHome(), "codex-usage-panel-active-thread.json");

function readActiveThreadFile() {
  try {
    const raw = fs.readFileSync(ACTIVE_THREAD_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!data.sessionId) return null;
    const updatedAt = Date.parse(data.updatedAt);
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt < 2 * 60 * 1000) {
      return { sessionId: data.sessionId, updatedAt: data.updatedAt }
    }
    return null;
  } catch {
    return null;
  }
}

function readActiveThread() {
  if (!DatabaseSync) return null;
  const file = newestStateDb();
  if (!file) return null;
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
  } catch {
    return null;
  }
  try {
    return db
      .prepare(
        "SELECT id, rollout_path, name, title, tokens_used, model, recency_at_ms FROM threads WHERE archived=0 ORDER BY recency_at_ms DESC LIMIT 1"
      )
      .get();
  } catch {
    return null;
  } finally {
    try { db.close(); } catch {}
  }
}

function threadIdFromName(file) {
  const match = path.basename(file).match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  return match ? match[0] : null;
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

function extractTokenCount(entry) {
  if (!entry) return null;
  const payload =
    entry.type === "token_count"
      ? entry
      : entry.type === "event_msg" && entry.payload?.type === "token_count"
        ? entry.payload
        : null;
  if (!payload) return null;
  const info = payload.info || {};
  const last = info.last_token_usage || {};
  const total = info.total_token_usage || {};
  const contextWindow = Number(info.model_context_window || 0);
  const lastInput = Number(last.input_tokens || 0);
  return {
    observedAt: entry.timestamp || payload.timestamp || null,
    contextWindow,
    last: {
      inputTokens: lastInput,
      cachedInputTokens: Number(last.cached_input_tokens || 0),
      cacheWriteInputTokens: Number(last.cache_write_input_tokens || 0),
      outputTokens: Number(last.output_tokens || 0),
      reasoningOutputTokens: Number(last.reasoning_output_tokens || 0),
      totalTokens: Number(last.total_tokens || 0),
      contextPercent: contextWindow > 0 ? (lastInput / contextWindow) * 100 : null,
    },
    total: {
      inputTokens: Number(total.input_tokens || 0),
      cachedInputTokens: Number(total.cached_input_tokens || 0),
      cacheWriteInputTokens: Number(total.cache_write_input_tokens || 0),
      outputTokens: Number(total.output_tokens || 0),
      reasoningOutputTokens: Number(total.reasoning_output_tokens || 0),
      totalTokens: Number(total.total_tokens || 0),
    },
    rateLimits: normalizeRateLimits(payload.rate_limits),
  };
}

function normalizeRateLimits(rateLimits) {
  if (!rateLimits || typeof rateLimits !== "object") return null;
  const credits = rateLimits.credits;
  return {
    limitId: rateLimits.limit_id ?? rateLimits.limitId ?? null,
    limitName: rateLimits.limit_name ?? rateLimits.limitName ?? null,
    planType: rateLimits.plan_type ?? rateLimits.planType ?? null,
    primary: normalizeLimit(rateLimits.primary),
    secondary: normalizeLimit(rateLimits.secondary),
    credits: credits
      ? {
          balance: typeof credits.balance === "string" ? credits.balance : null,
          hasCredits: Boolean(credits.hasCredits),
          unlimited: Boolean(credits.unlimited),
        }
      : null,
  };
}

export function latestLocalUsage(preferredThreadId) {
  const stateThread = readActiveThread();
  const activeThreadFile = readActiveThreadFile();
  const threadId = preferredThreadId || process.env.CODEX_THREAD_ID || activeThreadFile?.sessionId || stateThread?.id || null;
  const threadNames = loadThreadNames();
  const files = collectJsonl(SESSION_ROOT);
  if (files.length === 0 && !stateThread) return null;

  let ordered = files;
  if (threadId) {
    const matched = files.filter((file) => threadIdFromName(file.path) === threadId);
    if (matched.length > 0) ordered = matched;
  }

  if (ordered.length === 0 && stateThread) {
    return {
      source: "state_db",
      file: stateThread.rollout_path || null,
      threadId: stateThread.id,
      threadName: stateThread.name || threadNames.get(stateThread.id) || stateThread.title || null,
      stateTokensUsed: Number(stateThread.tokens_used || 0),
      observedAt: null,
      contextWindow: null,
      last: null,
      total: { totalTokens: Number(stateThread.tokens_used || 0) },
      rateLimits: null,
    };
  }

  for (const file of ordered) {
    const lines = readTail(file.path);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      const usage = extractTokenCount(entry);
      if (!usage) continue;
      const resolvedThreadId = threadIdFromName(file.path) || threadId || null;
      const stateName = resolvedThreadId === stateThread?.id ? stateThread.name || stateThread.title || null : null;
      const stateTokens = resolvedThreadId === stateThread?.id ? Number(stateThread.tokens_used || 0) : null;
      return {
        source: "state_db+local_jsonl",
        file: file.path,
        threadId: resolvedThreadId,
        threadName: stateName || (resolvedThreadId ? threadNames.get(resolvedThreadId) || null : null),
        stateTokensUsed: stateTokens,
        ...usage,
      };
    }
  }
  return null;
}

export function availableSessionCount() {
  return collectJsonl(SESSION_ROOT).length;
}





