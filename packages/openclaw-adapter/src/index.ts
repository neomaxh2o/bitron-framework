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
  profile: string;
  checks: PreflightItem[];
  missing: string[];
  raw?: any;
}

export interface BuilderProbeResult {
  success: boolean;
  node: string;
  checks: Array<{
    bin: string;
    found: boolean;
    path: string | null;
  }>;
  raw?: any;
}

export interface ExecSpec {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface ExecOnNodeResult {
  success: boolean;
  node: string;
  mode: "planned" | "not-implemented";
  spec: ExecSpec;
  stdout: string;
  stderr: string;
  code: number | null;
}

const DEFAULT_NODE = "intradia-vps-2";

const PREFLIGHT_PROFILES: Record<string, string[]> = {
  basic: ["bash", "sh", "node", "npm", "git", "python3"],
  nodejs: ["bash", "sh", "node", "npm", "git", "pnpm"],
  devops: ["bash", "sh", "git", "curl", "jq", "systemctl", "docker"],
  docker: ["bash", "sh", "docker", "docker-compose", "curl"],
  full: ["bash", "sh", "node", "npm", "pnpm", "git", "python3", "curl", "jq", "systemctl", "docker"]
};

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

async function invokeSystemWhich(bins: string[], node?: string): Promise<RunResult> {
  const target = node || DEFAULT_NODE;
  const params = JSON.stringify({ bins }).replace(/(["\\$`])/g, "\\$1");
  const fullCommand = `openclaw nodes invoke --node ${target} --command system.which --params "${params}"`;

  console.log("[Bitron → OpenClaw system.which] Ejecutando:", fullCommand);

  return execCommand(fullCommand);
}

function parseWhichPayload(stdout: string): any | null {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

export function listPreflightProfiles(): string[] {
  return Object.keys(PREFLIGHT_PROFILES);
}

export async function whichOnNode(bin: string, node?: string): Promise<WhichResult> {
  const result = await invokeSystemWhich([bin], node);

  if (!result.success) {
    return result;
  }

  const parsed = parseWhichPayload(result.stdout);

  return {
    ...result,
    parsed: parsed || undefined
  };
}

export async function preflightProfile(profile = "basic", node?: string): Promise<PreflightResult> {
  const target = node || DEFAULT_NODE;
  const bins = PREFLIGHT_PROFILES[profile] || PREFLIGHT_PROFILES.basic;
  const result = await invokeSystemWhich(bins, target);

  if (!result.success) {
    return {
      success: false,
      node: target,
      profile,
      checks: bins.map((bin) => ({ bin, found: false, path: null })),
      missing: bins
    };
  }

  const parsed = parseWhichPayload(result.stdout);
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
    profile,
    checks,
    missing,
    raw: parsed || undefined
  };
}

export async function preflightBasic(node?: string): Promise<PreflightResult> {
  return preflightProfile("basic", node);
}

export async function builderProbeOnNode(node?: string): Promise<BuilderProbeResult> {
  const target = node || DEFAULT_NODE;
  const bins = ["node", "npm", "git", "pwd"];
  const result = await invokeSystemWhich(bins, target);

  if (!result.success) {
    return {
      success: false,
      node: target,
      checks: bins.map((bin) => ({ bin, found: false, path: null }))
    };
  }

  const parsed = parseWhichPayload(result.stdout);
  const resolvedBins = parsed?.payload?.bins || {};

  return {
    success: true,
    node: target,
    checks: bins.map((bin) => ({
      bin,
      found: Boolean(resolvedBins[bin]),
      path: resolvedBins[bin] || null
    })),
    raw: parsed || undefined
  };
}

export async function execOnNode(spec: ExecSpec, node?: string): Promise<ExecOnNodeResult> {
  const target = node || DEFAULT_NODE;

  return {
    success: false,
    node: target,
    mode: "not-implemented",
    spec,
    stdout: "",
    stderr: "execOnNode todavía no está implementado en el adapter. Discovery y preflight sí están activos.",
    code: 1
  };
}

export function runOnNode(command: string, node?: string): Promise<RunResult> {
  return Promise.resolve({
    success: false,
    stdout: "",
    stderr: 'runOnNode(command) quedó deshabilitado. Usá runWrapper(...), whichOnNode(...), preflightProfile(...) o execOnNode(...).',
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
