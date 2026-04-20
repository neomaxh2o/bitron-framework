import { runQueueWorkerOnce } from "@bitron/execution-runtime";

export async function handleQueueWorkerCommand(args: string[]) {
  const action = args[1];

  if (action !== "run-once") {
    console.error("Uso: bitron queue-worker run-once");
    process.exit(1);
  }

  const result = runQueueWorkerOnce();
  console.log(JSON.stringify(result, null, 2));
}
