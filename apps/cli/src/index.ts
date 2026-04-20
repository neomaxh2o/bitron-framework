#!/usr/bin/env node

import { createJobId, createContext } from "@bitron/core";
import { plannerAgent } from "@bitron/agents";
import {
  runOnNode,
  runWrapper,
  whichOnNode,
  preflightBasic,
  preflightProfile,
  listPreflightProfiles,
  execOnNode
} from "@bitron/openclaw-adapter";
import { listExecProfiles, getExecProfile, buildExecReceipt } from "@bitron/execution";
import { buildExecutionBackendConfig, checkExecPolicy } from "@bitron/runtime";
import { runStandardDelivery, runNodeBuild } from "@bitron/workflows";

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

function getOption(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function stripOption(name: string): string[] {
  const idx = args.indexOf(name);
  if (idx === -1) return [...args];
  const copy = [...args];
  copy.splice(idx, 2);
  return copy;
}

const node = getOption("--node");
const cleanArgs = stripOption("--node");
const command = cleanArgs[0];

async function main() {
  if (command === "plan") {
    const task = cleanArgs.slice(1).join(" ");
    const context = createContext(createJobId(), "planner-agent", node || "default-node");
    const result = plannerAgent(context, task);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "which") {
    const bin = cleanArgs[1];
    if (!bin) {
      console.error("Debes indicar un binario. Ejemplo: bitron which bash --node intradia-vps-2");
      process.exit(1);
    }

    const result = await whichOnNode(bin, node);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "preflight") {
    const profile = cleanArgs[1];

    if (!profile) {
      console.error(`Debes indicar un perfil. Disponibles: ${listPreflightProfiles().join(", ")}`);
      process.exit(1);
    }

    if (profile === "basic") {
      const result = await preflightBasic(node);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (listPreflightProfiles().includes(profile)) {
      const result = await preflightProfile(profile, node);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.error(`Perfil no reconocido. Disponibles: ${listPreflightProfiles().join(", ")}`);
    process.exit(1);
  }

  if (command === "exec-profile-list") {
    console.log(JSON.stringify(listExecProfiles(), null, 2));
    return;
  }

  if (command === "exec-plan") {
    const profileId = cleanArgs[1];

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

    const adapterResult = await execOnNode(
      {
        command: profile.command,
        args: profile.args
      },
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
      policy
    });

    console.log(JSON.stringify({ preflight, adapterResult, receipt }, null, 2));
    return;
  }

  if (command === "run") {
    const cmd = cleanArgs.slice(1).join(" ");
    const result = await runOnNode(cmd, node);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "run-wrapper") {
    const wrapperName = cleanArgs[1];
    const wrapperArgs = cleanArgs.slice(2);
    const result = await runWrapper(wrapperName, wrapperArgs, node);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "workflow") {
    const workflowName = cleanArgs[1];
    const task = cleanArgs.slice(2).join(" ");

    if (workflowName === "standard-delivery") {
      const result = await runStandardDelivery(task, node);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (workflowName === "node-build") {
      const result = await runNodeBuild(task, node);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Workflow no reconocido: ${workflowName}`);
    process.exit(1);
  }

  console.log("Uso:");
  console.log('  pnpm --filter bitron-cli run bitron -- which bash --node intradia-vps-2');
  console.log('  pnpm --filter bitron-cli run bitron -- preflight full --node intradia-vps-2');
  console.log('  pnpm --filter bitron-cli run bitron -- exec-profile-list');
  console.log('  pnpm --filter bitron-cli run bitron -- exec-plan node-version-check --node intradia-vps-2');
  console.log('  pnpm --filter bitron-cli run bitron -- workflow standard-delivery "tu tarea" --node intradia-vps-2');
  console.log('  pnpm --filter bitron-cli run bitron -- workflow node-build "build frontend" --node intradia-vps-2');
}

main().catch((err) => {
  console.error("Bitron CLI error:", err);
  process.exit(1);
});
