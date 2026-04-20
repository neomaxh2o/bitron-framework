import { createJobId } from "@bitron/core";
import { preflightProfile } from "@bitron/openclaw-adapter";
import {
  getExecProfile,
  buildPlannedExecRequest,
  buildOpenClawExecPayload,
  buildApprovalTarget
} from "@bitron/execution";
import { buildExecutionBackendConfig, checkExecPolicy } from "@bitron/runtime";
import { buildExecReadyArtifactPaths, writeJson } from "../lib/artifacts";

export async function handleExecReadyCommand(args: string[], node?: string) {
  const profileId = args[1];

  if (!profileId) {
    console.error("Debes indicar un exec profile. Ejemplo: bitron exec-ready node-version-check --node intradia-vps-2");
    process.exit(1);
  }

  const profile = getExecProfile(profileId);
  if (!profile) {
    console.error(`Exec profile no reconocido: ${profileId}`);
    process.exit(1);
  }

  const targetNode = node || "intradia-vps-2";
  const backendConfig = buildExecutionBackendConfig(targetNode);

  const preflight = await preflightProfile(profile.preflightProfile, targetNode);
  const availableBins = preflight.checks.filter((item) => item.found).map((item) => item.bin);

  const policy = checkExecPolicy({
    command: profile.command,
    requiredBins: profile.requiredBins,
    availableBins,
    preflightSuccess: preflight.success,
    preflightMissing: preflight.missing
  });

  const execRequest = buildPlannedExecRequest({
    node: targetNode,
    command: profile.command,
    args: profile.args,
    security: backendConfig.security,
    ask: backendConfig.ask
  });

  const openclawExecPayload = buildOpenClawExecPayload(execRequest);
  const approvalTarget = buildApprovalTarget({
    command: execRequest.command,
    node: targetNode
  });

  const jobId = createJobId();
  const readyPayload = {
    jobId,
    ready: preflight.success && policy.allowed,
    node: targetNode,
    profileId: profile.id,
    preflight,
    backend: backendConfig,
    policy,
    execRequest,
    openclawExecPayload,
    approvalTarget
  };

  const paths = buildExecReadyArtifactPaths(jobId);

  writeJson(paths.execReady, readyPayload);
  writeJson(paths.approvalChecklist, {
    jobId,
    node: targetNode,
    profileId: profile.id,
    command: execRequest.command,
    suggestedChecks: approvalTarget?.suggestedChecks || [],
    backend: backendConfig,
    policy
  });

  console.log(JSON.stringify({
    ...readyPayload,
    artifacts: {
      execReady: paths.execReady,
      approvalChecklist: paths.approvalChecklist
    }
  }, null, 2));
}
