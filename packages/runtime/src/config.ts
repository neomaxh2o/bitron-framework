import fs from "node:fs";
import path from "node:path";

export type BitronExecBackend = "local" | "openclaw-node" | "auto";

export interface BitronRuntimeConfig {
  execBackend: BitronExecBackend;
}

const CONFIG_DIR = "/root/bitron-framework/.bitron";
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: BitronRuntimeConfig = {
  execBackend: "local"
};

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function getRuntimeConfigPath(): string {
  return CONFIG_PATH;
}

export function loadRuntimeConfig(): BitronRuntimeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Partial<BitronRuntimeConfig>;
    const execBackend =
      raw.execBackend === "local" || raw.execBackend === "openclaw-node" || raw.execBackend === "auto"
        ? raw.execBackend
        : DEFAULT_CONFIG.execBackend;

    return { execBackend };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveRuntimeConfig(config: BitronRuntimeConfig): BitronRuntimeConfig {
  ensureDir(CONFIG_DIR);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  return config;
}

export function setExecBackend(execBackend: BitronExecBackend): BitronRuntimeConfig {
  const current = loadRuntimeConfig();
  const next: BitronRuntimeConfig = {
    ...current,
    execBackend
  };
  return saveRuntimeConfig(next);
}
