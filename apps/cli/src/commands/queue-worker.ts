import {
  getQueueWorkerStatus,
  inspectQueueJob,
  purgeProcessedQueueJobs,
  runQueueWorkerLoop,
  runQueueWorkerOnce
} from "@bitron/execution-runtime";

function getInterval(args: string[]): number {
  const idx = args.indexOf("--interval");
  if (idx === -1) return 5;

  const raw = args[idx + 1];
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 5;
  }

  return parsed;
}

export async function handleQueueWorkerCommand(args: string[]) {
  const action = args[1];

  if (action === "run-once") {
    const result = runQueueWorkerOnce();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (action === "status") {
    const result = getQueueWorkerStatus();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (action === "inspect") {
    const queueId = args[2];
    if (!queueId) {
      console.error("Uso: bitron queue-worker inspect <queueId>");
      process.exit(1);
    }

    const result = inspectQueueJob(queueId);
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exit(1);
    return;
  }

  if (action === "purge-processed") {
    const result = purgeProcessedQueueJobs();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (action === "run-loop") {
    const interval = getInterval(args);
    console.log(JSON.stringify({
      success: true,
      action: "run-loop",
      intervalSeconds: interval,
      message: "Queue worker loop iniciado"
    }, null, 2));

    await runQueueWorkerLoop(interval);
    return;
  }

  console.error("Uso: bitron queue-worker run-once | status | inspect <queueId> | purge-processed | run-loop [--interval 5]");
  process.exit(1);
}
