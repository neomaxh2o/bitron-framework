#!/usr/bin/env node

import { createJobId, createContext } from "@bitron/core";
import { plannerAgent } from "@bitron/agents";
import { runOnNode, runWrapper } from "@bitron/openclaw-adapter";

import { normalizeArgs, getOption, stripOption } from "./lib/args";
import { handleWhichCommand } from "./commands/which";
import { handlePreflightCommand } from "./commands/preflight";
import { handleExecProfileListCommand } from "./commands/exec-profile-list";
import { handleExecReadyCommand } from "./commands/exec-ready";
import { handleExecPlanCommand } from "./commands/exec-plan";
import { handleWorkflowCommand } from "./commands/workflow";

const rawArgs = process.argv.slice(2);
const normalizedArgs = normalizeArgs(rawArgs);

const node = getOption(normalizedArgs, "--node");
const cleanArgs = stripOption(normalizedArgs, "--node");
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
    await handleWhichCommand(cleanArgs, node);
    return;
  }

  if (command === "preflight") {
    await handlePreflightCommand(cleanArgs, node);
    return;
  }

  if (command === "exec-profile-list") {
    await handleExecProfileListCommand();
    return;
  }

  if (command === "exec-ready") {
    await handleExecReadyCommand(cleanArgs, node);
    return;
  }

  if (command === "exec-plan") {
    await handleExecPlanCommand(cleanArgs, node);
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
    await handleWorkflowCommand(cleanArgs, node);
    return;
  }

  console.log("Uso:");
  console.log('  pnpm --filter bitron-cli run bitron -- exec-profile-list');
  console.log('  pnpm --filter bitron-cli run bitron -- exec-ready node-version-check --node intradia-vps-2');
  console.log('  pnpm --filter bitron-cli run bitron -- exec-plan node-version-check --node intradia-vps-2');
}

main().catch((err) => {
  console.error("Bitron CLI error:", err);
  process.exit(1);
});
