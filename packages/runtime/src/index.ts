import {
  getRuntimeConfigPath,
  loadRuntimeConfig,
  saveRuntimeConfig,
  setExecBackend,
  type BitronExecBackend,
  type BitronRuntimeConfig
} from "./config";

export type { BitronExecBackend, BitronRuntimeConfig };

export interface ExecutionBackendConfig {
  backend: "openclaw-exec";
  host: "node";
  node: string;
  security: "off" | "allowlist";
  ask: "off" | "ask";
}

export interface ExecPolicyInput {
  command: string;
  requiredBins: string[];
  availableBins: string[];
  preflightSuccess: boolean;
  preflightMissing: string[];
}

export interface ExecPolicyResult {
  allowed: boolean;
  reasons: string[];
}

export function buildExecutionBackendConfig(node: string): ExecutionBackendConfig {
  return {
    backend: "openclaw-exec",
    host: "node",
    node,
    security: "off",
    ask: "off"
  };
}

export function checkExecPolicy(input: ExecPolicyInput): ExecPolicyResult {
  const reasons: string[] = [];

  if (!input.preflightSuccess) {
    reasons.push("preflight_failed");
  }

  const missingRequired = input.requiredBins.filter((bin) => !input.availableBins.includes(bin));
  if (missingRequired.length > 0) {
    reasons.push(`missing_required_bins:${missingRequired.join(",")}`);
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}

export {
  getRuntimeConfigPath,
  loadRuntimeConfig,
  saveRuntimeConfig,
  setExecBackend
};
