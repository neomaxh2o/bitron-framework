export type ExecutionBackend = "openclaw-exec";
export type ExecutionHost = "node";
export type ExecutionSecurity = "off" | "allowlist";
export type ExecutionAsk = "off" | "ask";

export interface ExecutionBackendConfig {
  backend: ExecutionBackend;
  host: ExecutionHost;
  node: string;
  security: ExecutionSecurity;
  ask: ExecutionAsk;
}

export interface ExecPolicyCheck {
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

export function checkExecPolicy(input: {
  command: string;
  requiredBins: string[];
  availableBins: string[];
  preflightSuccess: boolean;
  preflightMissing?: string[];
}): ExecPolicyCheck {
  const reasons: string[] = [];

  if (!input.command) {
    reasons.push("missing_command");
  }

  if (!input.preflightSuccess) {
    reasons.push("preflight_failed");
  }

  const missingRequiredBins = input.requiredBins.filter((bin) => !input.availableBins.includes(bin));
  if (missingRequiredBins.length > 0) {
    reasons.push(`missing_required_bins:${missingRequiredBins.join(",")}`);
  }

  const missingProfileBins = (input.preflightMissing || []).filter(Boolean);
  if (missingProfileBins.length > 0) {
    reasons.push(`missing_profile_bins:${missingProfileBins.join(",")}`);
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}
