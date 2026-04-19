#!/usr/bin/env node

import { plannerAgent } from "@bitron/agents";
import { runOnNode } from "@bitron/openclaw-adapter";

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
const command = args[0];

async function main() {
  if (command === "plan") {
    const task = args.slice(1).join(" ");
    const result = plannerAgent(task);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "run") {
    const cmd = args.slice(1).join(" ");
    const result = await runOnNode(cmd);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("Uso:");
  console.log('  pnpm --filter bitron-cli run bitron -- plan "tu tarea"');
  console.log('  pnpm --filter bitron-cli run bitron -- run "echo hola"');
}

main().catch((err) => {
  console.error("Bitron CLI error:", err);
  process.exit(1);
});
