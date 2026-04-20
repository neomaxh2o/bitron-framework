import { preflightProfile, execOnNode } from "@bitron/openclaw-adapter";
import {
  getExecProfile,
  buildExecReceipt,
  buildPlannedExecRequest,
  buildOpenClawExecPayload,
  buildApprovalTarget
} from "@bitron/execution";
import { buildExecutionBackendConfig, checkExecPolicy } from "@bitron/runtime";

export async function handleExecPlanCommand(args: string[], node?: string) {
  const profileId = args[1];

  if (!profileId) {
    console.error("Debes indicar un exec profile. Ejemplo: bitron exec-plan node-version-check --node intradia-vps-2");
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

  const adapterResult = await execOnNode(
    { command: profile.command, args: profile.args },
    targetNode
  );

  const receipt = buildExecReceipt({
    node: targetNode,
    profile,
    mode: adapterResult.success ? "executed" : "planned",
    ok: adapterResult.success && policy.allowed,
    stdout: adapterResult.stdout,
    stderr: adapterResult.stderr,
    code: adapterResult.code,
    backend: backendConfig,
    policy,
    execRequest,
    openclawExecPayload,
    approvalTarget
  });

  console.log(JSON.stringify({ preflight, adapterResult, receipt }, null, 2));
}
