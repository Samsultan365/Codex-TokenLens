import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const home = process.env.CODEX_HOME || path.join(process.env.USERPROFILE || process.env.HOME, ".codex");
const dbs = fs.readdirSync(home).filter((n) => /^state_\d+\.sqlite$/.test(n)).sort((a,b)=>Number(b.match(/\d+/)[0])-Number(a.match(/\d+/)[0]));
const file = path.join(home, dbs[0]);
const log = path.join(home, "codex-usage-panel-monitor.log");
function tick() {
  try {
    const db = new DatabaseSync(file, { readOnly: true });
    const row = db.prepare("SELECT id, name, recency_at_ms, updated_at_ms FROM threads WHERE archived=0 ORDER BY recency_at_ms DESC LIMIT 1").get();
    db.close();
    const line = JSON.stringify({ t: new Date().toISOString(), row });
    fs.appendFileSync(log, line + "\n", "utf8");
  } catch (e) {
    fs.appendFileSync(log, JSON.stringify({ t: new Date().toISOString(), error: String(e) }) + "\n", "utf8");
  }
}
tick();
const timer = setInterval(tick, 1000);
setTimeout(() => clearInterval(timer), 60000);
