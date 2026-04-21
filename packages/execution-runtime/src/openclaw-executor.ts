import fs from "node:fs";
import path from "node:path";
import {
  listQueueJobs,
  getQueueJob,
  loadQueueResult,
  saveQueueResult,
  type QueueJob,
  type QueueResult
} from "./queue";

export interface OpenClawExecutorRunOnceResult {
  success: boolean;
  processed: number;
  skipped: number;
  jobs: Array<{
    queueId: string;
    status: "processed" | "skipped";
    reason: string;
    responsePath?: string;
  }>;
}

export interface OpenClawExecutorExportResult {
  success: boolean;
  queueId: string;
  baseDir: string;
  requestPath: string;
  handoffPath: string;
  payload: unknown | null;
  message: string;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getOpenClawRequestPath(job: QueueJob): string {
  return path.join(job.baseDir, "openclaw-request.json");
}

function getOpenClawResponsePath(job: QueueJob): string {
  return path.join(job.baseDir, "openclaw-response.json");
}

function getOpenClawHandoffPath(job: QueueJob): string {
  return path.join(job.baseDir, "openclaw-handoff.json");
}

function shouldHandleJob(job: QueueJob): boolean {
  return fs.existsSync(getOpenClawRequestPath(job));
}

function processJob(job: QueueJob): {
  queueId: string;
  status: "processed";
  reason: string;
  responsePath: string;
} {
  const requestPath = getOpenClawRequestPath(job);
  const responsePath = getOpenClawResponsePath(job);

  const requestPayload = readJson<any>(requestPath);
  const existingResult = loadQueueResult(job);

  const now = new Date().toISOString();

  const responsePayload = {
    queueId: job.queueId,
    createdAt: now,
    status: "stubbed",
    transport: "openclaw-node-executor",
    request: requestPayload,
    success: false,
    stdout: "",
    stderr:
      "OpenClaw executor stub: se detectó un request preparado, pero todavía no existe un runtime con acceso real a exec host=node.",
    code: 1
  };

  writeJson(responsePath, responsePayload);

  const updatedResult: QueueResult = {
    queueId: existingResult?.queueId || job.queueId,
    createdAt: existingResult?.createdAt || now,
    status: "processed",
    success: false,
    mode: "backend-unavailable",
    stdout: "",
    stderr:
      "OpenClaw executor stub procesó el request. Se escribió openclaw-response.json, pero todavía no existe ejecución real.",
    code: 1,
    backend: {
      type: "openclaw-node-executor",
      available: false,
      queued: false,
      queuePath: job.baseDir
    },
    processedAt: now
  };

  saveQueueResult(job, updatedResult);

  return {
    queueId: job.queueId,
    status: "processed",
    reason: "openclaw_request_materialized",
    responsePath
  };
}

export function runOpenClawExecutorOnce(): OpenClawExecutorRunOnceResult {
  const jobs = listQueueJobs();

  let processed = 0;
  let skipped = 0;

  const results: OpenClawExecutorRunOnceResult["jobs"] = [];

  for (const job of jobs) {
    if (!shouldHandleJob(job)) {
      skipped += 1;
      results.push({
        queueId: job.queueId,
        status: "skipped",
        reason: "no_openclaw_request"
      });
      continue;
    }

    const outcome = processJob(job);
    processed += 1;
    results.push(outcome);
  }

  return {
    success: true,
    processed,
    skipped,
    jobs: results
  };
}

export function exportOpenClawHandoff(queueId: string): OpenClawExecutorExportResult {
  const job = getQueueJob(queueId);

  if (!job) {
    return {
      success: false,
      queueId,
      baseDir: "",
      requestPath: "",
      handoffPath: "",
      payload: null,
      message: "queue job not found"
    };
  }

  const requestPath = getOpenClawRequestPath(job);
  const handoffPath = getOpenClawHandoffPath(job);

  if (!fs.existsSync(requestPath)) {
    return {
      success: false,
      queueId,
      baseDir: job.baseDir,
      requestPath,
      handoffPath,
      payload: null,
      message: "openclaw-request.json not found for this job"
    };
  }

  const payload = readJson<any>(requestPath);

  const handoff = {
    queueId,
    createdAt: new Date().toISOString(),
    type: "openclaw-exec-handoff",
    instructions: {
      note: "Ejecutar este payload desde un runtime/agente con acceso real a la tool exec host=node.",
      requiredChecks: [
        `openclaw approvals get --node ${payload?.exec?.node || "<node>"} --json`,
        `openclaw nodes describe --node ${payload?.exec?.node || "<node>"}`
      ]
    },
    payload
  };

  writeJson(handoffPath, handoff);

  return {
    success: true,
    queueId,
    baseDir: job.baseDir,
    requestPath,
    handoffPath,
    payload,
    message: "openclaw handoff exported"
  };
}
