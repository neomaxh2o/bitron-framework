export interface ExecProfile {
  id: string;
  description: string;
  command: string;
  args: string[];
  requiredBins: string[];
  preflightProfile: string;
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

export function buildExecReceipt(input: {
  node: string;
  profile: ExecProfile;
  mode?: "planned" | "executed";
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  code?: number | null;
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
    stdout: input.stdout ?? "",
    stderr: input.stderr ?? "",
    code: input.code ?? null
  };
}
