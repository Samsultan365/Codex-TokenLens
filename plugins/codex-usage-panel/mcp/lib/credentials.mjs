import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  DatabaseSync = null;
}

function ccSwitchRoot() {
  const candidates = [
    process.env.CC_SWITCH_HOME,
    path.join(os.homedir(), ".cc-switch"),
    path.join(process.env.APPDATA || "", "cc-switch"),
  ].filter(Boolean);
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {
      // ignore
    }
  }
  return null;
}

function candidateDatabases() {
  const root = ccSwitchRoot();
  if (!root) return [];
  const files = [];
  const db = path.join(root, "cc-switch.db");
  if (fs.existsSync(db)) files.push(db);
  const backups = path.join(root, "backups");
  try {
    for (const entry of fs.readdirSync(backups)) {
      if (entry.endsWith(".db")) {
        const full = path.join(backups, entry);
        try {
          files.push({ path: full, mtimeMs: fs.statSync(full).mtimeMs });
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // no backups directory
  }
  const sorted = files
    .filter((item) => typeof item === "string")
    .concat(
      files
        .filter((item) => typeof item !== "string")
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .map((item) => item.path),
    );
  return sorted;
}

function currentProviderId(root) {
  try {
    const raw = fs.readFileSync(path.join(root, "settings.json"), "utf8");
    const data = JSON.parse(raw);
    return data.currentProviderCodex || null;
  } catch {
    return null;
  }
}

function extractKey(settingsConfig) {
  if (!settingsConfig) return null;
  let data;
  try {
    data = JSON.parse(settingsConfig);
  } catch {
    return null;
  }
  const auth = data.auth || {};
  const candidates = [
    auth.OPENAI_API_KEY,
    auth.openai_api_key,
    auth.apiKey,
    auth.api_key,
    auth.API_KEY,
    data.apiKey,
    data.api_key,
    data.OPENAI_API_KEY,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function resolveFallbackApiKey(platform) {
  if (platform !== "deepseek" || !DatabaseSync) return null;
  const files = candidateDatabases();
  if (files.length === 0) return null;
  const root = ccSwitchRoot();
  const preferredId = currentProviderId(root);

  for (const file of files) {
    let db;
    try {
      db = new DatabaseSync(file, { readOnly: true });
    } catch {
      continue;
    }
    try {
      let row;
      if (preferredId) {
        row = db
          .prepare("SELECT settings_config FROM providers WHERE app_type='codex' AND id=? LIMIT 1")
          .get(preferredId);
      }
      if (!row) {
        row = db
          .prepare("SELECT settings_config FROM providers WHERE app_type='codex' AND is_current=1 LIMIT 1")
          .get();
      }
      if (!row) {
        row = db
          .prepare("SELECT settings_config FROM providers WHERE app_type='codex' AND (name LIKE '%deepseek%' OR settings_config LIKE '%deepseek%') ORDER BY is_current DESC LIMIT 1")
          .get();
      }
      const key = extractKey(row?.settings_config);
      if (key) return key;
    } finally {
      try {
        db.close();
      } catch {
        // ignore
      }
    }
  }
  return null;
}
