import { resolvePlatform, loadPluginConfig } from "./lib/config.mjs";
import { latestLocalUsage } from "./lib/codex-source.mjs";
import { queryBalance } from "./lib/adapters/index.mjs";
import { renderCombined } from "./lib/render.mjs";

const platform = resolvePlatform();
const usage = latestLocalUsage();
const skipBalance = process.argv.includes("--no-balance");
const balance = skipBalance ? null : await queryBalance(platform, loadPluginConfig());

const safePlatform = { ...platform, auth: undefined };
const payload = {
  generatedAt: new Date().toISOString(),
  platform: safePlatform,
  usage,
  balance,
};

if (process.argv.includes("--markdown")) {
  process.stdout.write(`${renderCombined(usage, balance, platform)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

