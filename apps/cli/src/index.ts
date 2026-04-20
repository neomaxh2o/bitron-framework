#!/usr/bin/env node

import { createJobId, createContext } from "@bitron/core";
import { plannerAgent } from "@bitron/agents";
import { runOnNode, runWrapper, whichOnNode, preflightBasic } from "@bitron/openclaw-adapter";
import { runStandardDelivery } from "@bitron/workflows";

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
const command = args[0];

async function main() {
  if (command === "plan") {
    const task = args.slice(1).join(" ");
    const context = createContext(createJobId(), "planner-agent");
    const result = plannerAgent(context, task);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "which") {
    const bin = args[1];
    if (!bin) {
      console.error("Debes indicar un binario. Ejemplo: bitron which bash");
      process.exit(1);
    }

    const result = await whichOnNode(bin);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "preflight") {
    const profile = args[1];

    if (profile === "basic") {
      const result = await preflightBasic();
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.error('Perfil no reconocido. Usá: bitron preflight basic');
    process.exit(1);
  }

  if (command === "run") {
    const cmd = args.slice(1).join(" ");
    const result = await runOnNode(cmd);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "run-wrapper") {
    const wrapperName = args[1];
    const wrapperArgs = args.slice(2);
    const result = await runWrapper(wrapperName, wrapperArgs);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "workflow") {
    const workflowName = args[1];
    const task = args.slice(2).join(" ");

    if (workflowName === "standard-delivery") {
      const result = await runStandardDelivery(task);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Workflow no reconocido: ${workflowName}`);
    process.exit(1);
  }

  console.log("Uso:");
  console.log('  pnpm --filter bitron-cli run bitron -- plan "tu tarea"');
  console.log('  pnpm --filter bitron-cli run bitron -- which bash');
  console.log('  pnpm --filter bitron-cli run bitron -- preflight basic');
  console.log('  pnpm --filter bitron-cli run bitron -- run "echo hola"');
  console.log('  pnpm --filter bitron-cli run bitron -- run-wrapper echo "hola mundo"');
  console.log('  pnpm --filter bitron-cli run bitron -- run-wrapper pwd');
  console.log('  pnpm --filter bitron-cli run bitron -- workflow standard-delivery "tu tarea"');
}

main().catch((err) => {
  console.error("Bitron CLI error:", err);
  process.exit(1);
});
