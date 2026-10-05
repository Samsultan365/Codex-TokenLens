import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

export function pluginDir() {
  return path.resolve(__dirname, "..");
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function unquote(value) {
  const text = value.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function parseScalar(value) {
  const text = value.trim();
  if (text === "true") return true;
  if (text === "false") return false;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => unquote(item));
  }
  if (text !== "" && !Number.isNaN(Number(text))) return Number(text);
  return text;
}

function setNested(target, keyPath, value) {
  const parts = keyPath.split(".");
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

export function parseToml(text) {
  const root = {};
  let sectionPath = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      sectionPath = section[1].trim();
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = parseScalar(match[2]);
    const fullKey = sectionPath ? `${sectionPath}.${key}` : key;
    setNested(root, fullKey, value);
  }
  return root;
}

export function getNested(object, ...keys) {
  let cursor = object;
  for (const key of keys) {
    if (cursor == null) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

export function loadCodexConfig() {
  const file = path.join(codexHome(), "config.toml");
  try {
    return parseToml(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

export function loadModelCatalog() {
  const file = path.join(codexHome(), "cc-switch-model-catalog.json");
  const data = readJson(file);
  if (!data || !Array.isArray(data.models)) return null;
  const map = new Map();
  for (const model of data.models) map.set(model.slug, model);
  return map;
}

export function loadPluginConfig() {
  const candidates = [
    process.env.CODEX_USAGE_PANEL_CONFIG,
    path.join(codexHome(), "codex-usage-panel.config.json"),
    path.join(pluginDir(), "codex-usage-panel.config.json"),
  ].filter(Boolean);
  for (const file of candidates) {
    const data = readJson(file);
    if (data) return data;
  }
  return null;
}

export function resolvePlatform() {
  const codex = loadCodexConfig();
  const model = codex.model || "";
  const provider = codex.model_provider || "openai";
  const baseUrl =
    getNested(codex, "model_providers", provider, "base_url") ||
    getNested(codex, "model_providers", provider, "baseUrl") ||
    "";
  const catalog = loadModelCatalog();
  const catalogModel = catalog ? catalog.get(model) : null;
  const displayName = catalogModel?.display_name || model || provider;

  let platform = "openai_compatible";
  if (/deepseek/i.test(`${model} ${baseUrl}`)) platform = "deepseek";
  else if (/openrouter\.ai/i.test(baseUrl)) platform = "openrouter";
  else if (/api\.openai\.com|openai\.com/i.test(baseUrl)) platform = "openai";
  else if (provider === "openai" && !baseUrl) platform = "openai";

  return {
    model,
    provider,
    baseUrl,
    platform,
    displayName,
    codexHome: codexHome(),
    auth: readJson(path.join(codexHome(), "auth.json")),
  };
}

export function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
