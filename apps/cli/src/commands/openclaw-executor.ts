import { exportOpenClawHandoff, runOpenClawExecutorOnce } from "@bitron/execution-runtime";

export async function handleOpenClawExecutorCommand(args: string[]) {
  const action = args[1];

  if (action === "run-once") {
    const result = runOpenClawExecutorOnce();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (action === "export") {
    const queueId = args[2];
    if (!queueId) {
      console.error("Uso: bitron openclaw-executor export <queueId>");
      process.exit(1);
    }

    const result = exportOpenClawHandoff(queueId);
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exit(1);
    return;
  }

  console.error("Uso: bitron openclaw-executor run-once | export <queueId>");
  process.exit(1);
}
