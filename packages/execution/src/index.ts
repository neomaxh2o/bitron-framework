export interface ExecProfile {
  id: string;
  description: string;
  command: string;
  args: string[];
  requiredBins: string[];
  preflightProfile: string;
}

export interface PlannedExecRequest {
  tool: "exec";
  command: string;
  host: "node";
  node: string;
  security: "off" | "allowlist";
  ask: "off" | "ask";
}

export interface ExecReceipt {
  ok: boolean;
  mode: "planned" | "executed";
  node: string;
  profileId: string;
  command: string;
  args: string[];
  requiredBins: string[];
  preflightProfile: string;
  backend?: {
    backend: string;
    host: string;
    node: string;
    security: string;
    ask: string;
  };
  policy?: {
    allowed: boolean;
    reasons: string[];
  };
  execRequest?: PlannedExecRequest;
  stdout: string;
  stderr: string;
  code: number | null;
}

const EXEC_PROFILES: Record<string, ExecProfile> = {
  "node-version-check": {
    id: "node-version-check",
    description: "Verifica versión de Node.js en el nodo objetivo",
    command: "node",
    args: ["--version"],
    requiredBins: ["node"],
    preflightProfile: "nodejs"
  },
  "npm-version-check": {
    id: "npm-version-check",
    description: "Verifica versión de npm en el nodo objetivo",
    command: "npm",
    args: ["--version"],
    requiredBins: ["npm"],
    preflightProfile: "nodejs"
  },
  "git-version-check": {
    id: "git-version-check",
    description: "Verifica versión de git en el nodo objetivo",
    command: "git",
    args: ["--version"],
    requiredBins: ["git"],
    preflightProfile: "basic"
  }
};

export function listExecProfiles(): ExecProfile[] {
  return Object.values(EXEC_PROFILES);
}

export function getExecProfile(profileId: string): ExecProfile | null {
  return EXEC_PROFILES[profileId] || null;
}

export function buildShellCommand(command: string, args: string[]): string {
  const esc = (v: string) => {
    if (/^[A-Za-z0-9_./:-]+$/.test(v)) return v;
    return `'${v.replace(/'/g, `'\\''`)}'`;
  };
  return [command, ...args].map(esc).join(" ");
}

export function buildPlannedExecRequest(input: {
  node: string;
  command: string;
  args: string[];
  security: "off" | "allowlist";
  ask: "off" | "ask";
}): PlannedExecRequest {
  return {
    tool: "exec",
    command: buildShellCommand(input.command, input.args),
    host: "node",
    node: input.node,
    security: input.security,
    ask: input.ask
  };
}

export function buildExecReceipt(input: {
  node: string;
  profile: ExecProfile;
  mode?: "planned" | "executed";
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  code?: number | null;
  backend?: {
    backend: string;
    host: string;
    node: string;
    security: string;
    ask: string;
  };
  policy?: {
    allowed: boolean;
    reasons: string[];
  };
  execRequest?: PlannedExecRequest;
}): ExecReceipt {
  return {
    ok: input.ok ?? false,
    mode: input.mode ?? "planned",
    node: input.node,
    profileId: input.profile.id,
    command: input.profile.command,
    args: input.profile.args,
    requiredBins: input.profile.requiredBins,
    preflightProfile: input.profile.preflightProfile,
    backend: input.backend,
    policy: input.policy,
    execRequest: input.execRequest,
    stdout: input.stdout ?? "",
    stderr: input.stderr ?? "",
    code: input.code ?? null
  };
}
