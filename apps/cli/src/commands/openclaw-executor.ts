import { runOpenClawExecutorOnce } from "@bitron/execution-runtime";

export async function handleOpenClawExecutorCommand(args: string[]) {
  const action = args[1];

  if (action !== "run-once") {
    console.error("Uso: bitron openclaw-executor run-once");
    process.exit(1);
  }

  const result = runOpenClawExecutorOnce();
  console.log(JSON.stringify(result, null, 2));
}
