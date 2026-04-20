import { runStandardDelivery, runNodeBuild } from "@bitron/workflows";

export async function handleWorkflowCommand(args: string[], node?: string) {
  const workflowName = args[1];
  const task = args.slice(2).join(" ");

  if (workflowName === "standard-delivery") {
    console.log(JSON.stringify(await runStandardDelivery(task, node), null, 2));
    return;
  }

  if (workflowName === "node-build") {
    console.log(JSON.stringify(await runNodeBuild(task, node), null, 2));
    return;
  }

  console.log(`Workflow no reconocido: ${workflowName}`);
  process.exit(1);
}
