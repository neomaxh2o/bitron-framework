import { exec } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface WhichResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  parsed?: any;
}

export interface PreflightItem {
  bin: string;
  found: boolean;
  path: string | null;
}

export interface PreflightResult {
  success: boolean;
  node: string;
  checks: PreflightItem[];
  missing: string[];
  raw?: any;
}

const DEFAULT_NODE = "intradia-vps-2";

function getWrapperPath(wrapperName: string): string {
  const safeName = wrapperName.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join("/root/bitron-framework", ".bitron", "wrappers", `run_${safeName}.sh`);
}

function shellEscapeDouble(value: string): string {
  return value.replace(/(["\\$`])/g, "\\$1");
}

function execCommand(fullCommand: string): Promise<RunResult> {
  return new Promise((resolve) => {
    exec(fullCommand, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout,
        stderr,
        code: error?.code ?? 0
      });
    });
  });
}

export async function whichOnNode(bin: string, node?: string): Promise<WhichResult> {
  const target = node || DEFAULT_NODE;
  const params = JSON.stringify({ bins: [bin] }).replace(/(["\\$`])/g, "\\$1");
  const fullCommand = `openclaw nodes invoke --node ${target} --command system.which --params "${params}"`;

  console.log("[Bitron → OpenClaw which] Ejecutando:", fullCommand);

  const result = await execCommand(fullCommand);

  if (!result.success) {
    return result;
  }

  try {
    const parsed = JSON.parse(result.stdout);
    return {
      ...result,
      parsed
    };
  } catch {
    return result;
  }
}

export async function preflightBasic(node?: string): Promise<PreflightResult> {
  const target = node || DEFAULT_NODE;
  const bins = ["bash", "sh", "node", "npm", "git", "python3"];
  const params = JSON.stringify({ bins }).replace(/(["\\$`])/g, "\\$1");
  const fullCommand = `openclaw nodes invoke --node ${target} --command system.which --params "${params}"`;

  console.log("[Bitron → OpenClaw preflight] Ejecutando:", fullCommand);

  const result = await execCommand(fullCommand);

  if (!result.success) {
    return {
      success: false,
      node: target,
      checks: bins.map((bin) => ({ bin, found: false, path: null })),
      missing: bins
    };
  }

  try {
    const parsed = JSON.parse(result.stdout);
    const resolvedBins = parsed?.payload?.bins || {};

    const checks: PreflightItem[] = bins.map((bin) => ({
      bin,
      found: Boolean(resolvedBins[bin]),
      path: resolvedBins[bin] || null
    }));

    const missing = checks.filter((item) => !item.found).map((item) => item.bin);

    return {
      success: missing.length === 0,
      node: target,
      checks,
      missing,
      raw: parsed
    };
  } catch {
    return {
      success: false,
      node: target,
      checks: bins.map((bin) => ({ bin, found: false, path: null })),
      missing: bins
    };
  }
}

export function runOnNode(command: string, node?: string): Promise<RunResult> {
  return Promise.resolve({
    success: false,
    stdout: "",
    stderr: 'runOnNode(command) quedó deshabilitado. Usá runWrapper(...) o whichOnNode(...).',
    code: 1
  });
}

export function runWrapper(wrapperName: string, args: string[] = [], node?: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const target = node || DEFAULT_NODE;
    const wrapperPath = getWrapperPath(wrapperName);

    if (!fs.existsSync(wrapperPath)) {
      resolve({
        success: false,
        stdout: "",
        stderr: `Wrapper no encontrado: ${wrapperPath}`,
        code: 1
      });
      return;
    }

    const cmd = [wrapperPath, ...args.map(arg => `"${shellEscapeDouble(arg)}"`)].join(" ");
    const fullCommand = `openclaw nodes run --node ${target} --raw "${shellEscapeDouble(cmd)}" --ask off`;

    console.log("[Bitron → OpenClaw wrapper] Ejecutando:", fullCommand);

    exec(fullCommand, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout,
        stderr,
        code: error?.code ?? 0
      });
    });
  });
}
