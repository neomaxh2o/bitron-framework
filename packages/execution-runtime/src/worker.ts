import {
  listQueueJobs,
  loadQueueRequest,
  loadQueueResult,
  saveQueueRequest,
  saveQueueResult,
  type QueueJob,
  type QueueRequest,
  type QueueResult
} from "./queue";

export interface QueueWorkerRunOnceResult {
  success: boolean;
  queueRoot: string;
  processed: number;
  skipped: number;
  jobs: Array<{
    queueId: string;
    status: "processed" | "skipped";
    reason: string;
    resultPath: string;
  }>;
}

function processQueuedJob(job: QueueJob, request: QueueRequest, existingResult: QueueResult | null) {
  const now = new Date().toISOString();

  const updatedRequest: QueueRequest = {
    ...request,
    status: "processed"
  };

  const updatedResult: QueueResult = {
    queueId: request.queueId,
    createdAt: existingResult?.createdAt || request.createdAt,
    status: "processed",
    success: false,
    mode: "backend-unavailable",
    stdout: "",
    stderr:
      `Queue worker processed the queued request, but no real execution backend is connected yet.`,
    code: 1,
    backend: {
      type: "planned-payload-bridge-worker",
      available: false,
      queued: false,
      queuePath: job.baseDir
    },
    processedAt: now
  };

  saveQueueRequest(job, updatedRequest);
  saveQueueResult(job, updatedResult);

  return {
    queueId: job.queueId,
    status: "processed" as const,
    reason: "queued_job_marked_processed",
    resultPath: job.resultPath
  };
}

export function runQueueWorkerOnce(): QueueWorkerRunOnceResult {
  const jobs = listQueueJobs();

  let processed = 0;
  let skipped = 0;

  const results: QueueWorkerRunOnceResult["jobs"] = [];

  for (const job of jobs) {
    const request = loadQueueRequest(job);
    const existingResult = loadQueueResult(job);

    if (request.status !== "queued") {
      skipped += 1;
      results.push({
        queueId: job.queueId,
        status: "skipped",
        reason: `request_status_is_${request.status}`,
        resultPath: job.resultPath
      });
      continue;
    }

    const processedResult = processQueuedJob(job, request, existingResult);
    processed += 1;
    results.push(processedResult);
  }

  return {
    success: true,
    queueRoot: "/root/bitron-framework/.bitron/execution-queue",
    processed,
    skipped,
    jobs: results
  };
}
