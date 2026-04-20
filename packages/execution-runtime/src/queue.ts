import fs from "node:fs";
import path from "node:path";

export interface QueueRequest {
  queueId: string;
  createdAt: string;
  status: "queued" | "processed";
  node: string;
  command: string;
  security: "off" | "allowlist";
  ask: "off" | "ask";
}

export interface QueueResult {
  queueId: string;
  createdAt: string;
  status: "queued" | "processed";
  success: boolean;
  mode: "backend-unavailable" | "executed";
  stdout: string;
  stderr: string;
  code: number | null;
  backend: {
    type: string;
    available: boolean;
    queued?: boolean;
    queuePath?: string;
  };
  processedAt?: string;
}

export interface QueueJob {
  queueId: string;
  baseDir: string;
  requestPath: string;
  resultPath: string;
}

const QUEUE_ROOT = "/root/bitron-framework/.bitron/execution-queue";

export function getQueueRoot(): string {
  return QUEUE_ROOT;
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function listQueueJobs(): QueueJob[] {
  if (!fs.existsSync(QUEUE_ROOT)) return [];

  return fs
    .readdirSync(QUEUE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const baseDir = path.join(QUEUE_ROOT, entry.name);
      return {
        queueId: entry.name,
        baseDir,
        requestPath: path.join(baseDir, "request.json"),
        resultPath: path.join(baseDir, "result.json")
      };
    })
    .filter((job) => fs.existsSync(job.requestPath));
}

export function loadQueueRequest(job: QueueJob): QueueRequest {
  return readJson<QueueRequest>(job.requestPath);
}

export function loadQueueResult(job: QueueJob): QueueResult | null {
  if (!fs.existsSync(job.resultPath)) return null;
  return readJson<QueueResult>(job.resultPath);
}

export function saveQueueRequest(job: QueueJob, data: QueueRequest): void {
  writeJson(job.requestPath, data);
}

export function saveQueueResult(job: QueueJob, data: QueueResult): void {
  writeJson(job.resultPath, data);
}
