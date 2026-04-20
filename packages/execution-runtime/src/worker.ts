import {
  listQueueJobs,
  getQueueJob,
  loadQueueRequest,
  loadQueueResult,
  saveQueueRequest,
  saveQueueResult,
  removeQueueJob,
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

export interface QueueWorkerStatusResult {
  success: boolean;
  queueRoot: string;
  total: number;
  queued: number;
  processed: number;
  unknown: number;
  jobs: Array<{
    queueId: string;
    requestStatus: string;
    resultStatus: string | null;
    baseDir: string;
  }>;
}

export interface QueueWorkerInspectResult {
  success: boolean;
  queueId: string;
  baseDir: string;
  request: QueueRequest | null;
  result: QueueResult | null;
}

export interface QueueWorkerPurgeResult {
  success: boolean;
  queueRoot: string;
  removed: number;
  kept: number;
  jobs: Array<{
    queueId: string;
    action: "removed" | "kept";
    reason: string;
  }>;
}

export interface QueueWorkerRetryResult {
  success: boolean;
  queueId: string;
  baseDir: string;
  request: QueueRequest | null;
  result: QueueResult | null;
  message: string;
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

export function getQueueWorkerStatus(): QueueWorkerStatusResult {
  const jobs = listQueueJobs();

  let queued = 0;
  let processed = 0;
  let unknown = 0;

  const summaryJobs: QueueWorkerStatusResult["jobs"] = jobs.map((job) => {
    const request = loadQueueRequest(job);
    const result = loadQueueResult(job);

    if (request.status === "queued") {
      queued += 1;
    } else if (request.status === "processed") {
      processed += 1;
    } else {
      unknown += 1;
    }

    return {
      queueId: job.queueId,
      requestStatus: request.status,
      resultStatus: result?.status || null,
      baseDir: job.baseDir
    };
  });

  return {
    success: true,
    queueRoot: "/root/bitron-framework/.bitron/execution-queue",
    total: jobs.length,
    queued,
    processed,
    unknown,
    jobs: summaryJobs
  };
}

export function inspectQueueJob(queueId: string): QueueWorkerInspectResult {
  const job = getQueueJob(queueId);

  if (!job) {
    return {
      success: false,
      queueId,
      baseDir: "",
      request: null,
      result: null
    };
  }

  return {
    success: true,
    queueId,
    baseDir: job.baseDir,
    request: loadQueueRequest(job),
    result: loadQueueResult(job)
  };
}

export function purgeProcessedQueueJobs(): QueueWorkerPurgeResult {
  const jobs = listQueueJobs();

  let removed = 0;
  let kept = 0;

  const results: QueueWorkerPurgeResult["jobs"] = [];

  for (const job of jobs) {
    const request = loadQueueRequest(job);

    if (request.status === "processed") {
      removeQueueJob(job);
      removed += 1;
      results.push({
        queueId: job.queueId,
        action: "removed",
        reason: "request_status_is_processed"
      });
      continue;
    }

    kept += 1;
    results.push({
      queueId: job.queueId,
      action: "kept",
      reason: `request_status_is_${request.status}`
    });
  }

  return {
    success: true,
    queueRoot: "/root/bitron-framework/.bitron/execution-queue",
    removed,
    kept,
    jobs: results
  };
}

export function retryQueueJob(queueId: string): QueueWorkerRetryResult {
  const job = getQueueJob(queueId);

  if (!job) {
    return {
      success: false,
      queueId,
      baseDir: "",
      request: null,
      result: null,
      message: "queue job not found"
    };
  }

  const request = loadQueueRequest(job);
  const existingResult = loadQueueResult(job);

  const updatedRequest: QueueRequest = {
    ...request,
    status: "queued"
  };

  const updatedResult: QueueResult = {
    queueId: request.queueId,
    createdAt: existingResult?.createdAt || request.createdAt,
    status: "queued",
    success: false,
    mode: "backend-unavailable",
    stdout: "",
    stderr: "Queue job re-queued manually. Pending worker processing.",
    code: 1,
    backend: {
      type: "planned-payload-bridge",
      available: false,
      queued: true,
      queuePath: job.baseDir
    }
  };

  saveQueueRequest(job, updatedRequest);
  saveQueueResult(job, updatedResult);

  return {
    success: true,
    queueId,
    baseDir: job.baseDir,
    request: updatedRequest,
    result: updatedResult,
    message: "queue job re-queued"
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runQueueWorkerLoop(intervalSeconds = 5): Promise<never> {
  const safeInterval = Number.isFinite(intervalSeconds) && intervalSeconds > 0 ? intervalSeconds : 5;

  while (true) {
    const result = runQueueWorkerOnce();
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      intervalSeconds: safeInterval,
      run: result
    }, null, 2));

    await sleep(safeInterval * 1000);
  }
}
